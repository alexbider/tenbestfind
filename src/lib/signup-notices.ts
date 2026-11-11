import "server-only";
import { claimReference, issueClaimCode, METHOD_LABEL } from "./claim-codes";
import { db } from "./db";
import { alertNewClaim, alertNewListing, sendClaimReceived } from "./notify";

/**
 * The emails a signup sends once it is paid for, never before. Someone who
 * fills in a form and leaves at the payment page has not claimed or submitted
 * anything yet, so neither they nor the team hear about it.
 *
 * A new listing's own email (payment received, plus the login) is sent by
 * grantListingAccess; this adds the team alert. A claim gets its receipt, or
 * the email verification code, plus the team alert.
 */
export async function announcePaidSignup(subscriptionId: string) {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, business: { include: { category: true } } },
  });
  if (!subscription) return;

  const claim = await db.claimRequest.findFirst({ where: { subscriptionId } });
  if (claim) {
    await Promise.allSettled([
      claim.verificationMethod === "EMAIL" && !claim.emailVerifiedAt
        ? issueClaimCode(claim.id)
        : sendClaimReceived({
            to: claim.ownerEmail,
            ownerName: claim.ownerName,
            businessName: claim.businessName,
            reference: claimReference(claim.id),
            method: METHOD_LABEL[claim.verificationMethod] ?? claim.verificationMethod,
          }),
      alertNewClaim({
        businessName: claim.businessName,
        ownerName: claim.ownerName,
        ownerEmail: claim.ownerEmail,
        role: claim.role,
        method: METHOD_LABEL[claim.verificationMethod] ?? claim.verificationMethod,
        plans: subscription.plan.name,
        claimId: claim.id,
      }),
    ]);
    return;
  }

  if (subscription.plan.key === "listing") {
    const { business } = subscription;
    const submission = await db.submission.findFirst({
      where: { kind: "BUSINESS", payload: { contains: `"businessId":"${business.id}"` } },
      orderBy: { createdAt: "desc" },
    });
    await alertNewListing({
      businessName: business.name,
      businessId: business.id,
      contactName: submission?.name ?? "",
      contactEmail: submission?.email ?? business.email ?? "",
      category: business.category?.name ?? "",
      website: business.website,
    }).catch(() => null);
  }
}
