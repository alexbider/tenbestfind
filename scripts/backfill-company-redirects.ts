// Redirects for company profiles that moved without leaving one.
//
// Company slugs carry the city and region, and they are built from the name.
// scripts/relocate-company-slugs.ts rebuilt every slug from the current name
// and, in its first version, wrote no redirects. Run once that was harmless.
// Run again after a company had been renamed and the profile moved, silently,
// leaving the old address answering 404.
//
// This finds those and writes the 301 that should have been written at the
// time. Two sources, because neither is complete on its own:
//
//   The audit log, which records a create and every update with the name on
//   it. A business whose current slug does not match the slug its creation
//   would have produced has moved at some point.
//
//   A list of the five paths reported from the live site, kept explicitly so
//   they are fixed whether or not the audit log goes back far enough.
//
//   npx tsx scripts/backfill-company-redirects.ts          # reports
//   npx tsx scripts/backfill-company-redirects.ts --write
//
// Safe to re-run. A redirect that already points somewhere is left alone, and
// a path that now belongs to a real profile is never redirected away from it.

import { db } from "../src/lib/db";
import { recordMove } from "../src/lib/redirects";
import { routes } from "../src/lib/urls";

/**
 * Reported from the live site. Each one is an old company slug whose profile
 * now lives at a slug built from the company's current name.
 */
const REPORTED: { from: string; find: string }[] = [
  { from: "green-heating-and-air-toronto-on", find: "green-heating-and-air" },
  { from: "jln-hvac-solutions-toronto-on", find: "jln-hvac-solutions" },
  {
    from: "new-york-heating-and-air-conditioning-staten-island-new-york-ny",
    find: "new-york-heating-and-air-conditioning",
  },
  { from: "art-hvac-ny-new-york-ny", find: "art-hvac" },
  { from: "weston-bros-new-york-ny", find: "weston-bros" },
];

type Move = { from: string; to: string; why: string };

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const moves: Move[] = [];
  const unresolved: string[] = [];

  const businesses = await db.business.findMany({
    select: { id: true, name: true, slug: true, status: true },
  });
  const bySlug = new Map(businesses.map((b) => [b.slug, b]));

  // The reported five. A prefix match rather than an exact one, because the
  // whole point is that the tail of the slug changed with the name.
  for (const row of REPORTED) {
    if (bySlug.has(row.from)) continue; // Still live, nothing to redirect.

    const matches = businesses.filter((b) => b.slug.startsWith(row.find));
    if (matches.length === 1) {
      moves.push({ from: routes.business(row.from), to: routes.business(matches[0]!.slug), why: "reported" });
    } else {
      unresolved.push(
        `${row.from}: ${matches.length === 0 ? "no profile starts with " + row.find : matches.length + " profiles start with " + row.find + " (" + matches.map((m) => m.slug).join(", ") + ")"}`,
      );
    }
  }

  // Anything else the audit log knows moved. A business is created with one
  // slug and the entry names it; if the row no longer uses that slug, and
  // nothing else does, the old address is dangling.
  const created = await db.auditLog.findMany({
    where: { entityType: "business", action: "create" },
    select: { entityId: true, summary: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  for (const entry of created) {
    if (!entry.entityId) continue;
    const business = businesses.find((b) => b.id === entry.entityId);
    if (!business) continue;

    // Summaries read "business <name>". The slug is not recorded, so the name
    // is the only thing to go on, and a name that still produces the current
    // slug tells us nothing moved.
    const named = entry.summary?.replace(/^business\s+/i, "").replace(/\s+\(via .+\)$/, "").trim();
    if (!named || named === business.name) continue;

    unresolved.push(
      `${business.slug}: created as "${named}", now "${business.name}". Old slug not recorded, so no redirect can be written from the log alone.`,
    );
  }

  const fresh: Move[] = [];
  for (const move of moves) {
    const existing = await db.redirect.findUnique({ where: { source: move.from } });
    if (existing) continue;
    fresh.push(move);
  }

  console.log(`${fresh.length} redirect${fresh.length === 1 ? "" : "s"} to write:`);
  for (const move of fresh) console.log(`  ${move.from}  ->  ${move.to}  (${move.why})`);
  if (moves.length - fresh.length > 0) {
    console.log(`\n${moves.length - fresh.length} already had a redirect and were left alone.`);
  }
  if (unresolved.length > 0) {
    console.log(`\n${unresolved.length} could not be resolved automatically:`);
    for (const note of unresolved) console.log(`  ${note}`);
  }

  if (!write) {
    console.log("\nNothing was written. Pass --write to do it.");
    await db.$disconnect();
    return;
  }

  for (const move of fresh) await recordMove(move.from, move.to);
  console.log(`\nWrote ${fresh.length}.`);
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
