/**
 * The schema.org type for each trade.
 *
 * Every company was published as a bare LocalBusiness, which is true and says
 * almost nothing. schema.org has a specific type for most of these trades, and
 * a specific type is what lets a search engine tell a plumber from a roofer
 * without reading the prose.
 *
 * One table, keyed by category slug, so a new trade is one line here rather
 * than a condition somewhere in a template. Anything not listed falls back to
 * LocalBusiness, which is correct if unhelpful, and is better than guessing at
 * a type that does not fit.
 *
 * The named types are the ones schema.org actually defines. There is no
 * FlooringContractor or PestControlBusiness, so those trades take the nearest
 * true parent rather than an invented child that no consumer would recognise.
 */
export const BUSINESS_TYPE_BY_CATEGORY: Record<string, string> = {
  // Trades with a type of their own.
  hvac: "HVACBusiness",
  plumbers: "Plumber",
  roofing: "RoofingContractor",
  electricians: "Electrician",
  locksmiths: "Locksmith",
  "moving-companies": "MovingCompany",

  // Building and construction work, which is the parent schema.org offers.
  "chimney-services": "HomeAndConstructionBusiness",
  "home-remodeling": "GeneralContractor",
  "general-contractors": "GeneralContractor",
  "garage-doors": "HomeAndConstructionBusiness",
  carpentry: "GeneralContractor",
  concrete: "GeneralContractor",
  "deck-builders": "GeneralContractor",
  drywall: "GeneralContractor",
  fencing: "GeneralContractor",
  flooring: "HomeAndConstructionBusiness",
  "foundation-repair": "GeneralContractor",
  handyman: "HomeAndConstructionBusiness",
  insulation: "HomeAndConstructionBusiness",
  masonry: "GeneralContractor",
  painting: "HousePainter",
  siding: "HomeAndConstructionBusiness",
  solar: "HomeAndConstructionBusiness",
  waterproofing: "HomeAndConstructionBusiness",
  "windows-doors": "HomeAndConstructionBusiness",
  restoration: "GeneralContractor",
  septic: "HomeAndConstructionBusiness",
  "well-services": "HomeAndConstructionBusiness",
  "pool-services": "HomeAndConstructionBusiness",
  landscaping: "HomeAndConstructionBusiness",
  "tree-services": "HomeAndConstructionBusiness",
  gutters: "HomeAndConstructionBusiness",
  "home-security": "HomeAndConstructionBusiness",

  // No specific type exists for these, so they stay general on purpose.
  "appliance-repair": "LocalBusiness",
  cleaning: "LocalBusiness",
  "junk-removal": "LocalBusiness",
  "pest-control": "LocalBusiness",
  "pressure-washing": "LocalBusiness",
};

export const FALLBACK_BUSINESS_TYPE = "LocalBusiness";

/** The type for one trade, by category slug. */
export function businessTypeFor(categorySlug: string | null | undefined): string {
  if (!categorySlug) return FALLBACK_BUSINESS_TYPE;
  return BUSINESS_TYPE_BY_CATEGORY[categorySlug] ?? FALLBACK_BUSINESS_TYPE;
}
