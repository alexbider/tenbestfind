import { cache } from "react";
import { db } from "./db";

/**
 * The IA puts several kinds of thing at the root of the URL space:
 *
 *   /us/                        country
 *   /plumbers/                  service category
 *   /about/                     CMS page
 *   /us/tx/                     region
 *   /plumbers/drain-cleaning/   subservice
 *   /us/tx/dallas/              city
 *   /us/tx/dallas/plumbers/     ranking
 *
 * One resolver walks the segments and reports what was found, so a single
 * catch-all route can render the right template. Countries win over categories
 * on a collision, and CMS pages come last.
 */
export type Resolved =
  | { type: "country"; countryCode: string }
  | { type: "region"; countryCode: string; regionSlug: string }
  | { type: "city"; countryCode: string; regionSlug: string; citySlug: string }
  | {
      type: "ranking";
      countryCode: string;
      regionSlug: string;
      citySlug: string;
      categorySlug: string;
    }
  | { type: "category"; categorySlug: string }
  | { type: "subservice"; categorySlug: string; subserviceSlug: string }
  | { type: "page"; slug: string }
  | { type: "notFound" };

const getCountryCodes = cache(async () => {
  const countries = await db.country.findMany({
    where: { published: true },
    select: { code: true },
  });
  return new Set(countries.map((country) => country.code));
});

const getCategorySlugs = cache(async () => {
  const categories = await db.category.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return new Set(categories.map((category) => category.slug));
});

export async function resolvePath(segments: string[]): Promise<Resolved> {
  const path = segments.filter(Boolean);
  if (path.length === 0 || path.length > 4) return { type: "notFound" };

  const [first, second, third, fourth] = path;
  const [countries, categories] = await Promise.all([getCountryCodes(), getCategorySlugs()]);

  if (countries.has(first)) {
    if (!second) return { type: "country", countryCode: first };
    if (!third) return { type: "region", countryCode: first, regionSlug: second };
    if (!fourth) return { type: "city", countryCode: first, regionSlug: second, citySlug: third };
    if (categories.has(fourth)) {
      return {
        type: "ranking",
        countryCode: first,
        regionSlug: second,
        citySlug: third,
        categorySlug: fourth,
      };
    }
    return { type: "notFound" };
  }

  if (categories.has(first)) {
    if (!second) return { type: "category", categorySlug: first };
    if (!third) return { type: "subservice", categorySlug: first, subserviceSlug: second };
    return { type: "notFound" };
  }

  if (path.length === 1) return { type: "page", slug: first };

  return { type: "notFound" };
}
