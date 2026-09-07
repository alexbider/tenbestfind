// Telling Google directly that a URL exists or changed.
//
// A caveat worth stating plainly, because it decides how much to lean on this:
// Google documents the Indexing API as being for JobPosting and BroadcastEvent
// pages, and says other content should be discovered through sitemaps. In
// practice it accepts and often acts on other URLs, which is why every SEO
// tool offers it, but it is outside the documented contract and Google is
// entitled to ignore it at any time without telling anyone.
//
// So this is a third signal, not the mechanism. The sitemap is the contract,
// IndexNow covers Bing and Yandex within minutes, and this is the extra nudge
// where it happens to work. Nothing on the site depends on it succeeding, and
// a failure here is recorded rather than raised.
//
// Auth is a service account: sign a JWT with the account's private key, trade
// it for an access token, call the endpoint. No googleapis dependency, because
// the whole flow is two HTTP calls and a signature.

import { createSign } from "node:crypto";
import { db } from "./db";
import { getSecret, SECRET_KEYS } from "./secrets";
import { absoluteUrl } from "./urls";
import { loadSeoSettings } from "./seo-settings";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PUBLISH_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const SCOPE = "https://www.googleapis.com/auth/indexing";

/** Google's own ceiling: 200 URLs a day on a default quota. */
export const DAILY_QUOTA = 200;

export type IndexAction = "URL_UPDATED" | "URL_DELETED";

type ServiceAccount = { client_email: string; private_key: string };

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** The stored service account, or null when one has not been pasted in yet. */
async function serviceAccount(): Promise<ServiceAccount | null> {
  const raw = await getSecret(SECRET_KEYS.googleServiceAccount);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    // A key pasted through a form usually arrives with its newlines escaped.
    return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

export async function googleIndexingConfigured(): Promise<boolean> {
  return (await serviceAccount()) !== null;
}

/**
 * A short-lived access token for the indexing scope.
 *
 * Cached in memory for the life of the process, which is what a worker wants:
 * one signature per hour rather than one per URL.
 */
let cached: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;

  const account = await serviceAccount();
  if (!account) throw new Error("No Google service account is configured.");

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = base64url(signer.sign(account.private_key));
  const assertion = `${header}.${claims}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const body = (await response.json()) as { access_token?: string; error_description?: string; error?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(
      `Google refused the service account: ${body.error_description ?? body.error ?? response.status}`,
    );
  }

  cached = { token: body.access_token, expires: Date.now() + 3_000_000 };
  return body.access_token;
}

/**
 * Adds paths to the queue, skipping any already waiting.
 *
 * Queued rather than sent, because the daily quota is small enough that a batch
 * import would blow through it, and because a URL nobody ever submitted is a
 * question worth being able to answer later.
 */
export async function queueForIndexing(
  paths: string[],
  action: IndexAction = "URL_UPDATED",
): Promise<number> {
  const settings = await loadSeoSettings();
  if (!settings.bool("seo.searchEngineVisible")) return 0;
  if (!settings.bool("seo.googleIndexing")) return 0;

  const urls = [...new Set(paths.filter(Boolean).map((path) => absoluteUrl(path)))];
  if (urls.length === 0) return 0;

  const waiting = await db.indexRequest.findMany({
    where: { url: { in: urls }, target: "GOOGLE", status: "QUEUED" },
    select: { url: true },
  });
  const already = new Set(waiting.map((row) => row.url));
  const fresh = urls.filter((url) => !already.has(url));
  if (fresh.length === 0) return 0;

  await db.indexRequest.createMany({
    data: fresh.map((url) => ({ url, target: "GOOGLE", action })),
  });
  return fresh.length;
}

/** How many were accepted in the last 24 hours, for the quota. */
export async function sentToday(): Promise<number> {
  return db.indexRequest.count({
    where: {
      target: "GOOGLE",
      status: "SENT",
      sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
}

export type FlushResult = { sent: number; failed: number; remaining: number; note: string };

/**
 * Sends what is queued, up to whatever is left of today's quota.
 *
 * Each URL is its own request, because that is the only shape the endpoint has.
 * A 429 stops the run rather than burning through the rest of the queue against
 * a closed door; anything else is recorded against the row and moves on.
 */
export async function flushIndexQueue(limit = DAILY_QUOTA): Promise<FlushResult> {
  if (!(await googleIndexingConfigured())) {
    return { sent: 0, failed: 0, remaining: 0, note: "no Google service account configured" };
  }

  const used = await sentToday();
  const budget = Math.max(0, Math.min(limit, DAILY_QUOTA - used));
  if (budget === 0) {
    const remaining = await db.indexRequest.count({ where: { target: "GOOGLE", status: "QUEUED" } });
    return { sent: 0, failed: 0, remaining, note: `daily quota of ${DAILY_QUOTA} already used` };
  }

  const queued = await db.indexRequest.findMany({
    where: { target: "GOOGLE", status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: budget,
  });
  if (queued.length === 0) return { sent: 0, failed: 0, remaining: 0, note: "nothing queued" };

  let token: string;
  try {
    token = await accessToken();
  } catch (error) {
    return { sent: 0, failed: 0, remaining: queued.length, note: String(error) };
  }

  let sent = 0;
  let failed = 0;
  let note = "";

  for (const row of queued) {
    try {
      const response = await fetch(PUBLISH_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ url: row.url, type: row.action }),
        signal: AbortSignal.timeout(20_000),
      });
      const text = (await response.text()).slice(0, 500);

      if (response.status === 429) {
        // Out of quota for the day. Stop rather than fail the rest.
        note = "Google returned 429; the rest stay queued for tomorrow.";
        await db.indexRequest.update({
          where: { id: row.id },
          data: { attempts: { increment: 1 } },
        });
        break;
      }

      if (response.ok) {
        await db.indexRequest.update({
          where: { id: row.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            attempts: { increment: 1 },
            response: text,
            error: null,
          },
        });
        sent += 1;
      } else {
        await db.indexRequest.update({
          where: { id: row.id },
          data: {
            status: row.attempts >= 2 ? "FAILED" : "QUEUED",
            attempts: { increment: 1 },
            error: `HTTP ${response.status}: ${text}`,
          },
        });
        failed += 1;
      }
    } catch (error) {
      await db.indexRequest.update({
        where: { id: row.id },
        data: {
          status: row.attempts >= 2 ? "FAILED" : "QUEUED",
          attempts: { increment: 1 },
          error: String(error).slice(0, 500),
        },
      });
      failed += 1;
    }
  }

  const remaining = await db.indexRequest.count({ where: { target: "GOOGLE", status: "QUEUED" } });
  return { sent, failed, remaining, note: note || `${DAILY_QUOTA - used - sent} left in today's quota` };
}
