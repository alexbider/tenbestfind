import { describe, expect, it } from "vitest";
import { cooldownUntil, isCooldownOutcome } from "@/lib/provider-cooldown";

const NOW = 1_700_000_000_000;
const mins = (d: Date) => Math.round((d.getTime() - NOW) / 60_000);

describe("which outcomes trip the breaker", () => {
  it("trips on quota, billing, auth and rate-limit; nothing else", () => {
    for (const o of ["QUOTA_EXHAUSTED", "BILLING", "AUTH", "RATE_LIMITED"] as const) {
      expect(isCooldownOutcome(o)).toBe(true);
    }
    for (const o of ["OK", "AVOIDED", "SERVER", "TIMEOUT", "NETWORK", "INVALID"] as const) {
      expect(isCooldownOutcome(o)).toBe(false);
    }
  });
});

describe("cooldown duration by outcome", () => {
  it("quota waits for the provider's own reset when given", () => {
    const reset = new Date(NOW + 3 * 3600_000);
    expect(cooldownUntil("QUOTA_EXHAUSTED", NOW, { resetAt: reset })).toEqual(reset);
  });
  it("quota falls back to a bounded 1h when the reset is unknown or past", () => {
    expect(mins(cooldownUntil("QUOTA_EXHAUSTED", NOW)!)).toBe(60);
    const past = new Date(NOW - 1000);
    expect(mins(cooldownUntil("QUOTA_EXHAUSTED", NOW, { resetAt: past })!)).toBe(60);
  });
  it("billing and auth park for 6h (need a human)", () => {
    expect(mins(cooldownUntil("BILLING", NOW)!)).toBe(360);
    expect(mins(cooldownUntil("AUTH", NOW)!)).toBe(360);
  });
  it("rate-limit honors Retry-After, clamped to 1s..15m", () => {
    expect(cooldownUntil("RATE_LIMITED", NOW, { retryAfterMs: 30_000 })!.getTime()).toBe(NOW + 30_000);
    expect(cooldownUntil("RATE_LIMITED", NOW)!.getTime()).toBe(NOW + 60_000); // default
    expect(cooldownUntil("RATE_LIMITED", NOW, { retryAfterMs: 60 * 60_000})!.getTime()).toBe(NOW + 15 * 60_000); // clamp high
    expect(cooldownUntil("RATE_LIMITED", NOW, { retryAfterMs: 10 })!.getTime()).toBe(NOW + 1000); // clamp low
  });
  it("does not trip for non-cooldown outcomes", () => {
    expect(cooldownUntil("OK", NOW)).toBeNull();
    expect(cooldownUntil("SERVER", NOW)).toBeNull();
    expect(cooldownUntil("TIMEOUT", NOW)).toBeNull();
  });
});
