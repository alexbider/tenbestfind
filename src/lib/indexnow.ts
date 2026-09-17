// Telling Bing, Yandex and the other IndexNow engines that a page changed.
//
// Google ignores the protocol, so this is not a replacement for the sitemap.
// It is the other half: the sitemap is a standing offer a crawler reads when
// it feels like it, and this is a push that lands within minutes. On a
// directory whose whole value is being current, waiting a fortnight to be
// re-crawled is the difference between a ranking that is right and one that is
// merely published.
//
// Two rules shape everything below. The site must never fail because a search
// engine did, so every call here swallows its own errors and returns a result
// rather than throwing. And nothing is submitted when indexing is switched off
// in the admin, because pushing URLs at an engine while telling it not to
// index them is a contradiction it is entitled to remember.

import { randomBytes } from "node:crypto";
import { db } from "./db";
import { loadSeoSettings } from "./seo-settings";
import { absoluteUrl } from "./urls";

/** Where the key is kept. Outside the `seo.` namespace: it is not a setting an editor should see or change. */
const KEY_SETTING = "indexnow.key";

/** The shared endpoint. It forwards a submission to every participating engine. */
const ENDPOINT = "https://api.indexnow.org/IndexNow";

/** The protocol's ceiling for one request. */
const MAX_URLS = 10_000;

export type IndexNowResult =
  | { status: "sent"; urls: number; httpStatus: number }
  | { status: "skipped"; reason: string };

/**
 * The site's IndexNow key, generated on first use and kept afterwards.
 *
 * It is not a secret. It is a proof of control: an engine that receives a
 * submission fetches the key file from this domain and only believes the
 * submission if the two match, which is what stops anyone submitting URLs on
 * someone else's behalf.
 */
export async function indexNowKey(): Promise<string> {
  const existing = await db.setting.findUnique({ where: { key: KEY_SETTING } });
  const stored = existing?.value ? String(JSON.parse(existing.value)) : "";
  if (/^[a-f0-9]{32}$/.test(stored)) return stored;

  const key = randomBytes(16).toString("hex");
  await db.setting.upsert({
    where: { key: KEY_SETTING },
    create: {
      key: KEY_SETTING,
      value: JSON.stringify(key),
      groupName: "seo",
      label: "IndexNow key",
    },
    update: { value: JSON.stringify(key), groupName: "seo", label: "IndexNow key" },
  });
  return key;
}

/** The address the key file is served from. The filename has to be the key. */
export function indexNowKeyLocation(key: string): string {
  return absoluteUrl(`/indexnow/${key}.txt`);
}

/**
 * Submits paths for recrawl. Duplicates are collapsed and anything that is not
 * a path on this site is dropped, because a submission containing a URL from
 * another host is rejected whole rather than in part.
 */
export async function submitToIndexNow(paths: string[]): Promise<IndexNowResult> {
  const settings = await loadSeoSettings();
  if (!settings.bool("seo.searchEngineVisible")) {
    return { status: "skipped", reason: "indexing is switched off" };
  }
  if (!settings.bool("seo.indexnow")) {
    return { status: "skipped", reason: "IndexNow is switched off" };
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) return { status: "skipped", reason: "no NEXT_PUBLIC_SITE_URL" };

  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return { status: "skipped", reason: "NEXT_PUBLIC_SITE_URL is not a URL" };
  }
  // Nothing localhost can be verified, so a development run would only ever
  // collect a rejection.
  if (host === "localhost" || host === "127.0.0.1") {
    return { status: "skipped", reason: "not a public host" };
  }

  const urls = [...new Set(paths.filter(Boolean).map((path) => absoluteUrl(path)))]
    .filter((url) => url.startsWith(origin))
    .slice(0, MAX_URLS);
  if (urls.length === 0) return { status: "skipped", reason: "nothing to submit" };

  const key = await indexNowKey();

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: indexNowKeyLocation(key), urlList: urls }),
      // A slow engine must not hold up the editor who pressed Save.
      signal: AbortSignal.timeout(10_000),
    });
    return { status: "sent", urls: urls.length, httpStatus: response.status };
  } catch (error) {
    return { status: "skipped", reason: `request failed (${String(error)})` };
  }
}

/* --------------------------------------------------------------- the queue */

