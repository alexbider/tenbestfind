// Every phrase this site could plausibly write a guide for.
//
// Thirty-eight trades, two countries, twenty-nine states and forty-one cities
// make a matrix of a few thousand pairs, and four kinds of guide turn that into
// something like eleven thousand candidates. That number is only affordable
// because pricing is bulk: eleven thousand keywords cost about sixteen calls,
// not eleven thousand. So the right move is to generate everything defensible
// and let the data throw most of it away, rather than guess in advance.
//
// This file is pure and imports nothing but the guide types. Generation is
// deterministic from the taxonomy, which is what lets a plan regenerate its
// candidate list on every tick instead of carrying half a megabyte of them
// through the database between steps.

import { GUIDE_TYPES, type GuideType } from "./enums";

export type PlaceKind = "country" | "region" | "city";

export type CandidatePlace = {
  kind: PlaceKind;
  id: string;
  /** How it reads in a search: "Austin", "Texas", "United States". */
  name: string;
  /** Which market its volumes are measured in. */
  market: string;
  countryId: string | null;
  regionId: string | null;
  cityId: string | null;
};

export type CandidateService = {
  id: string;
  /** "Plumbers" */
  name: string;
  /** "Plumber" */
  singular: string;
  /** "Plumbing" */
  serviceName: string;
  slug: string;
};

export type Candidate = {
  keyword: string;
  guideType: GuideType;
  service: CandidateService;
  /** Always set. A country-wide place is what "national" means on this site. */
  place: CandidatePlace;
  /** Which pattern produced it, for the admin to show and for nothing else. */
  pattern: string;
};

/** Lower-cased, single-spaced: the form every DataForSEO endpoint keys on. */
export function normaliseKeyword(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

const lower = (value: string) => value.toLowerCase();

/**
 * The patterns, per kind of guide.
 *
 * National and local are written separately rather than one template with an
 * optional suffix, because "roofing cost" and "roofing cost in Austin" are not
 * the same sentence with a word added: the local one wants the price to move
 * and the national one wants it to be a range. Keeping them apart keeps both
 * readable and makes a bad pattern easy to delete.
 */
const PATTERNS: Record<GuideType, { national: ((s: CandidateService) => string)[]; local: ((s: CandidateService, place: string) => string)[] }> = {
  HOW_TO_CHOOSE: {
    national: [
      (s) => `how to choose a ${lower(s.singular)}`,
      (s) => `how to find a good ${lower(s.singular)}`,
      (s) => `what to look for in a ${lower(s.singular)}`,
      (s) => `how to hire a ${lower(s.singular)}`,
    ],
    local: [
      (s, place) => `how to choose a ${lower(s.singular)} in ${place}`,
      (s, place) => `finding a good ${lower(s.singular)} in ${place}`,
      (s, place) => `hiring a ${lower(s.singular)} in ${place}`,
    ],
  },
  COST: {
    national: [
      (s) => `${lower(s.serviceName)} cost`,
      (s) => `how much does ${lower(s.serviceName)} cost`,
      (s) => `average ${lower(s.serviceName)} cost`,
      (s) => `${lower(s.singular)} hourly rate`,
    ],
    local: [
      (s, place) => `${lower(s.serviceName)} cost in ${place}`,
      (s, place) => `how much does ${lower(s.serviceName)} cost in ${place}`,
      (s, place) => `${lower(s.singular)} prices in ${place}`,
    ],
  },
  QUESTIONS: {
    national: [
      (s) => `questions to ask a ${lower(s.singular)}`,
      (s) => `what to ask a ${lower(s.singular)} before hiring`,
      (s) => `${lower(s.singular)} red flags`,
    ],
    local: [
      (s, place) => `questions to ask a ${lower(s.singular)} in ${place}`,
      (s, place) => `${lower(s.singular)} scams in ${place}`,
    ],
  },
  CHECKLIST: {
    national: [
      (s) => `${lower(s.serviceName)} checklist`,
      (s) => `hiring a ${lower(s.singular)} checklist`,
      (s) => `${lower(s.serviceName)} contract checklist`,
    ],
    // Licensing and permits are the strongest local informational topics there
    // are: the answer genuinely differs by state, which is exactly what a
    // national page cannot do and a search engine knows it.
    local: [
      (s, place) => `${lower(s.singular)} license requirements in ${place}`,
      (s, place) => `${lower(s.serviceName)} permit requirements in ${place}`,
      (s, place) => `${lower(s.serviceName)} checklist for ${place}`,
    ],
  },
};

export type GenerateInput = {
  services: CandidateService[];
  places: CandidatePlace[];
  guideTypes: GuideType[];
};

/**
 * The whole matrix, deduplicated by phrase.
 *
 * Two patterns can land on the same words, and a phrase is worth exactly one
 * candidate however many ways there were to arrive at it. First one wins, which
 * makes the output stable across runs as long as the taxonomy is.
 */
export function generateCandidates({ services, places, guideTypes }: GenerateInput): Candidate[] {
  const types = guideTypes.length > 0 ? guideTypes : [...GUIDE_TYPES];
  const seen = new Set<string>();
  const out: Candidate[] = [];

  const add = (candidate: Candidate) => {
    const phrase = normaliseKeyword(candidate.keyword);
    // Keyed by market as well as phrase: "how to choose a plumber" is one
    // candidate in the United States and a different one in Canada, priced
    // separately and answered by a different guide.
    const dedupe = `${candidate.place.market}|${phrase}`;
    if (!phrase || seen.has(dedupe)) return;
    seen.add(dedupe);
    out.push({ ...candidate, keyword: phrase });
  };

  for (const service of services) {
    for (const type of types) {
      for (const place of places) {
        // A country-wide guide uses the national wording, because naming the
        // country in the phrase is how nobody searches.
        if (place.kind === "country") {
          for (const [index, build] of PATTERNS[type].national.entries()) {
            add({ keyword: build(service), guideType: type, service, place, pattern: `${type}/national/${index}` });
          }
          continue;
        }
        for (const [index, build] of PATTERNS[type].local.entries()) {
          add({
            keyword: build(service, place.name),
            guideType: type,
            service,
            place,
            pattern: `${type}/${place.kind}/${index}`,
          });
        }
      }
    }
  }

  return out;
}

/** The key a coverage check uses: one guide per trade, place and kind. */
export function coverageKey(
  serviceId: string | null,
  placeId: string | null,
  guideType: string,
): string {
  return `${serviceId ?? "-"}|${placeId ?? "-"}|${guideType}`;
}

/** The most specific place a guide row names, or null when it is national. */
export function placeIdOf(row: {
  cityId?: string | null;
  regionId?: string | null;
  countryId?: string | null;
}): string | null {
  return row.cityId ?? row.regionId ?? row.countryId ?? null;
}
