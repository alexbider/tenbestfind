/**
 * A state and a province sit at the same level of the hierarchy and go by
 * different words, and several pages list both countries at once.
 *
 * Left alone that produces the heading this file was written for: "Browse
 * plumbers by provinces", printed over a list of Florida and Ontario. The
 * page had taken the noun from whichever region sorted first and applied
 * its country's plural to everything, so a mostly American list was
 * labelled with the Canadian word, in the wrong grammatical number, with
 * nothing anywhere to say which of the two a given name belonged to.
 *
 * So: one place that knows what to call a region, and one place that puts
 * regions under the country they belong to.
 */

/** The little the helpers here need to know about a country. */
export type RegionCountryLike = {
  code: string;
  name: string;
  /** "states" or "provinces", per the Country model. */
  regionLabel: string;
  sortOrder?: number;
};

export type WithCountry<T> = T & { country: RegionCountryLike };

/**
 * What one country calls a region, in the number asked for.
 *
 *   regionNoun(us)      -> "state"
 *   regionNoun(ca, 13)  -> "provinces"
 */
export function regionNoun(country: RegionCountryLike, count = 1): string {
  const plural = country.regionLabel === "provinces" ? "provinces" : "states";
  return count === 1 ? plural.replace(/s$/, "") : plural;
}

/**
 * What to call a region in a heading that covers several countries at
 * once. One country gets its own word; more than one gets both, because
 * there is no word that honestly covers a state and a province and
 * "region" is not what anybody calls the place they live.
 *
 *   regionNounAcross([us])      -> "state"
 *   regionNounAcross([us, ca])  -> "state or province"
 */
export function regionNounAcross(
  countries: RegionCountryLike[],
  count = 1,
  conjunction: "or" | "and" = "or",
): string {
  const words: string[] = [];
  for (const country of countries) {
    const word = regionNoun(country, count);
    if (!words.includes(word)) words.push(word);
  }
  if (words.length === 0) return count === 1 ? "state" : "states";
  if (words.length === 1) return words[0];
  return words.slice(0, -1).join(", ") + ` ${conjunction} ` + words[words.length - 1];
}

/**
 * Puts regions under the country they belong to, keeping each country's
 * own order and the order the regions arrived in.
 *
 * Countries come back in `sortOrder`, then by name, which is the order the
 * rest of the site lists them in, rather than the order the first matching
 * region happened to appear.
 */
export function groupByCountry<T extends { country: RegionCountryLike }>(
  regions: T[],
): { country: RegionCountryLike; regions: T[] }[] {
  const groups = new Map<string, { country: RegionCountryLike; regions: T[] }>();

  for (const region of regions) {
    const key = region.country.code;
    const group = groups.get(key);
    if (group) group.regions.push(region);
    else groups.set(key, { country: region.country, regions: [region] });
  }

  return [...groups.values()].sort((a, b) => {
    const order = (a.country.sortOrder ?? 0) - (b.country.sortOrder ?? 0);
    return order !== 0 ? order : a.country.name.localeCompare(b.country.name);
  });
}

/** The distinct countries a list of regions spans, in the same order. */
export function countriesOf<T extends { country: RegionCountryLike }>(
  regions: T[],
): RegionCountryLike[] {
  return groupByCountry(regions).map((group) => group.country);
}
