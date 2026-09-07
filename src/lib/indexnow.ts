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

/**
 * Fire and forget, for use beside a revalidatePath in a server action.
 *
 * Publishing must not wait on, or be broken by, an engine that is slow or
 * down, so this is deliberately not awaited by its callers and cannot reject.
 */
export function pingIndexNow(paths: string[]): void {
  void submitToIndexNow(paths).catch(() => {});
}
