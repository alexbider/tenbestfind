import { NextResponse } from "next/server";
import { grantListingAccess, LOGIN_PATH, openSession, PORTAL_PATH } from "@/lib/client-accounts";
import { db } from "@/lib/db";
import { getStripe, siteUrl } from "@/lib/stripe";
import { routes } from "@/lib/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How long after checkout the return link may sign someone in. */
const SIGN_IN_WINDOW_MS = 60 * 60 * 1000;

/**
 * Where Stripe sends a new listing's buyer after paying. Stripe confirms the
 * payment, the buyer's owner account is set up (if the webhook has not done it
 * already), and a brand-new owner is signed straight in to the portal.
 *
 * Signing in from this link happens once: only for an owner account that has
 * never signed in and has no password yet, so an old or shared return link
 * leads to the sign-in page instead.
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session");
  const go = (path: string) => NextResponse.redirect(siteUrl(path), 303);
  const receipt = sessionId
    ? `${routes.addBusiness()}complete/?session=${encodeURIComponent(sessionId)}`
    : `${routes.addBusiness()}complete/`;
  if (!sessionId) return go(receipt);

  const subscription = await db.subscription.findFirst({
    where: { stripeCheckoutId: sessionId },
    include: { plan: true },
  });
  if (!subscription || subscription.plan.key !== "listing") return go(receipt);

  try {
    const remote = await (await getStripe()).checkout.sessions.retrieve(sessionId);
    if (remote.status !== "complete") return go(receipt);

    const owner = await grantListingAccess(subscription.id);
    if (!owner) return go(receipt);

    const fresh = Date.now() - remote.created * 1000 < SIGN_IN_WINDOW_MS;
    const firstVisit = owner.role === "BUSINESS_OWNER" && !owner.passwordHash && !owner.lastLoginAt;
    if (fresh && firstVisit) {
      await openSession(owner);
      return go(`${PORTAL_PATH}?welcome=1`);
    }
    return go(LOGIN_PATH);
  } catch (error) {
    console.error("[billing-return] could not finish:", error instanceof Error ? error.message : error);
    return go(receipt);
  }
}
