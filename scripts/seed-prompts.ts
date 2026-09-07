/**
 * The four templates the writer starts with, one per hub.
 *
 * They exist so the first thing an editor does is edit a real brief rather than
 * compose one from an empty box, and so the four kinds of guide are actually
 * written differently. A cost guide that opens with hedging and a checklist
 * guide that opens with a range are both the wrong page.
 *
 * Only ever creates. A template someone has edited is never overwritten, which
 * is what lets this run on every deploy.
 *
 *   npx tsx scripts/seed-prompts.ts          dry run
 *   npx tsx scripts/seed-prompts.ts --yes    write
 */
import { db } from "../src/lib/db";
import { DEFAULT_SYSTEM } from "../src/lib/guide-writer";
import { stringify } from "../src/lib/json";

const write = process.argv.includes("--yes");

const COMMON = `Structure it around the questions in the research rather than around a template. Where the research shows a question Google is already asking, answer it, in the body or in the FAQs. Where the pages that currently rank all say the same thing, either say it better or say why it is incomplete.

Use the structured blocks where they earn their place and not otherwise. Three well-chosen blocks beat nine.

RESEARCH BRIEF
%research%`;

const TEMPLATES = [
  {
    name: "How to choose a pro",
    slug: "how-to-choose",
    guideType: "HOW_TO_CHOOSE",
    isDefault: true,
    wordTarget: 1500,
    skills: ["eeat-signals", "questions-to-ask", "red-flags", "local-variation", "aeo-first", "no-fluff"],
    instructions: `Write a guide of about %wordcount% words answering: %topic%

This is a hiring guide%service%%location%. The phrase it should rank for is %keyword%.

The reader has decided to hire someone and does not know how to tell one company from another. Everything in the guide should serve that: what to verify and where, what a quote should itemise, which reassurances mean something and which are noise. The test for any paragraph is whether it changes who the reader calls.

${COMMON}`,
    notes: "The default. Used when no template is chosen.",
  },
  {
    name: "What things cost",
    slug: "cost",
    guideType: "COST",
    isDefault: false,
    wordTarget: 1600,
    skills: ["cost-ranges", "local-variation", "eeat-signals", "comparison-table", "aeo-first", "no-fluff"],
    instructions: `Write a cost guide of about %wordcount% words answering: %topic%

This covers pricing%service%%location%. The phrase it should rank for is %keyword%.

Open with the range, then spend the guide explaining what moves a quote within it and what pushes it outside. Name the line items people forget to budget for. Where two quotes for the same job differ, say what usually accounts for the difference.

Do not publish a single national average as if it were a fact. If the research does not support a number, say what the price depends on and what to ask a company for instead. A cost guide that admits what it does not know is worth more than one that guesses.

${COMMON}`,
    notes: "Cost guides also switch the page template, which adds the range and the sourced table.",
  },
  {
    name: "Questions to ask",
    slug: "questions-to-ask",
    guideType: "QUESTIONS",
    isDefault: false,
    wordTarget: 1300,
    skills: ["questions-to-ask", "red-flags", "eeat-signals", "aeo-first", "no-fluff"],
    instructions: `Write a guide of about %wordcount% words answering: %topic%

This is a questions guide%service%%location%. The phrase it should rank for is %keyword%.

The value is not the list of questions, which anyone can write. It is what the answers tell you. For every question, say what a good answer sounds like, what a bad one sounds like, and what it means when someone will not answer at all.

Group the questions by when they come up: before the visit, during the quote, before signing. A reader should be able to take the guide to a conversation.

${COMMON}`,
    notes: "",
  },
  {
    name: "Project checklists",
    slug: "checklists",
    guideType: "CHECKLIST",
    isDefault: false,
    wordTarget: 1200,
    skills: ["checklist", "eeat-signals", "local-variation", "aeo-first", "no-fluff"],
    instructions: `Write a guide of about %wordcount% words answering: %topic%

This is a checklist guide%service%%location%. The phrase it should rank for is %keyword%.

Order it the way the job happens: what to confirm before anyone starts, what to watch while the work runs, and what to check before the final payment leaves your hands. Each item should be something a reader can actually verify, not a principle to bear in mind.

Say what a document should contain, which register to search, who a certificate should come from. Verifiability is the whole point of a checklist.

${COMMON}`,
    notes: "",
  },
];

async function main(): Promise<void> {
  let created = 0;
  let kept = 0;

  for (const template of TEMPLATES) {
    const existing = await db.promptTemplate.findUnique({
      where: { slug: template.slug },
      select: { id: true },
    });
    if (existing) {
      kept += 1;
      continue;
    }

    console.log(`  ${write ? "creating" : "would create"} ${template.name}`);
    if (!write) {
      created += 1;
      continue;
    }

    await db.promptTemplate.create({
      data: {
        name: template.name,
        slug: template.slug,
        kind: "GUIDE",
        guideType: template.guideType,
        system: DEFAULT_SYSTEM,
        instructions: template.instructions,
        model: "claude-opus-5",
        effort: "high",
        wordTarget: template.wordTarget,
        skills: stringify(template.skills),
        notes: template.notes || null,
        isDefault: template.isDefault,
      },
    });
    created += 1;
  }

  console.log(
    `prompt templates: ${created} ${write ? "created" : "to create"}, ${kept} already there and left alone`,
  );
  if (!write) console.log("dry run. Pass --yes to write.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
