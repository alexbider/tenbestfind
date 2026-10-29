"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { startOneTimeCheckout } from "@/lib/billing";
import { db } from "@/lib/db";
import { GUEST_POST_KIND, GUEST_POST_PLAN_KEY, guestPostBrief, guestPostLinks, guestPostSchema } from "@/lib/guest-post";
import { stripeConfigured } from "@/lib/stripe";
import { routes } from "@/lib/urls";

export type GuestPostState = { status: "idle" | "ok" | "error"; message?: string; errors?: Record<string, string> };

/**
 * Records a guest post order and, when payment is configured, hands the
 * customer to a one-time Checkout. The order is reviewed by an editor only
 * after the webhook marks it paid, and the post carries a Sponsored label.
 */
export async function submitGuestPost(_prev: GuestPostState, formData: FormData): Promise<GuestPostState> {
  const parsed = guestPostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", errors };
  }
  const data = parsed.data;

  const plan = await db.plan.findUnique({ where: { key: GUEST_POST_PLAN_KEY } });
  if (!plan || !plan.active) {
    return { status: "error", message: "Guest posts are not available right now. Nothing was charged." };
  }

  const order = await db.submission.create({
    data: {
      kind: GUEST_POST_KIND,
      subject: "Guest post order",
      email: data.email,
      name: data.name,
      message: data.topic,
      payload: JSON.stringify({
        business: data.business,
        topic: data.topic,
        links: guestPostLinks(data),
        brief: guestPostBrief(data),
        payment: { state: "awaiting_payment" },
      }),
      status: "NEW",
    },
  });

  let checkoutUrl: string | null;
  try {
    checkoutUrl = await startOneTimeCheckout({
      planKey: GUEST_POST_PLAN_KEY,
      orderId: order.id,
      email: data.email,
      name: data.name,
      successPath: `${routes.guestPost()}complete/`,
      cancelPath: routes.guestPost(),
    });
  } catch (error) {
    console.error("[guest-post] checkout failed:", error instanceof Error ? error.message : error);
    return { status: "error", message: "We could not open the secure checkout just now. Nothing was charged. Please try again in a minute." };
  }

  revalidatePath(routes.admin("/submissions"));

  if (checkoutUrl) redirect(checkoutUrl);

  // Payment is not configured here, so the order is kept and an editor takes payment by hand.
  await db.submission.update({
    where: { id: order.id },
    data: {
      payload: JSON.stringify({
        business: data.business,
        topic: data.topic,
        links: guestPostLinks(data),
        brief: guestPostBrief(data),
        payment: { state: "recorded" },
      }),
    },
  });
  return {
    status: "ok",
    message: (await stripeConfigured())
      ? "Order recorded. Payment could not be opened, so an editor will contact you."
      : "Order recorded. Payment is not configured on this environment, so an editor will contact you before anything is charged.",
  };
}
