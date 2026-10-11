import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { sendClaimReceived } from "./notify";
import { siteUrl } from "./stripe";
import { routes } from "./urls";

/**
 * Email verification for ownership claims. A six-digit code goes to the
 * address on the claim; only an HMAC of it is stored. Codes last thirty
 * minutes, five wrong guesses lock the code, and a new one can be sent once a
 * minute.
 */

export const CODE_TTL_MINUTES = 30;
export const MAX_ATTEMPTS = 5;
export const RESEND_SECONDS = 60;

export const METHOD_LABEL: Record<string, string> = {
  EMAIL: "Business domain email",
  PHONE: "Phone callback",
  WEBSITE_TOKEN: "Website token",
  DOCUMENT: "Registration document",
};

function hashCode(claimId: string, code: string): string {
  const secret = process.env.SESSION_SECRET ?? "tenbestfind-dev-secret";
  return createHmac("sha256", secret).update(`claim:${claimId}:${code}`).digest("hex");
}

export function verifyUrl(claimId: string): string {
  return siteUrl(`${routes.claim()}verify/?c=${encodeURIComponent(claimId)}`);
}

/** jane@acme.com becomes ja…@acme.com, enough to recognise without exposing it. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}…@${domain ?? ""}`;
}

export const claimReference = (claimId: string) => claimId.slice(-8).toUpperCase();

/** Issues a fresh code and emails it with the claim receipt. */
export async function issueClaimCode(claimId: string): Promise<{ sent: boolean; code: string }> {
  const claim = await db.claimRequest.findUnique({ where: { id: claimId } });
  if (!claim) throw new Error("Claim not found");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  await db.claimRequest.update({
    where: { id: claimId },
    data: {
      codeHash: hashCode(claimId, code),
      codeSentAt: now,
      codeExpiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000),
      codeAttempts: 0,
    },
  });

  const sent = await sendClaimReceived({
    to: claim.ownerEmail,
    ownerName: claim.ownerName,
    businessName: claim.businessName,
    reference: claimReference(claim.id),
    method: METHOD_LABEL[claim.verificationMethod] ?? claim.verificationMethod,
    code,
    verifyUrl: verifyUrl(claim.id),
  });
  // A code nobody received is no use, and replacing a working one with it
  // would strand the claimant, so a failed send puts the old code back.
  if (!sent && claim.codeHash) {
    await db.claimRequest.update({
      where: { id: claimId },
      data: {
        codeHash: claim.codeHash,
        codeSentAt: claim.codeSentAt,
        codeExpiresAt: claim.codeExpiresAt,
        codeAttempts: claim.codeAttempts,
      },
    });
  }
  return { sent, code };
}

export type CodeCheck =
  | { ok: true }
  | { ok: false; reason: "missing" | "verified" | "expired" | "locked" | "wrong"; remaining?: number };

export async function checkClaimCode(claimId: string, input: string): Promise<CodeCheck> {
  const claim = await db.claimRequest.findUnique({ where: { id: claimId } });
  if (claim?.emailVerifiedAt) return { ok: false, reason: "verified" };
  if (!claim || !claim.codeHash) return { ok: false, reason: "missing" };
  if (claim.codeAttempts >= MAX_ATTEMPTS) return { ok: false, reason: "locked" };
  if (!claim.codeExpiresAt || claim.codeExpiresAt < new Date()) return { ok: false, reason: "expired" };

  const code = input.replace(/\D/g, "");
  const expected = Buffer.from(claim.codeHash, "hex");
  const actual = Buffer.from(hashCode(claim.id, code), "hex");
  const matches = code.length === 6 && expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    const attempts = claim.codeAttempts + 1;
    await db.claimRequest.update({ where: { id: claim.id }, data: { codeAttempts: attempts } });
    return attempts >= MAX_ATTEMPTS
      ? { ok: false, reason: "locked" }
      : { ok: false, reason: "wrong", remaining: MAX_ATTEMPTS - attempts };
  }

  await db.claimRequest.update({
    where: { id: claim.id },
    data: {
      emailVerifiedAt: new Date(),
      codeHash: null,
      codeExpiresAt: null,
      // Email proven; an editor still confirms the match before approving.
      status: claim.status === "SUBMITTED" ? "VERIFYING" : claim.status,
    },
  });
  return { ok: true };
}

/** Whether the claim address is on the same domain as the business website. */
export function emailMatchesWebsite(email: string, website: string | null | undefined): boolean | null {
  if (!website) return null;
  let host = "";
  try {
    host = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.toLowerCase();
  } catch {
    return null;
  }
  host = host.replace(/^www\./, "");
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return Boolean(domain) && (domain === host || domain.endsWith(`.${host}`) || host.endsWith(`.${domain}`));
}
