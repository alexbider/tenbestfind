/**
 * Submits everything the sitemap offers that has changed since the last run.
 *
 * The server actions ping IndexNow as an editor saves, which covers the normal
 * case. This covers the rest: the first submission of a brand new site, a
 * batch import that wrote a thousand profiles, a spell where the engine was
 * down, and anything changed by a script rather than by a person.
 *
 * It reads from the sitemap rather than from the tables directly, so it can
 * only ever submit a URL the site is already willing to have indexed. The two
 * agree by construction instead of by being kept in step.
 *
 * The watermark is the timestamp of the last successful submission. A first
 * run has none, which is correct: everything is new and everything is sent.
 *
 *   npx tsx scripts/indexnow.ts          dry run
 *   npx tsx scripts/indexnow.ts --yes    submit
 *   npx tsx scripts/indexnow.ts --all    ignore the watermark
 */
import { db } from "../src/lib/db";
import { indexNowKey, indexNowKeyLocation, submitToIndexNow } from "../src/lib/indexnow";
import { sitemapChild, sitemapIndex } from "../src/lib/sitemap";

const write = process.argv.includes("--yes");
const everything = process.argv.includes("--all");

const WATERMARK = "indexnow.submittedAt";

async function readWatermark(): Promise<Date | null> {
  if (everything) return null;
  const row = await db.setting.findUnique({ where: { key: WATERMARK } });
  if (!row?.value) return null;
  const parsed = new Date(String(JSON.parse(row.value)));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function saveWatermark(at: Date): Promise<void> {
  const value = JSON.stringify(at.toISOString());
  await db.setting.upsert({
    where: { key: WATERMARK },
    create: { key: WATERMARK, value, groupName: "seo", label: "IndexNow last submission" },
    update: { value, groupName: "seo", label: "IndexNow last submission" },
  });
}

async function main(): Promise<void> {
  // An empty index means indexing or the sitemap is switched off in the admin,
  // and submitting URLs while robots.txt says to stay away is a contradiction.
  const index = await sitemapIndex();
  if (index.length === 0) {
    console.log("indexnow: the sitemap is empty, nothing to submit");
    return;
  }

  const since = await readWatermark();
  const startedAt = new Date();

  // Taken from the index rather than from the list of kinds, because any
  // child can be split across several files and only the index knows how many.
  const children = index.map((child) => child.path.replace(/^\/sitemaps\/|\.xml$/g, ""));

  const paths: string[] = [];
  let seen = 0;
  for (const child of children) {
    const entries = await sitemapChild(child);
    if (!entries) continue;
    seen += entries.length;
    for (const entry of entries) {
      if (since && entry.lastModified && entry.lastModified <= since) continue;
      paths.push(entry.path);
    }
  }

  const unique = [...new Set(paths)];
  console.log(
    `indexnow: ${unique.length} of ${seen} URLs changed` +
      (since ? ` since ${since.toISOString()}` : " (first run, submitting everything)"),
  );

  if (unique.length === 0) return;

  if (!write) {
    for (const path of unique.slice(0, 20)) console.log(`  would submit ${path}`);
    if (unique.length > 20) console.log(`  ...and ${unique.length - 20} more`);
    console.log("dry run. Pass --yes to submit.");
    return;
  }

  const result = await submitToIndexNow(unique);
  if (result.status === "skipped") {
    console.log(`indexnow: not submitted (${result.reason})`);
    return;
  }

  console.log(`indexnow: submitted ${result.urls} URLs, HTTP ${result.httpStatus}`);
  console.log(`indexnow: key file ${indexNowKeyLocation(await indexNowKey())}`);

  // 200 and 202 are both acceptance. Anything else means the engine did not
  // take the batch, and moving the watermark would quietly lose it.
  if (result.httpStatus === 200 || result.httpStatus === 202) {
    await saveWatermark(startedAt);
  } else {
    console.log("indexnow: watermark left alone so the next run retries these");
  }
}

main()
  .catch((error) => {
    // A search engine having a bad day is not a reason to fail a deploy.
    console.error(`indexnow: ${String(error)}`);
  })
  .finally(() => db.$disconnect());
