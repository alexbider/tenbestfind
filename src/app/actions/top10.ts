"use server";

import { redirect } from "next/navigation";
import { startCheckout } from "@/lib/billing";
import { db } from "@/lib/db";
import { top10Eligibility, top10Schema, TOP10_PLAN_KEY } from "@/lib/top10";
import { stripeConfigured } from "@/lib/stripe";
import { routes } from "@/lib/urls";

export type Top10State = { status: "idle" | "ok" | "error"; message?: string; errors?: Record<string, string> };

/**
 * Opens a Top 10 subscription scoped to one city and trade. The placement
 * itself is created by the webhook once the subscription is active, so a
 * closed checkout never shows a sponsored box. Nothing here touches a ranking.
 */
export async function submitTop10(_prev: Top10State, formData: FormData): Promise<Top10State> {
  const parsed = top10Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", errors };
  }
  const data = parsed.data;

  const business = await db.business.findUnique({ where: { slug: data.businessSlug } });
  if (!business) return { status: "error", message: "We could not find that business.", errors: { businessSlug: "Choose a business from the list." } };

  const problem = top10Eligibility(business, data);
  if (problem) return { status: "error", message: problem };

  // One Featured Partner per city and trade. Refuse before taking a payment.
  const taken = await db.sponsoredPlacement.findFirst({
    where: { status: "ACTIVE", cityId: data.cityId, categoryId: data.categoryId },
    select: { id: true },
  });
  if (taken) {
    return { status: "error", message: "This city and trade already has a Featured Partner. Choose another city or trade." };
  }

  let checkout;
  try {
    checkout = await startCheckout({
      businessId: business.id,
      planKey: TOP10_PLAN_KEY,
      email: data.email,
      name: data.name,
      scopeCityId: data.cityId,
      scopeCategoryId: data.categoryId,
      successPath: `${routes.top10()}complete/`,
      cancelPath: routes.top10(),
    });
  } catch (error) {
    console.error("[top10] checkout failed:", error instanceof Error ? error.message : error);
    return { status: "error", message: "We could not open the secure checkout just now. Nothing was charged. Please try again in a minute." };
  }

  if (checkout.mode === "stripe") redirect(checkout.url);

  return {
    status: "ok",
    message: (await stripeConfigured())
      ? "Order recorded."
      : "Order recorded. Payment is not configured on this environment, so an editor will complete it by hand. Nothing was charged.",
  };
}
