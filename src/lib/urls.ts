// Every internal link is built here so the URL model stays in one place.
//
//   /home-services/                      services index
//   /plumbers/                           service category (country agnostic)
//   /us/                                 country hub
//   /us/fl/                              region hub
//   /us/fl/miami/                        city hub
//   /us/fl/miami/plumbers/               ranking
//   /companies/lone-star-roofing/        business profile
//   /guides/how-to-choose-a-plumber/     guide
//   /experts/marcus-reed/                expert profile

type CityRef = { slug: string; region: { slug: string; country: { code: string } } };
type RegionRef = { slug: string; country: { code: string } };

export const routes = {
  home: () => "/",
  servicesIndex: () => "/home-services/",
  category: (slug: string) => `/${slug}/`,
  subservice: (categorySlug: string, slug: string) => `/${categorySlug}/${slug}/`,

  country: (code: string) => `/${code}/`,
  region: (countryCode: string, regionSlug: string) => `/${countryCode}/${regionSlug}/`,
  city: (countryCode: string, regionSlug: string, citySlug: string) =>
    `/${countryCode}/${regionSlug}/${citySlug}/`,
  ranking: (
    countryCode: string,
    regionSlug: string,
    citySlug: string,
    categorySlug: string,
  ) => `/${countryCode}/${regionSlug}/${citySlug}/${categorySlug}/`,

  business: (slug: string) => `/companies/${slug}/`,
  guide: (slug: string) => `/guides/${slug}/`,
  guidesIndex: () => "/guides/",
  expert: (slug: string) => `/experts/${slug}/`,
  expertsIndex: () => "/experts/",
  rankingsIndex: () => "/rankings/",
  locationsIndex: () => "/locations/",
  search: (params?: { service?: string; location?: string }) => {
    if (!params) return "/search/";
    const qs = new URLSearchParams();
    if (params.service) qs.set("service", params.service);
    if (params.location) qs.set("location", params.location);
    const query = qs.toString();
    return query ? `/search/?${query}` : "/search/";
  },

  page: (slug: string) => `/${slug}/`,
  post: (slug: string) => `/blog/${slug}/`,
  blogIndex: () => "/blog/",

  howWeRank: () => "/how-we-rank/",
  editorialTeam: () => "/editorial-team/",
  advertisingDisclosure: () => "/advertising-disclosure/",
  corrections: () => "/corrections/",
  contact: () => "/contact/",

  forBusinesses: () => "/for-businesses/",
  claim: () => "/claim/",
  addBusiness: () => "/add-business/",
  advertise: () => "/advertise/",

  admin: (path = "") => `/admin${path}`,
} as const;

export function cityUrl(city: CityRef): string {
  return routes.city(city.region.country.code, city.region.slug, city.slug);
}

export function regionUrl(region: RegionRef): string {
  return routes.region(region.country.code, region.slug);
}

export function rankingUrl(ranking: {
  category: { slug: string };
  city: CityRef | null;
}): string {
  if (!ranking.city) return routes.rankingsIndex();
  return routes.ranking(
    ranking.city.region.country.code,
    ranking.city.region.slug,
    ranking.city.slug,
    ranking.category.slug,
  );
}

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

export type Crumb = { label: string; href?: string };
