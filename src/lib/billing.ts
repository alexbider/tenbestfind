import "server-only";
import { db } from "./db";
import {
  fromUnix,
  getStripe,
  mapInvoiceStatus,
  mapSubscriptionStatus,
  PRODUCT_PREFIX,
  siteUrl,
  STATEMENT_DESCRIPTOR,
  STRIPE_METADATA,
  stripeConfigured,
  type Stripe,
} from "./stripe";
import { money } from "./format";
import { parseJson } from "./json";
import { parseOrderPayload } from "./guest-post";
import { FEATURED_PARTNER_KIND, TOP10_PLAN_KEY } from "./top10";
import { alertNewSubscription, alertPaymentFailed, sendPaymentFailed, sendPlanEnded } from "./notify";
import { approveClaimIfReady } from "./client-accounts";

/**
 * The internal billing API. Everything that talks to Stripe goes through here,
 * so the flows, the admin and the webhook all share one set of rules and the
 * database stays the source of truth for what the admin displays.
 */

/* ------------------------------------------------------- product catalogue */

/**
 * Mirrors a plan into Stripe as a product plus a price. Prices are immutable in
 * Stripe, so a changed amount creates a new price and repoints the plan; the
 * old price keeps working for subscriptions already on it.
 */
export async function syncPlanToStripe(planId: string) {
  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");
  if (plan.interval === "quote") {
    throw new Error("Quoted plans have no fixed price, so there is nothing to sync.");
  }

  const stripe = await getStripe();

  // The Stripe account is shared, so the product name, the card statement and
  // the metadata all say TenBestFind.
  const productFields = {
    name: `${PRODUCT_PREFIX} ${plan.name}`,
    description: plan.description || undefined,
    statement_descriptor: STATEMENT_DESCRIPTOR,
    metadata: { ...STRIPE_METADATA, planKey: plan.key },
  };
  // A stored id from another Stripe account (or the other mode) no longer
  // exists, so it is replaced rather than left to fail every sync.
  const existingProduct = plan.stripeProductId
    ? await stripe.products.update(plan.stripeProductId, productFields).catch((error) => {
        if (isMissingResource(error)) return null;
        throw error;
      })
    : null;
  const product = existingProduct ?? (await stripe.products.create(productFields));
  if (!existingProduct) plan.stripePriceId = null;

  // Reuse the existing price when the amount, currency and billing shape still match.
  const recurring = plan.interval !== "once";
  let priceId = plan.stripePriceId;
  if (priceId) {
    const existing = await stripe.prices.retrieve(priceId).catch(() => null);
    const matches =
      existing &&
      existing.active &&
      existing.unit_amount === plan.priceCents &&
      existing.currency === plan.currency.toLowerCase() &&
      Boolean(existing.recurring) === recurring;
    if (!matches) priceId = null;
  }

  if (!priceId) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceCents,
      currency: plan.currency.toLowerCase(),
      // A one-time plan (a guest post) has no recurring interval at all.
      ...(recurring ? { recurring: { interval: plan.interval === "year" ? "year" : "month" } } : {}),
      nickname: `${PRODUCT_PREFIX} ${plan.name}`,
      metadata: { ...STRIPE_METADATA, planKey: plan.key },
    });
    priceId = price.id;
  }

  await db.plan.update({
    where: { id: plan.id },
    data: { stripeProductId: product.id, stripePriceId: priceId, stripeSyncedAt: new Date() },
  });

  return { productId: product.id, priceId };
}

/** True for Stripe's "No such product / price / customer" error. */
function isMissingResource(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "resource_missing";
}

/* --------------------------------------------------------------- customers */

/**
 * The Stripe customer a business already has, if any. A new customer is never
 * made up front: Checkout creates one when the payment goes through, so
 * someone who opens the payment page and leaves does not appear in Stripe.
 */
async function existingCustomer(businessId: string): Promise<string | null> {
  const business = await db.business.findUnique({ where: { id: businessId }, select: { stripeCustomerId: true } });
  return business?.stripeCustomerId ?? null;
}

/**
 * Links the customer Checkout created to the business and labels it, since
 * the Stripe account is shared and its customer list must say whose each is.
 */
