// What every page calls itself.
//
// One module decides the title, the H1, the line under it and the meta
// description for every kind of page on the site, from the same structured
// values the page itself renders. Templates used to write their own, which is
// how a city page came to call itself "the ten best local businesses" while its
// title said something else and its description promised reviews it did not
// show.
//
// The rules here are deliberate rather than mechanical:
//
//   A page never claims ten companies unless ten are published.
//   A page never carries a year unless it was actually reviewed in that year.
//   A description never mentions something the page does not show.
//
// Nothing in here reads the database. Callers pass what they already loaded,
// which keeps it pure, testable and impossible to get out of step with the page
// it is describing.

export const BRAND = "TenBestFind";

/**
 * Everything a template and its metadata need to describe one page.
 *
 * `title` is final: the global title template is bypassed for anything built
 * here, because half of these titles carry the brand and half deliberately do
 * not.
 */
export type PageCopy = {
  title: string;
  /** The one visible H1. */
  h1: string;
  /** The line directly under the H1, where the design has one. */
  support?: string;
  description: string;
  /** False when the rules say this page should stay out of the index. */
  indexable: boolean;
  /** Why it is out, for the QA report and the admin. */
  reason?: string;
};

const brand = (title: string) => `${title} | ${BRAND}`;

/** "Columbus, OH", the way every page in the site writes a place. */
export function placeLabel(city: { name: string }, region: { code: string }): string {
  return `${city.name}, ${region.code.toUpperCase()}`;
}

/* --------------------------------------------------------------- the site */

export function homeCopy(): PageCopy {
  return {
    title: brand("10 Best Local Businesses Near You"),
    h1: "Find the 10 Best Local Service Companies in Your City",
    description:
      "Find researched local businesses across the U.S. and Canada. Compare TenBestFind rankings, company profiles, reviews, services and trusted local guides.",
    indexable: true,
  };
}

export function homeServicesCopy(): PageCopy {
  return {
    title: brand("Best Home Service Companies Near You"),
    h1: "Find the Best Home Service Companies Near You",
    description:
      "Find researched home service companies near you. Compare TenBestFind rankings, services, reviews, business profiles and practical homeowner guides.",
    indexable: true,
  };
}

export function locationsCopy(): PageCopy {
  return {
    title: brand("Best Local Businesses by City"),
    h1: "Every Market We Cover",
    description:
      "Browse TenBestFind locations across the U.S. and Canada. Find researched local business rankings by state, province, city and service.",
    indexable: true,
  };
}

export function rankingsArchiveCopy(): PageCopy {
  return {
    title: brand("Latest Local Business Rankings"),
    h1: "Every Ranking We Have Published",
    description:
      "Browse TenBestFind's latest local business rankings across the U.S. and Canada. Explore researched companies by location and home service category.",
    indexable: true,
  };
}

export function guidesCopy(): PageCopy {
  return {
    title: brand("Home Service Guides & Expert Advice"),
    h1: "Home Service Guides & Expert Advice",
    description:
      "Explore TenBestFind home service guides covering costs, hiring tips, contractor research, local services and practical homeowner advice.",
    indexable: true,
  };
}

/* ------------------------------------------------------------- the trades */

/**
 * How a heading names several of one trade.
 *
 * The category name is the taxonomy label and is not always a noun for people:
 * "Plumbers" reads fine, "Roofing" does not, and "10 Best Roofing in Dallas" is
 * the sort of sentence that tells a reader nobody looked at the page. The
 * singular is always a person or a company, so the plural of it always works.
 */
export type Trade = { name: string; singular?: string | null; pluralName?: string | null };

