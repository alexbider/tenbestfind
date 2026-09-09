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

/** Where a title stops being read in full. Not a rule, but the practical width. */
export const TITLE_LIMIT = 60;

/**
 * A title with the brand on the end, in the longest form that fits.
 *
 * Two things pull against each other here. Every page wants the brand, because
 * a result with a publisher on it is a result somebody recognises. And a few
 * titles start with a long name: "Best Home Service Companies in Newfoundland
 * and Labrador" is fifty-six characters before the brand is anywhere near it.
 * Appending regardless produced eleven titles Google cuts off mid-word.
 *
 * So a caller passes the ways it would have written the same title, longest
 * first, and the longest one that still leaves room wins. Shortening the
 * sentence is better than losing the publisher, and losing the publisher is
 * better than being truncated by a machine that stops at a character count.
 */
export const brandedTitle = (...forms: string[]): string => {
  const suffix = ` | ${BRAND}`;
  const fits = forms.find((form) => form.length + suffix.length <= TITLE_LIMIT);
  if (fits) return fits + suffix;

  // Nothing fits with the brand on it, so the words that describe the page keep
  // the space. This is the deliberate version of what truncation does badly.
  return forms[forms.length - 1]!;
};

const brand = brandedTitle;

/**
 * The plural of a trade, as it reads in the middle of a sentence.
 *
 * `name` on a category is already plural, but only sometimes plural of a
 * person: "Plumbers" and "Electricians" work, "HVAC", "Roofing" and "Flooring"
 * do not, and lowercasing them produced "AC repair is handled by hvac". The
 * singular is always a noun phrase for the people who do the work, so this
 * pluralises that instead and lowercases only the words that are not acronyms.
 */
export function tradesPhrase(category: { singular: string }): string {
  const plural = category.singular
    .split(" ")
    .map((word, index, words) => (index === words.length - 1 ? pluralise(word) : word))
    .join(" ");

  return plural
    .split(" ")
    .map((word) => (isAcronym(word) ? word : word.toLowerCase()))
    .join(" ");
}

/** Two or more letters, all capitals: HVAC, AC, GC. Left alone everywhere. */
const isAcronym = (word: string) => word.length >= 2 && word === word.toUpperCase() && /[A-Z]/.test(word);

function pluralise(word: string): string {
  if (/y$/i.test(word) && !/[aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}

/**
 * A "near you" heading that does not fight the name in front of it.
 *
 * The name is written however the trade writes it, acronyms and all, and the
 * suffix used to be title case, which produced "AC repair Near You". Sentence
 * case on the suffix leaves the name alone and reads as one phrase.
 */
export function nearYou(term: string): string {
  return `${term} near you`;
}

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
  const heading = nearYou(term);
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

/* ------------------------------------------------------------- the people */

/**
 * An editor's own page.
 *
 * The separator used to be an em dash, which is not house style and read as
 * punctuation nobody chose. A comma is what a person types. The role is dropped
 * to its first clause, and then entirely, when the full line will not fit:
 * "Marcus Reed, Expert reviewer, exteriors and structure" is fifty-two
 * characters before the brand.
 */
export function expertTitle(name: string, role: string): string {
  const head = role.split(",")[0]!.trim();
  return brand(`${name}, ${role}`, `${name}, ${head}`, name);
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
    title: brand(`Best Home Service Companies in ${short}`, `Home Services in ${short}`),
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
    title: brand(
      `Best Home Service Companies in ${region.name}`,
      `Home Service Companies in ${region.name}`,
      `Home Services in ${region.name}`,
    ),
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
    title: brand(
      `Best Home Service Companies in ${place}`,
      `Home Service Companies in ${place}`,
      `Home Services in ${place}`,
    ),
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
 * Below this, a ranking is not a shortlist, it is a company with a page.
 *
 * The importer used to name whatever it found, which put "1 Best Plumbers in
 * Minneapolis, MN" on a live URL. Naming the count is the smaller half of the
 * problem: at one entry the page has nothing to compare, so it is held back
 * rather than renamed.
 */
export const RANKING_MIN_ENTRIES = 5;

/**
 * What a ranking should be called, given how many companies are really on it.
 *
 * The number appears only at a full ten. Anything else is "Best X in Y", which
 * stays true as entries come and go, and a title that stops churning is worth
 * more than one that counts.
 */
export function rankingTitle(
  category: Trade,
  city: { name: string },
  region: { code: string },
  publishedEntries: number,
): string {
  const service = tradePlural(category);
  const place = placeLabel(city, region);
  return publishedEntries === TOP_TEN
    ? `${TOP_TEN} Best ${service} in ${place}`
    : `Best ${service} in ${place}`;
}

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

  // The brand goes back on. Removing the entry count from the heading took the
  // suffix with it, which left four ranking titles at twenty-seven characters
  // and every one of them unattributed. The year is the first thing dropped
  // when the line runs long, because it is the least of what the title says.
  const title = complete
    ? brand(`${TOP_TEN} Best ${service} in ${place}${year ? ` (${year})` : ""}`, `${TOP_TEN} Best ${service} in ${place}`)
    : brand(`Best ${service} in ${place}`);

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

/**
 * What a card, a list row or a link calls a ranking.
 *
 * The same heading the ranking page itself uses, so an archive cannot promise
 * ten while the list holds seven. Cards carry no year: they sit next to a
 * review date already, and a year in a grid of twenty headings is noise.
 */
export function rankingCardTitle(ranking: {
  category: Trade;
  city: { name: string; region: { code: string } } | null;
  _count?: { entries: number };
  title: string;
}): string {
  if (!ranking.city) return ranking.title;
  const published = ranking._count?.entries ?? 0;
  const service = tradePlural(ranking.category);
  const place = placeLabel(ranking.city, ranking.city.region);
  return published === TOP_TEN
    ? `${TOP_TEN} Best ${service} in ${place}`
    : `Best ${service} in ${place}`;
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
