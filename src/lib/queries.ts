import { cache } from "react";
import { db } from "./db";

/** Shape used everywhere a ranking is linked from a card or list. */
export const rankingCardSelect = {
  id: true,
  title: true,
  summary: true,
  slug: true,
  status: true,
  publishedAt: true,
  lastReviewedAt: true,
  companiesReviewed: true,
  // How many published companies are actually on the list. A card that says
  // "10 best" while the list holds seven is the same lie as a title that does,
  // so the card is built from this rather than from the stored heading.
  _count: { select: { entries: { where: { business: { status: "PUBLISHED" } } } } },
  category: { select: { name: true, singular: true, pluralName: true, slug: true, serviceName: true, iconKey: true } },
  city: {
    select: {
      name: true,
      slug: true,
      heroImage: true,
      region: { select: { name: true, code: true, slug: true, country: { select: { code: true, name: true } } } },
    },
  },
  author: { select: { name: true, slug: true } },
} as const;

export const getFeaturedCategories = cache(async () =>
  db.category.findMany({
    where: { published: true, featured: true },
    orderBy: [{ wide: "desc" }, { sortOrder: "asc" }],
  }),
);

export const getTrendingSubservices = cache(async () =>
  db.subservice.findMany({
    where: { trending: true },
    orderBy: { sortOrder: "asc" },
    take: 8,
    include: { category: { select: { slug: true } } },
  }),
);

export const getPublishedRankings = cache(async (take = 12) =>
  db.ranking.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ lastReviewedAt: "desc" }, { publishedAt: "desc" }],
    take,
    select: rankingCardSelect,
  }),
);

export const getPublishedGuides = cache(async (take = 12) =>
  db.guide.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take,
    include: {
      category: { select: { name: true, slug: true, serviceName: true } },
      author: { select: { name: true, slug: true } },
    },
  }),
);

export const getGlobalFaqs = cache(async () =>
  db.faq.findMany({ where: { scope: "GLOBAL" }, orderBy: { sortOrder: "asc" } }),
);

export const getCountriesWithRegions = cache(async () =>
  db.country.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
    include: {
      regions: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        include: {
          cities: { where: { published: true }, orderBy: { sortOrder: "asc" } },
          _count: { select: { cities: true } },
        },
      },
    },
  }),
);

/** Cities with the most published rankings, used by the homepage city browser. */
export const getPopularCities = cache(async (countryCode: string, take = 10) => {
  const cities = await db.city.findMany({
    where: { published: true, region: { country: { code: countryCode } } },
    orderBy: [{ topMetro: "desc" }, { population: "desc" }],
    take,
    select: {
      name: true,
      slug: true,
      region: { select: { code: true, slug: true, country: { select: { code: true } } } },
      _count: { select: { rankings: true } },
    },
  });
  return cities;
});

export const getCountryStats = cache(async (countryCode: string) => {
  const country = await db.country.findUnique({
    where: { code: countryCode },
    include: { _count: { select: { regions: true } } },
  });
  if (!country) return null;
  const [cityCount, rankingCount, businessCount] = await Promise.all([
    db.city.count({ where: { published: true, region: { countryId: country.id } } }),
    db.ranking.count({ where: { status: "PUBLISHED", countryId: country.id } }),
    db.business.count({ where: { status: "PUBLISHED", city: { region: { countryId: country.id } } } }),
  ]);
  return { country, cityCount, rankingCount, businessCount };
});

/**
 * The list shown in the homepage hero, with enough of its top three to fill
 * the preview card. The most recently reviewed one, since the card carries the
 * review date and a stale date is worse than no card.
 */
export const getHeroRanking = cache(async () =>
  db.ranking.findFirst({
    where: { status: "PUBLISHED", cityId: { not: null }, entries: { some: {} } },
    orderBy: [{ lastReviewedAt: "desc" }, { publishedAt: "desc" }],
    select: {
      ...rankingCardSelect,
      entries: {
        where: { business: { status: "PUBLISHED" } },
        orderBy: { position: "asc" },
        take: 3,
        select: {
          id: true,
          position: true,
          designation: true,
          business: {
            select: {
              name: true,
              verified: true,
              yearFounded: true,
              licenseNumber: true,
              credentials: { orderBy: { sortOrder: "asc" }, take: 1, select: { label: true } },
            },
          },
        },
      },
    },
  }),
);

/** The four figures under the homepage hero. */
export const getDirectoryCounts = cache(async () => {
  const [cities, categories, businesses] = await Promise.all([
    db.city.count({ where: { published: true, rankings: { some: { status: "PUBLISHED" } } } }),
    db.category.count({ where: { published: true } }),
    db.business.count({ where: { status: "PUBLISHED" } }),
  ]);
  return { cities, categories, businesses };
});
