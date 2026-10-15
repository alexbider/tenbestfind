import { db } from "./db";
import { routes } from "./urls";

/**
 * Where an address from the site's first URL scheme lives now.
 *
 * The first build published rankings at /home-services/{trade}/{city}-{st}/
 * and places at /locations/{state-name}/{city}-{st}/. Google still had over a
 * hundred of those indexed when the site moved to /us/{st}/{city}/{trade}/, and
 * every one answered 404. The redirect table holds the ones that were found;
 * this answers the rest, including any nobody has seen yet.
 *
 * The rule is the closest live page, never a guess at a different city:
 * the ranking when it exists, else the city, else the state or province, else
 * the trade. Returns null for anything that is not an old-scheme address.
 */
export async function legacyTarget(segments: string[]): Promise<string | null> {
  const [head, first, second] = segments.map((segment) => segment.toLowerCase());

  if (head === "home-services" && first) {
    const category = await db.category.findUnique({ where: { slug: first }, select: { id: true, slug: true } });
    const fallback = category ? routes.category(category.slug) : routes.servicesIndex();
    if (!second) return fallback;

    const place = await placeFromSlug(second);
    if (!place) return fallback;

    if (place.city && category) {
      const ranking = await db.ranking.findFirst({
        where: { status: "PUBLISHED", categoryId: category.id, cityId: place.city.id },
        select: { id: true },
      });
      if (ranking) {
        return routes.ranking(place.countryCode, place.regionSlug, place.city.slug, category.slug);
      }
    }
    if (place.city?.live) return routes.city(place.countryCode, place.regionSlug, place.city.slug);
    if (place.regionLive) return routes.region(place.countryCode, place.regionSlug);
    return fallback;
  }

  if (head === "locations" && first) {
    if (second) {
      const place = await placeFromSlug(second);
      if (place?.city?.live) return routes.city(place.countryCode, place.regionSlug, place.city.slug);
      if (place?.regionLive) return routes.region(place.countryCode, place.regionSlug);
    }
    const region = await regionByName(first);
    if (region) return routes.region(region.countryCode, region.slug);
    return routes.locationsIndex();
  }

  return null;
}

type Place = {
  countryCode: string;
  regionSlug: string;
  regionLive: boolean;
  city: { id: string; slug: string; live: boolean } | null;
};

/** "columbus-oh" to the Columbus in the region whose code is OH. */
async function placeFromSlug(slug: string): Promise<Place | null> {
  const match = /^(.+)-([a-z]{2})$/.exec(slug);
  if (!match) return null;
  const [, citySlug, code] = match;

  const region = await db.region.findFirst({
    where: { code: { in: [code!, code!.toUpperCase()] }, published: true },
    select: {
      id: true,
      slug: true,
      country: { select: { code: true } },
    },
  });
  if (!region) return null;

  // Counted through the cities, which is how every page counts a region's
  // rankings, rather than trusting a region id on the ranking row.
  const regionRankings = await db.ranking.count({ where: { status: "PUBLISHED", city: { regionId: region.id } } });

  const city = await db.city.findFirst({
    where: { regionId: region.id, slug: citySlug!, published: true },
    select: { id: true, slug: true, _count: { select: { rankings: { where: { status: "PUBLISHED" } } } } },
  });

  return {
    countryCode: region.country.code.toLowerCase(),
    regionSlug: region.slug,
    regionLive: regionRankings > 0,
    city: city ? { id: city.id, slug: city.slug, live: city._count.rankings > 0 } : null,
  };
}

/** "new-york" or "british-columbia" to that region, when it has rankings. */
async function regionByName(segment: string) {
  const regions = await db.region.findMany({
    where: { published: true, cities: { some: { rankings: { some: { status: "PUBLISHED" } } } } },
    select: { name: true, slug: true, country: { select: { code: true } } },
  });
  const wanted = segment.replace(/-/g, " ");
  const region = regions.find((row) => row.name.toLowerCase() === wanted);
  return region ? { slug: region.slug, countryCode: region.country.code.toLowerCase() } : null;
}
