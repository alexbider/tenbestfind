/**
 * Fills in city coordinates on a database that already has its cities.
 *
 * The service-area radius cannot measure anything without them, so this runs
 * once against an existing install. It only writes to cities that have no
 * coordinates, so a city someone positioned by hand is left alone.
 *
 *   npx tsx scripts/backfill-coordinates.ts          dry run
 *   npx tsx scripts/backfill-coordinates.ts --yes    write
 */
import { db } from "../src/lib/db";
import { CITY_COORDINATES, coordinateKey } from "../prisma/data/coordinates";

const write = process.argv.includes("--yes");

async function main(): Promise<void> {
  const cities = await db.city.findMany({
    include: { region: { include: { country: true } } },
    orderBy: { name: "asc" },
  });

  let filled = 0;
  let missing = 0;

  for (const city of cities) {
    if (city.latitude !== null && city.longitude !== null) continue;
    const key = coordinateKey(city.region.country.code, city.region.code, city.slug);
    const point = CITY_COORDINATES[key];
    if (!point) {
      missing += 1;
      console.log(`  no coordinates on file for ${city.name} (${key})`);
      continue;
    }
    filled += 1;
    console.log(`  ${city.name}: ${point[0]}, ${point[1]}`);
    if (write) {
      await db.city.update({
        where: { id: city.id },
        data: { latitude: point[0], longitude: point[1] },
      });
    }
  }

  console.log(
    `\n${write ? "Wrote" : "Would write"} ${filled} of ${cities.length} cities.` +
      (missing > 0 ? ` ${missing} have no entry in the coordinates table.` : ""),
  );
  if (!write && filled > 0) console.log("Re-run with --yes to apply.");
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