async function adoptCustomer(businessId: string, customerId: string) {
  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business) return;
  if (!business.stripeCustomerId) {
    await db.business.update({ where: { id: business.id }, data: { stripeCustomerId: customerId } });
  }
  const stripe = await getStripe();
  await stripe.customers
    .update(customerId, {
      description: `${PRODUCT_PREFIX}: ${business.name}`,
      metadata: { ...STRIPE_METADATA, businessId: business.id, businessSlug: business.slug },
    })
    .catch((error) => console.error("[billing] could not label customer:", error instanceof Error ? error.message : error));
}

/* ---------------------------------------------------------------- checkout */

export type CheckoutResult =
  | { mode: "stripe"; url: string; subscriptionId: string }
  | { mode: "recorded"; subscriptionId: string };

/**
 * Opens a Checkout session for a subscription and records a PENDING row against
 * it. The row is promoted to ACTIVE by the webhook, never by the browser
 * returning from Stripe, so a closed tab cannot leave a business unbilled or a
 * subscription falsely active.
 *
 * `trialUntilPublished` holds the card without charging, which is how a new
 * listing works: nothing is taken until an editor publishes it.
 */
export async function startCheckout(input: {
  businessId: string;
  planKey: string;
  email: string;
  name?: string;
  quantity?: number;
  scopeCityId?: string;
  scopeCategoryId?: string;
  trialUntilPublished?: boolean;
  successPath: string;
  cancelPath: string;
}): Promise<CheckoutResult> {
  const plan = await db.plan.findUnique({ where: { key: input.planKey } });
  if (!plan) throw new Error(`Unknown plan: ${input.planKey}`);

  // A retried checkout reuses the PENDING row it left behind rather than
  // stacking another one for the same business and plan.
  const unfinished = await db.subscription.findFirst({
    where: {
      businessId: input.businessId,
      planId: plan.id,
      status: "PENDING",
      stripeSubscriptionId: null,
      scopeCityId: input.scopeCityId ?? null,
      scopeCategoryId: input.scopeCategoryId ?? null,
    },
    orderBy: { createdAt: "desc" },
  });

  const subscription =
    unfinished ??
    (await db.subscription.create({
      data: {
        businessId: input.businessId,
        planId: plan.id,
        status: "PENDING",
        quantity: input.quantity ?? 1,
        scopeCityId: input.scopeCityId,
        scopeCategoryId: input.scopeCategoryId,
      },
    }));

  // Without keys the intent is recorded and an editor completes it by hand.
  if (!(await stripeConfigured()) || !plan.stripePriceId) {
    return { mode: "recorded", subscriptionId: subscription.id };
  }

  const stripe = await getStripe();
  let customerId = await existingCustomer(input.businessId);

  // Close the earlier page so the same row can never be paid for twice.
  if (unfinished?.stripeCheckoutId) {
    await stripe.checkout.sessions.expire(unfinished.stripeCheckoutId).catch(() => null);
  }

  const params = (price: string, customer: string | null): Stripe.Checkout.SessionCreateParams => ({
    mode: "subscription",
    // A returning business pays as its existing customer; anyone else gets one
    // made by Checkout only once they pay.
    ...(customer ? { customer } : { customer_email: input.email }),
    line_items: [{ price, quantity: input.quantity ?? 1 }],
    success_url: siteUrl(`${input.successPath}?session={CHECKOUT_SESSION_ID}`),
    cancel_url: siteUrl(input.cancelPath),
    client_reference_id: subscription.id,
    subscription_data: {
      description: `${PRODUCT_PREFIX} ${plan.name}`,
      metadata: {
        ...STRIPE_METADATA,
        subscriptionId: subscription.id,
        businessId: input.businessId,
        planKey: plan.key,
      },
      // A listing is not charged until it publishes. Ninety days is the outer
      // bound on editorial review; the webhook ends the trial at publish time.
      ...(input.trialUntilPublished ? { trial_period_days: 90 } : {}),
    },
    metadata: { ...STRIPE_METADATA, subscriptionId: subscription.id, businessId: input.businessId },
    allow_promotion_codes: true,
    // Everyone pays in US dollars, wherever they are browsing from.
    adaptive_pricing: { enabled: false },
    // The Stripe account belongs to 2M, LLC, so the checkout page is branded
    // TenBestFind here and says plainly who appears on the receipt.
    branding_settings: {
      display_name: "TenBestFind",
      button_color: "#2D74D7",
      background_color: "#F4F6F9",
      border_style: "rounded",
      font_family: "inter",
      icon: { type: "url", url: siteUrl("/logo-512.png") },
    },
    custom_text: {
      submit: {
        message: "TenBestFind is billed by 2M, LLC. Your card statement shows TENBESTFIND and your receipt comes from 2M, LLC.",
      },
    },
  });

  // A price, product or customer id saved against another Stripe account (or
  // the other mode) is missing here. Recreate whichever one Stripe names and
  // try again, rather than failing every checkout until someone notices.
  let priceId = plan.stripePriceId;
  let session: Stripe.Checkout.Session | undefined;
  for (let attempt = 0; !session; attempt++) {
    try {
      session = await stripe.checkout.sessions.create(params(priceId, customerId));
    } catch (error) {
      if (attempt >= 2 || !isMissingResource(error)) throw error;
      if ((error as { param?: string }).param === "customer") {
        await db.business.update({ where: { id: input.businessId }, data: { stripeCustomerId: null } });
        customerId = null;
      } else {
        priceId = (await syncPlanToStripe(plan.id)).priceId;
      }
    }
  }

  await db.subscription.update({
    where: { id: subscription.id },
    data: { stripeCustomerId: customerId, stripeCheckoutId: session.id },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { mode: "stripe", url: session.url, subscriptionId: subscription.id };
}

/**
 * Opens a one-time Checkout session (payment mode) for a plan with no
 * recurring interval, such as a guest post. The order id travels in the
 * metadata, and the webhook marks the order paid, never the browser return.
 */
export async function startOneTimeCheckout(input: {
  planKey: string;
  orderId: string;
  email: string;
  name?: string;
  successPath: string;
  cancelPath: string;
}): Promise<string | null> {
  const plan = await db.plan.findUnique({ where: { key: input.planKey } });
  if (!plan) throw new Error(`Unknown plan: ${input.planKey}`);
  if (plan.interval !== "once") throw new Error(`${plan.key} is not a one-time plan`);
  if (!(await stripeConfigured()) || !plan.stripePriceId) return null;

  const stripe = await getStripe();
  const params = (price: string): Stripe.Checkout.SessionCreateParams => ({
    mode: "payment",
    customer_email: input.email,
    line_items: [{ price, quantity: 1 }],
    success_url: siteUrl(`${input.successPath}?session={CHECKOUT_SESSION_ID}`),
    cancel_url: siteUrl(input.cancelPath),
    client_reference_id: input.orderId,
    metadata: { ...STRIPE_METADATA, guestPostId: input.orderId, planKey: plan.key },
    payment_intent_data: {
      description: `${PRODUCT_PREFIX} ${plan.name}`,
      statement_descriptor_suffix: "GUEST POST",
      metadata: { ...STRIPE_METADATA, guestPostId: input.orderId, planKey: plan.key },
    },
    adaptive_pricing: { enabled: false },
    branding_settings: {
      display_name: "TenBestFind",
      button_color: "#2D74D7",
      background_color: "#F4F6F9",
      border_style: "rounded",
      font_family: "inter",
      icon: { type: "url", url: siteUrl("/logo-512.png") },
    },
    custom_text: {
      submit: {
        message: "TenBestFind is billed by 2M, LLC. Your card statement shows TENBESTFIND and your receipt comes from 2M, LLC.",
      },
    },
  });

  // A price saved against another Stripe account is recreated once, then retried.
  const session = await stripe.checkout.sessions
    .create(params(plan.stripePriceId))
    .catch(async (error) => {
      if (!isMissingResource(error)) throw error;
      return stripe.checkout.sessions.create(params((await syncPlanToStripe(plan.id)).priceId));
    });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/* ---------------------------------------------------------- billing portal */

/** The setting that holds the TenBestFind billing portal configuration id. */
export const PORTAL_SETTING = "billing.portalConfiguration";

async function portalConfiguration(): Promise<string | undefined> {
  const env = process.env.STRIPE_PORTAL_CONFIGURATION?.trim();
  if (env) return env;
  const row = await db.setting.findUnique({ where: { key: PORTAL_SETTING } });
  const stored = row ? parseJson<string>(row.value, "") : "";
  return typeof stored === "string" && stored.trim() ? stored.trim() : undefined;
}

/**
 * The TenBestFind billing portal configuration, created on first use. The
 * Stripe account is shared with BeautyFind, so its default portal must never
 * be used. A stored id that has gone missing (another account or mode) is
 * replaced, and an existing TenBestFind configuration is reused before a new
 * one is made, so calling this twice never creates a duplicate.
 */
export async function ensurePortalConfiguration(): Promise<string> {
  const stripe = await getStripe();
  const stored = await portalConfiguration();
  if (stored) {
    const existing = await stripe.billingPortal.configurations.retrieve(stored).catch((error) => {
      if (isMissingResource(error)) return null;
      throw error;
    });
    if (existing?.active) return existing.id;
  }

  const listed = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const ours = listed.data.find((row) => row.metadata?.site === STRIPE_METADATA.site);
  const configuration =
    ours ??
    (await stripe.billingPortal.configurations.create({
      name: PRODUCT_PREFIX,
      business_profile: { headline: "TenBestFind" },
      default_return_url: siteUrl("/portal/billing/"),
      features: {
        payment_method_update: { enabled: true },
        invoice_history: { enabled: true },
        subscription_cancel: {
          enabled: true,
          mode: "at_period_end",
          proration_behavior: "none",
          cancellation_reason: {
            enabled: true,
            options: ["too_expensive", "missing_features", "switched_service", "unused", "low_quality", "other"],
          },
        },
        // Plans are changed by starting a new checkout, never in the portal.
        subscription_update: { enabled: false },
      },
      metadata: { ...STRIPE_METADATA },
    }));

  await db.setting.upsert({
    where: { key: PORTAL_SETTING },
    create: { key: PORTAL_SETTING, value: JSON.stringify(configuration.id), groupName: "billing", label: "Stripe billing portal configuration" },
    update: { value: JSON.stringify(configuration.id) },
  });
  return configuration.id;
}

export async function billingPortalUrl(businessId: string, returnPath: string) {
  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business?.stripeCustomerId) return null;
  const stripe = await getStripe();
  // The shared account's default portal belongs to someone else, so ours is
  // always named explicitly.
  const configuration = await ensurePortalConfiguration();
  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripeCustomerId,
    return_url: siteUrl(returnPath),
    configuration,
  });
  return session.url;
}

