import { cache } from "react";
import { db } from "./db";

/** Shape used everywhere a ranking is linked from a card or list. */
export const rankingCardSelect = {
  id: true,
  title: true,
  summary: true,
  slug: true,
  publishedAt: true,
  lastReviewedAt: true,
  companiesReviewed: true,
  category: { select: { name: true, slug: true, serviceName: true, iconKey: true } },
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
