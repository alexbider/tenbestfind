// An icon per job, rather than the trade's icon seventy-seven times.
//
// Every subservice was created without one, and the template falls back to the
// parent trade when a subservice has none. On a page that is fine once and
// absurd three times in a row: the "other flooring services" cards came out as
// tile, vinyl and carpet under three identical floor glyphs, which tells a
// reader nothing and reads as something broken.
//
// So each one gets an icon that says what the work is. Chosen from the set the
// site already draws, and only where the name maps onto one honestly. An icon
// that has nothing to do with the job is worse than a repeated one, so the
// handful with no good match keep the fallback.
//
//   npx tsx scripts/seed-subservice-icons.ts          # reports, writes nothing
//   npx tsx scripts/seed-subservice-icons.ts --write
//
// Never overwrites an icon somebody has set. Descriptions are handled the same
// way: the four flooring lines come from the design that specified them, and
// nothing else is invented here.

import { db } from "../src/lib/db";
import { hasIcon } from "../src/lib/icon-paths";

/** category slug -> subservice slug -> icon. */
const ICONS: Record<string, Record<string, string>> = {
  "appliance-repair": {
    "refrigerator-repair": "snow",
    "washer-dryer-repair": "washer",
    "oven-range-repair": "flame",
    "dishwasher-repair": "droplet",
  },
  "chimney-services": {
    "chimney-sweeping": "broom",
    "chimney-repair": "masonry",
    "chimney-inspection": "eye",
    "liner-installation": "pipe",
  },
  cleaning: { "deep-cleaning": "spray", "move-out": "box", recurring: "refresh" },
  electricians: {
    "panel-upgrades": "sliders",
    rewiring: "link",
    "ev-charger-installation": "plug",
    "lighting-installation": "bulb",
    "generator-installation": "spark",
  },
  flooring: { hardwood: "floor", tile: "grid", "vinyl-plank": "layers", carpet: "layout" },
  "garage-doors": {
    repair: "tools",
    "opener-installation": "plug",
    "spring-replacement": "gear",
    "door-installation": "garage",
  },
  "general-contractors": { "design-build": "ruler", "whole-home-renovation": "house", permitting: "clipboard" },
  gutters: { cleaning: "broom", guards: "shield" },
  "home-remodeling": {
    "kitchen-remodeling": "flame",
    "bathroom-remodeling": "bath",
    "basement-remodeling": "foundation",
    additions: "plus",
  },
  hvac: {
    "ac-repair": "snow",
    "ac-installation": "wind",
    "furnace-repair": "flame",
    "heat-pump-installation": "pump",
    "duct-cleaning": "filter",
    "maintenance-plans": "calendar",
  },
  landscaping: { "lawn-care": "leaf", hardscaping: "masonry", irrigation: "droplet", design: "pencil" },
  locksmiths: {
    "emergency-lockout": "lock",
    rekeying: "key",
    "lock-installation": "shield",
    "smart-lock-installation": "phone",
  },
  "moving-companies": { local: "truck", "long-distance": "map", storage: "box", packing: "tag" },
  painting: { interior: "roller", exterior: "house", "cabinet-refinishing": "spray" },
  "pest-control": { termites: "bug", rodents: "alert", mosquitoes: "spray" },
  plumbers: {
    "emergency-plumbing": "alert",
    "drain-cleaning": "drain",
    "water-heater-repair": "heater",
    repiping: "pipe",
    "sewer-line-repair": "sewer",
    "leak-detection": "leak",
    "gas-line-work": "flame",
    "fixture-installation": "bath",
  },
  restoration: { "water-damage": "waves", "fire-smoke": "smoke", mold: "mold" },
  roofing: {
    "roof-repair": "tools",
    "roof-replacement": "house",
    "roof-inspection": "eye",
    "metal-roofing": "layers",
    "flat-roofing": "layout",
    "storm-damage-repair": "rain",
  },
  "windows-doors": { "window-replacement": "window", "entry-doors": "access", "patio-doors": "sun" },
};

/**
 * The one line under a name on a sibling card.
 *
 * Only the four the design wrote. The rest of the site's subservices have no
 * description and are left without one rather than given a sentence somebody
 * would have to check.
 */
const DESCRIPTIONS: Record<string, Record<string, string>> = {
  flooring: {
    hardwood: "Solid and engineered wood, plus refinishing existing floors.",
    tile: "Ceramic, porcelain and stone, plus the substrate work underneath.",
    "vinyl-plank": "Waterproof plank flooring, wear layers and subfloor preparation.",
    carpet: "Carpet and underlay, fibre choice, and what warranties require.",
  },
};

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

      // A name this script has never been told about. Reported rather than
      // guessed at, so the list above is visibly incomplete instead of
      // quietly wrong.
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
