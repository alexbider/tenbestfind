// What happens to a company the gate turns down.
//
// The rule is that it leaves: the batch carries what it is importing, not a
// record of everything it declined. The decision still has to survive, or the
// next scrape of the same city pays to discover the same dead website again.
// This checks both halves against a copy of the database.

import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const copy = join(tmpdir(), `skip-check-${Date.now()}.db`);
copyFileSync("prisma/dev.db", copy);
process.env.DATABASE_URL = `file:${copy}`;

async function main(): Promise<void> {
  const { db } = await import("../src/lib/db");
  const { dropItem } = await import("../src/lib/import-pipeline");

  const category = await db.category.findFirstOrThrow({ select: { id: true } });
  const city = await db.city.findFirstOrThrow({ select: { id: true } });

  const batch = await db.importBatch.create({
    data: {
      name: "skip check",
      status: "ENRICHING",
      categoryId: category.id,
      cityIds: JSON.stringify([city.id]),
      perCity: 3,
    },
  });

  const item = await db.importItem.create({
    data: {
      batchId: batch.id,
      cityId: city.id,
      placeId: "ChIJcheck0001",
      name: "Dead Site Plumbing",
      status: "FOUND",
      website: "https://deadsiteplumbing.test",
    },
  });

  await dropItem(item, "website did not respond");

  const stillThere = await db.importItem.findUnique({ where: { id: item.id } });
  console.log(`row deleted: ${stillThere === null}`);

  const remembered = await db.skippedPlace.findUnique({ where: { placeId: "ChIJcheck0001" } });
  console.log(`remembered: ${remembered?.reason ?? "no"} (${remembered?.stage ?? "-"}) host=${remembered?.host ?? "-"}`);

  // The same company, arriving on a later scrape without a place id: the
  // hostname is what catches it.
  const byHost = await db.skippedPlace.findFirst({ where: { host: "deadsiteplumbing.test" } });
  console.log(`found again by host: ${byHost !== null}`);

  // A second rejection of the same place updates the row rather than piling up.
  const again = await db.importItem.create({
    data: {
      batchId: batch.id,
      cityId: city.id,
      placeId: "ChIJcheck0001",
      name: "Dead Site Plumbing",
      status: "FOUND",
      website: "https://deadsiteplumbing.test",
    },
  });
  await dropItem(again, "no email on the website (4 pages read)");
  console.log(`skip rows for that place: ${await db.skippedPlace.count({ where: { placeId: "ChIJcheck0001" } })}`);
  const updated = await db.skippedPlace.findUnique({ where: { placeId: "ChIJcheck0001" } });
  console.log(`latest reason: ${updated?.reason}`);

  // A company with neither a place id nor a website leaves no row to match on,
  // and must not leave a row nobody could match either.
  const anonymous = await db.importItem.create({
    data: { batchId: batch.id, cityId: city.id, name: "No Trace Plumbing", status: "FOUND" },
  });
  const before = await db.skippedPlace.count();
  await dropItem(anonymous, "no website");
  console.log(`untraceable company adds a skip row: ${(await db.skippedPlace.count()) !== before}`);
  console.log(`untraceable row still deleted: ${(await db.importItem.findUnique({ where: { id: anonymous.id } })) === null}`);

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
