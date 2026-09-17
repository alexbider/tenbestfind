// Re-runs every SEO record through the scorer.
//
// The checks changed underneath the stored scores: the URL check compares
// normalised words instead of a raw substring and is given the real slug
// rather than a cuid, and the word count reads the saved copy instead of
// whatever the form put in a hidden field. Every score written before those
// changes was answering different questions, so they all need running again.
//
//   npx tsx scripts/rescore-seo.ts            # reports what would change
//   npx tsx scripts/rescore-seo.ts --write
//
// Reads and rewrites SeoMeta only. Nothing else is touched, and a record whose
// score does not move is left alone rather than rewritten with the same value.

import { db } from "../src/lib/db";
import { analyzeSeo } from "../src/lib/seo";
import { savedContent, slugForScoring } from "../src/lib/seo-content";

async function main(): Promise<void> {
  const write = process.argv.includes("--write");

  const records = await db.seoMeta.findMany({
    select: {
      id: true,
      entityType: true,
      entityId: true,
      title: true,
      description: true,
      focusKeyword: true,
      ogImage: true,
      score: true,
    },
  });

  let moved = 0;
  let same = 0;
  let up = 0;
  let down = 0;
  const byType = new Map<string, { moved: number; delta: number }>();

  for (const record of records) {
    const [content, slug] = await Promise.all([
      savedContent(record.entityType, record.entityId),
      slugForScoring(record.entityType, record.entityId),
    ]);

    const analysis = analyzeSeo({
      title: record.title,
      description: record.description,
      focusKeyword: record.focusKeyword,
      slug,
      content: content || record.description,
      hasImage: Boolean(record.ogImage),
      internalLinks: 3,
    });

    if (analysis.score === record.score) {
      same += 1;
      continue;
    }

    const delta = analysis.score - record.score;
    moved += 1;
    if (delta > 0) up += 1;
    else down += 1;

    const bucket = byType.get(record.entityType) ?? { moved: 0, delta: 0 };
    bucket.moved += 1;
    bucket.delta += delta;
    byType.set(record.entityType, bucket);

    if (write) {
      await db.seoMeta.update({
        where: { id: record.id },
        data: { score: analysis.score, analysis: JSON.stringify(analysis.checks) },
      });
    }
  }

  console.log(`${records.length} records scored.`);
  console.log(`  ${moved} moved, ${same} unchanged (${up} up, ${down} down)`);
  for (const [type, bucket] of [...byType.entries()].sort()) {
    const average = bucket.moved === 0 ? 0 : Math.round(bucket.delta / bucket.moved);
    console.log(`  ${type}: ${bucket.moved} moved, ${average > 0 ? "+" : ""}${average} on average`);
  }
  if (!write && moved > 0) console.log("\nNothing was written. Pass --write to do it.");

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
