// The written half of a subservice page.
//
// A subservice template can draw a comparison, a price chart, a claim and a
// list of failure points, but it cannot know any of them: what hardwood costs
// a square foot and the fact that it has to acclimate in the room for days
// before it is laid are facts about hardwood, and no amount of string
// formatting turns the word "hardwood" into either one.
//
// So they are written, here, one job at a time, and a job nobody has written
// renders without those four sections rather than with invented ones. This
// seeds what has been written so far.
//
//   npx tsx scripts/seed-subservice-detail.ts          # reports, writes nothing
//   npx tsx scripts/seed-subservice-detail.ts --write
//
// Never overwrites. A detail edited in the admin or through the connector is
// somebody's work, and a seed that reverts it on the next deploy is a seed
// that makes the admin pointless. Same for the questions: they are written
// once and then they belong to whoever edits them.

import { db } from "../src/lib/db";
import { parseSubserviceDetail } from "../src/lib/subservice-detail";
import { SUBSERVICE_DETAIL } from "../prisma/data/subservice-detail";
import { SUBSERVICE_FAQS } from "../prisma/data/subservice-faqs";

/** Flattened from the table, so the two cannot drift. */
const WRITTEN = Object.entries(SUBSERVICE_DETAIL).flatMap(([category, rows]) =>
  Object.entries(rows).map(([subservice, detail]) => ({
    category,
    subservice,
    detail,
    faqs: SUBSERVICE_FAQS[category]?.[subservice],
  })),
);

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  let wrote = 0;
  let kept = 0;
  let missing = 0;

  for (const entry of WRITTEN) {
    const category = await db.category.findUnique({ where: { slug: entry.category }, select: { id: true } });
    const subservice = category
      ? await db.subservice.findUnique({
          where: { categoryId_slug: { categoryId: category.id, slug: entry.subservice } },
          select: { id: true, detail: true },
        })
      : null;

    const where = `${entry.category}/${entry.subservice}`;
    if (!subservice) {
      console.log(`  skip   ${where}: no such subservice here`);
      missing += 1;
      continue;
    }

    // A detail that already parses to something is somebody's work.
    const existing = parseSubserviceDetail(subservice.detail);
    const filled = Object.values(existing).some(Boolean);
    if (filled) {
      console.log(`  keep   ${where}: already written`);
      kept += 1;
      continue;
    }

    if (!write) {
      console.log(`  would  ${where}: ${Object.keys(entry.detail).join(", ")}`);
      wrote += 1;
      continue;
    }

    await db.subservice.update({
      where: { id: subservice.id },
      data: { detail: JSON.stringify(entry.detail) },
    });

    // Questions written for the job replace the generated set, so they only
    // go in where there are none: one already stored is an editor's.
    let questions = 0;
    if (entry.faqs?.length) {
      const already = await db.faq.count({ where: { scope: "SUBSERVICE", subserviceId: subservice.id } });
      if (already === 0) {
        await db.faq.createMany({
          data: entry.faqs.map((faq, index) => ({
            scope: "SUBSERVICE",
            subserviceId: subservice.id,
            question: faq.question,
            answer: faq.answer,
            sortOrder: index,
          })),
        });
        questions = entry.faqs.length;
      }
    }

    console.log(`  wrote  ${where}: ${Object.keys(entry.detail).join(", ")}${questions ? `, ${questions} questions` : ""}`);
    wrote += 1;
  }

  const verb = write ? "written" : "to write";
  console.log(`\n${wrote} ${verb}, ${kept} left alone${missing ? `, ${missing} not found` : ""}.`);
}

main();
