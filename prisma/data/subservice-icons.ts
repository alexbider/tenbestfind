// An icon and a one-line description per job.
//
// Every subservice was created without an icon, and the template falls back to
// the parent trade when one is missing, so a row of sibling cards came out
// under three to eight copies of the same glyph. Chosen from the set the site
// already draws, and only where the name maps onto one honestly.

/** category slug -> subservice slug -> icon name. */
export const ICONS: Record<string, Record<string, string>> = {
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

/** The line under a name on a sibling card, where the design wrote one. */
export const DESCRIPTIONS: Record<string, Record<string, string>> = {
  flooring: {
    hardwood: "Solid and engineered wood, plus refinishing existing floors.",
    tile: "Ceramic, porcelain and stone, plus the substrate work underneath.",
    "vinyl-plank": "Waterproof plank flooring, wear layers and subfloor preparation.",
    carpet: "Carpet and underlay, fibre choice, and what warranties require.",
  },
};
