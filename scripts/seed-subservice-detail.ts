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
import { parseSubserviceDetail, type SubserviceDetail } from "../src/lib/subservice-detail";

type Written = {
  category: string;
  subservice: string;
  detail: SubserviceDetail;
  faqs?: { question: string; answer: string }[];
};

const WRITTEN: Written[] = [
  {
    category: "flooring",
    subservice: "hardwood",
    detail: {
      involves: {
        heading: "Solid or engineered, and where each one can go",
        paragraphs: [
          "Solid hardwood is one piece of timber all the way through, which is what lets it be sanded and refinished repeatedly across decades. Engineered hardwood is a real wood veneer over a plywood core, so it looks identical once laid but can only be refinished once or twice, and sometimes not at all if the veneer is thin.",
          "The deciding factor is usually not preference, it is where the floor is going. On a normal timber subfloor above ground either works, and solid lasts longer.",
        ],
        options: [
          {
            name: "Solid hardwood",
            note: "One piece of timber throughout",
            rows: [
              { label: "Over concrete slab", value: "No", tone: "against" },
              { label: "Over radiant heating", value: "No", tone: "against" },
              { label: "Below grade", value: "No", tone: "against" },
              { label: "Refinishing", value: "Repeatedly", tone: "for" },
            ],
          },
          {
            name: "Engineered hardwood",
            note: "Wood veneer over a plywood core",
            rows: [
              { label: "Over concrete slab", value: "Yes", tone: "for" },
              { label: "Over radiant heating", value: "Yes", tone: "for" },
              { label: "Below grade", value: "Yes", tone: "for" },
              { label: "Refinishing", value: "Once or twice", tone: "mixed" },
            ],
          },
        ],
        footnote:
          "Engineered is dimensionally stable, so it goes over concrete slabs and over radiant heating, both of which solid hardwood cannot do reliably. Below grade, in a basement, engineered is the only one of the two worth considering.",
      },
      prices: {
        eyebrow: "Hardwood by type",
        heading: "What it costs per square foot",
        lead: "Installed, 2026, including materials and labour on a straightforward rectangular room.",
        unit: "Dollars per square foot",
        currency: "$",
        items: [
          { name: "Engineered hardwood", low: 8, high: 14, note: "Goes where solid cannot." },
          { name: "Solid hardwood", low: 9, high: 18, note: "Lasts longest on a timber subfloor above ground." },
          {
            name: "Refinishing an existing floor",
            low: 3,
            high: 5,
            tone: "mixed",
            note: "Often the better spend if the boards are sound.",
          },
        ],
        footnote:
          "Removing the old floor adds $1 to $3 per square foot. Minor levelling adds roughly five to eight percent to a job, and replacing soft or rotten subfloor sections adds ten to twenty percent or more.",
        aside: {
          label: "Cheapest good option",
          heading: "Refinishing is a third of the price of replacing",
          body: "If you have hardwood already and it looks tired, price refinishing before replacement. At $3 to $5 a square foot against $9 to $18 for new, sanding back and refinishing a floor is a fraction of the cost and gives you a floor with more remaining life than a new engineered one.",
          footnote:
            "The question is only how much thickness is left above the tongue, which a flooring contractor can tell you in a few minutes.",
        },
      },
      claim: {
        eyebrow: "Resale",
        heading: "It is the one flooring choice that reliably affects resale",
        lead: "Vinyl and laminate have closed the gap on appearance to the point where most people cannot tell at a normal viewing distance. What they have not closed is the effect on valuation.",
        notes: [
          "Real hardwood still moves appraisals and buyer perception in a way that convincing imitations do not, particularly at higher price points.",
          "That cuts both ways. In a house where the comparable sales do not have hardwood, installing it will not lift the value to match what it cost. The advantage shows up where buyers expect it and its absence would be noticed.",
        ],
      },
      pitfalls: [
        {
          title: "Acclimation",
          body: "Wood needs to sit in the room it will live in, for days, reaching the humidity of that space before it is fitted. Floors laid straight off the delivery truck are the ones that gap in winter or cup in summer, and the installer who wants to fit tomorrow is the one to question.",
          ask: "How many days will the wood sit in the room before you fit it?",
        },
        {
          title: "Subfloor flatness",
          body: "It matters more with wider boards. Wide plank over an uneven subfloor moves, creaks and shows every dip. Ask what flatness tolerance the manufacturer specifies and whether the subfloor was checked against it, because that answer separates installers who have read the instructions from those who have not.",
          ask: "What flatness tolerance does the manufacturer specify, and was it checked?",
        },
      ],
    },
    faqs: [
      {
        question: "Who handles hardwood flooring?",
        answer:
          "Flooring companies, and within that a mix of firms that install with their own crews and firms that list the service and subcontract it. The first question worth asking is which of the two you are speaking to, because it decides who is answerable if the floor has to come back up.",
      },
      {
        question: "What should I ask before booking hardwood flooring?",
        answer:
          "Two questions specific to wood: how many days the material will acclimate in the room before it is fitted, and what flatness tolerance the manufacturer specifies for the subfloor and whether it was checked against it. Then the general set: licence for the parent trade, insurance confirmed with the insurer, and the exclusions in writing.",
      },
      {
        question: "How do I compare quotes for this?",
        answer:
          "Line the exclusions up, not the totals. Removal and disposal of the old floor, levelling or subfloor replacement, permits and making good afterwards are the items that move a price by thousands, and a low quote usually means one of them sits outside the number.",
      },
      {
        question: "Is hardwood flooring priced separately from the rest of the job?",
        answer:
          "Usually yes, priced per square foot installed, with removal, levelling and subfloor repair added as separate lines. If hardwood is part of a larger remodel, ask for it as its own figure so you can compare it against a flooring specialist's quote.",
      },
    ],
  },
];

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
