// The website-reading stage, end to end, against a copy of the database, a
// stubbed Anthropic and stubbed websites.
//
// Same reasoning as check-write-wave: the wave is queued on one tick and read
// on another, and the cases that matter are the ones where a company falls out
// of it. A site that does not answer, a site with nothing on it, and a request
// the model could not answer all have to leave the company enriched with
// whatever the parser found rather than stuck or skipped.

import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const copy = join(tmpdir(), `enrich-check-${Date.now()}.db`);
copyFileSync("prisma/dev.db", copy);
process.env.DATABASE_URL = `file:${copy}`;
process.env.ANTHROPIC_API_KEY = "sk-ant-not-a-real-key";

const BATCH_ID = "msgbatch_enrich_check";
const RESULTS_URL = `https://api.anthropic.com/v1/messages/batches/${BATCH_ID}/results`;

const page = (name: string) => `<!doctype html><html><head><title>${name}</title>
<meta name="description" content="${name} has been fixing pipes in New York since 1998."></head>
<body><h1>${name}</h1>
<p>${`${name} is a family plumbing company working across the five boroughs. We handle emergency calls, slab leaks, repiping and water heaters, and we have done since 1998. `.repeat(6)}</p>
<a href="mailto:office@${name.toLowerCase().replace(/\s+/g, "")}.com">Email us</a>
</body></html>`;

const extractionFor = (name: string) => ({
  staff: [{ name: "Dana Reyes", role: "Owner", bio: "", yearsExperience: 22, credentials: ["Master plumber"] }],
  yearFounded: 1998,
  employeeCount: "12",
  licenseNumbers: ["NY-114522"],
  certifications: [],
  paymentMethods: ["Visa", "Cash"],
  awards: [],
  brands: ["Rheem"],
  insured: "yes",
  warrantyTerms: "1 year on labour",
  services: ["Drain cleaning", "Water heaters"],
  specialties: ["Slab leaks"],
  areasServed: ["Brooklyn", "Queens"],
  serviceRadiusKm: 30,
  hours: [],
  bbbRating: "A+",
  bbbAccreditedSince: 2009,
  inspectionFee: "",
  manufacturerWarranty: "",
  bestFor: "Old buildings",
  tagline: `${name} keeps the water where it belongs`,
  postalCode: "11201",
  emergency: "yes",
  financing: "no",
  freeEstimates: "yes",
  phone: "+1 212 555 0100",
  email: "",
  addressLine: "1 Main Street, Brooklyn",
  summary: `${name} is a family plumbing company working across the five boroughs.`,
});

let submitted: { custom_id: string; params: { messages: { content: string }[] } }[] = [];
const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

  if (url.endsWith("/v1/messages/batches") && method === "POST") {
    submitted = JSON.parse(String(init?.body)).requests;
    return json({ id: BATCH_ID, processing_status: "in_progress", results_url: null });
  }
  if (url.endsWith(`/v1/messages/batches/${BATCH_ID}`)) {
    return json({ id: BATCH_ID, processing_status: "ended", results_url: RESULTS_URL });
  }
  if (url === RESULTS_URL) {
    const rows = [...submitted].reverse().map((request, index) => {
      const name = /Company: ([^\n]+)/.exec(request.params.messages[0]!.content)?.[1] ?? "Company";
      if (index === 0) {
        return {
          custom_id: request.custom_id,
          result: { type: "expired" },
        };
      }
      return {
        custom_id: request.custom_id,
        result: {
          type: "succeeded",
          message: {
            stop_reason: "end_turn",
            content: [{ type: "text", text: JSON.stringify(extractionFor(name)) }],
          },
        },
      };
    });
    return new Response(rows.map((row) => JSON.stringify(row)).join("\n") + "\n", {
      status: 200,
      headers: { "content-type": "application/binary" },
    });
  }

  // The stubbed websites. One of them is down, one of them is a shell.
  if (url.includes("ridgeplumbing.test")) return new Response(page("Ridge Plumbing"), { headers: { "content-type": "text/html" } });
  if (url.includes("harborplumbing.test")) return new Response(page("Harbor Plumbing"), { headers: { "content-type": "text/html" } });
  if (url.includes("valeplumbing.test")) return new Response(page("Vale Plumbing"), { headers: { "content-type": "text/html" } });
  if (url.includes("crestplumbing.test")) return new Response("down", { status: 503 });
  if (url.includes("shellplumbing.test")) return new Response("<html><body><p>Home</p></body></html>", { headers: { "content-type": "text/html" } });

  return realFetch(input as RequestInfo, init);
}) as typeof fetch;