/* ------------------------------------------------------ lifecycle actions */

/**
 * Ends the trial on a listing's subscription, which is what makes the first
 * charge happen. Called when an editor publishes a pending listing.
 */
export async function chargeOnPublish(businessId: string): Promise<boolean> {
  const subscription = await db.subscription.findFirst({
    where: { businessId, status: { in: ["PENDING", "ACTIVE"] }, stripeSubscriptionId: { not: null } },
  });
  if (!subscription?.stripeSubscriptionId || !(await stripeConfigured())) return false;

  const stripe = await getStripe();
  const remote = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  if (remote.status !== "trialing") return false;

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, { trial_end: "now" });
  return true;
}

/** Cancels at period end so the business keeps what it paid for. */
export async function cancelSubscription(subscriptionId: string, immediately = false) {
  const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription) throw new Error("Subscription not found");

  if (subscription.stripeSubscriptionId && (await stripeConfigured())) {
    const stripe = await getStripe();
    if (immediately) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } else {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  await db.subscription.update({
    where: { id: subscriptionId },
    data: immediately
      ? { status: "CANCELED", canceledAt: new Date(), cancelAtPeriodEnd: false }
      : { cancelAtPeriodEnd: true },
  });
}

export async function resumeSubscription(subscriptionId: string) {
  const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription) throw new Error("Subscription not found");

  if (subscription.stripeSubscriptionId && (await stripeConfigured())) {
    const stripe = await getStripe();
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  await db.subscription.update({
    where: { id: subscriptionId },
    data: { cancelAtPeriodEnd: false, canceledAt: null },
  });
}

