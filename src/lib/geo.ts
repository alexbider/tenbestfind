import { db } from "./db";

// Distances between places, and the service-area radius that hangs off them.
//
// The earth is treated as a sphere. Over the tens of kilometres a service area
// covers, the error against a proper ellipsoid is a few metres, which is far
// smaller than the error in calling a whole city one point on a map.

const EARTH_KM = 6371;

export const DEFAULT_RADIUS_KM = 20;

export type Point = { latitude: number | null; longitude: number | null };

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in kilometres, or null when either point is unknown. */
export function distanceKm(a: Point, b: Point): number | null {
  if (a.latitude === null || a.longitude === null) return null;
  if (b.latitude === null || b.longitude === null) return null;

  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * A bounding box wide enough to hold everything within `km`, used to keep the
 * database from measuring the distance to every city in the country. The box is
 * generous on purpose; the exact distance filter runs afterwards.
 */
function boundingBox(centre: { latitude: number; longitude: number }, km: number) {
  const latSpan = km / 111.32;
  // Meridians converge, so a degree of longitude is shorter the further north
  // you are. Near the poles the divisor collapses, hence the floor.
  const lonSpan = km / Math.max(1, 111.32 * Math.cos(radians(centre.latitude)));
  return {
    minLat: centre.latitude - latSpan,
    maxLat: centre.latitude + latSpan,
    minLon: centre.longitude - lonSpan,
    maxLon: centre.longitude + lonSpan,
  };
}

export type NearbyCity = {
  id: string;
  name: string;
  slug: string;
  regionId: string;
  km: number;
};

/**
 * Cities whose centre falls within `km` of a point, nearest first. `excludeId`
 * keeps the company's own city out of the list so a caller can add it
 * separately as the primary area, and `publishedOnly` is for callers that need
 * somewhere to link to rather than somewhere to name.
 */
export async function nearbyCities(
  centre: Point,
  km: number = DEFAULT_RADIUS_KM,
  excludeId?: string,
  publishedOnly = false,
): Promise<NearbyCity[]> {
  if (centre.latitude === null || centre.longitude === null) return [];
  const box = boundingBox({ latitude: centre.latitude, longitude: centre.longitude }, km);

  const candidates = await db.city.findMany({
    where: {
      // Unpublished suburbs count: a company genuinely covers them, and the
      // profile shows them as plain names rather than links to a page that is
      // not ready.
      ...(publishedOnly ? { published: true } : {}),
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLon, lte: box.maxLon },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, name: true, slug: true, regionId: true, latitude: true, longitude: true },
  });

  return candidates
    .map((city) => ({ city, km: distanceKm(centre, city) }))
    .filter((row): row is { city: (typeof candidates)[number]; km: number } => row.km !== null && row.km <= km)
    .sort((a, b) => a.km - b.km)
    .map((row) => ({
      id: row.city.id,
      name: row.city.name,
      slug: row.city.slug,
      regionId: row.city.regionId,
      km: Math.round(row.km * 10) / 10,
    }));
}

/**
 * Rewrites a company's service areas to its own city plus every city within the
 * radius. Areas a human added by hand for a city outside the radius are kept:
 * a company that genuinely drives an hour for the right job should not have
 * that erased by a geometry rule.
 */
export async function fillServiceAreas(
  businessId: string,
  km: number = DEFAULT_RADIUS_KM,
): Promise<{ added: number; total: number }> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      cityId: true,
      latitude: true,
      longitude: true,
      city: { select: { id: true, latitude: true, longitude: true } },
    },
  });
  if (!business) return { added: 0, total: 0 };

  // The company's own coordinates are the better centre when Google gave them.
  // Its city's centre is the fallback, which is all a hand-entered listing has.
  const centre: Point =
    business.latitude !== null && business.longitude !== null
      ? { latitude: business.latitude, longitude: business.longitude }
      : { latitude: business.city?.latitude ?? null, longitude: business.city?.longitude ?? null };

  const near = await nearbyCities(centre, km, business.cityId ?? undefined);
  const wanted = new Set(near.map((city) => city.id));
  if (business.cityId) wanted.add(business.cityId);
  if (wanted.size === 0) return { added: 0, total: 0 };

  const existing = await db.businessArea.findMany({
    where: { businessId },
    select: { cityId: true },
  });
  const have = new Set(existing.map((row) => row.cityId));
  const missing = [...wanted].filter((cityId) => !have.has(cityId));

  if (missing.length > 0) {
    await db.businessArea.createMany({
      data: missing.map((cityId) => ({
        businessId,
        cityId,
        primary: cityId === business.cityId,
      })),
    });
  }

  if (business.cityId && have.has(business.cityId)) {
    await db.businessArea.update({
      where: { businessId_cityId: { businessId, cityId: business.cityId } },
      data: { primary: true },
    });
  }

  return { added: missing.length, total: have.size + missing.length };
}

/* ------------------------------------------------------- discovered suburbs */

