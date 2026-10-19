import { db } from "./db";
import type { ProviderName, ProviderOutcome } from "./provider-usage";

/**
 * Provider circuit breaker. When a call comes back with a blocking outcome, the
 * provider is parked until a computed time; the pipeline checks this before
 * spending, so one dead provider stops its own work cleanly instead of being
 * retried into a wall — and leaves every other provider's work untouched.
 *
 * The duration logic is pure and unit-tested. Long waits (a daily quota, an
 * empty balance, a bad key) live here as a persisted `until`, never as an
 * in-process sleep, so a restart resumes correctly and no AI session is held
 * open waiting.
 */

const HOUR = 3600_000;

/** Outcomes that trip the breaker, longest-lived first. OK clears it. */
const COOLDOWN_OUTCOMES: ProviderOutcome[] = ["QUOTA_EXHAUSTED", "BILLING", "AUTH", "RATE_LIMITED"];

export function isCooldownOutcome(outcome: ProviderOutcome): boolean {
  return COOLDOWN_OUTCOMES.includes(outcome);
}

/**
 * How long to park a provider for a given blocking outcome.
 *  - QUOTA_EXHAUSTED: until the provider's own reset when it gave one, else a
 *    conservative, bounded 1h (never fabricated as a precise reset).
 *  - BILLING / AUTH: 6h — these need a human (top up, fix the key); the breaker
 *    rechecks periodically rather than hammering.
 *  - RATE_LIMITED: the Retry-After when supplied (clamped 1s..15m), else 60s.
 * Returns null for outcomes that should not trip a cooldown (handled by retry).
 */
export function cooldownUntil(
  outcome: ProviderOutcome,
  now: number,
  signal: { retryAfterMs?: number | null; resetAt?: Date | null } = {},
): Date | null {
  switch (outcome) {
    case "QUOTA_EXHAUSTED":
      return signal.resetAt && signal.resetAt.getTime() > now ? signal.resetAt : new Date(now + HOUR);
    case "BILLING":
    case "AUTH":
      return new Date(now + 6 * HOUR);
    case "RATE_LIMITED": {
      const ms = signal.retryAfterMs ?? 60_000;
      return new Date(now + Math.min(Math.max(ms, 1000), 15 * 60_000));
    }
    default:
      return null;
  }
}

export type Cooldown = { provider: string; until: Date; reason: string; note: string | null };

/** Park a provider. Best effort; extends the window when a new signal is longer. */
export async function tripCooldown(
  provider: ProviderName,
  outcome: ProviderOutcome,
  signal: { retryAfterMs?: number | null; resetAt?: Date | null; note?: string | null } = {},
): Promise<void> {
  const until = cooldownUntil(outcome, Date.now(), signal);
  if (!until) return;
  try {
    const existing = await db.providerCooldown.findUnique({ where: { provider } });
    // Keep the later expiry so a short rate-limit cannot shorten a long quota park.
    const effective = existing && existing.until > until ? existing.until : until;
    await db.providerCooldown.upsert({
      where: { provider },
      create: { provider, until: effective, reason: outcome, note: signal.note ?? null },
      update: { until: effective, reason: outcome, note: signal.note ?? null },
    });
  } catch (error) {
    console.warn("[provider-cooldown] could not trip:", (error as Error).message);
  }
}

/** The active cooldown for a provider, or null when it is clear or expired. */
export async function activeCooldown(provider: ProviderName): Promise<Cooldown | null> {
  try {
    const row = await db.providerCooldown.findUnique({ where: { provider } });
    if (row && row.until.getTime() > Date.now()) {
      return { provider, until: row.until, reason: row.reason, note: row.note };
    }
  } catch {
    /* table absent on an un-migrated DB — treat as no cooldown */
  }
  return null;
}

/** Clear a provider's cooldown (a successful call proves it is healthy again). */
export async function clearCooldown(provider: ProviderName): Promise<void> {
  try {
    await db.providerCooldown.deleteMany({ where: { provider } });
  } catch {
    /* best effort */
  }
}

/** All currently-active cooldowns, for the admin usage screen. */
export async function activeCooldowns(): Promise<Cooldown[]> {
  try {
    const rows = await db.providerCooldown.findMany({ where: { until: { gt: new Date() } }, orderBy: { until: "asc" } });
    return rows.map((r) => ({ provider: r.provider, until: r.until, reason: r.reason, note: r.note }));
  } catch {
    return [];
  }
}

/** Thrown by a provider seam that refuses to spend because the breaker is open. */
export class ProviderCoolingDown extends Error {
  constructor(
    readonly provider: string,
    readonly until: Date,
    readonly cooldownReason: string,
  ) {
    super(`${provider} is cooling down until ${until.toISOString()} (${cooldownReason}).`);
    this.name = "ProviderCoolingDown";
  }
}