/**
 * Refunds the most recent paid invoice on a subscription and cancels it. This
 * is what a rejected ownership claim does: the charge does not stand when we
 * could not verify the claim.
 */
export async function refundAndCancel(subscriptionId: string, reason: string) {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { invoices: { orderBy: { issuedAt: "desc" } } },
  });
  if (!subscription) throw new Error("Subscription not found");

  const lastPaid = subscription.invoices.find((invoice) => invoice.status === "PAID");

  if ((await stripeConfigured()) && lastPaid?.stripeInvoiceId) {
    const stripe = await getStripe();
    const invoice = await stripe.invoices.retrieve(lastPaid.stripeInvoiceId);
    const paymentIntent =
      typeof invoice.payments?.data[0]?.payment?.payment_intent === "string"
        ? invoice.payments.data[0].payment.payment_intent
        : null;
    if (paymentIntent) {
      await stripe.refunds.create({
        payment_intent: paymentIntent,
        reason: "requested_by_customer",
        metadata: { ...STRIPE_METADATA, reason },
      });
    }
  }

  if (lastPaid) {
    await db.invoice.update({ where: { id: lastPaid.id }, data: { status: "REFUNDED" } });
  }

  await cancelSubscription(subscriptionId, true);
}

/**
 * The subscriptions a claim opened: the one recorded on it, plus any opened in
 * the same submission (the Top 10 add-on). Never a subscription another owner
 * already holds on the same business.
 */