// A place name that could be a town. Anything with digits, punctuation beyond a
// hyphen or an apostrophe, or the word "county" is a description rather than a
// name and is left alone.
const PLACE_NAME = /^[A-Za-z][A-Za-z .'-]{1,38}$/;

/** The slug a town is filed under, which is how a duplicate is recognised. */
function citySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const NOT_A_TOWN = /\b(county|metro|metroplex|greater|area|region|district|township of)\b/i;

/**
 * Names that are a county, a regional municipality or a province rather than a
 * town. Enrichment kept turning "York", "Halton", "Peel" and "Ontario" into
 * city records, each of which then looked like a place a company covers.
 * Regions are matched against the directory's own region names as well, so a
 * province or state can never arrive this way whatever it is called.
 */
const NOT_A_CITY = new Set([
  "york", "halton", "peel", "durham", "niagara", "waterloo", "muskoka",
  "simcoe", "dufferin", "wellington", "hastings", "lanark", "renfrew",
  "greater toronto area", "gta", "golden horseshoe", "tri-cities", "tri cities",
]);

/**
 * Matches the town names a website claims against towns the directory already
 * has, and records the matches as service areas.
 *
 * This used to create whatever it could not find, which is how "York",
 * "Halton", "Peel" and a run of neighbourhood names became city records with no
 * coordinates, no content and a hub page nobody could write. A name we do not
 * recognise is now reported and dropped: a company covering a town we have
 * never heard of is a reason for an editor to add that town, not for a crawler
 * to invent it.
 */
export async function recordNamedAreas(
  businessId: string,
  regionId: string,
  names: string[],
  limit = 14,
): Promise<{ added: number; skipped: string[] }> {
  const seen = new Set<string>();
  const wanted: string[] = [];
  const skipped: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!PLACE_NAME.test(name) || NOT_A_TOWN.test(name) || NOT_A_CITY.has(key)) {
      skipped.push(name);
      continue;
    }
    wanted.push(name);
    if (wanted.length >= limit) break;
  }
  if (wanted.length === 0) return { added: 0, skipped };

  // Only towns the directory already knows about, in this company's own
  // region, and matched on the name or the slug it would be filed under.
  const slugs = wanted.map((name) => citySlug(name)).filter(Boolean);
  const known = await db.city.findMany({
    where: { regionId, OR: [{ name: { in: wanted } }, { slug: { in: slugs } }] },
    select: { id: true, name: true, slug: true },
  });
  const bySlug = new Map(known.map((city) => [city.slug, city.id]));
  const byName = new Map(known.map((city) => [city.name.toLowerCase(), city.id]));

  // Nothing is created here, so a province or a regional municipality simply
  // fails to match and is reported. The one it could match is a city of the
  // same name, such as New York in New York, which is the right answer.
  const matched = new Set<string>();
  for (const name of wanted) {
    const key = name.toLowerCase();
    const id = byName.get(key) ?? bySlug.get(citySlug(name));
    if (id) matched.add(id);
    else skipped.push(name);
  }
  if (matched.size === 0) return { added: 0, skipped };

  const have = new Set(
    (await db.businessArea.findMany({ where: { businessId }, select: { cityId: true } })).map(
      (row) => row.cityId,
    ),
  );
  const missing = [...matched].filter((cityId) => !have.has(cityId));
  if (missing.length > 0) {
    await db.businessArea.createMany({
      data: missing.map((cityId) => ({ businessId, cityId })),
    });
  }

  return { added: missing.length, skipped };
}

/**
 * Records a suburb that turned up in a scrape but is not in the directory yet.
 *
 * It is created unpublished. That is the point: it becomes a real place a
 * company can be shown as covering, without a hub page going live for a town
 * where we know about one business. An editor publishes it once it has enough
 * to be worth reading.
 */
export async function discoverCity(input: {
  name: string;
  regionId: string;
  latitude: number;
  longitude: number;
  /** Only accepted when it is this close to the city that was searched. */
  near: Point;
  km?: number;
}): Promise<{ id: string; created: boolean } | null> {
  const name = input.name.trim();
  if (!PLACE_NAME.test(name) || NOT_A_TOWN.test(name)) return null;
  if (NOT_A_CITY.has(name.toLowerCase())) return null;

  const distance = distanceKm(input.near, { latitude: input.latitude, longitude: input.longitude });
  if (distance === null || distance > (input.km ?? DEFAULT_RADIUS_KM)) return null;

  const slug = citySlug(name);
  if (!slug) return null;

  const existing = await db.city.findUnique({
    where: { regionId_slug: { regionId: input.regionId, slug } },
    select: { id: true, latitude: true },
  });
  if (existing) {
    // A city seeded without coordinates gets them from the first scrape that
    // lands there, which is what makes the radius work for it afterwards.
    if (existing.latitude === null) {
      await db.city.update({
        where: { id: existing.id },
        data: { latitude: input.latitude, longitude: input.longitude },
      });
    }
    return { id: existing.id, created: false };
  }

  const created = await db.city.create({
    data: {
      name,
      slug,
      regionId: input.regionId,
      latitude: input.latitude,
      longitude: input.longitude,
      published: false,
      sortOrder: 900,
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}
