// Every company email on the site, checked, and the ones that were never an
// address cleared.
//
// Enrichment kept the first thing on a page that matched an email pattern. That
// included somebody else's address (press@google.com), the agency that built
// the site (admin@seocompanysantamonica.com), a placeholder nobody edited
// (user@domain.com) and a run of addresses that are a sentence read by a
// regular expression: are@risk.if, find@times.fortunately, soundly@night.we.
//
//   npx tsx -r ./scripts/_server-only-stub.cjs scripts/cleanup-emails.ts
//   npx tsx -r ./scripts/_server-only-stub.cjs scripts/cleanup-emails.ts --apply
//   ... --apply --dns     # also clears addresses whose domain does not resolve
//
// Without --apply nothing is written. The DNS pass is opt-in because it is one
// lookup per company and a network that is having a bad minute should not be
// able to empty the column.

import { db } from "../src/lib/db";
import { checkEmail, verifyEmail } from "../src/lib/email-quality";

const apply = process.argv.includes("--apply");
const useDns = process.argv.includes("--dns");

function hostOf(website: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website.startsWith("http") ? website : `https://${website}`).hostname;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const businesses = await db.business.findMany({
    where: { email: { not: null } },
    select: { id: true, name: true, slug: true, email: true, website: true },
    orderBy: { name: "asc" },
  });

  const bad: { slug: string; email: string; reason: string }[] = [];
  const review: { slug: string; email: string; reason: string }[] = [];
  let kept = 0;

  for (const business of businesses) {
    const site = hostOf(business.website);
    const verdict = useDns
      ? await verifyEmail(business.email, site).catch(() => checkEmail(business.email, site))
      : checkEmail(business.email, site);

    if (verdict.ok) {
      kept += 1;
      continue;
    }
    const row = { slug: business.slug, email: business.email!, reason: verdict.reason };
    // An agency domain is a judgement call, so it is reported for a person to
    // settle rather than cleared on a name alone.
    if ("review" in verdict && verdict.review) review.push(row);
    else bad.push(row);
  }

  console.log(`${businesses.length} companies have an email`);
  console.log(`${kept} look right, ${bad.length} do not, ${review.length} need a person\n`);

  for (const row of bad) console.log(`  ${row.email.padEnd(44)} ${row.reason}\n    ${row.slug}`);
  if (review.length > 0) {
    console.log(`\nreported rather than cleared:`);
    for (const row of review) console.log(`  ${row.email.padEnd(44)} ${row.reason}\n    ${row.slug}`);
  }

  if (!apply) {
    console.log(`\nnothing written. Pass --apply to clear ${bad.length} addresses.`);
    return;
  }

  for (const row of bad) {
    await db.business.update({
      where: { slug: row.slug },
      data: { email: null, emailSource: null },
    });
  }
  console.log(`\n${bad.length} addresses cleared. The ${review.length} reported ones are untouched.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