async function main(): Promise<void> {
  const { db } = await import("../src/lib/db");
  const { advanceEnrichment } = await import("../src/lib/enrich-run");

  const category = await db.category.findFirstOrThrow({ select: { id: true } });
  const city = await db.city.findFirstOrThrow({ select: { id: true } });

  const companies = [
    ["Ridge Plumbing", "https://ridgeplumbing.test"],
    ["Harbor Plumbing", "https://harborplumbing.test"],
    ["Vale Plumbing", "https://valeplumbing.test"],
    ["Crest Plumbing", "https://crestplumbing.test"],
    ["Shell Plumbing", "https://shellplumbing.test"],
    ["Quiet Plumbing", null],
  ] as const;

  const ids: string[] = [];
  for (const [name, website] of companies) {
    const business = await db.business.create({
      data: {
        name,
        slug: `${name.toLowerCase().replace(/\s+/g, "-")}-check`,
        categoryId: category.id,
        cityId: city.id,
        website,
      },
      select: { id: true },
    });
    ids.push(business.id);
  }

  const run = await db.enrichRun.create({
    data: { businessIds: JSON.stringify(ids), requested: ids.length, useModel: true, status: "QUEUED" },
  });

  console.log(`submit: ${(await advanceEnrichment(run.id)).note}`);
  const queued = await db.enrichRun.findUniqueOrThrow({
    where: { id: run.id },
    select: { extractBatchId: true, pending: true, processed: true },
  });
  console.log(`  wave id stored: ${queued.extractBatchId}`);
  console.log(`  requests sent: ${submitted.length}`);
  console.log(`  waiting on: ${(JSON.parse(queued.pending ?? "[]") as unknown[]).length} companies`);
  console.log(`  processed so far: ${queued.processed}`);

  console.log(`collect: ${(await advanceEnrichment(run.id)).note}`);

  const after = await db.enrichRun.findUniqueOrThrow({
    where: { id: run.id },
    select: { processed: true, fieldsFilled: true, extractBatchId: true, pending: true, report: true, status: true },
  });
  console.log(`  processed=${after.processed} fields=${after.fieldsFilled} wave=${after.extractBatchId ?? "cleared"} pending=${after.pending ?? "cleared"}`);
  for (const entry of JSON.parse(after.report ?? "[]") as { business: string; filled: string[]; note?: string }[]) {
    console.log(`  ${entry.business}: ${entry.filled.length} fields${entry.note ? ` (${entry.note.slice(0, 70)})` : ""}`);
  }

  console.log(`next: ${(await advanceEnrichment(run.id)).note}`);

  const filled = await db.business.findMany({
    where: { id: { in: ids } },
    select: { name: true, yearFounded: true, warrantyTerms: true, bbbRating: true, email: true },
    orderBy: { name: "asc" },
  });
  console.log("\nwhat landed on the records:");
  for (const row of filled) {
    console.log(`  ${row.name}: founded=${row.yearFounded ?? "-"} warranty=${row.warrantyTerms ?? "-"} bbb=${row.bbbRating ?? "-"} email=${row.email ?? "-"}`);
  }

  // The parser-only run takes a different path through the same code: no wave,
  // no wait, a small slice done in place.
  const plain = await db.business.create({
    data: {
      name: "Ridge Plumbing",
      slug: "ridge-plumbing-parser-check",
      categoryId: category.id,
      cityId: city.id,
      website: "https://ridgeplumbing.test",
    },
    select: { id: true },
  });
  const parserRun = await db.enrichRun.create({
    data: { businessIds: JSON.stringify([plain.id]), requested: 1, useModel: false, status: "QUEUED" },
  });
  console.log(`\nwithout the model: ${(await advanceEnrichment(parserRun.id)).note}`);
  console.log(`  then: ${(await advanceEnrichment(parserRun.id)).note}`);

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
