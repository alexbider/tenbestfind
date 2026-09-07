// Why one topic beat the others.
//
// A suggestion nobody can argue with is a suggestion nobody trusts, so the
// score is not a black box: every factor that moved it is recorded with the
// number it moved it by and a sentence saying why. The admin prints those back,
// and an editor who disagrees with a suggestion can see exactly which input to
// distrust.
//
// The weights below are opinions, not measurements. They are written here in
// one readable block rather than scattered through the pipeline precisely so
// they can be argued with and changed.

export type ScoreFactor = { label: string; detail: string; delta: number };

export type ScoreInput = {
  /** Monthly searches, when anyone knows. */
  volume: number | null;
  /** How often the phrase is asked of an assistant, when that column was bought. */
  aiVolume: number | null;
  /** 0 easy, 100 hopeless. */
  difficulty: number | null;
  intent: string | null;
  /** Twelve months of volume, oldest first. */
  trend: number[];
  /** Where this site already ranks, when it does. */
  ourRank: number | null;
  /** A published guide already covers this trade, place and kind. */
  covered: boolean;
  /** Published companies in this trade and place, which is who the guide links to. */
  listings: number;
  /** Distinct domains in the top five that are forums, aggregators or thin. */
  weakResults: number | null;
  /** Questions Google attaches to the search. */
  questions: number;
  /** Google is already generating an answer for this. */
  aiOverview: boolean;
  /** The gates, so a near miss can be reported rather than silently dropped. */
  minVolume: number;
  maxDifficulty: number;
};

export type Scored = { score: number; factors: ScoreFactor[]; excluded: string | null };

/**
 * Domains whose presence high in the results means the question is being
 * answered by a forum thread or a lead-generation page rather than by anyone
 * who has actually done the work. That is the gap this site exists to fill.
 */
const WEAK_HOSTS = [
  "reddit.com",
  "quora.com",
  "facebook.com",
  "pinterest.com",
  "youtube.com",
  "yelp.com",
  "thumbtack.com",
  "angi.com",
  "homeadvisor.com",
  "houzz.com",
  "porch.com",
  "nextdoor.com",
];

/** How many of the top five are somewhere a researched page can beat. */
export function countWeakResults(domains: string[]): number {
  return domains
    .slice(0, 5)
    .filter((domain) => WEAK_HOSTS.some((host) => domain.toLowerCase().endsWith(host))).length;
}

