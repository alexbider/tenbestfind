import { describe, expect, it } from "vitest";
import {
  classifyHttpStatus,
  classifyDataForSeoCode,
  classifyThrown,
  escalateToQuota,
  parseRetryAfterMs,
  connectionRef,
  requestFingerprint,
} from "@/lib/provider-usage";

describe("HTTP status classification", () => {
  it("separates a temporary rate limit (429) from a hard failure", () => {
    expect(classifyHttpStatus(429)).toEqual({ outcome: "RATE_LIMITED", retryable: true });
  });
  it("treats auth errors as non-retryable", () => {
    expect(classifyHttpStatus(401).outcome).toBe("AUTH");
    expect(classifyHttpStatus(403).retryable).toBe(false);
  });
  it("treats 402 as a billing stop, not a retry", () => {
    expect(classifyHttpStatus(402)).toEqual({ outcome: "BILLING", retryable: false });
  });
  it("treats 5xx as a retryable server fault and 4xx as invalid", () => {
    expect(classifyHttpStatus(503)).toEqual({ outcome: "SERVER", retryable: true });
    expect(classifyHttpStatus(400).outcome).toBe("INVALID");
    expect(classifyHttpStatus(404).retryable).toBe(false);
  });
  it("treats 2xx as OK", () => {
    expect(classifyHttpStatus(200).outcome).toBe("OK");
    expect(classifyHttpStatus(201).outcome).toBe("OK");
  });
});

describe("daily quota vs temporary rate limit (spec test #5)", () => {
  it("does NOT call a bare 429 a daily quota", () => {
    expect(classifyHttpStatus(429).outcome).toBe("RATE_LIMITED");
  });
  it("escalates to QUOTA_EXHAUSTED only when the reset is far away", () => {
    const base = classifyHttpStatus(429);
    const soon = escalateToQuota(base, { resetAt: new Date(Date.now() + 30_000) });
    expect(soon.outcome).toBe("RATE_LIMITED"); // 30s away = still a throttle
    const tomorrow = escalateToQuota(base, { resetAt: new Date(Date.now() + 6 * 3600_000) });
    expect(tomorrow).toEqual({ outcome: "QUOTA_EXHAUSTED", retryable: false });
  });
  it("escalates when the remaining allowance is zero", () => {
    expect(escalateToQuota(classifyHttpStatus(429), { remaining: 0 }).outcome).toBe("QUOTA_EXHAUSTED");
  });
  it("never escalates a non-rate-limit outcome", () => {
    expect(escalateToQuota(classifyHttpStatus(500), { remaining: 0 }).outcome).toBe("SERVER");
  });
});

describe("DataForSEO in-body status_code classification", () => {
  it("reads 20000/20100 as success", () => {
    expect(classifyDataForSeoCode(20000).outcome).toBe("OK");
    expect(classifyDataForSeoCode(20100).outcome).toBe("OK");
  });
  it("reads the money codes (404xx) as a billing stop", () => {
    expect(classifyDataForSeoCode(40402)).toEqual({ outcome: "BILLING", retryable: false });
  });
  it("reads auth (401xx) and rate (402xx) distinctly", () => {
    expect(classifyDataForSeoCode(40101).outcome).toBe("AUTH");
    expect(classifyDataForSeoCode(40200).outcome).toBe("RATE_LIMITED");
  });
  it("reads 5xxxx as a retryable server fault, other 4xxxx as invalid", () => {
    expect(classifyDataForSeoCode(50000)).toEqual({ outcome: "SERVER", retryable: true });
    expect(classifyDataForSeoCode(40000).outcome).toBe("INVALID");
  });
});

describe("thrown fetch errors", () => {
  it("classifies an abort/timeout as TIMEOUT", () => {
    const e = new Error("The operation was aborted due to timeout");
    (e as { name: string }).name = "TimeoutError";
    expect(classifyThrown(e)).toEqual({ outcome: "TIMEOUT", retryable: true });
  });
  it("classifies anything else as a retryable network fault", () => {
    expect(classifyThrown(new Error("fetch failed"))).toEqual({ outcome: "NETWORK", retryable: true });
  });
});

describe("Retry-After parsing", () => {
  it("reads a seconds value", () => {
    expect(parseRetryAfterMs("30")).toBe(30_000);
  });
  it("reads an HTTP date into a future delay", () => {
    const ms = parseRetryAfterMs(new Date(Date.now() + 60_000).toUTCString());
    expect(ms).not.toBeNull();
    expect(ms!).toBeGreaterThan(50_000);
    expect(ms!).toBeLessThanOrEqual(60_000);
  });
  it("returns null for junk or missing values", () => {
    expect(parseRetryAfterMs(null)).toBeNull();
    expect(parseRetryAfterMs("soon")).toBeNull();
  });
});

describe("redaction and fingerprints", () => {
  it("never returns the credential itself", () => {
    const secret = "super-secret-token-value";
    const ref = connectionRef(secret);
    expect(ref).not.toBeNull();
    expect(ref!).not.toContain("secret");
    expect(secret.includes(ref!)).toBe(false);
    expect(ref!.length).toBe(10);
  });
  it("gives two different credentials two different tags", () => {
    expect(connectionRef("account-a")).not.toBe(connectionRef("account-b"));
  });
  it("fingerprints identical requests to the same key and different ones apart", () => {
    const a = requestFingerprint("apify", "startRun", { q: "roofing in Austin, TX" });
    const b = requestFingerprint("apify", "startRun", { q: "roofing in Austin, TX" });
    const c = requestFingerprint("apify", "startRun", { q: "roofing in Dallas, TX" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
