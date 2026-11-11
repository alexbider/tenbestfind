import "server-only";
import { db } from "./db";
import { queueForIndexNow } from "./indexnow";
import { parseJson } from "./json";
import { siteUrl } from "./stripe";
import { routes } from "./urls";

/**
 * A paid new listing goes live the moment the payment succeeds. The website
 * check runs afterwards, and anything it doubts is flagged to the team, who
 * keep the listing or take it down with a refund.
 */

export const PUBLISH_ON_PAYMENT_SETTING = "editorial.publishOnPayment";

/** On unless an editor has switched it off in Settings; off means listings wait for an editor. */
export async function publishOnPaymentEnabled(): Promise<boolean> {
  const row = await db.setting.findUnique({ where: { key: PUBLISH_ON_PAYMENT_SETTING } });
  if (!row) {
    // The earlier "auto-approve" switch is replaced by this one.
    await db.setting.deleteMany({ where: { key: "editorial.autoApproveListings" } }).catch(() => null);
    // Make the switch visible on the Settings screen the first time it is read.
    await db.setting
      .create({
        data: {
          key: PUBLISH_ON_PAYMENT_SETTING,
          value: "true",
          groupName: "editorial",
          label: "Publish paid new listings as soon as payment succeeds (the website check then flags problems)",
        },
      })
      .catch(() => null);
    return true;
  }
  return parseJson<unknown>(row.value, true) !== false;
}

/**
 * Publishes a pending listing that has just been paid for. Safe to call more
 * than once: only the first call changes anything. Returns the public URL when
 * the listing is live.
 */
export async function publishPaidListing(businessId: string): Promise<{ live: boolean; url: string | null }> {
  const business = await db.business.findUnique({ where: { id: businessId }, select: { slug: true, status: true, name: true } });
  if (!business) return { live: false, url: null };
  const url = siteUrl(routes.business(business.slug));
  if (business.status === "PUBLISHED") return { live: true, url };
  if (business.status !== "PENDING" || !(await publishOnPaymentEnabled())) return { live: false, url: null };

  const { count } = await db.business.updateMany({
    where: { id: businessId, status: "PENDING" },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  if (count === 1) {
    await db.auditLog.create({
      data: {
        action: "publish",
        entityType: "business",
        entityId: businessId,
        summary: `${business.name} published on payment; the website check follows`,
      },
    });
    await queueForIndexNow([routes.business(business.slug)]).catch(() => 0);
  }
  return { live: true, url };
}
