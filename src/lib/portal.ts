import "server-only";
import { ownedBusinesses, type SessionUser } from "./auth";
import { db } from "./db";

// Which company a portal page is about.
//
// One owner usually has one listing, so the common case needs no picker. When
// there are several, the id comes in on the query string, and it is checked
// against what this account actually owns rather than trusted.

export type PortalBusiness = {
  id: string;
  name: string;
  slug: string;
  status: string;
  completeness: number;
};

export async function resolvePortalBusiness(
  user: SessionUser,
  requestedId?: string,
): Promise<{ business: PortalBusiness | null; businesses: PortalBusiness[] }> {
  const businesses = await ownedBusinesses(user);
  if (businesses.length === 0) return { business: null, businesses };

  const chosen = requestedId
    ? (businesses.find((row) => row.id === requestedId) ?? businesses[0])
    : businesses[0];

  return { business: chosen, businesses };
}

/** The current owner's plan, in the words the portal uses to explain it. */
export async function planFor(businessId: string) {
  const subscription = await db.subscription.findFirst({
    where: { businessId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { name: true, priceCents: true, interval: true } } },
  });
  return subscription
    ? { name: subscription.plan.name, status: subscription.status, price: subscription.plan.priceCents }
    : null;
}
