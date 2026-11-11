import "server-only";
import { ownedBusinesses, type SessionUser } from "./auth";
import { db } from "./db";
import { TOP10_PLAN_KEY } from "./top10";

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

/**
 * What the billing page may offer a business. "Restart" brings back the last
 * plan when nothing is paid for; "Add Top 10" is for a business with a live
 * profile plan and no Top 10 yet. The page and the server actions both ask
 * here, so a forged form cannot start a checkout the page would not show.
 */
export async function billingOptions(businessId: string) {
  const [business, subscriptions] = await Promise.all([
    db.business.findUnique({
      where: { id: businessId },
      select: { status: true, cityId: true, categoryId: true },
    }),
    db.subscription.findMany({
      where: { businessId, status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      include: { plan: { select: { key: true, name: true, active: true, interval: true } } },
    }),
  ]);
  if (!business) return { restart: null, top10: null };

  const live = subscriptions.filter((row) => row.status === "ACTIVE" || row.status === "PAST_DUE");
  const restartable = (row: (typeof subscriptions)[number]) =>
    row.plan.active && (row.plan.interval === "month" || row.plan.interval === "year");

  // Prefer the profile plan they had over a lone Top 10 when bringing one back.
  const last =
    subscriptions.find((row) => restartable(row) && row.plan.key !== TOP10_PLAN_KEY) ??
    subscriptions.find(restartable);
  const restart =
    live.length === 0 && last
      ? {
          planKey: last.plan.key,
          planName: last.plan.name,
          scopeCityId: last.scopeCityId ?? undefined,
          scopeCategoryId: last.scopeCategoryId ?? undefined,
        }
      : null;

  const hasProfilePlan = live.some((row) => row.plan.key !== TOP10_PLAN_KEY);
  const hasTop10 = live.some((row) => row.plan.key === TOP10_PLAN_KEY);
  let top10: { cityId: string; categoryId: string } | { unavailable: string } | null = null;
  if (hasProfilePlan && !hasTop10) {
    if (business.status !== "PUBLISHED") {
      top10 = { unavailable: "Top 10 placement opens once your listing is published." };
    } else if (!business.cityId) {
      top10 = { unavailable: "Top 10 placement needs a city on your listing. Contact us to set one." };
    } else {
      // One Featured Partner per city and trade.
      const holder = await db.sponsoredPlacement.findFirst({
        where: { cityId: business.cityId, categoryId: business.categoryId, status: "ACTIVE", NOT: { businessId } },
        select: { id: true },
      });
      top10 = holder
        ? { unavailable: "Another company already holds the Top 10 placement for your city and trade." }
        : { cityId: business.cityId, categoryId: business.categoryId };
    }
  }

  return { restart, top10 };
}
