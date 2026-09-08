/**
 * The four templates the writer starts with, one per hub.
 *
 * They exist so the first thing an editor does is edit a real brief rather than
 * compose one from an empty box, and so the four kinds of guide are actually
 * written differently. A cost guide that opens with hedging and a checklist
 * guide that opens with a range are both the wrong page.
 *
 * Never overwrites a template an editor has touched. A stored template is
 * compared against the exact text previous versions of this script shipped; if
 * it still matches one of them nobody has edited it and it is brought up to
 * date, and if it does not, it is somebody's work and it is left alone.
 *
 *   npx tsx scripts/seed-prompts.ts          dry run
 *   npx tsx scripts/seed-prompts.ts --yes    write
 */
import { createHash } from "node:crypto";
import { db } from "../src/lib/db";
import { DEFAULT_SYSTEM } from "../src/lib/guide-writer";
import { stringify } from "../src/lib/json";

/**
 * The instructions and the standing rules exactly as earlier versions of this
 * script shipped them, by fingerprint.
 *
 * A stored template whose text still hashes to one of these has never been
 * opened by anyone, so bringing it up to date takes nothing away. A template
 * that hashes to anything else is somebody's work and is left alone, which is
 * the only safe rule when the alternative is silently deleting an editor's
 * afternoon on the next deploy.
 */
const SHIPPED_INSTRUCTIONS: Record<string, string[]> = {
  "how-to-choose": ["6df1326dfb808b40", "8fb603f65dfeeff9"],
  cost: ["3281d77007a1d640", "38a71c4f3ad0718d"],
  "questions-to-ask": ["69acfe0f221b80a4", "61f3369c3d5dc73c"],
  checklists: ["fd120ec972d5d483", "9dd874afbe72cdab"],
};

/** Every version of the standing rules this script has ever written. */
const SHIPPED_SYSTEMS = ["36bc607cbf7684d7"];

const fingerprint = (value: string): string =>
  createHash("sha256").update(value.trim()).digest("hex").slice(0, 16);

const write = process.argv.includes("--yes");

const COMMON = `OPEN IN FOUR PARTS
The opening is what an assistant quotes and what a featured snippet lifts, so it is built rather than written.

  shortAnswer: the direct answer. The phrase above and a concrete number, range or rule in the first sentence, then the typical case, then the two or three things that move it. Sixty to ninety words. No hedging opener, no call to action.

  keyTakeaways: extraction-ready facts, one per line, each a claim with a number or a named qualifier attached. Not topics.

  The first body block: a criteria or list block of definition-style one-liners covering the terms a reader has to know to follow the rest.

  Then one paragraph on how much this varies between properties and jobs, and the single caution that matters most here. Nothing promotional.

STRUCTURE
Every heading is a question a reader actually has or a claim, never a label. The first sentence under a question-style heading answers it. Build the section order from the questions in the research rather than from a template. Where the pages that currently rank all say the same thing, either say it better or say why it is incomplete.

Answer every question the research shows being asked, in the body or in the FAQs. Then cover at least two things none of the ranking pages cover.

USE THE BLOCKS
At least one compare block, used as a real table, where lining things up side by side beats prose. A checklist where a reader works through something in order. A flags block for what should end a conversation. A steps block where sequence matters. Not all of them in every guide, but three thousand words of unbroken paragraphs is a wall.

CHARTS
Where the research gives you real ranges, use a chart block and let the numbers be seen rather than described. Every figure in it is published as a number a reader will quote back, so use it only where the brief supports the ranges and leave it out entirely rather than estimating. A cost guide almost always earns one. A guide with no numbers in it does not.

PICTURES
Commission three photographs in the illustrations array: one cover and two inline. Describe scenes somebody could actually go and photograph. Real work, real materials, real hands, real weather. Name the subject, the setting, the light and the angle, concretely enough that two people reading the brief would come back with the same picture.

Nothing in a picture may carry information the text has not earned: no text in the image, no logos, no signage, no numbers, no charts or diagrams, no before-and-after pairs, nobody recognisable, no branded vehicles or products. Prefer the specific and unglamorous over the polished: a hand on a moisture meter reads as true where a smiling family in a bright kitchen reads as stock.

Place a figure block for each inline picture where the picture belongs in the argument, not wherever the text needs breaking up.

FAQS
Fifteen to eighteen, from the research questions first and the gaps second. Each answers in its first sentence, then adds the qualifier.

RESEARCH BRIEF
%research%`;

