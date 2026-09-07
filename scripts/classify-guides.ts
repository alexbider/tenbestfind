/**
 * Files guides written before the four-way split into one of the four hubs.
 *
 * Guides used to be EDITORIAL or COST. Cost guides are unaffected, because
 * COST still means the same thing and still switches the template. Everything
 * else was one undifferentiated pile, and the Guides menu promises three
 * distinct answers out of it: how to choose, what to ask, and what to check.
 *
 * The rules below are the ones an editor would apply reading the titles, in
 * the order an editor would apply them, and the classification is only a
 * default. Anything filed wrongly is one dropdown away from being right in the
 * admin, and this never touches a guide that has already been filed.
 *
 *   npx tsx scripts/classify-guides.ts          dry run
 *   npx tsx scripts/classify-guides.ts --yes    write
 */
import { db } from "../src/lib/db";
import { GUIDE_TYPES, LEGACY_GUIDE_TYPE, type GuideType } from "../src/lib/enums";

const write = process.argv.includes("--yes");

/**
 * Read against the slug and the title together. "Questions" is checked before
 * the checklist words because a guide called "Questions to ask before a roof
 * inspection" is a list of questions, not an inspection checklist.
 */
const RULES: { type: GuideType; test: RegExp }[] = [
  { type: "QUESTIONS", test: /\bquestions?\b|\bask\b|\binterview\b/i },
  {
    type: "CHECKLIST",
    test: /\bchecklist\b|\bverify\b|\bverifying\b|\binspect(ion|ing)?\b|\bbefore you\b|\bstep by step\b|\bwhat to do\b|\btiming\b|\bwhen to\b/i,
  },
];

/** The bucket a legacy guide belongs in, by its own words. */
function classify(guide: { slug: string; title: string }): GuideType {
  const text = `${guide.slug} ${guide.title}`;
  for (const rule of RULES) if (rule.test.test(text)) return rule.type;
  // The broadest of the three, and what most of the old editorial guides were:
  // help deciding who to hire.
  return "HOW_TO_CHOOSE";
}

async function main(): Promise<void> {
  const guides = await db.guide.findMany({ select: { id: true, slug: true, title: true, type: true } });

  const stale = guides.filter(
    (guide) => guide.type === LEGACY_GUIDE_TYPE || !(GUIDE_TYPES as readonly string[]).includes(guide.type),
  );

  if (stale.length === 0) {
    console.log(`guide types: all ${guides.length} already filed, nothing to do`);
    return;
  }

  const tally = new Map<GuideType, number>();
  for (const guide of stale) {
    const type = classify(guide);
    tally.set(type, (tally.get(type) ?? 0) + 1);
    console.log(`  ${write ? "filed" : "would file"} ${guide.slug} as ${type}`);
    if (write) await db.guide.update({ where: { id: guide.id }, data: { type } });
  }

  console.log(
    `guide types: ${stale.length} ${write ? "filed" : "to file"} (` +
      [...tally.entries()].map(([type, count]) => `${count} ${type}`).join(", ") +
      `), ${guides.length - stale.length} already filed`,
  );
  if (!write) console.log("dry run. Pass --yes to write.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
