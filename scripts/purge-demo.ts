import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";
import { ALL_BUSINESSES } from "../prisma/data/businesses";

// Removes the demo businesses the seed created, and nothing else.
//
// The list comes from the seed data itself rather than a hard-coded copy, so it
// cannot drift, and anything added since, by hand or by an import, is left
// alone. It writes what it is about to delete to a JSON file beside the
// database first, because a listing is easier to put back than to remember.
//
//   npx tsx scripts/purge-demo.ts          reports what would go
//   npx tsx scripts/purge-demo.ts --yes    does it

const execute = process.argv.includes("--yes");

function dumpDir(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const file = url.replace(/^file:/, "");
  return path.dirname(path.resolve(file));
}

async function main() {
  const slugs = ALL_BUSINESSES.map((entry) => entry.slug);

  const businesses = await db.business.findMany({
    where: { slug: { in: slugs } },
    include: {
      city: true,
      category: true,
      services: true,
      areas: true,
      credentials: true,
      photos: true,
      reviews: true,
      faqs: true,
      entries: { include: { ranking: true } },
      subscriptions: true,
      placements: true,
    },
  });

  if (businesses.length === 0) {
    console.log("Nothing to do: none of the seeded demo businesses are in the database.");
    await db.$disconnect();
    return;
  }

  const ids = businesses.map((row) => row.id);
  const seo = await db.seoMeta.findMany({ where: { entityType: "business", entityId: { in: ids } } });

  const affectedRankings = [...new Set(businesses.flatMap((row) => row.entries.map((e) => e.rankingId)))];

  console.log(`Demo businesses found: ${businesses.length}`);
  console.log(`  ranking entries they hold: ${businesses.reduce((n, r) => n + r.entries.length, 0)}`);
  console.log(`  subscriptions: ${businesses.reduce((n, r) => n + r.subscriptions.length, 0)}`);
  console.log(`  sponsored placements: ${businesses.reduce((n, r) => n + r.placements.length, 0)}`);
  console.log(`  reviews: ${businesses.reduce((n, r) => n + r.reviews.length, 0)}`);
  console.log(`  SEO records: ${seo.length}`);
  console.log(`  rankings that will lose entries: ${affectedRankings.length}`);

  const kept = await db.business.count({ where: { slug: { notIn: slugs } } });
  console.log(`Businesses that are NOT demo and will be left alone: ${kept}`);

  if (!execute) {
    console.log("\nDry run. Pass --yes to delete.");
    await db.$disconnect();
    return;
  }

  // The dump goes next to the database, on the volume that outlives a deploy.
  const dir = dumpDir();
  const file = path.join(dir, `purged-demo-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await mkdir(dir, { recursive: true });
  await writeFile(file, JSON.stringify({ businesses, seo }, null, 2), "utf8");
  console.log(`\nWrote a copy of everything being removed to ${file}`);

  // The relations cascade; the SEO records do not, because a SeoMeta row is
  // addressed by type and id rather than by a foreign key.
  await db.seoMeta.deleteMany({ where: { entityType: "business", entityId: { in: ids } } });
  const removed = await db.business.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${removed.count} businesses and ${seo.length} SEO records.`);

  // A published "10 Best" page with nothing on it is worse than no page. Any
  // list left empty goes back to draft rather than staying live and blank.
  let drafted = 0;
  for (const rankingId of affectedRankings) {
    const ranking = await db.ranking.findUnique({
      where: { id: rankingId },
      include: { _count: { select: { entries: true } } },
    });
    if (!ranking || ranking._count.entries > 0) continue;
    if (ranking.status !== "PUBLISHED") continue;

    await db.ranking.update({
      where: { id: rankingId },
      data: { status: "DRAFT", companiesReviewed: 0 },
    });
    console.log(`  unpublished "${ranking.title}", which was left with no companies`);
    drafted += 1;
  }

  console.log(`\nDone. ${removed.count} businesses removed, ${drafted} empty rankings unpublished.`);
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error("purge failed:", error);
  await db.$disconnect();
  process.exit(1);
});
