// The city records enrichment invented, and what to do about them.
//
// recordNamedAreas used to create a city for any town name it read off a
// company's website. That turned regional municipalities ("York", "Halton",
// "Peel"), a province ("Ontario") and a run of neighbourhood names into places
// with a slug, a hub URL and companies listed as covering them. Enrichment no
// longer creates anything, so this clears what it left.
//
// A record qualifies only when every one of these is true: it is unpublished,
// it has no coordinates, no ranking, no company filed under it, no guide, no
// FAQ and no import item. Anything an editor has since touched fails one of
// those and is left alone.
//
//   npx tsx -r ./scripts/_server-only-stub.cjs scripts/cleanup-enrichment-cities.ts
//   npx tsx -r ./scripts/_server-only-stub.cjs scripts/cleanup-enrichment-cities.ts --apply
//
// Without --apply it prints the report and writes nothing. With it, the service
// area links are removed and the empty city rows are deleted.

import { db } from "../src/lib/db";

const apply = process.argv.includes("--apply");

async function main(): Promise<void> {
  const cities = await db.city.findMany({
    where: { published: false, latitude: null, longitude: null },
    include: {
      region: { select: { name: true, code: true } },
      _count: {
        select: {
          businesses: true,
          rankings: true,
          serviceAreas: true,
          guides: true,
          faqs: true,
          importItems: true,
          costRows: true,
          placements: true,
          topicIdeas: true,
        },
      },
    },
    orderBy: [{ region: { code: "asc" } }, { name: "asc" }],
  });

  // A city with anything but service area links behind it belongs to somebody.
  const orphans = cities.filter((city) => {
    const counts = city._count;
    return (
      counts.businesses === 0 &&
      counts.rankings === 0 &&
      counts.guides === 0 &&
      counts.faqs === 0 &&
      counts.importItems === 0 &&
      counts.costRows === 0 &&
      counts.placements === 0 &&
      counts.topicIdeas === 0
    );
  });

  console.log(`${cities.length} unpublished cities with no coordinates`);
  console.log(`${orphans.length} of them are referenced only as service areas\n`);

  let links = 0;
  for (const city of orphans) {
    links += city._count.serviceAreas;
    console.log(
      `  ${city.name}, ${city.region.code.toUpperCase()}`.padEnd(46) +
        `${city._count.serviceAreas} service area link${city._count.serviceAreas === 1 ? "" : "s"}`,
    );
  }

  const kept = cities.filter((city) => !orphans.includes(city));
  if (kept.length > 0) {
    console.log(`\nleft alone because something else points at them:`);
    for (const city of kept) {
      const counts = city._count;
      const why = Object.entries(counts)
        .filter(([key, value]) => key !== "serviceAreas" && value > 0)
        .map(([key, value]) => `${value} ${key}`)
        .join(", ");
      console.log(`  ${city.name}, ${city.region.code.toUpperCase()}`.padEnd(46) + why);
    }
  }

  if (!apply) {
    console.log(`\nnothing written. Pass --apply to unlink ${links} areas and delete ${orphans.length} cities.`);
    return;
  }

  for (const city of orphans) {
    await db.businessArea.deleteMany({ where: { cityId: city.id } });
    await db.city.delete({ where: { id: city.id } });
  }
  console.log(`\n${links} service area links removed, ${orphans.length} cities deleted.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
