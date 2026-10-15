import { tradePlural, tradesPhrase, type Trade } from "./seo-copy";

/**
 * Every way a page names a trade inside a sentence, worked out in one place.
 *
 * The templates used to drop the taxonomy label straight into prose, so a label
 * that is not a plural noun for people ("Roofing", "HVAC", "Solar") produced
 * "Do roofing need a licence?", "a hvac company" and "Solar handle panels". The
 * label stays the label; sentences take the forms below.
 */

/** Two or more capitals: HVAC, AC, EV. Never lowercased. */
const isAcronym = (word: string) => word.length >= 2 && word === word.toUpperCase() && /[A-Z]/.test(word);

/** Lowercase for the middle of a sentence, leaving acronyms as written. */
export function inSentence(phrase: string): string {
  return phrase
    .split(" ")
    .map((word) => (isAcronym(word) ? word : word.toLowerCase()))
    .join(" ");
}

/** First letter up, the rest as written: "roofing companies" to "Roofing companies". */
export function capitalise(phrase: string): string {
  return phrase ? phrase[0]!.toUpperCase() + phrase.slice(1) : phrase;
}

/**
 * "a" or "an" by sound rather than by letter. An acronym is read letter by
 * letter, so HVAC takes "an" (aitch), EV takes "an" and UV takes "a".
 */
export function article(phrase: string): "a" | "an" {
  const first = phrase.trim().split(" ")[0] ?? "";
  if (isAcronym(first)) return /^[AEFHILMNORSX]/.test(first) ? "an" : "a";
  if (/^(uni|use|usu|eu|one|once)/i.test(first)) return "a";
  if (/^(hour|honest|honou?r|heir)/i.test(first)) return "an";
  return /^[aeiou]/i.test(first) ? "an" : "a";
}

export function withArticle(phrase: string): string {
  return `${article(phrase)} ${phrase}`;
}

/**
 * "Kitchen · Bathroom · Basement" as prose: "kitchen, bathroom and basement".
 * The tagline is written for a card, not for a sentence.
 */
export function taglineAsList(tagline: string | null | undefined): string | null {
  const parts = (tagline ?? "")
    .split(/\s*[·•|,]\s*/)
    .map((part) => inSentence(part.trim()))
    .filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

export type TradeWords = {
  /** For several, mid-sentence: "plumbers", "roofing companies", "HVAC companies". */
  pros: string;
  /** For several, in a heading: "Plumbers", "Roofing Companies". */
  Pros: string;
  /** For one, mid-sentence: "plumber", "roofing company", "HVAC company". */
  pro: string;
  /** The same with its article: "a plumber", "an HVAC company". */
  aPro: string;
  /** The trade as an activity, mid-sentence: "plumbing", "HVAC", "gutter". */
  trade: string;
};

/**
 * The trade as a modifier ("gutter services", "deck research"). serviceName is
 * stored as the searcher writes it, which is sometimes a plural ("Gutters",
 * "Decks"); when the singular starts with that word minus its "s", the stem is
 * the right modifier.
 */
function tradeModifier(serviceName: string, singular: string): string {
  const service = inSentence(serviceName.trim());
  const lowerSingular = singular.trim().toLowerCase();
  if (/s$/.test(service) && !/(ss|services)$/.test(service)) {
    const stem = service.slice(0, -1);
    if (lowerSingular.startsWith(stem.toLowerCase())) return stem;
  }
  return service;
}

export function tradeWords(category: Trade & { serviceName: string; singular?: string | null }): TradeWords {
  const singular = category.singular?.trim() || category.name;
  const pros = category.singular ? tradesPhrase({ singular }) : inSentence(category.name);
  const pro = inSentence(singular);
  return {
    pros,
    Pros: tradePlural(category),
    pro,
    aPro: withArticle(pro),
    trade: tradeModifier(category.serviceName, singular),
  };
}

/**
 * The noun for the permit to work, spelled for the reader's country: Canadian
 * pages say licence, American pages and pages for both countries say license.
 */
export function licenceWord(country?: string | null): "license" | "licence" {
  return country?.toUpperCase() === "CA" ? "licence" : "license";
}
