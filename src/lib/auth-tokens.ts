import { createHash, randomBytes } from "node:crypto";

/**
 * One-time links for business owners. A token is random, shown only inside the
 * email, and stored as a hash, so a leaked database row cannot be replayed.
 */

export const TOKEN_PURPOSES = ["SET_PASSWORD", "SIGN_IN"] as const;
export type TokenPurpose = (typeof TOKEN_PURPOSES)[number];

/** Setting a password can wait a few days; a sign-in link should not. */
export const TOKEN_TTL_MINUTES: Record<TokenPurpose, number> = {
  SET_PASSWORD: 72 * 60,
  SIGN_IN: 15,
};

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function expiresFor(purpose: TokenPurpose, now: Date = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_MINUTES[purpose] * 60_000);
}

export const MIN_PASSWORD_LENGTH = 10;