const TEMPLATES = [
  {
    name: "How to choose a pro",
    slug: "how-to-choose",
    guideType: "HOW_TO_CHOOSE",
    isDefault: true,
    wordTarget: 3200,
    skills: ["eeat-signals", "questions-to-ask", "red-flags", "local-variation", "aeo-first", "no-fluff"],
    instructions: `Write a guide of at least %wordcount% words answering: %topic%

This is a hiring guide%service%%location%. The phrase it should rank for is %keyword%.

The reader has decided to hire someone and cannot tell one company from another. Everything here serves that. The test for any paragraph is whether it changes who the reader calls.

Cover what to verify and exactly where to verify it, naming the register or the issuing body rather than saying to check their credentials. Cover what a written quote has to itemise before it can be compared with another one. Cover which reassurances mean something and which are noise, and say why. Cover what changes when the job is an emergency rather than planned.

Say where the rules differ by state or province, and where a city adds its own on top.

${COMMON}`,
    notes: "The default. Used when no template is chosen.",
  },
  {
    name: "What things cost",
    slug: "cost",
    guideType: "COST",
    isDefault: false,
    wordTarget: 3400,
    skills: ["cost-ranges", "local-variation", "eeat-signals", "comparison-table", "aeo-first", "no-fluff"],
    instructions: `Write a cost guide of at least %wordcount% words answering: %topic%

This covers pricing%service%%location%. The phrase it should rank for is %keyword%.

Open with the range, then spend the guide on what moves a quote inside it and what pushes it outside. Give the range a shape: what the low end buys, what the high end buys, and what the middle usually includes.

Name the line items people forget to budget for. Where two quotes for the same job differ, say what usually accounts for the difference. Build at least one table of cost factors against what each one does to the price and why, and one chart of the ranges the research actually supports.

Do not publish a single national average as if it were a fact. If the research does not support a number, say what the price depends on and what to ask a company for instead. A cost guide that admits what it does not know is worth more than one that guesses.

Cover how to read an estimate, what a deposit should look like, and which payment schedules are a warning.

${COMMON}`,
    notes: "Cost guides also switch the page template, which adds the range and the sourced table.",
  },
  {
    name: "Questions to ask",
    slug: "questions-to-ask",
    guideType: "QUESTIONS",
    isDefault: false,
    wordTarget: 3000,
    skills: ["questions-to-ask", "red-flags", "eeat-signals", "comparison-table", "aeo-first", "no-fluff"],
    instructions: `Write a guide of at least %wordcount% words answering: %topic%

This is a questions guide%service%%location%. The phrase it should rank for is %keyword%.

The value is not the list of questions, which anyone can write. It is what the answers tell you. For every question, say what a good answer sounds like, what a bad one sounds like, and what it means when somebody will not answer at all.

Group them by when they come up: before the visit, during the quote, before signing, and while the work is running. A reader should be able to take this to a conversation.

Include the questions a company hopes will not be asked, and be specific about why each one is uncomfortable. Build a table of question against what the answer reveals.

${COMMON}`,
    notes: "",
  },
  {
    name: "Project checklists",
    slug: "checklists",
    guideType: "CHECKLIST",
    isDefault: false,
    wordTarget: 3000,
    skills: ["checklist", "eeat-signals", "local-variation", "red-flags", "aeo-first", "no-fluff"],
    instructions: `Write a guide of at least %wordcount% words answering: %topic%

This is a checklist guide%service%%location%. The phrase it should rank for is %keyword%.

Order it the way the job happens: what to confirm before anyone starts, what to watch while the work runs, and what to check before the final payment leaves your hands.

Every item has to be something a reader can verify, not a principle to bear in mind. Say what a document should contain, which register to search, who a certificate should come from, and what a photograph should show. Verifiability is the whole point of a checklist.

Cover what to do when an item fails: who to call, what to stop, and what leverage the reader still has at that stage.

${COMMON}`,
    notes: "",
  },
];

async function main(): Promise<void> {
  let created = 0;
  let updated = 0;
  let kept = 0;

  const currentSystem = fingerprint(DEFAULT_SYSTEM);

  for (const template of TEMPLATES) {
    const existing = await db.promptTemplate.findUnique({
      where: { slug: template.slug },
      select: { id: true, instructions: true, system: true },
    });

    const payload = {
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
    };

    if (!existing) {
      console.log(`  ${write ? "creating" : "would create"} ${template.name}`);
      if (write) await db.promptTemplate.create({ data: payload });
      created += 1;
      continue;
    }

    // Untouched means it matches something this script has written, which
    // includes what it writes today: a template seeded by this very version is
    // not an edit.
    const stored = fingerprint(existing.instructions);
    const instructionsUntouched =
      stored === fingerprint(template.instructions) ||
      (SHIPPED_INSTRUCTIONS[template.slug] ?? []).includes(stored);
    const systemUntouched =
      SHIPPED_SYSTEMS.includes(fingerprint(existing.system)) || fingerprint(existing.system) === currentSystem;

    if (!instructionsUntouched || !systemUntouched) {
      const which = [!instructionsUntouched ? "instructions" : null, !systemUntouched ? "standing rules" : null]
        .filter(Boolean)
        .join(" and ");
      console.log(`  leaving ${template.name} alone, its ${which} have been edited`);
      kept += 1;
      continue;
    }

    if (stored === fingerprint(template.instructions) && fingerprint(existing.system) === currentSystem) {
      kept += 1;
      continue;
    }

    console.log(`  ${write ? "updating" : "would update"} ${template.name}`);
    // isDefault is left as the editor set it: which template runs when none is
    // chosen is a decision, not a default.
    if (write) {
      const { isDefault, ...rest } = payload;
      void isDefault;
      await db.promptTemplate.update({ where: { id: existing.id }, data: rest });
    }
    updated += 1;
  }

  console.log(
    `prompt templates: ${created} ${write ? "created" : "to create"}, ${updated} ${write ? "updated" : "to update"}, ${kept} left alone`,
  );
  if (!write) console.log("dry run. Pass --yes to write.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
