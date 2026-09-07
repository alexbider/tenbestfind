import { db } from "../src/lib/db";
import { advanceBatch } from "../src/lib/import-pipeline";
import { advanceRefresh } from "../src/lib/reviews";
import { advanceEnrichment } from "../src/lib/enrich-run";
import { ACTIVE_JOB_STATUSES, advanceGuideJob } from "../src/lib/guide-jobs";
import { flushIndexQueue, refreshIndexingCheck } from "../src/lib/google-indexing";
import { ACTIVE_PLAN_STATUSES, advanceTopicPlan, ensureWeeklyPlan } from "../src/lib/topic-plans";

// The batch runner. It lives in its own container rather than inside a request
// so a batch survives a deploy, a browser tab closing and a Next.js restart.
// One batch at a time, on purpose: Apify and Anthropic both charge per call and
// a runaway loop is expensive rather than merely slow.

const IDLE_MS = Number(process.env.IMPORT_POLL_MS ?? 10_000);
/** How often the Google index queue is drained. Its quota is per day, not per minute. */
const INDEX_EVERY_MS = Number(process.env.INDEX_FLUSH_MS ?? 15 * 60_000);
/** How often the calendar is checked for a week that has not been planned yet. */
const PLAN_EVERY_MS = Number(process.env.TOPIC_CHECK_MS ?? 60 * 60_000);
const ACTIVE = ["QUEUED", "SCRAPING", "ENRICHING", "WRITING", "PUBLISHING"];
const REFRESHING = ["QUEUED", "RUNNING"];

let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`==> ${signal}, finishing the current step then stopping`);
    stopping = true;
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Review refreshes are short and cheap, so they go ahead of a long import. */
async function tickRefresh(): Promise<boolean> {
  const refresh = await db.reviewRefresh.findFirst({
    where: { status: { in: REFRESHING } },
    orderBy: { createdAt: "asc" },
    select: { id: true, status: true },
  });
  if (!refresh) return false;

  const before = refresh.status;
  try {
    const result = await advanceRefresh(refresh.id);
    if (result.changed) console.log(`[reviews] ${before.toLowerCase()} -> ${result.note}`);
    return result.changed;
  } catch (error) {
    console.error("[reviews] unhandled:", error instanceof Error ? error.message : error);
    await sleep(5_000);
    return false;
  }
}

/** Website enrichment: cheaper than an import, slower than a review refresh. */
async function tickEnrichment(): Promise<boolean> {
  const run = await db.enrichRun.findFirst({
    where: { status: { in: REFRESHING } },
    orderBy: { createdAt: "asc" },
    select: { id: true, status: true },
  });
  if (!run) return false;

  const before = run.status;
  try {
    const result = await advanceEnrichment(run.id);
    if (result.changed) console.log(`[enrich] ${before.toLowerCase()} -> ${result.note}`);
    return result.changed;
  } catch (error) {
    console.error("[enrich] unhandled:", error instanceof Error ? error.message : error);
    await sleep(5_000);
    return false;
  }
}

/**
 * Writing a guide. Ahead of an import because somebody is usually watching a
 * job they just started, and behind the cheap ticks because it is neither
 * cheap nor quick.
 */
async function tickGuideJob(): Promise<boolean> {
  const job = await db.guideJob.findFirst({
    where: { status: { in: ACTIVE_JOB_STATUSES } },
    orderBy: { createdAt: "asc" },
    select: { id: true, topic: true, status: true },
  });
  if (!job) return false;

  const before = job.status;
  try {
    const result = await advanceGuideJob(job.id);
    if (result.changed) console.log(`[guide] ${job.topic}: ${before.toLowerCase()} -> ${result.note}`);
    return result.changed;
  } catch (error) {
    console.error("[guide] unhandled:", error instanceof Error ? error.message : error);
    await sleep(5_000);
    return false;
  }
}

/**
 * Looking for topics. Behind the guide writer because a plan is not urgent and
 * a job someone just started is, and ahead of an import because a plan step is
 * seconds where an Apify run is minutes.
 */
async function tickTopicPlan(): Promise<boolean> {
  const plan = await db.topicPlan.findFirst({
    where: { status: { in: ACTIVE_PLAN_STATUSES } },
    orderBy: { createdAt: "asc" },
    select: { id: true, status: true, weekOf: true },
  });
  if (!plan) return false;

  const before = plan.status;
  try {
    const result = await advanceTopicPlan(plan.id);
    if (result.changed) {
      console.log(`[topics] week of ${plan.weekOf.toISOString().slice(0, 10)}: ${before.toLowerCase()} -> ${result.note}`);
    }
    return result.changed;
  } catch (error) {
    console.error("[topics] unhandled:", error instanceof Error ? error.message : error);
    await sleep(5_000);
    return false;
  }
}

/**
 * Opens the week's plan once the configured day has come. Hourly, because the
 * question it answers changes once a week and asking it more often costs a
 * query for nothing.
 */
let nextPlanCheck = Date.now() + 120_000;

async function tickWeeklyPlan(): Promise<void> {
  if (Date.now() < nextPlanCheck) return;
  nextPlanCheck = Date.now() + PLAN_EVERY_MS;
  try {
    const id = await ensureWeeklyPlan();
    if (id) console.log(`[topics] opened this week's plan (${id})`);
  } catch (error) {
    console.error("[topics] weekly check:", error instanceof Error ? error.message : error);
  }
}

/**
 * Drains the Google index queue on its own clock rather than in the busy loop.
 * The quota is 200 a day, so there is nothing to gain from checking often and
 * something to lose from spending it all in the first minute of a deploy.
 */
let nextIndexFlush = Date.now() + 60_000;

async function tickIndexQueue(): Promise<void> {
  if (Date.now() < nextIndexFlush) return;
  nextIndexFlush = Date.now() + INDEX_EVERY_MS;

  // Before spending any of the quota, make sure the account is still one
  // Google accepts. It only does real work once a day, and it is what keeps
  // the light on the admin honest without anybody pressing anything.
  try {
    const check = await refreshIndexingCheck();
    if (check) console.log(`[index] access check: ${check.ok ? "ok" : "FAILED"} ${check.status}`);
  } catch (error) {
    console.error("[index] access check:", error instanceof Error ? error.message : error);
  }

  try {
    const result = await flushIndexQueue(50);
    if (result.sent > 0 || result.failed > 0) {
      console.log(`[index] sent ${result.sent}, failed ${result.failed}, ${result.remaining} queued (${result.note})`);
    }
  } catch (error) {
    console.error("[index] unhandled:", error instanceof Error ? error.message : error);
  }
}

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
    await tickIndexQueue();
    await tickWeeklyPlan();
    const busy =
      (await tickRefresh()) ||
      (await tickEnrichment()) ||
      (await tickGuideJob()) ||
      (await tickTopicPlan()) ||
      (await tick());
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
