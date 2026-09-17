import { beforeEach, describe, expect, it } from "vitest";
import { BURST_LIMIT, HOURLY_LIMIT, countCall, resetLimits } from "@/lib/mcp/limits";

/**
 * An agent working through a city makes about 150 calls and runs continuously.
 * The ceiling has to be out of its way and in a runaway loop's.
 */

beforeEach(() => resetLimits());

describe("what one connector token may ask for", () => {
  it("lets a real hour of work through untouched", () => {
    const start = Date.now();
    // Four cities at 150 calls each, spread across the hour so the per-minute
    // burst is never the thing being tested.
    for (let call = 0; call < 600; call += 1) {
      const verdict = countCall("token", start + call * 5_000);
      expect(verdict.ok, `call ${call}`).toBe(true);
    }
  });

  it("stops a loop within the minute rather than within the hour", () => {
    const start = Date.now();
    for (let call = 0; call < BURST_LIMIT; call += 1) {
      expect(countCall("token", start).ok).toBe(true);
    }

    const refused = countCall("token", start);
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.retryAfter).toBeGreaterThan(0);
      expect(refused.retryAfter).toBeLessThanOrEqual(60);
      expect(refused.message).toMatch(/nothing was lost/);
    }
  });

  it("opens again once the minute is over", () => {
    const start = Date.now();
    for (let call = 0; call < BURST_LIMIT; call += 1) countCall("token", start);
    expect(countCall("token", start).ok).toBe(false);
    expect(countCall("token", start + 60_001).ok).toBe(true);
  });

  it("holds the hour open well past the six hundred the brief asks for", () => {
    const start = Date.now();
    let allowed = 0;
    // One a second, so the burst window keeps resetting and only the hourly
    // ceiling is in play.
    for (let call = 0; call < HOURLY_LIMIT + 10; call += 1) {
      if (countCall("token", start + call * 1_000).ok) allowed += 1;
    }
    expect(allowed).toBe(HOURLY_LIMIT);
    expect(HOURLY_LIMIT).toBeGreaterThanOrEqual(600);
  });

  it("counts each token on its own", () => {
    const start = Date.now();
    for (let call = 0; call < BURST_LIMIT; call += 1) countCall("one", start);
    expect(countCall("one", start).ok).toBe(false);
    expect(countCall("two", start).ok).toBe(true);
  });
});
