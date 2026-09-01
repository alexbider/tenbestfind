import { db } from "./db";

export type Window = 7 | 30 | 90;

function startOf(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(0, 0, 0, 0);
  return date;
}

export type Totals = {
  impressions: number;
  profileViews: number;
  websiteClicks: number;
  phoneClicks: number;
  quoteClicks: number;
  directionsClicks: number;
};

const EMPTY: Totals = {
  impressions: 0,
  profileViews: 0,
  websiteClicks: 0,
  phoneClicks: 0,
  quoteClicks: 0,
  directionsClicks: 0,
};

/**
 * Totals come from the nightly rollup table rather than the raw event log, so
 * the admin dashboards stay fast as the event table grows.
 */
export async function totalsFor(window: Window, businessId?: string): Promise<Totals> {
  const rows = await db.businessDailyStat.aggregate({
    where: { date: { gte: startOf(window) }, ...(businessId ? { businessId } : {}) },
    _sum: {
      impressions: true,
      profileViews: true,
      websiteClicks: true,
      phoneClicks: true,
      quoteClicks: true,
      directionsClicks: true,
    },
  });
  return {
    impressions: rows._sum.impressions ?? 0,
    profileViews: rows._sum.profileViews ?? 0,
    websiteClicks: rows._sum.websiteClicks ?? 0,
    phoneClicks: rows._sum.phoneClicks ?? 0,
    quoteClicks: rows._sum.quoteClicks ?? 0,
    directionsClicks: rows._sum.directionsClicks ?? 0,
  };
}

/** The equivalent window immediately before, for period-over-period deltas. */
export async function previousTotals(window: Window, businessId?: string): Promise<Totals> {
  const rows = await db.businessDailyStat.aggregate({
    where: {
      date: { gte: startOf(window * 2), lt: startOf(window) },
      ...(businessId ? { businessId } : {}),
    },
    _sum: {
      impressions: true,
      profileViews: true,
      websiteClicks: true,
      phoneClicks: true,
      quoteClicks: true,
      directionsClicks: true,
    },
  });
  return {
    impressions: rows._sum.impressions ?? 0,
    profileViews: rows._sum.profileViews ?? 0,
    websiteClicks: rows._sum.websiteClicks ?? 0,
    phoneClicks: rows._sum.phoneClicks ?? 0,
    quoteClicks: rows._sum.quoteClicks ?? 0,
    directionsClicks: rows._sum.directionsClicks ?? 0,
  };
}

export async function dailySeries(window: Window, businessId?: string) {
  const rows = await db.businessDailyStat.findMany({
    where: { date: { gte: startOf(window) }, ...(businessId ? { businessId } : {}) },
    orderBy: { date: "asc" },
  });

  const byDate = new Map<string, number>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + row.profileViews);
  }

  const series: { date: string; value: number }[] = [];
  for (let index = window - 1; index >= 0; index -= 1) {
    const date = startOf(index).toISOString().slice(0, 10);
    series.push({ date, value: byDate.get(date) ?? 0 });
  }
  return series;
}

export async function topBusinesses(window: Window, take = 8) {
  const grouped = await db.businessDailyStat.groupBy({
    by: ["businessId"],
    where: { date: { gte: startOf(window) } },
    _sum: { profileViews: true, websiteClicks: true, phoneClicks: true },
    orderBy: { _sum: { profileViews: "desc" } },
    take,
  });

  const businesses = await db.business.findMany({
    where: { id: { in: grouped.map((row) => row.businessId) } },
    select: { id: true, name: true, slug: true, city: { select: { name: true } } },
  });
  const lookup = new Map(businesses.map((business) => [business.id, business]));

  return grouped.map((row) => ({
    business: lookup.get(row.businessId),
    profileViews: row._sum.profileViews ?? 0,
    contactActions: (row._sum.websiteClicks ?? 0) + (row._sum.phoneClicks ?? 0),
  }));
}

/** Monthly recurring revenue from active subscriptions. */
export async function monthlyRecurringRevenue() {
  const subscriptions = await db.subscription.findMany({
    where: { status: { in: ["ACTIVE", "PAST_DUE"] } },
    include: { plan: true },
  });
  return subscriptions.reduce(
    (total, subscription) => total + subscription.plan.priceCents * subscription.quantity,
    0,
  );
}

export const EMPTY_TOTALS = EMPTY;
