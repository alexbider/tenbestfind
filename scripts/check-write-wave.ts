// The write stage, end to end, against a copy of the database and a stubbed
// Anthropic.
//
// The wave itself is the part that cannot be tried for real without spending
// money, and it is also the part with the most state: a wave is queued on one
// tick and collected on another, results come back in a different order than
// they went out, and some of them come back as failures. That bookkeeping is
// what this checks. What the model actually writes is not the subject.

import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const copy = join(tmpdir(), `wave-check-${Date.now()}.db`);
copyFileSync("prisma/dev.db", copy);
process.env.DATABASE_URL = `file:${copy}`;
process.env.ANTHROPIC_API_KEY = "sk-ant-not-a-real-key";
process.env.IMPORT_MODEL = "";

const BATCH_ID = "msgbatch_check";
const RESULTS_URL = "https://api.anthropic.com/v1/messages/batches/msgbatch_check/results";

/** The company the request is about, read back out of the prompt. */
function nameIn(prompt: string): string {
  return /Business name: ([^\n]+)/.exec(prompt)?.[1] ?? "Company";
}

/** A listing that passes review, written around one company's name. */
function listingFor(name: string, opening: string) {
  const keyword = name.toLowerCase();
  const sentence = `${opening} The crew works across the metro and answers the phone before ten. `;
  return {
    tagline: `${name} keeps the water where it belongs`,
    // The overview is deliberately independent of the opening: the review
    // counts its words, and only the description's first line is fingerprinted.
    overview: "They fix pipes, they clear drains, and they replace water heaters in old houses. ".repeat(11),
    description: `${sentence}They are a ${keyword} outfit that has been at it for years. `.repeat(42),
    editorialTake: `What stands out about ${name} is that the estimate arrives when they said it would. `.repeat(2),
    bestFor: "Homeowners with an old house",
    strengths: ["Same-day emergency calls", "Repipe and slab leak work", "Written estimates up front"],
    considerations: ["Books out in winter", "No weekend crews in January"],
    services: ["Drain cleaning", "Water heaters", "Slab leaks", "Repiping"],
    faqs: Array.from({ length: 5 }, (unused, index) => ({
      question: `Question ${index + 1} about ${name}?`,
      answer: "Yes, and here is the sentence of detail that makes this an actual answer for a reader.",
    })),
    seoTitle: `${name} in New York Reviewed`.slice(0, 60),
    seoDescription: `${name} is a New York plumber taking emergency calls, slab leaks and repipes, with written estimates and same-day starts on repairs.`,
    extraKeywords: [keyword, "new york plumber", "emergency plumbing"],
  };
}

function jsonl(rows: unknown[]): string {
  return rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
}

let submitted: { custom_id: string; params: { messages: { content: string }[] } }[] = [];
let directCalls = 0;

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  if (url.endsWith("/v1/messages/batches") && method === "POST") {
    submitted = JSON.parse(String(init?.body)).requests;
    return json({ id: BATCH_ID, processing_status: "in_progress", results_url: null });
  }

  if (url.endsWith(`/v1/messages/batches/${BATCH_ID}`)) {
    return json({ id: BATCH_ID, processing_status: "ended", results_url: RESULTS_URL });
  }

  if (url === RESULTS_URL) {
    // Deliberately out of order, with one failure and one answer that will not
    // survive the review, so both recovery paths are exercised.
    const rows = [...submitted].reverse().map((request, index) => {
      const name = nameIn(request.params.messages[0]!.content);
      if (index === 0) {
        return { custom_id: request.custom_id, result: { type: "errored", error: { type: "invalid_request_error", error: { message: "the request was malformed" } } } };
      }
      const text = JSON.stringify(
        index === 1
          ? {
              ...listingFor(name, "Short."),
              // Long enough to be a listing, too short to be a good one: this
              // is the answer the review throws back for a second pass.
              description: "They fix pipes across the five boroughs and they answer the phone. ".repeat(24),
            }
          // The last two share an opening, which one of them has to be sent
          // back for: every request in a wave was told the same list to avoid.
          : listingFor(name, "Every job starts with a leak somebody found late."),
      );
      return {
        custom_id: request.custom_id,
        result: { type: "succeeded", message: { stop_reason: "end_turn", content: [{ type: "text", text }] } },
      };
    });
    return new Response(jsonl(rows), { status: 200, headers: { "content-type": "application/binary" } });
  }

  // The in-process second pass, at full price, for a listing the review threw
  // back.
  if (url.endsWith("/v1/messages") && method === "POST") {
    directCalls += 1;
    const body = JSON.parse(String(init?.body));
    const name = nameIn(body.messages[0].content);
    return json({
      id: "msg_retry",
      type: "message",
      role: "assistant",
      model: body.model,
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify(listingFor(name, `A second pass for ${name}.`)) }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });
  }

  return realFetch(input as RequestInfo, init);
}) as typeof fetch;

