import "server-only";
import { audit, createSession, type SessionUser } from "./auth";
import { expiresFor, hashToken, newToken, type TokenPurpose } from "./auth-tokens";
import { db } from "./db";
import type { UserRole } from "./enums";
import { emailLayout, esc, sendMail } from "./mail";
import { siteUrl } from "./stripe";

/**
 * Turns a paid, email-confirmed claim into a verified owner account, and gives
 * the owner the ways back in: a password, an emailed sign-in link, or Google.
 */

export const PORTAL_PATH = "/portal/";
export const LOGIN_PATH = "/login/";

const FOOTER =
  "TenBestFind publishes researched shortlists of local service companies. A subscription buys profile management and never a ranking position.";

/** The owner account for a claim's address. Staff keep their own role. */
export async function ownerAccountFor(email: string, name: string) {
  const address = email.toLowerCase().trim();
  const existing = await db.user.findUnique({ where: { email: address } });
  if (existing) return existing;
  return db.user.create({
    data: { email: address, name, role: "BUSINESS_OWNER", passwordHash: "", active: true },
  });
}

/**
 * Marks a claim verified once both halves are true: the subscription is paid
 * (the webhook has made it ACTIVE) and the buyer has confirmed the email code.
 * Runs from whichever of the two happens second, so the order does not matter.
 */
export async function approveClaimIfReady(claimId: string) {
  const claim = await db.claimRequest.findUnique({ where: { id: claimId } });
  if (!claim || !claim.businessId || !claim.subscriptionId || !claim.emailVerifiedAt) return null;
  if (claim.status === "APPROVED" || claim.status === "REJECTED") return null;

  const subscription = await db.subscription.findUnique({ where: { id: claim.subscriptionId } });
  if (!subscription || subscription.status !== "ACTIVE") return null;

  const owner = await ownerAccountFor(claim.ownerEmail, claim.ownerName);

  await db.claimRequest.update({
    where: { id: claim.id },
    data: { status: "APPROVED", reviewedAt: new Date(), userId: owner.id },
  });
  await db.business.update({
    where: { id: claim.businessId },
    data: { claimed: true, ownerId: owner.id },
  });
  await audit({
    userId: owner.id,
    action: "approve",
    entityType: "claim",
    entityId: claim.id,
    summary: `${claim.businessName} verified automatically after payment and email confirmation`,
  });

  if (!owner.passwordHash) {
    try {
      await sendAccessEmail(owner, "SET_PASSWORD");
    } catch (error) {
      console.error("[client-accounts] password email not sent:", error instanceof Error ? error.message : error);
    }
  }
  return owner;
}

/** Emails a one-time link. The token lives only in the email and as a hash in the database. */
export async function sendAccessEmail(user: { id: string; email: string; name: string }, purpose: TokenPurpose) {
  const token = newToken();
  await db.authToken.create({
    data: { userId: user.id, purpose, tokenHash: hashToken(token), expiresAt: expiresFor(purpose) },
  });

  const isSetup = purpose === "SET_PASSWORD";
  const link = siteUrl(isSetup ? `/account/set-password/?token=${token}` : `/account/sign-in/?token=${token}`);
  const first = user.name.split(" ")[0] || "there";
  const intro = isSetup
    ? "Your claim is verified and your TenBestFind account is ready. Choose a password to sign in to your dashboard whenever you need it."
    : "Use this link to sign in to your TenBestFind dashboard. It works once and expires in 15 minutes.";
  const cta = isSetup ? "Create my password" : "Sign me in";

  const html = emailLayout({
    heading: isSetup ? "Create your password" : "Sign in to TenBestFind",
    body: `<p style="margin:0 0 14px;">Hi ${esc(first)},</p>
<p style="margin:0 0 14px;">${esc(intro)}</p>
<p style="margin:22px 0 6px;"><a href="${esc(link)}" style="display:inline-block;background:#2D74D7;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px;">${esc(cta)}</a></p>
<p style="margin:14px 0 0;font-size:13px;color:#7b8798;">If you did not ask for this, you can ignore it.</p>`,
    footer: FOOTER,
  });
  const text = `Hi ${first},\n\n${intro}\n\n${link}\n\nIf you did not ask for this, you can ignore it.`;

  await sendMail({
    to: user.email,
    subject: isSetup ? "Create your TenBestFind password" : "Your TenBestFind sign-in link",
    html,
    text,
  });
}

/**
 * Checks a one-time link and spends it. A link works once; a second use, a
 * wrong purpose or an expired token all return null.
 */
export async function consumeAuthToken(token: string, purpose: TokenPurpose) {
  if (!token) return null;
  const row = await db.authToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt < new Date()) return null;
  if (!row.user.active) return null;

  const { count } = await db.authToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return count === 1 ? row.user : null;
}

/** Opens a session in a server action or page. Sets the cookie and records the sign-in. */
export async function openSession(user: { id: string; email: string; name: string; role: string }) {
  const session: SessionUser = { id: user.id, email: user.email, name: user.name, role: user.role as UserRole };
  await createSession(session);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ userId: user.id, action: "login", entityType: "user", entityId: user.id, summary: "owner sign-in" });
}
