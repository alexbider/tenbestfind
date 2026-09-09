// Who signs a ranking or a guide.
//
// Every ranking page carries "Last reviewed" and a methodology link, and not
// one of them named a person, because the author and reviewer columns were only
// ever filled by hand and the importer never filled them. A shortlist nobody
// signs is a shortlist nobody is answerable for, which is exactly what a reader
// deciding whether to trust it is trying to work out.
//
// The site already knows the answer. Every editor carries the trades they cover
// and the markets they know, and a `limits` paragraph saying in plain words what
// they do not touch. This reads those and picks the person whose stated field
// actually covers the page.
//
// It will decline. A trade with no matching editor gets no byline rather than
// the nearest available name, because a roofing reviewer credited on an HVAC
// ranking is worse than an unsigned one: the first is a false claim about a
// named person, the second is only a gap.

import { db } from "./db";
import { parseList } from "./json";

export type BylineCandidate = {
  id: string;
  name: string;
  slug: string;
  role: string;
  isAuthor: boolean;
  isReviewer: boolean;
  specializations: string[];
  markets: string[];
  limits: string | null;
};

export type Byline = { authorId: string | null; reviewerId: string | null };

/** Words too common to mean anything on their own when matching a trade. */
const NOISE = new Set([
  "and",
  "the",
  "of",
  "for",
  "services",
  "service",
  "company",
  "companies",
  "contractor",
  "contractors",
  "home",
  "local",
  "general",
  "work",
  "systems",
  "system",
]);

const tokens = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !NOISE.has(word));

/**
 * Trade words matched against a person's stated field.
 *
 * Stemmed only far enough to join the forms the same trade is written in:
 * "Roofing" against "Roofers", "Remodeling" against "remodeling". Anything
 * cleverer starts matching things that are not the same trade.
 */
const stem = (word: string): string =>
  word
    .replace(/(ing|ers|er|ies|es|s)$/, "")
    .replace(/i$/, "y");

const overlaps = (left: string[], right: string[]): number => {
  const theirs = new Set(right.flatMap((value) => tokens(value).map(stem)));
  return left.flatMap((value) => tokens(value).map(stem)).filter((word) => theirs.has(word)).length;
};

/**
 * Whether a person's own statement of what they do not cover rules this out.
 *
 * `limits` is published on their profile as written, so it is the closest thing
 * the site has to the person saying it themselves, and it wins over any score.
 */
function excluded(person: BylineCandidate, subject: string[]): boolean {
  if (!person.limits) return false;
  const sentence = person.limits.toLowerCase();
  const denial = sentence.match(/does not (?:review|write|cover|handle)([^.]*)/g);
  if (!denial) return false;

  const denied = denial.join(" ");
  return subject.some((value) => tokens(value).map(stem).some((word) => denied.includes(word)));
}

/** Everyone who could sign something, loaded once per pass. */
export async function bylineCandidates(): Promise<BylineCandidate[]> {
  const rows = await db.person.findMany({
    where: { published: true },
    select: {
      id: true,
      name: true,
      slug: true,
      role: true,
      isAuthor: true,
      isReviewer: true,
      specializations: true,
      markets: true,
      limits: true,
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    ...row,
    specializations: parseList(row.specializations),
    markets: parseList(row.markets),
  }));
}

/** Somebody whose job title says reviewing is the job. */
const readsAsReviewer = (person: BylineCandidate) =>
  person.isReviewer && /review/i.test(person.role);

/**
 * The author and reviewer for one page, or nulls.
 *
 * The trade decides who is in the running and the market breaks the tie, which
 * is the order a desk would use: an editor who covers plumbing is the right
 * person for a plumbing list wherever it is, and between two plumbing editors
 * the one who knows the city is better.
 *
 * Which slot somebody lands in follows their own job title rather than what is
 * still empty. Marcus Reed is "Expert reviewer, exteriors and structure", so on
 * a roofing list he is the reviewer, and if there is no separate writer that
 * list goes out reviewed and unauthored. Filling the other slot with him as
 * well would say a second person checked his work, and nobody did.
 */
export function bylineFor(
  people: BylineCandidate[],
  subject: { trade: string[]; market?: string[] },
): Byline {
  const trade = subject.trade.filter(Boolean);
  const market = (subject.market ?? []).filter(Boolean);

  const scored = people
    .filter((person) => !excluded(person, trade))
    .map((person) => ({
      person,
      trade: overlaps(trade, person.specializations),
      market: overlaps(market, person.markets),
    }))
    // No overlap with the stated field is no claim to the page, whatever else
    // the person knows.
    .filter((entry) => entry.trade > 0)
    .sort((a, b) => b.trade - a.trade || b.market - a.market || a.person.name.localeCompare(b.person.name))
    .map((entry) => entry.person);

  const reviewer = scored.find(readsAsReviewer) ?? null;
  const author = scored.find((person) => person.isAuthor && person.id !== reviewer?.id) ?? null;

  // Nobody writes and reviews the same page, but somebody who could have done
  // either is better placed as the writer when no one else can write.
  if (!author && reviewer && reviewer.isAuthor) {
    return { authorId: null, reviewerId: reviewer.id };
  }

  const secondReviewer =
    reviewer ?? scored.find((person) => person.isReviewer && person.id !== author?.id) ?? null;

  return { authorId: author?.id ?? null, reviewerId: secondReviewer?.id ?? null };
}
