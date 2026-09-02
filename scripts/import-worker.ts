import { db } from "../src/lib/db";
import { advanceBatch } from "../src/lib/import-pipeline";

// The batch runner. It lives in its own container rather than inside a request
// so a batch survives a deploy, a browser tab closing and a Next.js restart.
// One batch at a time, on purpose: Apify and Anthropic both charge per call and
// a runaway loop is expensive rather than merely slow.

const IDLE_MS = Number(process.env.IMPORT_POLL_MS ?? 10_000);
const ACTIVE = ["QUEUED", "SCRAPING", "ENRICHING", "WRITING", "PUBLISHING"];

let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`==> ${signal}, finishing the current step then stopping`);
    stopping = true;
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function tick(): Promise<boolean> {
  const batch = await db.importBatch.findFirst({
    where: { status: { in: ACTIVE } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, status: true },
  });
  if (!batch) return false;

  const before = batch.status;
  try {
    const result = await advanceBatch(batch.id);
    if (result.changed || before === "SCRAPING") {
      console.log(`[${batch.name}] ${before.toLowerCase()} -> ${result.note}`);
    }
    return result.changed;
  } catch (error) {
    // advanceBatch marks its own failures; anything reaching here is a bug or a
    // dropped connection, and the loop should not die of it.
    console.error(`[${batch.name}] unhandled:`, error instanceof Error ? error.message : error);
    await sleep(5_000);
    return false;
  }
}

async function main(): Promise<void> {
  console.log("==> import worker ready");
  while (!stopping) {
    const busy = await tick();
    // A step that changed something is followed immediately; an idle loop waits,
    // which is most of the time an Apify run is still going.
    await sleep(busy ? 250 : IDLE_MS);
  }
  await db.$disconnect();
  console.log("==> import worker stopped");
}

main().catch(async (error) => {
  console.error("import worker crashed:", error);
  await db.$disconnect();
  process.exit(1);
});
