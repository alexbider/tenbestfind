import "server-only";
import { chargeOnPublish } from "./billing";
import { db } from "./db";
import { sendListingPublished } from "./notify";
import { siteUrl } from "./stripe";
import { routes } from "./urls";

/**
 * What happens when a listing goes live, whichever screen or tool published
 * it: the held card is charged for the first time, and whoever submitted the
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
