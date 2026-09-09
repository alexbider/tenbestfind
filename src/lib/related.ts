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
//
// That last rule is why the first pass reached only 175 pages of 250. Both
// groups on a city hub were filtered down to cities and trades that already had
// a published ranking, so the twenty-one cities with none got two empty groups
// and no block, which is exactly backwards: a page with nothing on it is the
// page that most needs somewhere to send the reader. Every rule below now ends
// in something the site can always offer, and the last resort is the trades and
// the methodology, which exist on every deployment of this site.

import { db } from "./db";
import { tradesPhrase } from "./seo-copy";
import { rankingUrl, routes } from "./urls";

export type RelatedLink = { label: string; href: string; meta?: string };
export type RelatedGroup = { title: string; links: RelatedLink[] };

/** Drops the empty groups, so a template can render whatever comes back. */
const tidy = (groups: RelatedGroup[]): RelatedGroup[] => groups.filter((group) => group.links.length > 0);

/**
 * The trades, as a group of links. The one thing this site always has.
 *
 * Used where a rule runs out: a city with no rankings, a state with no cities.
 * Whatever else is missing, the reader arrived looking for a trade, and every
 * trade has a hub.
 */
async function tradesGroup(title: string): Promise<RelatedGroup> {
  const categories = await db.category.findMany({
    where: { published: true },
    orderBy: [{ navOrder: "asc" }, { sortOrder: "asc" }],
    take: 8,
  });

  return {
    title,
    links: categories.map((category) => ({
      label: category.name,
      href: routes.category(category.slug),
    })),
  };
}

/* ------------------------------------------------------------------ cities */

