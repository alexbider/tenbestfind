/**
 * Nightly analytics rollup.
 *
 * Aggregates yesterday's raw events into BusinessDailyStat, which is what the
 * admin dashboards read. Run it from cron:
 *
 *   0 3 * * *  cd /path/to/app && npx tsx scripts/rollup.ts
 *
 * Safe to re-run for the same day: the day's row is replaced, not added to.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const EVENT_TO_FIELD: Record<string, keyof Counts> = {
  IMPRESSION: "impressions",
  PROFILE_VIEW: "profileViews",
  WEBSITE_CLICK: "websiteClicks",
  PHONE_CLICK: "phoneClicks",
  QUOTE_CLICK: "quoteClicks",
  DIRECTIONS_CLICK: "directionsClicks",
};

type Counts = {
  impressions: number;
  profileViews: number;
  websiteClicks: number;
  phoneClicks: number;
  quoteClicks: number;
  directionsClicks: number;
};

const empty = (): Counts => ({
  impressions: 0,
  profileViews: 0,
  websiteClicks: 0,
  phoneClicks: 0,
  quoteClicks: 0,
  directionsClicks: 0,
});

async function main() {
  const daysBack = Number(process.argv[2] ?? 1);

  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const events = await db.analyticsEvent.findMany({
    where: { createdAt: { gte: start, lt: end }, businessId: { not: null } },
    select: { businessId: true, type: true },
  });

  const byBusiness = new Map<string, Counts>();
  for (const event of events) {
    if (!event.businessId) continue;
    const field = EVENT_TO_FIELD[event.type];
    if (!field) continue;
    const counts = byBusiness.get(event.businessId) ?? empty();
    counts[field] += 1;
    byBusiness.set(event.businessId, counts);
  }

  for (const [businessId, counts] of byBusiness) {
    await db.businessDailyStat.upsert({
      where: { businessId_date: { businessId, date: start } },
      create: { businessId, date: start, ...counts },
      update: counts,
    });
  }

  console.log(
    `Rolled up ${events.length} events for ${byBusiness.size} businesses on ${start.toISOString().slice(0, 10)}.`,
  );

  // Trim events past the retention window.
  const retentionSetting = await db.setting.findUnique({ where: { key: "analytics.retentionDays" } });
  const retentionDays = retentionSetting ? Number(JSON.parse(retentionSetting.value)) : 400;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const { count } = await db.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  if (count > 0) console.log(`Deleted ${count} events older than ${retentionDays} days.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