/** Rising, flat or falling, as a fraction: +0.4 means the last quarter is 40% up. */
export function trendSlope(trend: number[]): number | null {
  if (trend.length < 8) return null;
  const recent = trend.slice(-3);
  const before = trend.slice(-12, -3);
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const past = mean(before);
  if (!Number.isFinite(past) || past <= 0) return null;
  return (mean(recent) - past) / past;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function scoreTopic(input: ScoreInput): Scored {
  const factors: ScoreFactor[] = [];
  const add = (label: string, detail: string, delta: number) => {
    if (delta !== 0) factors.push({ label, detail, delta: Math.round(delta) });
    return delta;
  };

  // A guide that already exists is not an opportunity, it is a duplicate, and
  // two pages competing for one phrase is worse than one page.
  if (input.covered) {
    return {
      score: 0,
      factors: [{ label: "Already covered", detail: "A published guide already answers this for this trade and place.", delta: 0 }],
      excluded: "A published guide already covers this.",
    };
  }

  if (input.volume !== null && input.volume < input.minVolume) {
    return {
      score: 0,
      factors: [],
      excluded: `${input.volume} searches a month, under the floor of ${input.minVolume}.`,
    };
  }

  if (input.difficulty !== null && input.difficulty > input.maxDifficulty) {
    return {
      score: 0,
      factors: [],
      excluded: `Difficulty ${input.difficulty}, over the ceiling of ${input.maxDifficulty}.`,
    };
  }

  let score = 0;

  // Demand, on a log scale. The difference between 50 and 500 searches matters
  // far more than the difference between 5,000 and 5,450.
  if (input.volume !== null && input.volume > 0) {
    const value = clamp((Math.log10(input.volume) / Math.log10(20_000)) * 30, 0, 30);
    score += add("Demand", `${input.volume.toLocaleString()} searches a month.`, value);
  } else {
    score += add("No measured demand", "Nobody could price this phrase, so it is ranked on everything else.", -6);
  }

  // The GEO column. A phrase people put to an assistant is a phrase worth
  // answering in the first paragraph, whatever its search volume says.
  if (input.aiVolume !== null && input.aiVolume > 0) {
    const value = clamp((Math.log10(input.aiVolume) / Math.log10(5_000)) * 12, 0, 12);
    score += add("Asked of assistants", `${input.aiVolume.toLocaleString()} AI searches a month.`, value);
  }

  if (input.difficulty !== null) {
    const value = ((100 - input.difficulty) / 100) * 20;
    score += add("Difficulty", `${input.difficulty} out of 100 to reach the first page.`, value);
  }

  // Intent is the strongest single signal, because it decides whether the right
  // answer is a guide at all.
  switch (input.intent) {
    case "informational":
      score += add("Informational", "Somebody wants to be told something, which is what a guide is.", 16);
      break;
    case "commercial":
      score += add("Commercial", "Somebody comparing before they buy. A guide can serve this, a ranking serves it better.", 5);
      break;
    case "transactional":
      score += add("Transactional", "Somebody ready to hire. This wants a ranking page, not a guide.", -14);
      break;
    case "navigational":
      score += add("Navigational", "Somebody looking for a specific company by name.", -18);
      break;
    default:
      break;
  }

  if (input.ourRank !== null) {
    if (input.ourRank <= 3) {
      score += add("Already winning", `This site is at position ${input.ourRank}. Leave it alone.`, -22);
    } else if (input.ourRank <= 20) {
      score += add(
        "Striking distance",
        `This site is at position ${input.ourRank}. One good page usually moves that further than a new topic would.`,
        20,
      );
    } else {
      score += add("Ranked, distantly", `This site appears at position ${input.ourRank}.`, 6);
    }
  }

  if (input.weakResults !== null && input.weakResults > 0) {
    score += add(
      "Weak first page",
      `${input.weakResults} of the top five are forums or lead-generation directories.`,
      input.weakResults * 3,
    );
  }

  if (input.questions > 0) {
    score += add(
      "Questions to answer",
      `Google shows ${input.questions} related questions, which is a structure and an FAQ handed over for free.`,
      clamp(input.questions, 0, 7),
    );
  }

  if (input.aiOverview) {
    score += add(
      "AI overview present",
      "Google is already generating the answer. Being the page it cites is the whole point of writing this one well.",
      6,
    );
  }

  if (input.listings > 0) {
    score += add(
      "Somewhere to send the reader",
      `${input.listings} published companies to link to.`,
      clamp(input.listings, 0, 8),
    );
  }

  const slope = trendSlope(input.trend);
  if (slope !== null && Math.abs(slope) > 0.15) {
    const value = clamp(slope * 20, -8, 10);
    score += add(
      slope > 0 ? "Rising" : "Falling",
      `The last three months are ${Math.round(Math.abs(slope) * 100)}% ${slope > 0 ? "up on" : "down on"} the nine before them.`,
      value,
    );
  }

  return { score: Math.round(clamp(score, 0, 100)), factors, excluded: null };
}

/**
 * Trims a scored list so one trade or one city cannot take the whole week.
 *
 * Ten guides about roofing is a worse week than ten guides about ten trades,
 * even when roofing genuinely holds the ten best scores, because the site is
 * trying to cover a directory rather than win one category.
 */
export function spread<T extends { score: number; serviceId: string; placeId: string | null }>(
  items: T[],
  { maxPerService, maxPerPlace, limit }: { maxPerService: number; maxPerPlace: number; limit: number },
): T[] {
  const byService = new Map<string, number>();
  const byPlace = new Map<string, number>();
  const out: T[] = [];

  for (const item of [...items].sort((a, b) => b.score - a.score)) {
    if (out.length >= limit) break;
    const service = byService.get(item.serviceId) ?? 0;
    const place = byPlace.get(item.placeId ?? "-") ?? 0;
    if (service >= maxPerService || place >= maxPerPlace) continue;
    byService.set(item.serviceId, service + 1);
    byPlace.set(item.placeId ?? "-", place + 1);
    out.push(item);
  }

  return out;
}
