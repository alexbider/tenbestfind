/**
 * The bridge between a database row and the entity that gets published.
 *
 * The profile template and the ranking template both describe the same company,
 * and when each built its own object by hand they drifted: the ranking shipped a
 * bare LocalBusiness with no hours, no coordinates and an email nobody had
 * checked, while the profile shipped the lot. One function now decides what a
 * company looks like in JSON-LD, so a ranked company and the same company on its
 * own page say the same things, and the build check can rebuild exactly what the
 * templates render rather than an approximation of it.
 */

import type { BusinessEntityInput } from "./schema";
import { isPublishableEmail } from "./email-quality";

/** Everything the markup reads off a company row. */
export type BusinessRowForSchema = {
  slug: string;
  name: string;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  addressLine?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  hours?: string | null;
  socialLinks?: string | null;
  yearFounded?: number | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  category?: { slug: string } | null;
  credentials?: { label: string; authority?: string | null; identifier?: string | null }[];
};

/** Where the company is, and anything the page knows better than the row does. */
export type SchemaPlace = {
  cityName?: string | null;
  regionCode?: string | null;
  countryCode?: string | null;
  /** The towns it covers, already resolved to names. */
  areaServed?: string[];
  /** The lead photo, when the page has one better than the logo. */
  image?: string | null;
  /** Used when the row has no category of its own, as on a ranking. */
  categorySlug?: string | null;
};

export function businessSchemaInput(
  business: BusinessRowForSchema,
  place: SchemaPlace = {},
): BusinessEntityInput {
  return {
    slug: business.slug,
    name: business.name,
    categorySlug: business.category?.slug ?? place.categorySlug ?? null,
    website: business.website,
    phone: business.phone,
    // An email is a claim about how to reach this company, and enrichment has
    // put a sentence fragment and somebody else's agency in this field before
    // now, so only a checked one is published.
    email: isPublishableEmail(business.email) ? business.email : null,
    image: place.image ?? business.logoUrl,
    logo: business.logoUrl,
    addressLine: business.addressLine,
    postalCode: business.postalCode,
    cityName: place.cityName,
    regionCode: place.regionCode,
    countryCode: place.countryCode,
    latitude: business.latitude,
    longitude: business.longitude,
    hours: business.hours,
    areaServed: place.areaServed ?? [],
    socialLinks: business.socialLinks,
    yearFounded: business.yearFounded,
    credentials: (business.credentials ?? []).map((row) => ({
      label: row.label,
      authority: row.authority,
      identifier: row.identifier,
    })),
    rating: business.googleRating,
    reviewCount: business.googleReviewCount,
  };
}
