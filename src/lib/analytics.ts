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
  leads: number;
};

const EMPTY: Totals = {
  impressions: 0,
  profileViews: 0,
  websiteClicks: 0,
  phoneClicks: 0,
  quoteClicks: 0,
  directionsClicks: 0,
  leads: 0,
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
      leads: true,
    },
  });
  return {
    impressions: rows._sum.impressions ?? 0,
    profileViews: rows._sum.profileViews ?? 0,
    websiteClicks: rows._sum.websiteClicks ?? 0,
    phoneClicks: rows._sum.phoneClicks ?? 0,
    quoteClicks: rows._sum.quoteClicks ?? 0,
    directionsClicks: rows._sum.directionsClicks ?? 0,
    leads: rows._sum.leads ?? 0,
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
      leads: true,
    },
  });
  return {
    impressions: rows._sum.impressions ?? 0,
    profileViews: rows._sum.profileViews ?? 0,
    websiteClicks: rows._sum.websiteClicks ?? 0,
    phoneClicks: rows._sum.phoneClicks ?? 0,
    quoteClicks: rows._sum.quoteClicks ?? 0,
    directionsClicks: rows._sum.directionsClicks ?? 0,
    leads: rows._sum.leads ?? 0,
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

/* -------------------------------------------------------------- breakdowns */

/**
 * Where the traffic came from, read off the raw event log rather than the
 * rollup, because these are dimensions the daily table does not carry. The
 * window is short by design: this is a question you ask about recent weeks.
 */
export async function breakdowns(window: Window, businessId?: string) {
  const events = await db.analyticsEvent.findMany({
    where: { createdAt: { gte: startOf(window) }, ...(businessId ? { businessId } : {}) },
    select: { device: true, referrer: true, path: true, type: true },
    take: 20_000,
  });

  const tally = (values: (string | null)[]) => {
    const counts = new Map<string, number>();
    for (const value of values) {
      const key = value?.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  };

  return {
    devices: tally(events.map((event) => event.device)),
    // A referrer is a whole URL; the host is the part anyone reads.
    sources: tally(
      events.map((event) => {
        if (!event.referrer) return null;
        try {
          return new URL(event.referrer).hostname.replace(/^www\./, "");
        } catch {
          return null;
        }
      }),
    ).slice(0, 8),
    pages: tally(events.filter((event) => event.type !== "IMPRESSION").map((event) => event.path)).slice(0, 8),
    events: tally(events.map((event) => event.type)),
  };
}

/** Where the people asking for quotes are, by the postal code they gave. */
export async function leadPlaces(window: Window, businessId?: string) {
  const leads = await db.lead.findMany({
    where: { createdAt: { gte: startOf(window) }, ...(businessId ? { businessId } : {}) },
    select: { postalCode: true, jobType: true, urgency: true, status: true },
    take: 5_000,
  });

  const tally = (values: (string | null)[]) => {
    const counts = new Map<string, number>();
    for (const value of values) {
      const key = value?.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  };

  return {
    total: leads.length,
    places: tally(leads.map((lead) => lead.postalCode)).slice(0, 8),
    jobs: tally(leads.map((lead) => lead.jobType)).slice(0, 8),
    urgency: tally(leads.map((lead) => lead.urgency)),
    won: leads.filter((lead) => lead.status === "WON").length,
  };
}

/** Leads per day over the window, for the same chart shape as profile views. */
export async function leadSeries(window: Window, businessId?: string) {
  const rows = await db.businessDailyStat.findMany({
    where: { date: { gte: startOf(window) }, ...(businessId ? { businessId } : {}) },
    orderBy: { date: "asc" },
    select: { date: true, leads: true },
  });

  const byDate = new Map<string, number>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + row.leads);
  }

  const series: { date: string; value: number }[] = [];
  for (let index = window - 1; index >= 0; index -= 1) {
    const date = startOf(index).toISOString().slice(0, 10);
    series.push({ date, value: byDate.get(date) ?? 0 });
  }
  return series;
}
