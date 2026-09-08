// What the search results already say about a topic, before anyone writes.
//
// A guide written from nothing competes with ten pages that were written from
// something. DataForSEO is how this site sees what those ten pages are: what
// the phrase is actually searched as, what volume sits behind it, what Google
// is already showing, and which questions it thinks the searcher has.
//
// Two rules shape the module. Every call costs money, so nothing here runs
// speculatively and a job keeps whatever it has already bought. And research is
// never load-bearing: if the credentials are missing or the API is down, the
// writer is handed an empty brief and told so, rather than the whole run
// failing over a research step.

import { getSecret, SECRET_KEYS } from "./secrets";

const BASE = "https://api.dataforseo.com/v3";

/** How long any one call is given before it is abandoned. */
const TIMEOUT_MS = 45_000;

export class ResearchError extends Error {}

export type KeywordIdea = {
  keyword: string;
  volume: number | null;
  difficulty: number | null;
  cpc: number | null;
};

export type SerpResult = {
  position: number;
  title: string;
  url: string;
  domain: string;
  description: string | null;
};

/**
 * Everything the writer is told about the search landscape.
 *
 * `ok` is false when nothing could be fetched. The shape stays the same either
 * way so the writer has one thing to read rather than two.
 */
export type ResearchBrief = {
  ok: boolean;
  note: string;
  keyword: string;
  location: string;
  volume: number | null;
  difficulty: number | null;
  /** Phrases worth covering, most searched first. */
  related: KeywordIdea[];
  /** What Google is already ranking, in order. */
  serp: SerpResult[];
  /** People Also Ask, and the related searches under the results. */
  questions: string[];
  /** Which SERP features are present, so the writer knows what it is up against. */
  features: string[];
  /**
   * Google's own generated answer, when it is showing one.
   *
   * The single most useful thing in the brief. It is the answer the writer has
   * to beat, and where an assistant is already getting its version of the
   * topic, so a guide that does not account for it is arguing with something
   * it has not read.
   */
  aiOverview: string | null;
  /** How many billable calls this cost. */
  calls: number;
  fetchedAt: string;
};

export function emptyBrief(keyword: string, note: string): ResearchBrief {
  return {
    ok: false,
    note,
    keyword,
    location: "",
    volume: null,
    difficulty: null,
    related: [],
    serp: [],
    questions: [],
    features: [],
    aiOverview: null,
    calls: 0,
    fetchedAt: new Date().toISOString(),
  };
}

/** The credentials, as one basic-auth header, or null when unconfigured. */
async function authorization(): Promise<string | null> {
  const login = await getSecret(SECRET_KEYS.dataForSeoLogin);
  const password = await getSecret(SECRET_KEYS.dataForSeoPassword);
  if (!login || !password) return null;
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

/** True when research can run at all, for the admin to show. */
export async function researchConfigured(): Promise<boolean> {
  return (await authorization()) !== null;
}

type TaskResult = { result?: unknown[] | null; status_code?: number; status_message?: string };

/**
 * One POST to a live endpoint.
 *
 * DataForSEO answers 200 with an error inside the body as often as it answers
 * an HTTP error, so the status code alone tells you very little and the task's
 * own status has to be read.
 */
async function call(path: string, payload: Record<string, unknown>): Promise<unknown[]> {
  const auth = await authorization();
  if (!auth) throw new ResearchError("DataForSEO credentials are not set.");

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { authorization: auth, "content-type": "application/json" },
      body: JSON.stringify([payload]),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new ResearchError(`DataForSEO did not answer (${String(error)})`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new ResearchError("DataForSEO rejected the credentials.");
  }
  if (!response.ok) {
    throw new ResearchError(`DataForSEO returned HTTP ${response.status}.`);
  }

  const body = (await response.json()) as { tasks?: TaskResult[] };
  const task = body.tasks?.[0];
  if (!task) throw new ResearchError("DataForSEO returned no task.");
  // 20000 and 20100 are both success; anything else is the task telling you
  // why it did nothing, which is worth reporting rather than treating as empty.
  if (task.status_code && task.status_code >= 40000) {
    throw new ResearchError(`DataForSEO: ${task.status_message ?? task.status_code}`);
  }
  return Array.isArray(task.result) ? task.result : [];
}

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Related phrases with the volume behind them, biggest first. */
async function keywordIdeas(keyword: string, locationName: string): Promise<KeywordIdea[]> {
  const result = await call("/dataforseo_labs/google/related_keywords/live", {
    keyword,
    location_name: locationName,
    language_code: "en",
    depth: 2,
    limit: 40,
    include_seed_keyword: true,
  });

  const items = (result[0] as { items?: unknown[] } | undefined)?.items ?? [];
  const out: KeywordIdea[] = [];
  for (const raw of items) {
    const item = raw as {
      keyword_data?: {
        keyword?: unknown;
        keyword_info?: { search_volume?: unknown; cpc?: unknown };
        keyword_properties?: { keyword_difficulty?: unknown };
      };
    };
    const phrase = str(item.keyword_data?.keyword);
    if (!phrase) continue;
    out.push({
      keyword: phrase,
      volume: num(item.keyword_data?.keyword_info?.search_volume),
      difficulty: num(item.keyword_data?.keyword_properties?.keyword_difficulty),
      cpc: num(item.keyword_data?.keyword_info?.cpc),
    });
  }
  return out.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
}

/** The live first page, with the questions Google attaches to it. */
/**
 * Pulls the readable text out of an AI overview item.
 *
 * Google nests the answer one or two levels down and mixes paragraphs with
 * lists, so this walks whatever came back and keeps the text, rather than
 * assuming a shape that will change next quarter.
 */
function overviewText(item: unknown, depth = 0): string {
  if (depth > 4 || !item || typeof item !== "object") return "";
  const node = item as Record<string, unknown>;

  const parts: string[] = [];
  for (const key of ["text", "title", "description", "snippet"]) {
    const value = node[key];
    if (typeof value === "string" && value.trim().length > 0) parts.push(value.trim());
  }
  for (const key of ["items", "references", "list"]) {
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        const nested = overviewText(child, depth + 1);
        if (nested) parts.push(nested);
      }
    }
  }
  return [...new Set(parts)].join("\n");
}