async function main(): Promise<void> {
  const { db } = await import("../src/lib/db");
  const { advanceBatch } = await import("../src/lib/import-pipeline");

  const category = await db.category.findFirstOrThrow({ select: { id: true } });
  const city = await db.city.findFirstOrThrow({ select: { id: true } });

  const batch = await db.importBatch.create({
    data: {
      name: "wave check",
      status: "WRITING",
      categoryId: category.id,
      cityIds: JSON.stringify([city.id]),
      perCity: 3,
    },
  });

  const names = ["Ridge Plumbing", "Harbor Plumbing", "Vale Plumbing", "Crest Plumbing"];
  for (const [index, name] of names.entries()) {
    await db.importItem.create({
      data: {
        batchId: batch.id,
        cityId: city.id,
        name,
        status: "ENRICHED",
        gmbRank: index + 1,
        rating: 4.8,
        reviewCount: 120 + index,
        website: `https://${name.toLowerCase().replace(/\s+/g, "")}.com`,
        phone: "+1 212 555 0100",
        email: `office@${name.toLowerCase().replace(/\s+/g, "")}.com`,
        addressLine: "1 Main Street",
        raw: JSON.stringify({ categoryName: "Plumber", openingHours: null }),
        site: JSON.stringify({ summary: "A plumbing company.", text: "We fix pipes. ".repeat(40), yearFounded: 1998, licenseNumbers: [], social: {} }),
      },
    });
  }

  const first = await advanceBatch(batch.id);
  console.log(`submit: ${first.note}`);
  const queued = await db.importBatch.findUniqueOrThrow({ where: { id: batch.id }, select: { writerBatchId: true } });
  console.log(`  wave id stored: ${queued.writerBatchId}`);
  console.log(`  requests sent: ${submitted.length}`);
  console.log(`  items marked WRITING: ${await db.importItem.count({ where: { batchId: batch.id, status: "WRITING" } })}`);

  const second = await advanceBatch(batch.id);
  console.log(`collect: ${second.note}`);
  console.log(`  second passes sent directly: ${directCalls}`);

  const after = await db.importItem.findMany({
    where: { batchId: batch.id },
    orderBy: { gmbRank: "asc" },
    select: { name: true, status: true, attempts: true, seoScore: true, draft: true, reason: true },
  });
  for (const item of after) {
    const draft = item.draft ? (JSON.parse(item.draft) as { slug: string }) : null;
    console.log(
      `  ${item.name}: ${item.status} attempts=${item.attempts} score=${item.seoScore} slug=${draft?.slug ?? "-"}${item.reason ? ` reason=${item.reason.slice(0, 60)}` : ""}`,
    );
  }

  const counters = await db.importBatch.findUniqueOrThrow({
    where: { id: batch.id },
    select: { written: true, failed: true, writerBatchId: true, status: true },
  });
  console.log(`  batch: written=${counters.written} failed=${counters.failed} wave=${counters.writerBatchId ?? "cleared"} status=${counters.status}`);

  // Nothing left to write, so the next tick moves the batch on.
  await db.importItem.updateMany({ where: { batchId: batch.id, status: "ENRICHED" }, data: { status: "WRITTEN" } });
  const third = await advanceBatch(batch.id);
  console.log(`next: ${third.note}`);

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
