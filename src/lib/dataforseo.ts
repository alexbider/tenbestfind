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
async function serp(
  keyword: string,
  locationName: string,
): Promise<{ results: SerpResult[]; questions: string[]; features: string[] }> {
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

  return { results: results.slice(0, 10), questions: [...new Set(questions)].slice(0, 20), features: [...features] };
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

  const found = page.status === "fulfilled" ? page.value : { results: [], questions: [], features: [] };
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

  if (brief.questions.length > 0) {
    lines.push("Questions Google shows for this search:");
    for (const question of brief.questions) lines.push(`  ${question}`);
    lines.push("");
  }

  if (brief.serp.length > 0) {
    lines.push("What currently ranks, in order:");
    for (const result of brief.serp) {
      lines.push(`  ${result.position}. ${result.title} — ${result.domain}`);
      if (result.description) lines.push(`     ${result.description}`);
    }
    lines.push("");
  }

  if (brief.features.length > 0) {
    lines.push(`SERP features present: ${brief.features.join(", ")}`);
  }

  return lines.join("\n").trim();
}
