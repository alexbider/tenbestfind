import { describe, expect, it } from "vitest";
import {
  expiresFor,
  hashToken,
  MIN_PASSWORD_LENGTH,
  newToken,
  TOKEN_TTL_MINUTES,
} from "@/lib/auth-tokens";

describe("one-time link tokens", () => {
  it("makes long, unguessable, URL-safe tokens", () => {
    const a = newToken();
    const b = newToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("stores a hash, never the token itself", () => {
    const token = newToken();
    const hash = hashToken(token);
    expect(hash).not.toEqual(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(token)).toEqual(hash);
  });

  it("expires sign-in links in 15 minutes and setup links in 72 hours", () => {
    const now = new Date("2026-10-12T12:00:00Z");
    expect(expiresFor("SIGN_IN", now).getTime() - now.getTime()).toBe(15 * 60_000);
    expect(expiresFor("SET_PASSWORD", now).getTime() - now.getTime()).toBe(72 * 60 * 60_000);
    expect(TOKEN_TTL_MINUTES.SIGN_IN).toBeLessThan(TOKEN_TTL_MINUTES.SET_PASSWORD);
  });

  it("asks for at least ten characters", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(10);
  });
});
