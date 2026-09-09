// Puts a name on every ranking and guide that can carry one.
//
// The columns existed and nothing filled them, so the whole site published
// unsigned. This fills them from the editors' own stated fields and prints the
// trades that have nobody, which is the useful half of the output: an unsigned
// HVAC ranking is not a bug in this script, it is the site telling you there is
// no HVAC editor yet.
//
// Never overwrites. A page an editor assigned by hand keeps that assignment,
// and re-running changes nothing.
//
//   npx tsx scripts/assign-bylines.ts           # says what it would do
//   npx tsx scripts/assign-bylines.ts --write   # does it

import { db } from "../src/lib/db";
import { bylineCandidates, bylineFor } from "../src/lib/byline";

async function main(): Promise<void> {
  const write = process.argv.includes("--write") || process.argv.includes("--yes");
  const people = await bylineCandidates();

  if (people.length === 0) {
    console.log("  no published people, nothing to assign");
    return;
  }

  // Two different gaps, reported apart: a subject nobody covers at all, and one
  // where the only person who covers it is already in the other slot. The first
  // needs an editor, the second needs a second editor.
  const noOne = new Set<string>();
  const noSecond = new Set<string>();
  let assigned = 0;
  let already = 0;

  const note = (subject: string, byline: { authorId: string | null; reviewerId: string | null }) => {
    if (!byline.authorId && !byline.reviewerId) noOne.add(subject);
    else noSecond.add(subject);
  };

  /* -------------------------------------------------------------- rankings */

  const rankings = await db.ranking.findMany({
    include: {
      category: { select: { name: true, serviceName: true, singular: true } },
      city: { select: { name: true, region: { select: { name: true } } } },
    },
  });

  for (const ranking of rankings) {
    if (ranking.authorId && ranking.reviewerId) {
      already += 1;
      continue;
    }

    const trade = [ranking.category.name, ranking.category.serviceName, ranking.category.singular ?? ""];
    const byline = bylineFor(people, {
      trade,
      market: [ranking.city?.name ?? "", ranking.city?.region.name ?? ""],
    });

    const data = {
      ...(ranking.authorId ? {} : byline.authorId ? { authorId: byline.authorId } : {}),
      ...(ranking.reviewerId ? {} : byline.reviewerId ? { reviewerId: byline.reviewerId } : {}),
    };

    if (Object.keys(data).length === 0) {
      note(ranking.category.serviceName, byline);
      continue;
    }

    if (write) await db.ranking.update({ where: { id: ranking.id }, data });
    assigned += 1;
    console.log(`  ${write ? "signed" : "would"} ranking ${ranking.slug}`);
  }

  /* ---------------------------------------------------------------- guides */

  const guides = await db.guide.findMany({
    include: { category: { select: { name: true, serviceName: true, singular: true } } },
  });

  for (const guide of guides) {
    if (guide.authorId && guide.reviewerId) {
      already += 1;
      continue;
    }

    // A guide with no category is about the trade in its own title, which is
    // the best the data can offer and often enough to match on.
    const trade = guide.category
      ? [guide.category.name, guide.category.serviceName, guide.category.singular ?? ""]
      : [guide.title];

    const byline = bylineFor(people, { trade });
    const data = {
      ...(guide.authorId ? {} : byline.authorId ? { authorId: byline.authorId } : {}),
      ...(guide.reviewerId ? {} : byline.reviewerId ? { reviewerId: byline.reviewerId } : {}),
    };

    if (Object.keys(data).length === 0) {
      note(guide.category?.serviceName ?? guide.title, byline);
      continue;
    }

    if (write) await db.guide.update({ where: { id: guide.id }, data });
    assigned += 1;
    console.log(`  ${write ? "signed" : "would"} guide ${guide.slug}`);
  }

  console.log(`\n${assigned} ${write ? "signed" : "to sign"}, ${already} already carried both`);

  if (noOne.size > 0) {
    console.log("\nNobody's stated field covers these, so their pages stay unsigned:");
    for (const subject of [...noOne].sort()) console.log(`  ${subject}`);
    console.log("Add the trade to an editor's specializations, or add the editor.");
  }

  if (noSecond.size > 0) {
    console.log("\nOne name each, because only one editor covers them:");
    for (const subject of [...noSecond].sort()) console.log(`  ${subject}`);
  }

  if (!write) console.log("\nNothing was written. Pass --write.");
}

main();
