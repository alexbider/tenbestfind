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
// The worker does this once a day on its own, so this script is for running it
// now rather than waiting. Reads and rewrites SeoMeta only.

import { db } from "../src/lib/db";
import { rescoreSeo } from "../src/lib/seo-rescore";

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const result = await rescoreSeo({ write });

  console.log(`${result.scored} records scored.`);
  console.log(`  ${result.moved} moved, ${result.unchanged} unchanged (${result.up} up, ${result.down} down)`);
  for (const [type, bucket] of Object.entries(result.byType)) {
    const sign = bucket.averageDelta > 0 ? "+" : "";
    console.log(`  ${type}: ${bucket.moved} moved, ${sign}${bucket.averageDelta} on average`);
  }
  if (!write && result.moved > 0) console.log("\nNothing was written. Pass --write to do it.");

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
