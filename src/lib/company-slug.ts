// The address a company profile lives at.
//
// A profile is one physical location of one business, so its URL says which
// one: "1-tom-plumber-columbus-oh" rather than "1-tom-plumber". Two things
// follow from that, and both are the reason for it.
//
// A brand with real branches in three cities has three profiles, three sets of
// hours and three service areas, and three URLs that can be told apart by
// looking at them. And the first company of a common name no longer takes the
// only good slug: the second one is not "abc-roofing-2" forever, it is the one
// in the city it is actually in.
//
// Service areas do not appear here. Where a company works is not where it is,
// and a profile per area served would be the same company published many times
// over.

import { slugify } from "./format";

/** The canonical slug for one location of one business. */
export function companySlug(
  name: string,
  city: { slug: string },
  region: { code: string },
): string {
  const base = slugify(name) || "business";
  return [base, city.slug, region.code.toLowerCase()]
    .filter(Boolean)
    .join("-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The same slug, made unique. A second location of the same brand in the same
 * city is rare and real, so it gets a counter rather than being refused.
 *
 * `taken` covers the rows that do not exist yet: a wave of listings written
 * together are all still drafts, so the database cannot tell them apart.
 */
export async function uniqueCompanySlug(
  name: string,
  city: { slug: string },
  region: { code: string },
  isTaken: (slug: string) => Promise<boolean>,
  taken: Set<string> = new Set(),
): Promise<string> {
  const base = companySlug(name, city, region);

  for (let index = 1; index <= 40; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    if (taken.has(candidate)) continue;
    if (!(await isTaken(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