async function serp(
  keyword: string,
  locationName: string,
): Promise<{ results: SerpResult[]; questions: string[]; features: string[]; aiOverview: string | null }> {
  const result = await call("/serp/google/organic/live/advanced", {
    keyword,
    location_name: locationName,
    language_code: "en",
    device: "desktop",
    depth: 20,
    people_also_ask_click_depth: 2,
  });

  const items = (result[0] as { items?: unknown[] } | undefined)?.items ?? [];
  const results: SerpResult[] = [];
  const questions: string[] = [];
  const features = new Set<string>();
  let aiOverview: string | null = null;

  for (const raw of items) {
    const item = raw as {
      type?: unknown;
      rank_group?: unknown;
      title?: unknown;
      url?: unknown;
      domain?: unknown;
      description?: unknown;
      items?: unknown[];
    };
    const type = str(item.type);
    if (type) features.add(type);

    if (type === "ai_overview" || type === "ai_overview_element") {
      const text = overviewText(item);
      if (text.length > (aiOverview?.length ?? 0)) aiOverview = text;
    }

    if (type === "organic" && str(item.url)) {
      results.push({
        position: num(item.rank_group) ?? results.length + 1,
        title: str(item.title),
        url: str(item.url),
        domain: str(item.domain),
        description: str(item.description) || null,
      });
      continue;
    }

    // People Also Ask and Related Searches both nest their phrases one level
    // down, under different keys.
    if (type === "people_also_ask" || type === "related_searches") {
      for (const child of item.items ?? []) {
        const nested = child as { title?: unknown; keyword?: unknown };
        const question = str(nested.title) || str(nested.keyword);
        if (question) questions.push(question);
      }
    }
  }

  return {
    results: results.slice(0, 10),
    questions: [...new Set(questions)].slice(0, 20),
    features: [...features],
    aiOverview: aiOverview ? aiOverview.slice(0, 4000) : null,
  };
}

/**
 * The whole brief for one topic.
 *
 * Each half is fetched independently and a failure in one does not lose the
 * other: a brief with the SERP but no keyword ideas is still worth writing
 * from, and the note says which half is missing.
 */