export function tradePlural(category: Trade): string {
  const override = category.pluralName?.trim();
  if (override) return override;

  const singular = category.singular?.trim();
  if (!singular) return category.name;

  const plural = /man$/i.test(singular)
    ? singular.replace(/man$/i, "men")
    : /[^aeiou]y$/i.test(singular)
      ? `${singular.slice(0, -1)}ies`
      : /(s|x|z|ch|sh)$/i.test(singular)
        ? `${singular}es`
        : `${singular}s`;

  // The singular is stored in sentence case ("Roofing company") and this goes
  // in a heading, so each word is raised without touching what follows: HVAC
  // stays HVAC rather than becoming Hvac.
  return plural
    .split(" ")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * A primary service page. `name` is the trade as a searcher writes it, so
 * "Plumbers" rather than "Plumbing": the title reads "Best Plumbers Near You".
 */
export function serviceCopy(
  category: Trade & { description?: string | null },
  counts: { publishedRankings: number },
): PageCopy {
  const service = tradePlural(category);
  return {
    title: brand(`Best ${service} Near You`),
    h1: `Best ${service} Near You`,
    description: `Find researched ${service.toLowerCase()} near you. Compare local rankings, reviews, services and detailed business profiles from TenBestFind.`,
    // A trade with nothing published under it is a page with a search box on
    // it. It stays in the site for the people already on it, and out of the
    // index until it has something to say.
    indexable: counts.publishedRankings > 0,
    reason: counts.publishedRankings > 0 ? undefined : "no published rankings in this trade yet",
  };
}

/**
 * Below this a subservice page is the category page with one word changed.
 * Three companies is the point where the list is worth reading as a list.
 */
export const SUBSERVICE_MIN_BUSINESSES = 3;

/**
 * A subservice page. The heading uses the term people actually search, which
 * is not always the internal name: "Emergency Plumbing" is filed that way and
 * searched as "emergency plumbers", so an editor can set the search term and
 * the name is only the fallback.
 */
export function subserviceCopy(
  subservice: { name: string; searchTerm?: string | null; description?: string | null },
  category: Trade & { serviceName: string },
  counts: { businesses: number; publishedRankings: number },
): PageCopy {
  const term = subservice.searchTerm?.trim() || subservice.name;
  const heading = `${term} Near You`;
  const enough = counts.businesses >= SUBSERVICE_MIN_BUSINESSES;

  return {
    title: brand(heading),
    h1: heading,
    description:
      subservice.description?.trim() ||
      `Find ${term.toLowerCase()} near you. Compare local companies, reviews, services and TenBestFind rankings for ${subservice.name.toLowerCase()}.`,
    // Every possible keyword permutation is not a page. One earns indexing when
    // there is enough behind it to be worth landing on.
    indexable: enough && counts.publishedRankings > 0,
    reason: !enough
      ? `only ${counts.businesses} companies offer this, ${SUBSERVICE_MIN_BUSINESSES} needed`
      : counts.publishedRankings > 0
        ? undefined
        : "no published rankings in the parent trade yet",
  };
}

/* ------------------------------------------------------------ the places */

export function countryCopy(
  country: { name: string; code: string; blurb?: string | null },
  counts: { publishedRankings: number },
): PageCopy {
  // The United States is written "the U.S." in a title and "the United States"
  // in a heading, which is what the spec asks for and what reads best in each.
  const short = country.code.toLowerCase() === "us" ? "the U.S." : country.name;
  const long = country.code.toLowerCase() === "us" ? "the United States" : country.name;

  return {
    title: brand(`Best Home Service Companies in ${short}`),
    h1: `Best Home Service Companies in ${long}`,
    description: `Find researched home service companies across ${long}. Browse TenBestFind rankings by ${
      country.code.toLowerCase() === "ca" ? "province" : "state"
    }, city and service category.`,
    indexable: counts.publishedRankings > 0,
    reason: counts.publishedRankings > 0 ? undefined : "no published rankings in this country yet",
  };
}

export function regionCopy(
  region: { name: string; blurb?: string | null },
  counts: { publishedRankings: number },
): PageCopy {
  return {
    title: brand(`Best Home Service Companies in ${region.name}`),
    h1: `Best Home Service Companies in ${region.name}`,
    description: `Find researched home service companies across ${region.name}. Explore TenBestFind rankings, cities, services and detailed business profiles.`,
    indexable: counts.publishedRankings > 0,
    reason: counts.publishedRankings > 0 ? undefined : "no published rankings in this region yet",
  };
}

export function cityCopy(
  city: { name: string; blurb?: string | null },
  region: { code: string },
  counts: { publishedRankings: number },
): PageCopy {
  const place = placeLabel(city, region);
  return {
    title: brand(`Best Home Service Companies in ${place}`),
    h1: `Best Home Service Companies in ${place}`,
    description: `Find researched home service companies in ${place}. Explore local rankings, reviews, business profiles and service guides from TenBestFind.`,
    indexable: counts.publishedRankings > 0,
    reason: counts.publishedRankings > 0 ? undefined : "no published ranking for this city yet",
  };
}

/* ----------------------------------------------------------- the rankings */

/** A ranking is a Top 10 only when ten published companies are on it. */
export const TOP_TEN = 10;

/**
 * A city and trade ranking.
 *
 * Two rules do the work. The page may only call itself a Top 10 when ten
 * published companies are actually listed, and it may only carry a year when an
 * editor reviewed it in that year. Neither is cosmetic: a list of seven that
 * says ten is wrong on the page and wrong in the result, and a year that rolls
 * over on the first of January is a freshness claim nobody made.
 */
export function rankingCopy(
  ranking: { status: string; lastReviewedAt?: Date | null; summary?: string | null },
  category: Trade,
  city: { name: string },
  region: { code: string },
  counts: { publishedEntries: number },
): PageCopy {
  const service = tradePlural(category);
  const place = placeLabel(city, region);
  const complete = counts.publishedEntries === TOP_TEN;
  const year = ranking.lastReviewedAt ? ranking.lastReviewedAt.getFullYear() : null;

  const title = complete
    ? `${TOP_TEN} Best ${service} in ${place}${year ? ` (${year})` : ""}`
    : `Best ${service} in ${place}`;

  const h1 = complete ? `${TOP_TEN} Best ${service} in ${place}` : `Best ${service} in ${place}`;

  const description = complete
    ? `Compare the ${TOP_TEN} best ${service.toLowerCase()} in ${place}, researched by TenBestFind. See reviews, services, company profiles and how each business was evaluated.`
    : `Compare researched ${service.toLowerCase()} in ${place}. See local business profiles, reviews, services and TenBestFind evaluation information.`;

  return {
    title,
    h1,
    description,
    indexable: ranking.status === "PUBLISHED" && counts.publishedEntries > 0,
    reason:
      ranking.status !== "PUBLISHED"
        ? `the ranking is ${ranking.status.toLowerCase()}`
        : counts.publishedEntries > 0
          ? undefined
          : "no published companies on the list",
  };
}

/* ---------------------------------------------------------- the companies */

/**
 * A company profile.
 *
 * The description changes with what the profile can actually show. A company
 * with no review data must not be described as having reviews, and a thin
 * profile must not be made to sound complete, because the description is a
 * promise about the page and a broken one costs more than a vague one.
 */
export function companyCopy(
  business: { name: string },
  city: { name: string } | null,
  region: { code: string; name: string } | null,
  category: { serviceName: string },
  facts: { hasReviews: boolean; thin: boolean },
): PageCopy {
  const service = category.serviceName;
  const place = city && region ? placeLabel(city, region) : null;
  const at = place ? ` in ${place}` : "";

  const title = facts.hasReviews
    ? `${business.name}${at} | Reviews & Services`
    : `${business.name}${at} | Services & Information`;

  const description = facts.thin
    ? `View available information for ${business.name}${at}, including services, location, contact details and TenBestFind research status.`
    : facts.hasReviews
      ? `Research ${business.name}${at}. See ${service.toLowerCase()} services, review data, service areas, company details and its TenBestFind profile.`
      : `Learn about ${business.name}${at}. See ${service.toLowerCase()} services, service areas, contact details and TenBestFind company information.`;

  return {
    title,
    // The company is the entity. Nothing else belongs in its H1: the location
    // and the trade follow immediately as the supporting line.
    h1: business.name,
    support: city && region ? `${service} Company in ${city.name}, ${region.name}` : service,
    description,
    indexable: true,
  };
}

/* ---------------------------------------------------------- the fallbacks */

/**
 * Used only when the richer builders above cannot run: a record missing its
 * city, a page type without its own rule. Still specific enough to be true.
 */
export const fallbackDescription = {
  company: (name: string, place: string | null) =>
    `Learn about ${name}${place ? ` in ${place}` : ""}, including available services, company information and TenBestFind research.`,
  city: (place: string) =>
    `Explore local businesses and home service companies in ${place}, with researched TenBestFind profiles and rankings.`,
  service: (service: string) =>
    `Find researched ${service.toLowerCase()} near you and explore local TenBestFind business profiles, rankings and service information.`,
  ranking: (service: string, place: string) =>
    `Compare researched ${service.toLowerCase()} in ${place}, including company profiles, services and TenBestFind evaluation information.`,
  guide: (topic: string) => `Learn about ${topic} with practical information and research from TenBestFind.`,
};
