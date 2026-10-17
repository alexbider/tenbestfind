import { createHash } from "node:crypto";
import { db } from "./db";

/**
 * Provider request accounting.
 *
 * One row per outbound provider HTTP call (Apify, DataForSEO, Anthropic, ...),
 * so the recurring "request limit" can be diagnosed from data instead of guessed
 * at: which provider, which operation, how often, and — critically — WHY a call
 * failed (a per-minute rate limit is not a daily quota is not an empty balance).
 *
 * Rules this module keeps:
 *  - Never store secrets. Endpoints hold no tokens; `connectionRef` is a short
 *    one-way hash of the credential, only so two accounts/keys can be told apart.
 *  - Recording is best effort. A failure to write an accounting row must never
 *    break the actual pipeline work, so every write is swallowed.
 *  - Never fabricate a quota reset time. Unknown stays null.
 */

export type ProviderName = "apify" | "dataforseo" | "anthropic" | "resend" | "google-indexing" | "stripe";

// Distinct failure classes the spec requires us to separate. OK and AVOIDED are
// the two non-failure outcomes (AVOIDED = a call we skipped via permitted reuse).
export type ProviderOutcome =
  | "OK"
  | "AVOIDED"
  | "RATE_LIMITED" // minute/second throttle — retry after a short, backed-off wait
  | "QUOTA_EXHAUSTED" // daily/account allowance spent — wait for the (often unknown) reset
  | "BILLING" // out of credit / payment required — human top-up, do not retry
  | "AUTH" // bad or revoked credential — disable the connection, do not retry
  | "INVALID" // the request itself is wrong — fix it, do not resend as-is
  | "SERVER" // provider 5xx — transient, retry within limits
  | "TIMEOUT" // no answer in time — transient
  | "NETWORK"; // could not reach the provider — transient

export type Classification = {
  outcome: ProviderOutcome;
  /** True when a bounded retry is reasonable; false when resending will not help. */
  retryable: boolean;
};

/**
 * Classify a transport-level HTTP status. Provider-agnostic baseline.
 *
 * A 429 is deliberately classified RATE_LIMITED, never QUOTA_EXHAUSTED: the spec
 * is explicit that not every 429 is a daily quota. Callers that have a stronger
 * signal (a reset far in the future, remaining=0 for a daily metric, a provider
 * body that names the day) upgrade it with `escalateToQuota`.
 */
export function classifyHttpStatus(status: number): Classification {
  if (status >= 200 && status < 300) return { outcome: "OK", retryable: false };
  if (status === 429) return { outcome: "RATE_LIMITED", retryable: true };
  if (status === 401 || status === 403) return { outcome: "AUTH", retryable: false };
  if (status === 402) return { outcome: "BILLING", retryable: false };
  if (status === 408) return { outcome: "TIMEOUT", retryable: true };
  if (status === 404 || status === 400 || status === 422 || status === 405) return { outcome: "INVALID", retryable: false };
  if (status >= 500) return { outcome: "SERVER", retryable: true };
  if (status >= 400) return { outcome: "INVALID", retryable: false };
  return { outcome: "SERVER", retryable: true };
}

/**
 * Classify a DataForSEO task `status_code` (it answers HTTP 200 with the real
 * verdict inside the body). The raw code is always stored as `providerCode` so
 * nothing is lost to this mapping; the buckets are conservative on purpose.
 *   20000 / 20100  success
 *   401xx          authentication
 *   402xx          rate / usage limit
 *   404xx          money / balance (e.g. 40402 "Not enough money")
 *   5xxxx          server
 *   other 4xxxx    invalid request
 */
export function classifyDataForSeoCode(code: number | undefined | null): Classification {
  if (code == null) return { outcome: "OK", retryable: false };
  if (code === 20000 || code === 20100) return { outcome: "OK", retryable: false };
  if (code >= 50000) return { outcome: "SERVER", retryable: true };
  if (code >= 40400 && code < 40500) return { outcome: "BILLING", retryable: false };
  if (code >= 40200 && code < 40300) return { outcome: "RATE_LIMITED", retryable: true };
  if (code >= 40100 && code < 40200) return { outcome: "AUTH", retryable: false };
  if (code >= 40000) return { outcome: "INVALID", retryable: false };
  return { outcome: "OK", retryable: false };
}

/** Classify a thrown fetch error (no HTTP status) as a timeout or network fault. */
export function classifyThrown(error: unknown): Classification {
  const name = (error as { name?: string })?.name ?? "";
  const msg = String((error as { message?: string })?.message ?? error ?? "");
  if (name === "TimeoutError" || /timed? ?out|AbortError|ETIMEDOUT/i.test(msg)) {
    return { outcome: "TIMEOUT", retryable: true };
  }
  return { outcome: "NETWORK", retryable: true };
}