export async function researchTopic({
  keyword,
  locationName = "United States",
}: {
  keyword: string;
  locationName?: string;
}): Promise<ResearchBrief> {
  const phrase = keyword.trim();
  if (!phrase) return emptyBrief(phrase, "No keyword to research.");
  if (!(await authorization())) {
    return emptyBrief(phrase, "DataForSEO is not connected, so this was written without research.");
  }

  const [ideas, page] = await Promise.allSettled([
    keywordIdeas(phrase, locationName),
    serp(phrase, locationName),
  ]);

  const notes: string[] = [];
  let calls = 0;

  const related = ideas.status === "fulfilled" ? ideas.value : [];
  if (ideas.status === "fulfilled") calls += 1;
  else notes.push(`keyword ideas failed (${ideas.reason})`);

  const found = page.status === "fulfilled" ? page.value : { results: [], questions: [], features: [], aiOverview: null };
  if (page.status === "fulfilled") calls += 1;
  else notes.push(`SERP failed (${page.reason})`);

  const seed = related.find((idea) => idea.keyword.toLowerCase() === phrase.toLowerCase());

  return {
    ok: calls > 0,
    note: notes.length > 0 ? notes.join("; ") : "Researched against live search results.",
    keyword: phrase,
    location: locationName,
    volume: seed?.volume ?? null,
    difficulty: seed?.difficulty ?? null,
    related: related.filter((idea) => idea.keyword.toLowerCase() !== phrase.toLowerCase()).slice(0, 25),
    serp: found.results,
    questions: found.questions,
    features: found.features,
    aiOverview: found.aiOverview,
    calls,
    fetchedAt: new Date().toISOString(),
  };
}

/** The brief as the writer reads it: plain text, because that is what a prompt is. */
export function briefAsText(brief: ResearchBrief): string {
  if (!brief.ok) return `No search research was available. ${brief.note}`;

  const lines: string[] = [
    `Target phrase: ${brief.keyword}`,
    brief.volume !== null ? `Monthly searches: ${brief.volume.toLocaleString()}` : null,
    brief.difficulty !== null ? `Keyword difficulty: ${brief.difficulty}/100` : null,
    brief.location ? `Market: ${brief.location}` : null,
    "",
  ].filter((line): line is string => line !== null);

  if (brief.related.length > 0) {
    lines.push("Phrases people also search, with monthly volume:");
    for (const idea of brief.related.slice(0, 20)) {
      lines.push(`  ${idea.keyword}${idea.volume !== null ? ` (${idea.volume.toLocaleString()})` : ""}`);
    }
    lines.push("");
  }

  if (brief.aiOverview) {
    lines.push("GOOGLE'S OWN AI OVERVIEW FOR THIS SEARCH");
    lines.push("This is the answer Google is generating today. It is what you have to beat, and it is where");
    lines.push("an assistant is already getting its version of this topic.");
    lines.push(brief.aiOverview);
    lines.push("");
  }

  if (brief.questions.length > 0) {
    lines.push("Questions Google shows for this search:");
    for (const question of brief.questions) lines.push(`  ${question}`);
    lines.push("");
  }

  if (brief.serp.length > 0) {
    lines.push("What currently ranks, in order:");
    for (const result of brief.serp) {
      // No em dash. The writer is told never to use one, and a brief that uses
      // ten of them is a worked example arguing the other way.
      lines.push(`  ${result.position}. ${result.title} (${result.domain})`);
      if (result.description) lines.push(`     ${result.description}`);
    }
    lines.push("");
  }

  if (brief.features.length > 0) {
    lines.push(`SERP features present: ${brief.features.join(", ")}`);
  }

  return lines.join("\n").trim();
}

// ---------------------------------------------------------------------------
// Bulk probes
//
// Everything above answers one question about one phrase. Everything below
// answers one question about a thousand of them, which is the difference
// between topic research being affordable and not: DataForSEO charges per
// call, not per keyword, so a thousand keywords in one array costs what one
// keyword costs. The weekly plan is built entirely on that fact.
//
// Each probe is separately fallible on purpose. An account without the AI
// Optimization subscription should lose the AI column and keep the rest, and a
// parameter DataForSEO rejects on one endpoint should not cost the run the
// other four. So the callers here catch, and the plan records what it missed.

/** Comfortably under the documented ceiling of 1,000 per task. */
const BULK_CHUNK = 700;

export type PricedKeyword = {
  keyword: string;
  volume: number | null;
  cpc: number | null;
  competition: number | null;
  /** Twelve months of search volume, oldest first, when the endpoint returns it. */
  trend: number[];
};

export type IntentLabel = "informational" | "commercial" | "navigational" | "transactional";

export type KeywordIntent = { label: IntentLabel; probability: number };

export type SiteRanking = { rank: number; url: string };

