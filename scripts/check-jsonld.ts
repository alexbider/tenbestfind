// The JSON-LD every published page will emit, audited before a release.
//
// The runtime guard in <JsonLd> logs a problem when a page renders, which is
// only useful if somebody is reading the logs. This rebuilds the same graphs
// from the same builders the templates use, over every published company and
// every published ranking, and exits non-zero when any of them carries
// something structured data must never state: a reserved domain, unfinished
// placeholder text, the string "null", an empty array, or an aggregateRating
// with no reviews behind it.
//
//   npx tsx -r ./scripts/_server-only-stub.cjs scripts/check-jsonld.ts
//
// It writes nothing. A failure here is a data problem to fix in the record, not
// markup to paper over in a template.

import { db } from "../src/lib/db";
import { auditSchema, type SchemaProblem } from "../src/lib/schema-audit";
import { businessEntity, rankingListEntity } from "../src/lib/schema";
import { businessSchemaInput } from "../src/lib/schema-entities";
import { routes } from "../src/lib/urls";

type Failure = { page: string; problems: SchemaProblem[] };

async function main(): Promise<void> {
  const failures: Failure[] = [];
  let checked = 0;

  const businesses = await db.business.findMany({
    where: { status: "PUBLISHED" },
    include: {
      category: true,
      credentials: { orderBy: { sortOrder: "asc" } },
      photos: { orderBy: { sortOrder: "asc" }, take: 1 },
      areas: { include: { city: true }, orderBy: { primary: "desc" } },
      city: { include: { region: { include: { country: true } } } },
    },
  });

  for (const business of businesses) {
    const page = routes.business(business.slug);
    const entity = businessEntity(
      businessSchemaInput(business, {
        cityName: business.city?.name,
        regionCode: business.city?.region.code,
        countryCode: business.city?.region.country.code,
        image: business.photos[0]?.url ?? business.logoUrl,
        areaServed: business.areas
          .map((area) => area.city?.name)
          .filter((name): name is string => Boolean(name)),
      }),
    );
    const problems = auditSchema(entity, page);
    checked += 1;
    if (problems.length > 0) failures.push({ page, problems });
  }

  const rankings = await db.ranking.findMany({
    where: { status: "PUBLISHED" },
    include: {
      category: true,
      city: { include: { region: { include: { country: true } } } },
      entries: {
        where: { business: { status: "PUBLISHED" } },
        orderBy: { position: "asc" },
        include: {
          business: {
            include: {
              category: true,
              credentials: { orderBy: { sortOrder: "asc" } },
              areas: { include: { city: true }, orderBy: { primary: "desc" } },
            },
          },
        },
      },
    },
  });

  for (const ranking of rankings) {
    const city = ranking.city;
    // A ranking always has a city; the relation is optional in the schema only
    // because the row is written before the city is attached.
    if (!city) continue;
    const page = routes.ranking(
      city.region.country.code,
      city.region.slug,
      city.slug,
      ranking.category.slug,
    );
    const list = rankingListEntity({
      path: page,
      name: ranking.title ?? `${ranking.category.name} in ${city.name}`,
      businesses: ranking.entries.map((entry) =>
        businessSchemaInput(entry.business, {
          cityName: city.name,
          regionCode: city.region.code,
          countryCode: city.region.country.code,
          categorySlug: ranking.category.slug,
          areaServed: entry.business.areas
            .map((area) => area.city?.name)
            .filter((name): name is string => Boolean(name)),
        }),
      ),
    });
    const problems = auditSchema(list, page);
    checked += 1;
    if (problems.length > 0) failures.push({ page, problems });
  }

  console.log(`${checked} graphs checked`);
  for (const failure of failures) {
    console.log(`\n${failure.page}`);
    for (const row of failure.problems) console.log(`  ${row.path}: ${row.problem}`);
  }
  console.log(failures.length === 0 ? "\nall clean" : `\n${failures.length} pages to fix`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
