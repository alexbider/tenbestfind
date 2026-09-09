// Nothing that says "fill this in later" goes out on a page.
//
// Two reserved URLs shipped to production as `sameAs` on the editor profiles,
// which is the worst place for them: those three pages exist to show that real
// people stand behind the rankings, and `sameAs` is the property that says the
// page at the other end is that person. Said about example.com it is simply
// false, and a false claim reads worse than a missing one.
//
// This walks the fields that end up in emitted JSON-LD or in a public href and
// fails on anything reserved or obviously unfinished.
//
//   npx tsx scripts/check-placeholders.ts           # reports, writes nothing
//   npx tsx scripts/check-placeholders.ts --prune   # also drops the bad
//                                                   # profile links it finds
//
// Only profile links are pruned. Everything else is reported and left alone,
// because a business website or an ogImage that looks wrong is a question for
// whoever set it, and a check that quietly edits data nobody asked it to touch
// is worse than the placeholder.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { db } from "../src/lib/db";
import { parseJson } from "../src/lib/json";

/**
 * RFC 2606 reserves example.com, .org and .net for documentation, so a real
 * page is never behind one. The words are the other half: a URL or a title
 * carrying "lorem", "TODO" or "placeholder" was never finished.
 */
const RESERVED = /\b(?:[a-z0-9-]+\.)?example\.(?:com|org|net)\b/i;
const UNFINISHED = /\b(?:lorem ipsum|lorem|todo|placeholder|tbd|xxx+)\b/i;

const suspect = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (RESERVED.test(value)) return "a reserved documentation domain";
  if (UNFINISHED.test(value)) return "unfinished placeholder text";
  return null;
};

type Finding = { where: string; value: string; why: string };
const findings: Finding[] = [];

const check = (where: string, value: string | null | undefined): void => {
  const why = suspect(value);
  if (why) findings.push({ where, value: value!.slice(0, 90), why });
};

/* --------------------------------------------------------------- the seed */

// Caught here rather than after it has seeded a fresh environment, which is
// how the editor links got out: they were fixture data that nobody replaced.
function checkSeedFiles(): void {
  const dir = join(process.cwd(), "prisma", "data");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".ts"))) {
    const lines = readFileSync(join(dir, file), "utf8").split("\n");
    lines.forEach((line, index) => {
      // Only lines that assign something URL-shaped. A comment mentioning
      // example.com to explain this rule is not a violation of it.
      if (!/\b(url|website|href|link|image|portrait|sameAs)\b/i.test(line)) return;
      if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) return;
      check(`prisma/data/${file}:${index + 1}`, line.trim());
    });
  }
}

/* ----------------------------------------------------------- the database */

async function checkDatabase(): Promise<void> {
  const [people, businesses, guides, meta, settings, pages] = await Promise.all([
    db.person.findMany({ select: { slug: true, name: true, links: true, portrait: true } }),
    db.business.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, website: true, logoUrl: true },
    }),
    db.guide.findMany({ select: { slug: true, sources: { select: { url: true, label: true } } } }),
    db.seoMeta.findMany({ select: { entityType: true, entityId: true, canonical: true, ogImage: true } }),
    db.setting.findMany({ where: { key: { startsWith: "seo." } }, select: { key: true, value: true } }),
    db.page.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, body: true } }),
  ]);

  for (const person of people) {
    for (const link of parseJson<{ url?: string }[]>(person.links, [])) {
      check(`person ${person.slug} sameAs`, link?.url);
    }
    check(`person ${person.slug} portrait`, person.portrait);
  }

  for (const business of businesses) {
    check(`business ${business.slug} website`, business.website);
    check(`business ${business.slug} logo`, business.logoUrl);
  }

  for (const guide of guides) {
    for (const source of guide.sources) check(`guide ${guide.slug} source`, source.url);
  }

  for (const record of meta) {
    check(`seo ${record.entityType}/${record.entityId} canonical`, record.canonical);
    check(`seo ${record.entityType}/${record.entityId} ogImage`, record.ogImage);
  }

  for (const setting of settings) check(`setting ${setting.key}`, setting.value);

  // A page body is prose, so only its links are checked: an article about
  // reading a contractor's example estimate is allowed to say "for example".
  for (const page of pages) {
    for (const match of (page.body ?? "").matchAll(/https?:\/\/[^\s"'<>)]+/g)) {
      check(`page ${page.slug} link`, match[0]);
    }
  }
}

/**
 * Drops the reserved links off the people who have them.
 *
 * The fixture that produced them is gone, but the rows it seeded are still in
 * every database it ever seeded, and cleaning the source does not clean those.
 * Idempotent, so it does real work once and nothing afterwards.
 */
async function prune(): Promise<number> {
  const people = await db.person.findMany({ select: { id: true, slug: true, links: true } });
  let pruned = 0;

  for (const person of people) {
    const links = parseJson<{ url?: string }[]>(person.links, []);
    if (!Array.isArray(links) || links.length === 0) continue;

    const kept = links.filter((link) => !suspect(typeof link?.url === "string" ? link.url : null));
    if (kept.length === links.length) continue;

    await db.person.update({
      where: { id: person.id },
      data: { links: kept.length > 0 ? JSON.stringify(kept) : null },
    });
    console.log(`  fixed  ${person.slug}: dropped ${links.length - kept.length} of ${links.length} profile links`);
    pruned += links.length - kept.length;
  }

  return pruned;
}

async function main(): Promise<void> {
  checkSeedFiles();

  try {
    if (process.argv.includes("--prune")) await prune();
    await checkDatabase();
  } catch (error) {
    // A fresh checkout with no database yet still gets the seed scan, which is
    // the half that catches a placeholder before it exists anywhere.
    console.log(`  note   database not readable, checked the seed files only (${(error as Error).message})`);
  }

  if (findings.length === 0) {
    console.log("  ok     nothing unfinished in anything that reaches a page");
    process.exit(0);
  }

  for (const finding of findings) {
    console.log(`  BAD    ${finding.where}`);
    console.log(`         ${finding.value}`);
    console.log(`         ${finding.why}`);
  }
  console.log(`\n${findings.length} placeholder${findings.length === 1 ? "" : "s"} would reach a public page.`);
  process.exit(1);
}

main();