/** How many calls a list of keywords will cost on one bulk endpoint. */
export function bulkCalls(count: number): number {
  return Math.ceil(count / BULK_CHUNK);
}

function chunk<T>(items: T[], size = BULK_CHUNK): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

/** Lower-cased and trimmed, which is how every one of these endpoints keys its answers. */
const key = (value: unknown): string => str(value).toLowerCase();

type BulkOutcome<T> = { values: Map<string, T>; calls: number; note: string | null };

/**
 * Runs one bulk endpoint over as many chunks as the list needs.
 *
 * A chunk that fails is skipped rather than throwing, because losing one
 * seventh of a metric is a much better outcome than losing the run.
 */
async function overChunks<T>(
  keywords: string[],
  run: (batch: string[]) => Promise<Map<string, T>>,
  label: string,
): Promise<BulkOutcome<T>> {
  const values = new Map<string, T>();
  let calls = 0;
  const failures: string[] = [];

  for (const batch of chunk(keywords)) {
    try {
      const answered = await run(batch);
      calls += 1;
      for (const [phrase, value] of answered) values.set(phrase, value);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    values,
    calls,
    note: failures.length > 0 ? `${label}: ${failures[0]}${failures.length > 1 ? ` (+${failures.length - 1} more)` : ""}` : null,
  };
}

/** Monthly search volume, cost per click and the twelve-month shape of demand. */
export async function bulkVolume(keywords: string[], market: string): Promise<BulkOutcome<PricedKeyword>> {
  return overChunks(
    keywords,
    async (batch) => {
      const result = await call("/keywords_data/google_ads/search_volume/live", {
        keywords: batch,
        location_name: market,
        language_code: "en",
        // Without this the endpoint answers only for keywords Google Ads has an
        // exact match for, which throws away most of the long tail.
        search_partners: false,
      });

      const out = new Map<string, PricedKeyword>();
      for (const raw of result) {
        const item = raw as {
          keyword?: unknown;
          search_volume?: unknown;
          cpc?: unknown;
          competition_index?: unknown;
          monthly_searches?: unknown[];
        };
        const phrase = key(item.keyword);
        if (!phrase) continue;
        // The months arrive newest first; a trend line reads better the other way.
        const months = Array.isArray(item.monthly_searches) ? item.monthly_searches : [];
        const trend = months
          .map((month) => num((month as { search_volume?: unknown }).search_volume))
          .filter((value): value is number => value !== null)
          .reverse();
        out.set(phrase, {
          keyword: str(item.keyword),
          volume: num(item.search_volume),
          cpc: num(item.cpc),
          competition: num(item.competition_index),
          trend,
        });
      }
      return out;
    },
    "search volume",
  );
}

/** How hard the first page is, 0 to 100. */
export async function bulkDifficulty(keywords: string[], market: string): Promise<BulkOutcome<number>> {
  return overChunks(
    keywords,
    async (batch) => {
      const result = await call("/dataforseo_labs/google/bulk_keyword_difficulty/live", {
        keywords: batch,
        location_name: market,
        language_code: "en",
      });

      const items = (result[0] as { items?: unknown[] } | undefined)?.items ?? [];
      const out = new Map<string, number>();
      for (const raw of items) {
        const item = raw as { keyword?: unknown; keyword_difficulty?: unknown };
        const phrase = key(item.keyword);
        const difficulty = num(item.keyword_difficulty);
        if (phrase && difficulty !== null) out.set(phrase, difficulty);
      }
      return out;
    },
    "difficulty",
  );
}

/**
 * What the searcher wants.
 *
 * This is the gate that keeps the plan honest about its own site. "Plumbers in
 * Austin" is commercial: the answer to it is the ranking page that already
 * exists, not a guide. "How to choose a plumber in Austin" is informational,
 * and that is what a guide is for.
 */
export async function bulkIntent(keywords: string[]): Promise<BulkOutcome<KeywordIntent>> {
  return overChunks(
    keywords,
    async (batch) => {
      const result = await call("/dataforseo_labs/google/search_intent/live", {
        keywords: batch,
        language_code: "en",
      });

      const items = (result[0] as { items?: unknown[] } | undefined)?.items ?? [];
      const out = new Map<string, KeywordIntent>();
      for (const raw of items) {
        const item = raw as {
          keyword?: unknown;
          keyword_intent?: { label?: unknown; probability?: unknown };
        };
        const phrase = key(item.keyword);
        const label = str(item.keyword_intent?.label).toLowerCase();
        if (!phrase || !label) continue;
        out.set(phrase, {
          label: label as IntentLabel,
          probability: num(item.keyword_intent?.probability) ?? 0,
        });
      }
      return out;
    },
    "search intent",
  );
}

/**
 * How often the phrase is put to an assistant rather than a search box.
 *
 * Part of DataForSEO's AI Optimization tier, which is a separate subscription.
 * An account without it gets an error here and a plan that carries on without
 * the column, which is why this is called last and caught like the rest.
 */
export async function bulkAiVolume(keywords: string[]): Promise<BulkOutcome<number>> {
  return overChunks(
    keywords,
    async (batch) => {
      const result = await call("/ai_optimization/ai_keyword_data/keywords_search_volume/live", {
        keywords: batch,
        language_code: "en",
      });

      const items = (result[0] as { items?: unknown[] } | undefined)?.items ?? [];
      const out = new Map<string, number>();
      for (const raw of items) {
        const item = raw as { keyword?: unknown; ai_search_volume?: unknown };
        const phrase = key(item.keyword);
        const volume = num(item.ai_search_volume);
        if (phrase && volume !== null) out.set(phrase, volume);
      }
      return out;
    },
    "AI search volume",
  );
}

/**
 * Every phrase this site already ranks for, and where.
 *
 * One call, and the most useful thing the plan knows. A phrase sitting at
 * eleven is a page that needs one good guide pointing at it; a phrase sitting
 * at two is a phrase to leave alone.
 */
export async function siteRankings(
  domain: string,
  market: string,
  limit = 1000,
): Promise<{ values: Map<string, SiteRanking>; calls: number; note: string | null }> {
  const target = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  if (!target) return { values: new Map(), calls: 0, note: "no domain to check" };

  try {
    const result = await call("/dataforseo_labs/google/ranked_keywords/live", {
      target,
      location_name: market,
      language_code: "en",
      limit: Math.min(1000, limit),
      order_by: ["ranked_serp_element.serp_item.rank_group,asc"],
    });

    const items = (result[0] as { items?: unknown[] } | undefined)?.items ?? [];
    const values = new Map<string, SiteRanking>();
    for (const raw of items) {
      const item = raw as {
        keyword_data?: { keyword?: unknown };
        ranked_serp_element?: { serp_item?: { rank_group?: unknown; url?: unknown } };
      };
      const phrase = key(item.keyword_data?.keyword);
      const rank = num(item.ranked_serp_element?.serp_item?.rank_group);
      if (!phrase || rank === null) continue;
      const existing = values.get(phrase);
      if (!existing || rank < existing.rank) {
        values.set(phrase, { rank, url: str(item.ranked_serp_element?.serp_item?.url) });
      }
    }
    return { values, calls: 1, note: null };
  } catch (error) {
    return {
      values: new Map(),
      calls: 0,
      note: `own rankings: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Phrases a seed suggests that nobody would have thought to write down.
 *
 * The generated candidates cover what the site knows it sells. This covers what
 * people actually type, which is where the surprises are.
 */
export async function expandSeed(
  seed: string,
  market: string,
  limit = 60,
): Promise<{ keywords: string[]; calls: number; note: string | null }> {
  try {
    const result = await call("/dataforseo_labs/google/keyword_suggestions/live", {
      keyword: seed,
      location_name: market,
      language_code: "en",
      include_seed_keyword: false,
      limit,
      filters: [["keyword_data.keyword_info.search_volume", ">", 20]],
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
    });

    const items = (result[0] as { items?: unknown[] } | undefined)?.items ?? [];
    const keywords: string[] = [];
    for (const raw of items) {
      const phrase = str((raw as { keyword_data?: { keyword?: unknown } }).keyword_data?.keyword);
      if (phrase) keywords.push(phrase);
    }
    return { keywords, calls: 1, note: null };
  } catch (error) {
    return {
      keywords: [],
      calls: 0,
      note: `expansion of "${seed}": ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** The live first page for one candidate, as the plan needs it: cheap and shallow. */
export async function probeSerp(
  keyword: string,
  market: string,
): Promise<{ serp: SerpResult[]; questions: string[]; features: string[] } | null> {
  try {
    const page = await serp(keyword, market);
    return { serp: page.results, questions: page.questions, features: page.features };
  } catch {
    return null;
  }
}
