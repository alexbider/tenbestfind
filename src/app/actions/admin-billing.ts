"use server";

import { revalidatePath } from "next/cache";
import {
  billingPortalUrl,
  cancelSubscription,
  chargeOnPublish,
  refundAndCancel,
  resumeSubscription,
  syncPlanToStripe,
} from "@/lib/billing";
import { audit, requireAdmin, requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export type BillingState = { status: "idle" | "ok" | "error"; message?: string; url?: string };

const ok = (message: string, url?: string): BillingState => ({ status: "ok", message, url });
const fail = (message: string): BillingState => ({ status: "error", message });

function describe(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong talking to Stripe.";
}

/** Mirrors every priced plan into Stripe as a product and price. */
export async function syncPlans(_prev: BillingState): Promise<BillingState> {
  const user = await requireAdmin();
  const plans = await db.plan.findMany({ where: { active: true, NOT: { interval: "quote" } } });

  const results: string[] = [];
  for (const plan of plans) {
    try {
      const { priceId } = await syncPlanToStripe(plan.id);
      results.push(`${plan.name} → ${priceId}`);
    } catch (error) {
      return fail(`${plan.name}: ${describe(error)}`);
    }
  }

  await audit({
    userId: user.id,
    action: "sync",
    entityType: "plan",
    summary: `${results.length} plans synced to Stripe`,
  });
  revalidatePath("/admin/packages");
  return ok(`Synced ${results.length} ${results.length === 1 ? "plan" : "plans"} to Stripe.`);
}

export async function cancelSubscriptionAction(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const immediately = formData.get("immediately") === "1";
  await cancelSubscription(id, immediately);
  await audit({
    userId: user.id,
    action: "cancel",
    entityType: "subscription",
    entityId: id,
    summary: immediately ? "Cancelled immediately" : "Cancels at period end",
  });
  revalidatePath("/admin/subscriptions");
}

export async function resumeSubscriptionAction(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  await resumeSubscription(id);
  await audit({ userId: user.id, action: "resume", entityType: "subscription", entityId: id });
  revalidatePath("/admin/subscriptions");
}

/** Refunds and cancels, used when a claim is rejected after payment. */
export async function refundSubscriptionAction(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  await refundAndCancel(id, String(formData.get("reason") ?? "Editorial decision"));
  await audit({
    userId: user.id,
    action: "refund",
    entityType: "subscription",
    entityId: id,
    summary: "Refunded and cancelled",
  });
  revalidatePath("/admin/subscriptions");
}

/** Opens the Stripe billing portal for a business, for support conversations. */
export async function openBillingPortal(_prev: BillingState, formData: FormData): Promise<BillingState> {
  await requireStaff();
  const businessId = String(formData.get("businessId"));
  try {
    const url = await billingPortalUrl(businessId, `/admin/businesses/${businessId}?tab=billing`);
    if (!url) return fail("This business has no Stripe customer yet.");
    return ok("Portal session created.", url);
  } catch (error) {
    return fail(describe(error));
  }
}

/**
 * Publishing a pending listing is what triggers its first charge, by ending the
 * Stripe trial that has been holding the card.
 */
export async function publishListing(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));

  const business = await db.business.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  try {
    await chargeOnPublish(id);
  } catch (error) {
    // The listing is live either way; a billing fault is recorded, not fatal.
    await audit({
      userId: user.id,
      action: "error",
      entityType: "subscription",
      entityId: id,
      summary: `Charge on publish failed: ${describe(error)}`,
    });
  }

  await audit({
    userId: user.id,
    action: "publish",
    entityType: "business",
    entityId: id,
    summary: `${business.name} published, billing started`,
  });

  revalidatePath(`/companies/${business.slug}/`);
  revalidatePath("/admin/businesses");
}