/**
 * Promote a RATE_LIMITED classification to QUOTA_EXHAUSTED when the evidence says
 * the limit is a daily/account allowance rather than a short throttle: a known
 * remaining of 0, or a reset more than `minMs` (default 10 min) in the future.
 */
export function escalateToQuota(
  base: Classification,
  signal: { remaining?: number | null; resetAt?: Date | null; minMs?: number },
): Classification {
  if (base.outcome !== "RATE_LIMITED") return base;
  const minMs = signal.minMs ?? 10 * 60_000;
  const farReset = signal.resetAt ? signal.resetAt.getTime() - Date.now() > minMs : false;
  const noneLeft = signal.remaining === 0;
  if (farReset || noneLeft) return { outcome: "QUOTA_EXHAUSTED", retryable: false };
  return base;
}

/** Parse a Retry-After header (seconds, or an HTTP date) into milliseconds. */
export function parseRetryAfterMs(headerValue: string | null | undefined): number | null {
  if (!headerValue) return null;
  const secs = Number(headerValue);
  if (Number.isFinite(secs)) return Math.max(0, Math.round(secs * 1000));
  const when = Date.parse(headerValue);
  if (Number.isFinite(when)) return Math.max(0, when - Date.now());
  return null;
}

/** Short, non-reversible tag for a credential so two accounts/keys differ in the log. */
export function connectionRef(secret: string | null | undefined): string | null {
  if (!secret) return null;
  return createHash("sha256").update(secret).digest("hex").slice(0, 10);
}

/** Stable hash of (provider, operation, key params) — the single-flight / reuse key. */
export function requestFingerprint(provider: ProviderName, operation: string, keyParams: unknown): string {
  const basis = JSON.stringify({ provider, operation, keyParams });
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}

export type ProviderRequestInput = {
  provider: ProviderName;
  endpoint: string; // normalized path — MUST NOT contain a secret
  operation: string;
  method?: string;
  outcome: ProviderOutcome;
  httpStatus?: number | null;
  providerCode?: string | null;
  latencyMs?: number | null;
  retryAttempt?: number;
  retryAfterMs?: number | null;
  quotaMetric?: string | null;
  quotaLimit?: number | null;
  quotaRemaining?: number | null;
  quotaResetAt?: Date | null; // null = unknown; never fabricate
  billableUnits?: number | null;
  estCostUsd?: number | null;
  avoided?: boolean;
  initiator?: string | null;
  runId?: string | null;
  jobId?: string | null;
  businessId?: string | null;
  connectionRef?: string | null;
  fingerprint?: string | null;
  note?: string | null;
};

/**
 * Write one accounting row. Best effort: any failure (including the table not yet
 * existing on an un-migrated DB) is logged and swallowed so provider work is never
 * interrupted by its own bookkeeping.
 */
export async function recordProviderRequest(input: ProviderRequestInput): Promise<void> {
  try {
    await db.providerRequest.create({
      data: {
        provider: input.provider,
        endpoint: input.endpoint,
        operation: input.operation,
        method: input.method ?? "GET",
        outcome: input.outcome,
        httpStatus: input.httpStatus ?? null,
        providerCode: input.providerCode ?? null,
        latencyMs: input.latencyMs ?? null,
        retryAttempt: input.retryAttempt ?? 0,
        retryAfterMs: input.retryAfterMs ?? null,
        quotaMetric: input.quotaMetric ?? null,
        quotaLimit: input.quotaLimit ?? null,
        quotaRemaining: input.quotaRemaining ?? null,
        quotaResetAt: input.quotaResetAt ?? null,
        billableUnits: input.billableUnits ?? null,
        estCostUsd: input.estCostUsd ?? null,
        avoided: input.avoided ?? false,
        initiator: input.initiator ?? null,
        runId: input.runId ?? null,
        jobId: input.jobId ?? null,
        businessId: input.businessId ?? null,
        connectionRef: input.connectionRef ?? null,
        fingerprint: input.fingerprint ?? null,
        note: input.note ? input.note.slice(0, 500) : null,
      },
    });
  } catch (error) {
    console.warn("[provider-usage] could not record request:", (error as Error).message);
  }
}

/** Record a call we deliberately avoided through permitted reuse (cache/dedup hit). */
export async function recordAvoided(
  provider: ProviderName,
  operation: string,
  extra: Partial<ProviderRequestInput> = {},
): Promise<void> {
  await recordProviderRequest({
    provider,
    endpoint: extra.endpoint ?? "(reuse)",
    operation,
    outcome: "AVOIDED",
    avoided: true,
    ...extra,
  });
}
