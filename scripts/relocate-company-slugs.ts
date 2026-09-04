// Moves every company profile to its location-aware URL.
//
//   /companies/1-tom-plumber/  ->  /companies/1-tom-plumber-columbus-oh/
//
// Run once. It is idempotent: a profile already at its canonical slug is left
// alone, and re-running it changes nothing.
//
// No redirects are written. The site is early enough that these URLs are not
// meaningfully indexed, and a redirect table full of rows nothing ever requests
// is worse than none: it hides the ones that matter. Any rename after this one
// records a redirect automatically, which is what that machinery is for.
//
//   npx tsx scripts/relocate-company-slugs.ts          # says what it would do
//   npx tsx scripts/relocate-company-slugs.ts --write   # does it

import { db } from "../src/lib/db";
import { uniqueCompanySlug } from "../src/lib/company-slug";

async function main(): Promise<void> {
  const write = process.argv.includes("--write");

  const businesses = await db.business.findMany({
    include: { city: { include: { region: true } } },
    orderBy: { createdAt: "asc" },
  });

  const claimed = new Set<string>();
  let moved = 0;
  let already = 0;
  let stranded = 0;

  for (const business of businesses) {
    if (!business.city) {
      // Without a city there is no location to put in the URL. The profile
      // keeps the slug it has and is reported, because a company with no city
      // is a data problem rather than a naming one.
      stranded += 1;
      console.log(`  no city    ${business.slug}  (${business.name})`);
      continue;
    }

    const slug = await uniqueCompanySlug(
      business.name,
      business.city,
      business.city.region,
      async (candidate) => {
        const row = await db.business.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        return row !== null && row.id !== business.id;
      },
      claimed,
    );
    claimed.add(slug);

    if (slug === business.slug) {
      already += 1;
      continue;
    }

    console.log(`  ${business.slug}  ->  ${slug}`);
    if (write) await db.business.update({ where: { id: business.id }, data: { slug } });
    moved += 1;
  }

  console.log(
    `\n${moved} to move, ${already} already right${stranded ? `, ${stranded} with no city` : ""}.`,
  );
  if (!write && moved > 0) console.log("Nothing was written. Pass --write to do it.");

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
