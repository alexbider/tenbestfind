import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { startCheckout } from "./billing";
import { db } from "./db";
import { money } from "./format";
import { sendFinishSignup } from "./notify";
import { siteUrl } from "./stripe";
import { routes } from "./urls";

/**
 * Finishing a signup that stopped before payment.
 *
 * The email carries a link to the site, not to Stripe: a Checkout page expires
 * after a day, so the link opens a fresh one for the saved subscription each
 * time it is followed. The link is signed, so it only works for the
 * subscription it was made for.
 */

function sign(subscriptionId: string): string {
  const secret = process.env.SESSION_SECRET ?? "tenbestfind-dev-secret";
  return createHmac("sha256", secret).update(`finish-signup:${subscriptionId}`).digest("base64url").slice(0, 32);
}

export function finishSignupToken(subscriptionId: string): string {
  return `${subscriptionId}.${sign(subscriptionId)}`;
}

/** The subscription id a token was made for, or null when it is not genuine. */
export function readFinishSignupToken(token: string): string | null {
  const [id, mac] = token.split(".");
  if (!id || !mac) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

export function finishSignupUrl(subscriptionId: string): string {
  return siteUrl(`/billing/finish/${finishSignupToken(subscriptionId)}/`);
}

/** Where each plan's checkout returns to, matching the forms that start it. */
function pathsFor(planKey: string) {
  if (planKey === "listing") return { successPath: `${routes.addBusiness()}complete/`, cancelPath: routes.addBusiness() };
  if (planKey === "top10") return { successPath: `${routes.top10()}complete/`, cancelPath: routes.top10() };
  return { successPath: `${routes.claim()}complete/`, cancelPath: routes.claim() };
}

type Loaded = Awaited<ReturnType<typeof findSubscription>>;

function findSubscription(subscriptionId: string) {
  return db.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true, business: true } });
}

async function loadUnfinished(
  subscriptionId: string,
): Promise<{ error: string; subscription: Loaded } | { subscription: NonNullable<Loaded> }> {
  const subscription = await findSubscription(subscriptionId);
  if (!subscription) return { error: "That signup no longer exists.", subscription: null };
  if (subscription.business.status === "ARCHIVED" || subscription.business.status === "REJECTED") {
    return { error: "That listing is no longer being considered.", subscription: null };
  }
  if (subscription.status !== "PENDING" || subscription.stripeSubscriptionId) {
    return { error: "That signup has already been completed.", subscription };
  }
  return { subscription };
}

/** Who to write to: the person who claimed or submitted, else the listing's email. */
async function contactFor(subscriptionId: string, businessId: string, businessEmail: string | null) {
  const claim = await db.claimRequest.findFirst({
    where: { subscriptionId },
    orderBy: { submittedAt: "desc" },
  });
  if (claim) return { email: claim.ownerEmail, name: claim.ownerName };

  const submission = await db.submission.findFirst({
    where: { kind: "BUSINESS", payload: { contains: businessId } },
    orderBy: { createdAt: "desc" },
  });
  if (submission?.email) return { email: submission.email, name: submission.name };

  return businessEmail ? { email: businessEmail, name: null } : null;
}

/** A new listing is charged on publish; everything else is charged at checkout. */
function chargedOnPublish(planKey: string, businessStatus: string) {
  return planKey === "listing" && businessStatus !== "PUBLISHED";
}

/**
 * Opens a fresh Checkout page for an unfinished signup and returns its URL.
 * startCheckout picks up the PENDING row it belongs to, so no new record is made.
 */
export async function resumeSignupCheckout(subscriptionId: string): Promise<{ url: string } | { error: string; done?: boolean }> {
  const loaded = await loadUnfinished(subscriptionId);
  if ("error" in loaded) return { error: loaded.error, done: Boolean(loaded.subscription) };
  const { subscription } = loaded;
  const contact = await contactFor(subscription.id, subscription.businessId, subscription.business.email);
  if (!contact) return { error: "There is no email address on that signup." };

  const result = await startCheckout({
    businessId: subscription.businessId,
    planKey: subscription.plan.key,
    email: contact.email,
    name: contact.name ?? undefined,
    quantity: subscription.quantity,
    scopeCityId: subscription.scopeCityId ?? undefined,
    scopeCategoryId: subscription.scopeCategoryId ?? undefined,
    trialUntilPublished: chargedOnPublish(subscription.plan.key, subscription.business.status),
    ...pathsFor(subscription.plan.key),
  });
  if (result.mode !== "stripe") return { error: "Online payment is not available just now." };
  return { url: result.url };
}

/** Emails the finish-signup link. Returns the address it went to. */
export async function sendFinishSignupEmail(subscriptionId: string): Promise<{ sentTo: string }> {
  const loaded = await loadUnfinished(subscriptionId);
  if ("error" in loaded) throw new Error(loaded.error);
  const { subscription } = loaded;
  const contact = await contactFor(subscription.id, subscription.businessId, subscription.business.email);
  if (!contact) throw new Error("There is no email address on that signup.");

  const { plan } = subscription;
  const interval = plan.interval === "year" ? " / year" : plan.interval === "month" ? " / month" : "";
  const sent = await sendFinishSignup({
    to: contact.email,
    contactName: contact.name,
    businessName: subscription.business.name,
    planName: plan.name,
    amount: `${money(plan.priceCents * subscription.quantity, plan.currency)}${interval}`,
    finishUrl: finishSignupUrl(subscription.id),
    chargedOnPublish: chargedOnPublish(plan.key, subscription.business.status),
  });
  if (!sent) throw new Error("The email could not be sent. Check the Resend key under Admin, Integrations.");
  return { sentTo: contact.email };
}
