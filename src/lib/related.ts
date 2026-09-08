// What else a reader should look at, and why that link rather than another.
//
// Every page type on this site had a shape of link that made sense for it and
// three that did not, and the ones that had none simply ended. These are the
// four rules, written once:
//
//   A city hub leads to the cities around it and the trades covered in it.
//   A state hub leads to its cities and to the states next to it with coverage.
//   A subservice leads to its siblings and up to the trade it belongs to.
//   A ranking leads to the same trade nearby and to other trades in that city.
//
// Every query filters on what is actually published, so a link is never offered
// to a page that has nothing on it. A group with no links is dropped rather
// than rendered empty, and a block with no groups does not render at all.

import { db } from "./db";
import { tradesPhrase } from "./seo-copy";
import { rankingUrl, routes } from "./urls";

export type RelatedLink = { label: string; href: string; meta?: string };
export type RelatedGroup = { title: string; links: RelatedLink[] };

/** Drops the empty groups, so a template can render whatever comes back. */
const tidy = (groups: RelatedGroup[]): RelatedGroup[] => groups.filter((group) => group.links.length > 0);

/* ------------------------------------------------------------------ cities */

export async function relatedForCity(input: {
  cityId: string;
  regionId: string;
  regionSlug: string;
  countryCode: string;
  cityName: string;
}): Promise<RelatedGroup[]> {
  const [nearby, trades] = await Promise.all([
    db.city.findMany({
      where: {
        regionId: input.regionId,
        published: true,
        NOT: { id: input.cityId },
        rankings: { some: { status: "PUBLISHED" } },
      },
      orderBy: [{ topMetro: "desc" }, { sortOrder: "asc" }],
      take: 8,
    }),
    db.ranking.findMany({
      where: { cityId: input.cityId, status: "PUBLISHED" },
      include: { category: true, city: { include: { region: { include: { country: true } } } } },
      orderBy: { lastReviewedAt: "desc" },
      take: 8,
    }),
  ]);

  return tidy([
    {
      title: "Nearby cities",
      links: nearby.map((city) => ({
        label: city.name,
        href: routes.city(input.countryCode, input.regionSlug, city.slug),
      })),
    },
    {
      title: `Trades covered in ${input.cityName}`,
      links: trades.map((ranking) => ({ label: ranking.category.name, href: rankingUrl(ranking) })),
    },
  ]);
}

/* ------------------------------------------------------------------ states */

export async function relatedForRegion(input: {
  regionId: string;
  countryId: string;
  countryCode: string;
}): Promise<RelatedGroup[]> {
  const [cities, neighbours] = await Promise.all([
    db.city.findMany({
      where: { regionId: input.regionId, published: true, rankings: { some: { status: "PUBLISHED" } } },
      include: { region: true },
      orderBy: [{ topMetro: "desc" }, { sortOrder: "asc" }],
      take: 10,
    }),
    // "Neighbouring" here means in the same country with coverage, which is
    // what the site can actually know. Guessing at geography from a name would
    // put Maine next to Maryland.
    db.region.findMany({
      where: {
        countryId: input.countryId,
        published: true,
        NOT: { id: input.regionId },
        rankings: { some: { status: "PUBLISHED" } },
      },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
  ]);

  return tidy([
    {
      title: "Cities we cover here",
      links: cities.map((city) => ({
        label: city.name,
        href: routes.city(input.countryCode, city.region.slug, city.slug),
      })),
    },
    {
      title: "Other states and provinces",
      links: neighbours.map((region) => ({
        label: region.name,
        href: routes.region(input.countryCode, region.slug),
      })),
    },
  ]);
}

/* ------------------------------------------------------------- subservices */

export async function relatedForSubservice(input: {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  categorySingular: string;
  subserviceId: string;
}): Promise<RelatedGroup[]> {
  const siblings = await db.subservice.findMany({
    where: { categoryId: input.categoryId, NOT: { id: input.subserviceId } },
    orderBy: { sortOrder: "asc" },
    take: 10,
  });

  return tidy([
    {
      title: `Other ${input.categoryName} services`,
      links: siblings.map((sub) => ({
        label: sub.name,
        href: routes.subservice(input.categorySlug, sub.slug),
      })),
    },
    {
      title: "The trade itself",
      links: [
        {
          label: `All ${tradesPhrase({ singular: input.categorySingular })} research`,
          href: routes.category(input.categorySlug),
        },
      ],
    },
  ]);
}

/* ---------------------------------------------------------------- rankings */

export async function relatedForRanking(input: {
  rankingId: string;
  categoryId: string;
  cityId: string;
  regionId: string;
  countryCode: string;
  cityName: string;
  categoryName: string;
}): Promise<RelatedGroup[]> {
  const [sameTrade, otherTrades] = await Promise.all([
    db.ranking.findMany({
      where: {
        status: "PUBLISHED",
        categoryId: input.categoryId,
        city: { regionId: input.regionId },
        NOT: { id: input.rankingId },
      },
      include: { city: { include: { region: { include: { country: true } } } }, category: true },
      take: 8,
    }),
    db.ranking.findMany({
      where: { status: "PUBLISHED", cityId: input.cityId, NOT: { id: input.rankingId } },
      include: { city: { include: { region: { include: { country: true } } } }, category: true },
      take: 8,
    }),
  ]);

  const keep = (
    rows: {
      category: { name: string; slug: string };
      city: { name: string; slug: string; region: { slug: string; country: { code: string } } } | null;
    }[],
  ): RelatedLink[] =>
    rows
      .filter((row) => row.city !== null)
      .map((row) => ({ label: `${row.category.name} in ${row.city!.name}`, href: rankingUrl(row) }));

  return tidy([
    { title: `${input.categoryName} in nearby cities`, links: keep(sameTrade) },
    { title: `Other trades in ${input.cityName}`, links: keep(otherTrades) },
  ]);
}
