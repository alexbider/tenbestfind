import "server-only";
import { chargeOnPublish, refundAndCancel } from "./billing";
import { db } from "./db";
import { sendListingDeclined, sendListingPublished } from "./notify";
import { siteUrl } from "./stripe";
import { routes } from "./urls";

/**
 * What happens when a listing goes live, whichever screen or tool published
 * it: a listing still on the old held-card trial is charged, and whoever submitted the
 * listing hears about it. Only listings that came in through the add-a-business
 * form have a submitter, so an imported or editor-made listing triggers
 * neither. Both steps are best effort and reported back rather than thrown.
 */
export async function onListingPublished(businessId: string): Promise<{ charged: boolean; emailed: boolean; error?: string }> {
  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business) return { charged: false, emailed: false };

  let charged = false;
  let error: string | undefined;
  try {
    charged = await chargeOnPublish(businessId);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Charge on publish failed";
  }

  const submission = await db.submission.findFirst({
    where: { kind: "BUSINESS", payload: { contains: `"businessId":"${business.id}"` } },
    orderBy: { createdAt: "desc" },
  });

  let emailed = false;
  if (submission?.email) {
    emailed = await sendListingPublished({
      to: submission.email,
      contactName: submission.name,
      businessName: business.name,
      url: siteUrl(routes.business(business.slug)),
    });
  }

  return { charged, emailed, error };
}

/**
 * A submitted listing an editor declined. Whatever was paid for it is refunded
 * in full and the plan is closed, then the submitter is told. Imported or
 * editor-made listings have no submitter and nothing happens.
 */
export async function onListingRejected(
  businessId: string,
): Promise<{ emailed: boolean; refunded: boolean; refundFailures: string[] }> {
  const business = await db.business.findUnique({ where: { id: businessId } });
  if (!business) return { emailed: false, refunded: false, refundFailures: [] };

  const submission = await db.submission.findFirst({
    where: { kind: "BUSINESS", payload: { contains: `"businessId":"${business.id}"` } },
    orderBy: { createdAt: "desc" },
  });
  if (!submission?.email) return { emailed: false, refunded: false, refundFailures: [] };

  // Paid (or trialling) plans are refunded and cancelled in Stripe; a signup
  // that never reached payment is simply closed.
  const open = await db.subscription.findMany({
    where: { businessId, status: { in: ["PENDING", "ACTIVE", "PAST_DUE"] } },
  });
  let refunded = false;
  const refundFailures: string[] = [];
  for (const subscription of open) {
    if (!subscription.stripeSubscriptionId) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { status: "CANCELED", canceledAt: new Date() },
      });
      continue;
    }
    try {
      await refundAndCancel(subscription.id, "Listing declined in editorial review");
      refunded = true;
    } catch (error) {
      refundFailures.push(`${subscription.id}: ${error instanceof Error ? error.message : "unknown"}`);
      console.error("[listing-declined] refund failed:", refundFailures.at(-1));
    }
  }

  // The submitter no longer manages a listing that will not be published.
  await db.business.update({ where: { id: businessId }, data: { claimed: false, ownerId: null } });

  const emailed = await sendListingDeclined({
    to: submission.email,
    contactName: submission.name,
    businessName: business.name,
    refunded,
  });
  return { emailed, refunded, refundFailures };
}
