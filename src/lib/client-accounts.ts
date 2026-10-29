import "server-only";
import { audit, createSession, type SessionUser } from "./auth";
import { expiresFor, hashToken, newToken, type TokenPurpose } from "./auth-tokens";
import { db } from "./db";
import type { UserRole } from "./enums";
import { emailLayout, esc, sendMail, ui } from "./mail";
import { sendClaimApproved, sendClaimDeclined } from "./notify";
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

  await completeClaimApproval(claim.id);
  return owner;
}

/** Emails a one-time link. The token lives only in the email and as a hash in the database. */
export async function sendAccessEmail(
  user: { id: string; email: string; name: string },
  purpose: TokenPurpose,
  variant: "setup" | "reset" = "setup",
) {
  const token = newToken();
  await db.authToken.create({
    data: { userId: user.id, purpose, tokenHash: hashToken(token), expiresAt: expiresFor(purpose) },
  });

  const isSetup = purpose === "SET_PASSWORD";
  const isReset = isSetup && variant === "reset";
  const link = siteUrl(isSetup ? `/account/set-password/?token=${token}` : `/account/sign-in/?token=${token}`);
  const first = user.name.split(" ")[0] || "there";
  const intro = isReset
    ? `Someone asked to reset the password for ${user.email}. If that was you, choose a new one with the button below. If it wasn't, ignore this email and your password stays the same.`
    : isSetup
      ? "Your claim is verified and your TenBestFind account is ready. Choose a password to sign in to your dashboard whenever you need it."
      : "Use this link to sign in to your TenBestFind dashboard. It works once and expires in 15 minutes.";
  const cta = isReset ? "Set a new password" : isSetup ? "Create my password" : "Sign me in";

  const html = emailLayout({
    heading: isReset ? "Reset your password" : isSetup ? "Create your password" : "Sign in to TenBestFind",
    eyebrow: isReset ? "Account security" : "Your dashboard",
    preheader: isSetup ? "This link works once." : "This link works once and expires in 15 minutes.",
    body: `${ui.p(`Hi ${esc(first)},`)}
${ui.p(esc(intro))}
${ui.button(link, cta)}
${ui.muted("If you did not ask for this, you can ignore it. Nobody can get into your account without this link.")}`,
    footer: FOOTER,
  });
  const text = `Hi ${first},\n\n${intro}\n\n${link}\n\nIf you did not ask for this, you can ignore it.`;

  await sendMail({
    to: user.email,
    subject: isReset
      ? "Set a new password for TenBestFind"
      : isSetup
        ? "Create your TenBestFind password"
        : "Your TenBestFind sign-in link",
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


/** A one-time link that lets the owner in: set a password if they have none, otherwise sign in. */
async function accessLink(user: { id: string; passwordHash: string | null }) {
  const purpose: TokenPurpose = user.passwordHash ? "SIGN_IN" : "SET_PASSWORD";
  const token = newToken();
  await db.authToken.create({
    data: { userId: user.id, purpose, tokenHash: hashToken(token), expiresAt: expiresFor(purpose) },
  });
  return {
    url: siteUrl(purpose === "SET_PASSWORD" ? `/account/set-password/?token=${token}` : `/account/sign-in/?token=${token}`),
    needsPassword: purpose === "SET_PASSWORD",
  };
}

/**
 * What an approval has to do however it happens (automatically after payment,
 * by an editor in the admin, or through the connector): link the owner account
 * to the claim and the listing, mark the listing claimed, and email the owner a
 * way in. Without this a hand-approved owner had a claimed listing and no login.
 */
export async function completeClaimApproval(claimId: string) {
  const claim = await db.claimRequest.findUnique({ where: { id: claimId } });
  if (!claim || !claim.businessId) return null;

  const owner = await ownerAccountFor(claim.ownerEmail, claim.ownerName);
  await db.claimRequest.update({ where: { id: claim.id }, data: { userId: owner.id } });
  await db.business.update({ where: { id: claim.businessId }, data: { claimed: true, ownerId: owner.id } });

  try {
    const link = await accessLink(owner);
    await sendClaimApproved({
      to: owner.email,
      ownerName: claim.ownerName,
      businessName: claim.businessName,
      accessUrl: link.url,
      needsPassword: link.needsPassword,
    });
  } catch (error) {
    console.error("[client-accounts] approval email not sent:", error instanceof Error ? error.message : error);
  }
  return owner;
}

/**
 * A rejected claim leaves the listing as it was before anyone claimed it,
 * unless a different claim on the same listing is still approved, and tells
 * the claimant why.
 */
export async function completeClaimRejection(claimId: string, input: { reason?: string | null; refunded: boolean }) {
  const claim = await db.claimRequest.findUnique({ where: { id: claimId } });
  if (!claim) return;

  if (claim.businessId) {
    const stillApproved = await db.claimRequest.count({
      where: { businessId: claim.businessId, status: "APPROVED", id: { not: claim.id } },
    });
    if (stillApproved === 0) {
      await db.business.update({ where: { id: claim.businessId }, data: { claimed: false, ownerId: null } });
    }
  }

  await sendClaimDeclined({
    to: claim.ownerEmail,
    ownerName: claim.ownerName,
    businessName: claim.businessName,
    reason: input.reason,
    refunded: input.refunded,
  });
}
