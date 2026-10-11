import "server-only";
import Stripe from "stripe";
import { getSecret, SECRET_KEYS } from "./secrets";

/**
 * Stripe is optional at runtime. Without keys the app still runs and the
 * subscription flows record intent in the database, which is what the admin
 * reads; the checkout step is simply skipped and surfaced as unconfigured.
 * That keeps local development and CI working without live credentials.
 *
 * The keys live in Admin, Integrations, encrypted like every other outbound
 * credential, so they can be set or rotated without touching the server. The
 * environment variables STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET still win
 * when they are set.
 */
let client: Stripe | null = null;
let clientKey: string | null = null;

export async function stripeSecretKey(): Promise<string | null> {
  return getSecret(SECRET_KEYS.stripeSecret);
}

export async function stripeConfigured(): Promise<boolean> {
  return Boolean(await stripeSecretKey());
}

export async function webhookSecret(): Promise<string | null> {
  return getSecret(SECRET_KEYS.stripeWebhook);
}

export async function webhookConfigured(): Promise<boolean> {
  return Boolean(await webhookSecret());
}

export async function getStripe(): Promise<Stripe> {
  const key = await stripeSecretKey();
  if (!key) {
    throw new Error("No Stripe secret key is set. Add it under Admin, Integrations to enable checkout and billing.");
  }
  // A rotated key gets a fresh client rather than the cached one.
  if (!client || clientKey !== key) {
    client = new Stripe(key, {
      // Pin the version so a Stripe-side upgrade cannot change behaviour under us.
      apiVersion: "2026-08-26.dahlia",
      appInfo: { name: "TenBestFind", version: "1.0.0", url: "https://tenbestfind.com" },
      typescript: true,
      maxNetworkRetries: 2,
      timeout: 15000,
    });
    clientKey = key;
  }
  return client;
}

/** True when the key is a test-mode key, shown in the admin so it is obvious. */
export async function isTestMode(): Promise<boolean> {
  const key = (await stripeSecretKey()) ?? "";
  return key.startsWith("sk_test_") || key.startsWith("rk_test_");
}

/**
 * TenBestFind bills through a Stripe account it shares with other businesses,
 * so everything it creates there says whose it is: the product names, this
 * statement descriptor on the card statement, and the metadata Stripe search
 * filters on.
 */
export const STATEMENT_DESCRIPTOR = "TENBESTFIND";
export const STRIPE_METADATA = { site: "tenbestfind" } as const;
export const PRODUCT_PREFIX = "TenBestFind";

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
