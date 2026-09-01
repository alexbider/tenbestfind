import "server-only";
import Stripe from "stripe";

/**
 * Stripe is optional at runtime. Without keys the app still runs and the
 * subscription flows record intent in the database, which is what the admin
 * reads; the checkout step is simply skipped and surfaced as unconfigured.
 * That keeps local development and CI working without live credentials.
 */
let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function webhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env to enable checkout and billing.",
    );
  }
  if (!client) {
    client = new Stripe(key, {
      // Pin the version so a Stripe-side upgrade cannot change behaviour under us.
      apiVersion: "2026-08-26.dahlia",
      appInfo: { name: "TenBestFind", version: "1.0.0" },
      typescript: true,
      maxNetworkRetries: 2,
      timeout: 15000,
    });
  }
  return client;
}

/** True when the key is a test-mode key, shown in the admin so it is obvious. */
export function isTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

export function siteUrl(path = "/"): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

/** Maps a Stripe subscription status onto ours. */
export function mapSubscriptionStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "PENDING";
  }
}

export function mapInvoiceStatus(status: Stripe.Invoice.Status | null): string {
  switch (status) {
    case "paid":
      return "PAID";
    case "void":
      return "VOID";
    case "uncollectible":
      return "VOID";
    case "open":
      return "OPEN";
    default:
      return "OPEN";
  }
}

export function fromUnix(seconds: number | null | undefined): Date | null {
  return seconds ? new Date(seconds * 1000) : null;
}

export type { Stripe };