/** After this many tries a URL is left alone; something about it is wrong. */
const MAX_ATTEMPTS = 5;

export type IndexNowFlush = {
  sent: number;
  failed: number;
  remaining: number;
  note: string;
};

/**
 * Puts paths on the queue rather than sending them.
 *
 * A send that happens inside a server action is lost the moment anything goes
 * wrong: the engine is down, the container restarts, a batch writes a thousand
 * profiles at once and the request is refused for being too large. The queue is
 * the same table the Google submissions use, so "was this page ever submitted"
 * has one answer for both.
 */
export async function queueForIndexNow(
  paths: string[],
  action: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED",
): Promise<number> {
  const settings = await loadSeoSettings();
  if (!settings.bool("seo.searchEngineVisible")) return 0;
  if (!settings.bool("seo.indexnow")) return 0;

  const urls = [...new Set(paths.filter(Boolean).map((path) => absoluteUrl(path)))];
  if (urls.length === 0) return 0;

  const waiting = await db.indexRequest.findMany({
    where: { url: { in: urls }, target: "INDEXNOW", status: "QUEUED" },
    select: { url: true },
  });
  const already = new Set(waiting.map((row) => row.url));
  const fresh = urls.filter((url) => !already.has(url));
  if (fresh.length === 0) return 0;

  await db.indexRequest.createMany({
    data: fresh.map((url) => ({ url, target: "INDEXNOW", action })),
  });
  return fresh.length;
}

/**
 * Sends what is queued, in one request.
 *
 * The protocol takes up to 10,000 URLs at a time and an engine would rather
 * have one list than ten thousand pings, so this is the opposite shape to the
 * Google flush. A failure leaves every row queued with its attempt count up by
 * one, and a row that has failed five times is marked FAILED and left out of
 * later runs rather than retried forever.
 */
export async function flushIndexNowQueue(limit = MAX_URLS): Promise<IndexNowFlush> {
  const queued = await db.indexRequest.findMany({
    where: { target: "INDEXNOW", status: "QUEUED", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: Math.min(limit, MAX_URLS),
  });
  if (queued.length === 0) return { sent: 0, failed: 0, remaining: 0, note: "nothing queued" };

  const result = await submitToIndexNow(queued.map((row) => row.url));
  const ids = queued.map((row) => row.id);

  if (result.status === "skipped") {
    // Switched off or not a public host: these are not failures to retry, and
    // leaving them queued would pile up forever.
    await db.indexRequest.updateMany({
      where: { id: { in: ids } },
      data: { status: "SKIPPED", error: result.reason },
    });
    return { sent: 0, failed: 0, remaining: 0, note: result.reason };
  }

  const ok = result.httpStatus >= 200 && result.httpStatus < 300;
  if (ok) {
    await db.indexRequest.updateMany({
      where: { id: { in: ids } },
      data: {
        status: "SENT",
        sentAt: new Date(),
        attempts: { increment: 1 },
        response: String(result.httpStatus),
        error: null,
      },
    });
  } else {
    await db.indexRequest.updateMany({
      where: { id: { in: ids } },
      data: { attempts: { increment: 1 }, error: `HTTP ${result.httpStatus}` },
    });
    // Anything that has now used up its attempts stops being retried.
    await db.indexRequest.updateMany({
      where: { id: { in: ids }, attempts: { gte: MAX_ATTEMPTS } },
      data: { status: "FAILED" },
    });
  }

  const remaining = await db.indexRequest.count({
    where: { target: "INDEXNOW", status: "QUEUED", attempts: { lt: MAX_ATTEMPTS } },
  });

  return {
    sent: ok ? queued.length : 0,
    failed: ok ? 0 : queued.length,
    remaining,
    note: ok ? `${queued.length} submitted` : `engine returned ${result.httpStatus}`,
  };
}

/**
 * Queue and then try to send, for use beside a revalidatePath in a server
 * action.
 *
 * Publishing must not wait on, or be broken by, an engine that is slow or
 * down, so this is deliberately not awaited by its callers and cannot reject.
 * Anything the send does not manage stays on the queue for the next flush.
 */
export function pingIndexNow(paths: string[]): void {
  void (async () => {
    await queueForIndexNow(paths);
    await flushIndexNowQueue();
  })().catch(() => {});
}