export async function claimSubscriptions(claim: { businessId: string | null; subscriptionId: string | null; submittedAt: Date }) {
  if (!claim.businessId) return [];
  const windowEnd = new Date(claim.submittedAt.getTime() + 5 * 60_000);
  return db.subscription.findMany({
    where: {
      businessId: claim.businessId,
      status: { in: ["PENDING", "ACTIVE", "PAST_DUE"] },
      OR: [
        ...(claim.subscriptionId ? [{ id: claim.subscriptionId }] : []),
        { createdAt: { gte: claim.submittedAt, lte: windowEnd } },
      ],
    },
  });
}

/** Refunds and cancels everything a rejected claim opened. Returns any failures. */
export async function refundClaim(claim: { businessId: string | null; subscriptionId: string | null; submittedAt: Date }) {
  const failures: string[] = [];
  for (const open of await claimSubscriptions(claim)) {
    try {
      await refundAndCancel(open.id, "Ownership could not be verified");
    } catch (error) {
      failures.push(`${open.id}: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }
  return failures;
}

/* ------------------------------------------------------ top 10 placement */

/**
 * Shows or ends the Featured Partner box for a Top 10 subscription. It writes
 * only to the placement table, never to a ranking, so payment cannot move a
 * business up or down an editorial list.
 */
async function syncTop10Placement(subscriptionId: string, active: boolean): Promise<string | null> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!subscription || subscription.plan.key !== TOP10_PLAN_KEY) return null;
  const { businessId, scopeCityId: cityId, scopeCategoryId: categoryId } = subscription;
  if (!cityId || !categoryId) return null;

  if (active) {
    const existing = await db.sponsoredPlacement.findFirst({
      where: { businessId, cityId, categoryId, status: "ACTIVE" },
      select: { id: true },
    });
    if (existing) return null;

    // One Featured Partner per city and trade. If another business already holds
    // the slot, this subscription is refused and any money it took is returned.
    const holder = await db.sponsoredPlacement.findFirst({
      where: { cityId, categoryId, status: "ACTIVE", NOT: { businessId } },
      select: { id: true },
    });
    if (holder) {
      await refuseTop10(subscriptionId, subscription.stripeSubscriptionId);
      return `refused a second Top 10 for ${cityId}/${categoryId}; payment returned`;
    }

    await db.sponsoredPlacement.create({
      data: { businessId, cityId, categoryId, kind: FEATURED_PARTNER_KIND, label: "Sponsored", status: "ACTIVE" },
    });
    return null;
  }

  await db.sponsoredPlacement.updateMany({
    where: { businessId, cityId, categoryId, status: "ACTIVE" },
    data: { status: "ENDED", endsAt: new Date() },
  });
  return null;
}

/**
 * Cancels a Top 10 subscription that lost the slot race and refunds every paid
 * invoice on it. Without Stripe keys only the local row is cancelled, and the
 * refund is left for an editor to make by hand.
 */
async function refuseTop10(subscriptionId: string, stripeSubscriptionId: string | null) {
  await cancelSubscription(subscriptionId, true);
  if (!stripeSubscriptionId || !(await stripeConfigured())) return;

  const stripe = await getStripe();
  const paid = await stripe.invoices.list({ subscription: stripeSubscriptionId, status: "paid", limit: 20 });
  for (const invoice of paid.data) {
    const paymentIntent =
      typeof invoice.payments?.data[0]?.payment?.payment_intent === "string"
        ? invoice.payments.data[0].payment.payment_intent
        : null;
    if (paymentIntent) {
      await stripe.refunds.create({
        payment_intent: paymentIntent,
        reason: "requested_by_customer",
        metadata: { ...STRIPE_METADATA, reason: "Featured placement slot already taken" },
      });
    }
    await db.invoice.updateMany({ where: { stripeInvoiceId: invoice.id }, data: { status: "REFUNDED" } });
  }
}

/* ---------------------------------------------------------------- webhooks */

/** Applies one Stripe event. Callers guarantee it has not been applied before. */
export async function applyStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      // A one-time guest post order. Only a paid session marks the order paid.
      if (session.mode === "payment") {
        const orderId = session.metadata?.guestPostId;
        if (!orderId) return null;
        const order = await db.submission.findUnique({ where: { id: orderId } });
        if (!order) return null;
        if (session.payment_status !== "paid") return `guest post ${orderId} not paid yet`;
        const payload = parseOrderPayload(order.payload);
        await db.submission.update({
          where: { id: orderId },
          data: {
            payload: JSON.stringify({
              ...payload,
              payment: { state: "paid", sessionId: session.id, paidAt: new Date().toISOString() },
            }),
          },
        });
        return `marked guest post ${orderId} paid`;
      }

      // The account is shared with other businesses, whose sessions arrive
      // here too. Anything that does not point at one of our rows is ignored.
      const subscriptionId = session.metadata?.subscriptionId ?? session.client_reference_id;
      if (!subscriptionId) return null;
      const ours = await db.subscription.findUnique({ where: { id: subscriptionId } });
      if (!ours) return null;

      const stripeSubscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (stripeCustomerId) await adoptCustomer(ours.businessId, stripeCustomerId);

      await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          stripeSubscriptionId,
          stripeCustomerId,
          status: "ACTIVE",
          startedAt: new Date(),
        },
      });
      // If the owner already confirmed their email, payment is the last step,
      // so the claim is verified here and the owner gets their sign-in email.
      const claim = await db.claimRequest.findFirst({ where: { subscriptionId }, select: { id: true } });
      if (claim) await approveClaimIfReady(claim.id);
      const top10 = await syncTop10Placement(subscriptionId, true);

      if (ours.status !== "ACTIVE") {
        const sold = await db.subscription.findUnique({
          where: { id: subscriptionId },
          include: { plan: true, business: { select: { name: true } } },
        });
        if (sold) {
          await alertNewSubscription({
            businessName: sold.business.name,
            planName: sold.plan.name,
            amount: `${money(sold.plan.priceCents, sold.plan.currency)}/${sold.plan.interval}`,
            businessId: sold.businessId,
          });
        }
      }
      return top10 ?? `activated subscription ${subscriptionId}`;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const remote = event.data.object;
      const local = await db.subscription.findFirst({
        where: {
          OR: [
            { stripeSubscriptionId: remote.id },
            { id: remote.metadata?.subscriptionId ?? "__none__" },
          ],
        },
      });
      if (!local) return null;

      const periodEnd = remote.items.data[0]?.current_period_end;

      await db.subscription.update({
        where: { id: local.id },
        data: {
          stripeSubscriptionId: remote.id,
          status: mapSubscriptionStatus(remote.status),
          currentPeriodEnd: fromUnix(periodEnd),
          cancelAtPeriodEnd: remote.cancel_at_period_end,
          canceledAt: fromUnix(remote.canceled_at),
          startedAt: local.startedAt ?? fromUnix(remote.start_date),
        },
      });
      const nowStatus = mapSubscriptionStatus(remote.status);
      if (nowStatus === "ACTIVE" || nowStatus === "CANCELED") {
        await syncTop10Placement(local.id, nowStatus === "ACTIVE");
      }

      // A plan that has just ended: tell the owner, and if nothing else is
      // still paid for, the listing goes back to an unclaimed editorial
      // profile, as the pricing page promises. The owner keeps their login.
      if (nowStatus === "CANCELED" && local.status !== "CANCELED") {
        await onPlanEnded(local.id);
      }
      return `synced subscription ${local.id} to ${remote.status}`;
    }

    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.finalized": {
      const invoice = event.data.object;
      const stripeSubscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : invoice.parent?.subscription_details?.subscription?.id;
      if (!stripeSubscriptionId) return null;

      const local = await db.subscription.findFirst({
        where: { stripeSubscriptionId },
        include: { plan: true },
      });
      if (!local) return null;

      const status = event.type === "invoice.payment_failed" ? "OPEN" : mapInvoiceStatus(invoice.status);

      await db.invoice.upsert({
        where: { stripeInvoiceId: invoice.id },
        create: {
          subscriptionId: local.id,
          stripeInvoiceId: invoice.id,
          number: invoice.number ?? `STRIPE-${invoice.id.slice(-8).toUpperCase()}`,
          amountCents: invoice.amount_due,
          currency: invoice.currency.toUpperCase(),
          status,
          issuedAt: fromUnix(invoice.created) ?? new Date(),
          paidAt: status === "PAID" ? (fromUnix(invoice.status_transitions?.paid_at) ?? new Date()) : null,
          periodStart: fromUnix(invoice.period_start),
          periodEnd: fromUnix(invoice.period_end),
          hostedUrl: invoice.hosted_invoice_url ?? null,
          pdfUrl: invoice.invoice_pdf ?? null,
        },
        update: {
          status,
          amountCents: invoice.amount_due,
          paidAt: status === "PAID" ? (fromUnix(invoice.status_transitions?.paid_at) ?? new Date()) : null,
          hostedUrl: invoice.hosted_invoice_url ?? null,
          pdfUrl: invoice.invoice_pdf ?? null,
        },
      });

      if (event.type === "invoice.payment_failed") {
        await db.subscription.update({ where: { id: local.id }, data: { status: "PAST_DUE" } });
        const business = await db.business.findUnique({ where: { id: local.businessId } });
        const to = invoice.customer_email ?? business?.email;
        if (to && business) {
          await sendPaymentFailed({
            to,
            businessName: business.name,
            planName: local.plan.name,
            amount: money(invoice.amount_due, invoice.currency.toUpperCase()),
            payUrl: invoice.hosted_invoice_url,
          });
        }
        if (business) {
          await alertPaymentFailed({
            businessName: business.name,
            planName: local.plan.name,
            amount: money(invoice.amount_due, invoice.currency.toUpperCase()),
            businessId: business.id,
          });
        }
      }

      return `recorded invoice ${invoice.id} as ${status}`;
    }

    default:
      return null; // not a type we act on
  }
}


/** Follow-through when a subscription ends, whichever way it ended. */
async function onPlanEnded(subscriptionId: string) {
  const ended = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: true,
      business: { select: { id: true, name: true, slug: true, email: true, owner: { select: { email: true } } } },
    },
  });
  if (!ended) return;

  const stillPaid = await db.subscription.count({
    where: { businessId: ended.businessId, status: { in: ["ACTIVE", "PAST_DUE"] }, id: { not: ended.id } },
  });
  if (stillPaid === 0 && (ended.plan.key === "claim" || ended.plan.key === "listing")) {
    await db.business.update({ where: { id: ended.businessId }, data: { claimed: false } });
  }

  const to = ended.business.owner?.email ?? ended.business.email;
  if (to) {
    await sendPlanEnded({
      to,
      businessName: ended.business.name,
      planName: ended.plan.name,
      profileUrl: siteUrl(`/companies/${ended.business.slug}/`),
    });
  }
}