export async function relatedForCity(input: {
  cityId: string;
  regionId: string;
  regionSlug: string;
  countryCode: string;
  cityName: string;
  regionName: string;
}): Promise<RelatedGroup[]> {
  const [nearby, trades] = await Promise.all([
    // Any published city in the state, not only the ones with a ranking on
    // them. A city hub is a real page whether or not a list has been built for
    // it yet, and "nearby" is the reason a reader follows the link.
    db.city.findMany({
      where: { regionId: input.regionId, published: true, NOT: { id: input.cityId } },
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
    // Only when there is nothing local to offer. A city we have not built a
    // list for yet still has a trade the reader came looking for.
    ...(trades.length === 0 ? [await tradesGroup("Trades we cover")] : []),
    {
      title: "Wider coverage",
      links: [
        { label: input.regionName, href: routes.region(input.countryCode, input.regionSlug) },
        { label: "Every market we cover", href: routes.locationsIndex() },
      ],
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
      where: { regionId: input.regionId, published: true },
      include: { region: true },
      orderBy: [{ topMetro: "desc" }, { sortOrder: "asc" }],
      take: 10,
    }),
    // "Neighbouring" here means in the same country, which is what the site can
    // actually know. Guessing at geography from a name would put Maine next to
    // Maryland.
    db.region.findMany({
      where: { countryId: input.countryId, published: true, NOT: { id: input.regionId } },
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
    ...(cities.length === 0 ? [await tradesGroup("Trades we cover")] : []),
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
  categorySlug: string;
  categoryName: string;
  cityId: string;
  citySlug: string;
  cityName: string;
  regionId: string;
  regionSlug: string;
  regionName: string;
  countryCode: string;
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
    // Always present. Eleven of seventeen ranking pages had neither group,
    // because they are the only list for their trade in their state and the
    // only list in their city, which is what a site early in its coverage looks
    // like. Where the page sits is a link the site can always make.
    {
      title: "Where this sits",
      links: [
        { label: `Everything in ${input.cityName}`, href: routes.city(input.countryCode, input.regionSlug, input.citySlug) },
        { label: input.regionName, href: routes.region(input.countryCode, input.regionSlug) },
        { label: `All ${input.categoryName.toLowerCase()} research`, href: routes.category(input.categorySlug) },
        { label: "How we rank", href: routes.howWeRank() },
      ],
    },
  ]);
}

/* ----------------------------------------------------------------- guides */

/**
 * A guide.
 *
 * Guides had no block at all, which left eighteen routes ending on a full stop.
 * A guide is read by somebody mid-decision, so the useful next steps are the
 * other guides about the same trade and the shortlists that guide is advice
 * for. The trade hub catches everything else.
 */
export async function relatedForGuide(input: {
  guideId: string;
  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
}): Promise<RelatedGroup[]> {
  const [siblings, rankings] = await Promise.all([
    db.guide.findMany({
      where: {
        status: "PUBLISHED",
        NOT: { id: input.guideId },
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    input.categoryId
      ? db.ranking.findMany({
          where: { status: "PUBLISHED", categoryId: input.categoryId },
          include: { city: { include: { region: { include: { country: true } } } }, category: true },
          orderBy: { lastReviewedAt: "desc" },
          take: 6,
        })
      : Promise.resolve([]),
  ]);

  return tidy([
    {
      title: input.categoryName ? `More ${input.categoryName.toLowerCase()} guides` : "More guides",
      links: siblings.map((guide) => ({ label: guide.title, href: routes.guide(guide.slug) })),
    },
    {
      title: input.categoryName ? `${input.categoryName} shortlists` : "Shortlists",
      links: rankings
        .filter((ranking) => ranking.city !== null)
        .map((ranking) => ({ label: `${ranking.category.name} in ${ranking.city!.name}`, href: rankingUrl(ranking) })),
    },
    {
      title: "Start here instead",
      links: [
        ...(input.categorySlug && input.categoryName
          ? [{ label: `All ${input.categoryName.toLowerCase()} research`, href: routes.category(input.categorySlug) }]
          : []),
        { label: "Every guide", href: routes.guidesIndex() },
        { label: "How we rank", href: routes.howWeRank() },
      ],
    },
  ]);
}

/**
 * A guide hub, question or trade.
 *
 * The row of hub links at the foot of that template points at the other axis
 * and stops there, which leaves a reader on "Roofing guides" no route to the
 * roofing shortlists the guides are advice about. This is that route.
 */
export async function relatedForGuideHub(input: {
  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
}): Promise<RelatedGroup[]> {
  const rankings = input.categoryId
    ? await db.ranking.findMany({
        where: { status: "PUBLISHED", categoryId: input.categoryId },
        include: { city: { include: { region: { include: { country: true } } } }, category: true },
        orderBy: { lastReviewedAt: "desc" },
        take: 6,
      })
    : [];

  return tidy([
    {
      title: input.categoryName ? `${input.categoryName} shortlists` : "Shortlists",
      links: rankings
        .filter((ranking) => ranking.city !== null)
        .map((ranking) => ({ label: `${ranking.category.name} in ${ranking.city!.name}`, href: rankingUrl(ranking) })),
    },
    ...(rankings.length === 0 ? [await tradesGroup("Trades we cover")] : []),
    {
      title: "Elsewhere on the site",
      links: [
        ...(input.categorySlug && input.categoryName
          ? [{ label: `All ${input.categoryName.toLowerCase()} research`, href: routes.category(input.categorySlug) }]
          : []),
        { label: "Every shortlist", href: routes.rankingsIndex() },
        { label: "How we rank", href: routes.howWeRank() },
      ],
    },
  ]);
}

/* ----------------------------------------------------------------- people */

/**
 * An editor's own page, or the team index when no id is given.
 *
 * Somebody reading either is checking whether a byline means anything, so the
 * links that answer that are the rest of the team and how the work is done.
 */
export async function relatedForPerson(personId?: string): Promise<RelatedGroup[]> {
  const colleagues = await db.person.findMany({
    where: { published: true, ...(personId ? { NOT: { id: personId } } : {}) },
    orderBy: { name: "asc" },
    take: 8,
  });

  return tidy([
    {
      title: "The rest of the team",
      links: colleagues.map((person) => ({
        label: person.name,
        href: routes.expert(person.slug),
        meta: person.role,
      })),
    },
    {
      title: "How the work is done",
      links: [
        { label: "How we rank", href: routes.howWeRank() },
        { label: "Editorial team", href: routes.editorialTeam() },
        { label: "Corrections", href: routes.corrections() },
      ],
    },
  ]);
}
