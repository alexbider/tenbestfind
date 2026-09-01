import "server-only";
import { db } from "./db";
import {
  fromUnix,
  getStripe,
  mapInvoiceStatus,
  mapSubscriptionStatus,
  siteUrl,
  stripeConfigured,
  type Stripe,
} from "./stripe";

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

  const stripe = getStripe();

  const product = plan.stripeProductId
    ? await stripe.products.update(plan.stripeProductId, {
        name: plan.name,
        description: plan.description ?? undefined,
      })
    : await stripe.products.create({
        name: plan.name,
        description: plan.description ?? undefined,
        metadata: { planKey: plan.key },
      });

  // Reuse the existing price when the amount and currency still match.
  let priceId = plan.stripePriceId;
  if (priceId) {
    const existing = await stripe.prices.retrieve(priceId).catch(() => null);
    const matches =
      existing &&
      existing.active &&
      existing.unit_amount === plan.priceCents &&
      existing.currency === plan.currency.toLowerCase();
    if (!matches) priceId = null;
  }

  if (!priceId) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceCents,
      currency: plan.currency.toLowerCase(),
      recurring: { interval: plan.interval === "year" ? "year" : "month" },
      metadata: { planKey: plan.key },
    });
    priceId = price.id;
  }

  await db.plan.update({
    where: { id: plan.id },
    data: { stripeProductId: product.id, stripePriceId: priceId, stripeSyncedAt: new Date() },
  });

  return { productId: product.id, priceId };
}

/* --------------------------------------------------------------- customers */

/** Finds or creates the Stripe customer for a business. */
export async function ensureCustomer(businessId: string, email: string, name?: string) {
  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business) throw new Error("Business not found");
  if (business.stripeCustomerId) return business.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name: name ?? business.name,
    metadata: { businessId: business.id, businessSlug: business.slug },
  });

  await db.business.update({ where: { id: business.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
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

  const subscription = await db.subscription.create({
    data: {
      businessId: input.businessId,
      planId: plan.id,
      status: "PENDING",
      quantity: input.quantity ?? 1,
      scopeCityId: input.scopeCityId,
      scopeCategoryId: input.scopeCategoryId,
    },
  });

  // Without keys the intent is recorded and an editor completes it by hand.
  if (!stripeConfigured() || !plan.stripePriceId) {
    return { mode: "recorded", subscriptionId: subscription.id };
  }

  const stripe = getStripe();
  const customerId = await ensureCustomer(input.businessId, input.email, input.name);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: input.quantity ?? 1 }],
    success_url: siteUrl(`${input.successPath}?session={CHECKOUT_SESSION_ID}`),
    cancel_url: siteUrl(input.cancelPath),
    client_reference_id: subscription.id,
    subscription_data: {
      metadata: {
        subscriptionId: subscription.id,
        businessId: input.businessId,
        planKey: plan.key,
      },
      // A listing is not charged until it publishes. Ninety days is the outer
      // bound on editorial review; the webhook ends the trial at publish time.
      ...(input.trialUntilPublished ? { trial_period_days: 90 } : {}),
    },
    metadata: { subscriptionId: subscription.id, businessId: input.businessId },
    allow_promotion_codes: true,
  });

  await db.subscription.update({
    where: { id: subscription.id },
    data: { stripeCustomerId: customerId, stripeCheckoutId: session.id },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { mode: "stripe", url: session.url, subscriptionId: subscription.id };
}

/* ---------------------------------------------------------- billing portal */

export async function billingPortalUrl(businessId: string, returnPath: string) {
  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business?.stripeCustomerId) return null;
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripeCustomerId,
    return_url: siteUrl(returnPath),
  });
  return session.url;
}

/* ------------------------------------------------------ lifecycle actions */

/**
 * Ends the trial on a listing's subscription, which is what makes the first
 * charge happen. Called when an editor publishes a pending listing.
 */
export async function chargeOnPublish(businessId: string) {
  const subscription = await db.subscription.findFirst({
    where: { businessId, status: { in: ["PENDING", "ACTIVE"] }, stripeSubscriptionId: { not: null } },
  });
  if (!subscription?.stripeSubscriptionId || !stripeConfigured()) return;

  const stripe = getStripe();
  const remote = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  if (remote.status !== "trialing") return;

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, { trial_end: "now" });
}

/** Cancels at period end so the business keeps what it paid for. */
export async function cancelSubscription(subscriptionId: string, immediately = false) {
  const subscription = await db.subscription.findUnique({ where: { id: subscriptionId } });
  if (!subscription) throw new Error("Subscription not found");

  if (subscription.stripeSubscriptionId && stripeConfigured()) {
    const stripe = getStripe();
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

  if (subscription.stripeSubscriptionId && stripeConfigured()) {
    const stripe = getStripe();
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

  if (stripeConfigured() && lastPaid?.stripeInvoiceId) {
    const stripe = getStripe();
    const invoice = await stripe.invoices.retrieve(lastPaid.stripeInvoiceId);
    const paymentIntent =
      typeof invoice.payments?.data[0]?.payment?.payment_intent === "string"
        ? invoice.payments.data[0].payment.payment_intent
        : null;
    if (paymentIntent) {
      await stripe.refunds.create({
        payment_intent: paymentIntent,
        reason: "requested_by_customer",
        metadata: { reason },
      });
    }
  }

  if (lastPaid) {
    await db.invoice.update({ where: { id: lastPaid.id }, data: { status: "REFUNDED" } });
  }

  await cancelSubscription(subscriptionId, true);
}

/* ---------------------------------------------------------------- webhooks */

/** Applies one Stripe event. Callers guarantee it has not been applied before. */
export async function applyStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const subscriptionId = session.client_reference_id ?? session.metadata?.subscriptionId;
      if (!subscriptionId) return "no subscription reference on the session";

      const stripeSubscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          stripeSubscriptionId,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripeCheckoutId: null,
          status: "ACTIVE",
          startedAt: new Date(),
        },
      });
      return `activated subscription ${subscriptionId}`;
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
      if (!local) return `no local subscription for ${remote.id}`;

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
      if (!stripeSubscriptionId) return "invoice is not tied to a subscription";

      const local = await db.subscription.findFirst({
        where: { stripeSubscriptionId },
        include: { plan: true },
      });
      if (!local) return `no local subscription for invoice ${invoice.id}`;

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
      }

      return `recorded invoice ${invoice.id} as ${status}`;
    }

    default:
      return null; // not a type we act on
  }
}
