// An icon per job, rather than the trade's icon seventy-seven times.
//
// Every subservice was created without one, and the template falls back to the
// parent trade when a subservice has none. On a page that is fine once and
// absurd three times in a row: the "other flooring services" cards came out as
// tile, vinyl and carpet under three identical floor glyphs, which tells a
// reader nothing and reads as something broken.
//
// So each one gets an icon that says what the work is, from the tables in
// prisma/data/subservice-icons.ts. An icon that has nothing to do with the job
// is worse than a repeated one, so anything with no honest match is reported
// here and keeps the trade's icon rather than being given a wrong one.
//
//   npx tsx scripts/seed-subservice-icons.ts          # reports, writes nothing
//   npx tsx scripts/seed-subservice-icons.ts --write
//
// Never overwrites an icon somebody has set. Descriptions are handled the same
// way: the four flooring lines come from the design that specified them, and
// nothing else is invented here.

import { db } from "../src/lib/db";
import { hasIcon } from "../src/lib/icon-paths";
import { ICONS, DESCRIPTIONS } from "../prisma/data/subservice-icons";

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  let icons = 0;
  let blurbs = 0;
  let kept = 0;
  const unknown: string[] = [];

  const categories = await db.category.findMany({
    select: { slug: true, subservices: { select: { id: true, slug: true, iconKey: true, description: true } } },
  });

  for (const category of categories) {
    for (const subservice of category.subservices) {
      const where = `${category.slug}/${subservice.slug}`;
      const icon = ICONS[category.slug]?.[subservice.slug];
      const blurb = DESCRIPTIONS[category.slug]?.[subservice.slug];

      // A name the table has never been told about. Reported rather than
      // guessed at, so the gap is visible instead of quietly wrong.
      if (!icon) unknown.push(where);
      if (icon && !hasIcon(icon)) {
        console.log(`  BAD    ${where}: there is no icon called ${icon}`);
        continue;
      }

      const data: { iconKey?: string; description?: string } = {};
      if (icon && !subservice.iconKey) data.iconKey = icon;
      if (blurb && !subservice.description) data.description = blurb;

      if (Object.keys(data).length === 0) {
        kept += 1;
        continue;
      }

      if (write) await db.subservice.update({ where: { id: subservice.id }, data });
      if (data.iconKey) icons += 1;
      if (data.description) blurbs += 1;
    }
  }

  const verb = write ? "set" : "would set";
  console.log(`  ${verb} ${icons} icons and ${blurbs} descriptions, left ${kept} alone`);
  if (unknown.length > 0) {
    console.log(`  note   ${unknown.length} with no icon in the table, keeping the trade's: ${unknown.join(", ")}`);
  }
}

main();
