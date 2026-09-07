// The weekly plan, moved along one step at a time.
//
// Same shape as the import pipeline and the guide writer, for the same reason:
// each call does one step and writes the result back, so a run survives a
// deploy and never buys the same answer twice. What is different here is the
// economics, and they drive the design.
//
// Pricing a phrase is a bulk operation: a thousand keywords cost what one
// costs. Looking at a phrase's live search results is not: that is one call
// each, and it is where the evidence comes from. So the plan prices very
// widely and looks very narrowly, and it keeps every price it has ever bought
// in KeywordMetric so the second week costs a fraction of the first.

import { db } from "./db";
import { classify, PermanentError, type Effort } from "./anthropic";
import {
  bulkAiVolume,
  bulkDifficulty,
  bulkIntent,
  bulkVolume,
  probeSerp,
  researchConfigured,
  siteRankings,
} from "./dataforseo";
import { guideTypeOf, type GuideType } from "./enums";
import { parseJson, parseList, stringify } from "./json";
import { absoluteUrl } from "./urls";
import {
  generateCandidates,
  coverageKey,
  placeIdOf,
  type Candidate,
  type CandidatePlace,
  type CandidateService,
} from "./topic-candidates";
import { planTopics, type ShortlistEntry } from "./topic-planner";
import { countWeakResults, scoreTopic, spread } from "./topic-scoring";
import { loadTopicSettings, weekStart, type TopicSettings } from "./topic-settings";

export const TOPIC_PLAN_STATUSES = [
  "QUEUED",
  "PRICING",
  "PROBING",
  "DRAFTING",
  "READY",
  "FAILED",
  "CANCELLED",
] as const;
export type TopicPlanStatus = (typeof TOPIC_PLAN_STATUSES)[number];

/** The statuses the worker keeps picking up. */
export const ACTIVE_PLAN_STATUSES: TopicPlanStatus[] = ["QUEUED", "PRICING", "PROBING", "DRAFTING"];

export type StepResult = { changed: boolean; note: string };

/** Phrases priced per tick. One chunk on each of the bulk endpoints. */
const PRICE_PER_TICK = 700;
/** Live search results pulled per tick. Each is its own call and its own wait. */
const PROBE_PER_TICK = 4;

/* ------------------------------------------------------------- the matrix */

export type Matrix = {
  services: CandidateService[];
  places: CandidatePlace[];
  /** trade|place|kind for every published guide, so nothing is proposed twice. */
  covered: Set<string>;
  /** Published companies keyed trade|place. */
  listings: Map<string, number>;
  publishedTitles: string[];
  /** Phrases an editor has already ruled on, or that are already being written. */
  blocked: Set<string>;
};

/** Everything the generator needs, in four queries. */
export async function loadMatrix(settings: TopicSettings): Promise<Matrix> {
  const [categories, countries, regions, cities, guides, businesses, decided] = await Promise.all([
    db.category.findMany({
      where: { published: true, ...(settings.services.length > 0 ? { slug: { in: settings.services } } : {}) },
      select: { id: true, name: true, singular: true, serviceName: true, slug: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.country.findMany({ where: { published: true }, select: { id: true, name: true } }),
    db.region.findMany({
      where: { published: true },
      select: { id: true, name: true, countryId: true, country: { select: { name: true } } },
    }),
    db.city.findMany({
      where: { published: true },
      select: {
        id: true,
        name: true,
        regionId: true,
        topMetro: true,
        population: true,
        region: { select: { countryId: true, country: { select: { name: true } } } },
      },
    }),
    db.guide.findMany({
      where: { status: { in: ["PUBLISHED", "REVIEW", "DRAFT"] } },
      select: { title: true, type: true, categoryId: true, countryId: true, regionId: true, cityId: true, status: true },
    }),
    db.business.groupBy({
      by: ["cityId", "categoryId"],
      where: { status: "PUBLISHED", cityId: { not: null } },
      _count: { _all: true },
    }),
    // Anything already ruled on. A snooze expires; a dismissal does not, and a
    // phrase somebody is already writing about should not come back next
    // Monday looking like a fresh idea.
    db.topicIdea.findMany({
      where: {
        OR: [
          { status: { in: ["COMMISSIONED", "DISMISSED"] } },
          { status: "SNOOZED", snoozedUntil: { gt: new Date() } },
          { status: "SUGGESTED", plan: { status: { notIn: ["FAILED", "CANCELLED"] } } },
        ],
      },
      select: { keyword: true },
    }),
  ]);

  const places: CandidatePlace[] = [
    ...countries.map((country) => ({
      kind: "country" as const,
      id: country.id,
      name: country.name,
      market: country.name,
      countryId: country.id,
      regionId: null,
      cityId: null,
    })),
    ...regions.map((region) => ({
      kind: "region" as const,
      id: region.id,
      name: region.name,
      market: region.country.name,
      countryId: region.countryId,
      regionId: region.id,
      cityId: null,
    })),
    // Bigger cities first, so the pricing rotation reaches the places worth
    // knowing about before it reaches the long tail.
    ...[...cities]
      .sort((a, b) => Number(b.topMetro) - Number(a.topMetro) || (b.population ?? 0) - (a.population ?? 0))
      .map((city) => ({
        kind: "city" as const,
        id: city.id,
        name: city.name,
        market: city.region.country.name,
        countryId: city.region.countryId,
        regionId: city.regionId,
        cityId: city.id,
      })),
  ];

  const covered = new Set<string>();
  for (const guide of guides) {
    covered.add(coverageKey(guide.categoryId, placeIdOf(guide), guideTypeOf(guide.type)));
  }

  const listings = new Map<string, number>();
  for (const row of businesses) {
    if (!row.cityId) continue;
    listings.set(`${row.categoryId}|${row.cityId}`, row._count._all);
  }

  return {
    services: categories,
    places,
    covered,
    listings,
    publishedTitles: guides.filter((guide) => guide.status === "PUBLISHED").map((guide) => guide.title),
    blocked: new Set(decided.map((idea) => idea.keyword)),
  };
}

/* ------------------------------------------------------------ housekeeping */

type PlanRow = NonNullable<Awaited<ReturnType<typeof db.topicPlan.findUnique>>>;

async function fail(id: string, error: unknown): Promise<StepResult> {
  const classified = error instanceof Error ? classify(error) : new Error(String(error));
  await db.topicPlan.update({
    where: { id },
    data: {
      status: "FAILED",
      error: classified.message.slice(0, 800),
      hint:
        classified instanceof PermanentError
          ? classified.hint
          : "Run it again. If it fails the same way twice, the credentials or the dials are the problem.",
      finishedAt: new Date(),
    },
  });
  return { changed: true, note: `failed: ${classified.message.slice(0, 120)}` };
}

/** Appends to the running commentary a plan keeps about itself. */
function withNote(existing: string | null, line: string | null): string | null {
  if (!line) return existing;
  const notes = existing ? existing.split("\n") : [];
  if (notes.includes(line)) return existing;
  notes.push(line);
  return notes.slice(-30).join("\n");
}

/** The settings this plan is running under, snapshotted at creation. */
function settingsOf(plan: PlanRow, live: TopicSettings): TopicSettings {
  return parseJson<TopicSettings>(plan.settings, live);
}

/* ------------------------------------------------------------ the pipeline */

/**
 * Moves one plan forward by exactly one step.
 *
 * Returns changed:false when there is nothing to do, which is how the worker
 * knows to go back to sleep.
 */
export async function advanceTopicPlan(id: string): Promise<StepResult> {
  const plan = await db.topicPlan.findUnique({ where: { id } });
  if (!plan) return { changed: false, note: "no such plan" };

  const live = await loadTopicSettings();
  const settings = settingsOf(plan, live);

  try {
    switch (plan.status as TopicPlanStatus) {
      case "QUEUED":
        return await startPlan(plan, settings);
      case "PRICING":
        return await pricePlan(plan, settings);
      case "PROBING":
        return await probePlan(plan, settings);
      case "DRAFTING":
        return await draftPlan(plan, settings);
      default:
        return { changed: false, note: plan.status.toLowerCase() };
    }
  } catch (error) {
    return fail(id, error);
  }
}

/** Counts the matrix and asks once where this site already ranks. */
async function startPlan(plan: PlanRow, settings: TopicSettings): Promise<StepResult> {
  const matrix = await loadMatrix(settings);
  const candidates = generateCandidates({
    services: matrix.services,
    places: matrix.places,
    guideTypes: settings.guideTypes,
  });

  if (candidates.length === 0) {
    await db.topicPlan.update({
      where: { id: plan.id },
      data: {
        status: "FAILED",
        error: "Nothing to look at.",
        hint: "Every trade is unpublished or excluded, or no kind of guide is ticked.",
        finishedAt: new Date(),
      },
    });
    return { changed: true, note: "nothing to plan" };
  }

  let notes = withNote(plan.notes, `${candidates.length.toLocaleString()} candidate phrases across ${matrix.services.length} trades and ${matrix.places.length} places.`);
  let calls = 0;

  // One call, and the most useful thing the plan knows. Only the phrases in the
  // matrix are stored: the rest of what a rank check returns is real but has
  // nothing to do with what is being planned.
  if (settings.checkOurRankings && (await researchConfigured())) {
    const domain = settings.siteDomain || absoluteUrl("/");
    const wanted = new Set(candidates.map((candidate) => candidate.keyword));
    const markets = [...new Set(candidates.map((candidate) => candidate.place.market))];

    for (const market of markets) {
      const ranked = await siteRankings(domain, market);
      calls += ranked.calls;
      notes = withNote(notes, ranked.note);
      let hits = 0;
      for (const [phrase, ranking] of ranked.values) {
        if (!wanted.has(phrase)) continue;
        hits += 1;
        await db.keywordMetric.upsert({
          where: { keyword_market: { keyword: phrase, market } },
          update: { ourRank: ranking.rank, ourUrl: ranking.url, rankedAt: new Date() },
          create: {
            keyword: phrase,
            market,
            ourRank: ranking.rank,
            ourUrl: ranking.url,
            rankedAt: new Date(),
            // Not priced: a rank check says where you are, not what it is worth.
            pricedAt: new Date(0),
          },
        });
      }
      if (hits > 0) notes = withNote(notes, `Already ranking for ${hits} of them in ${market}.`);
    }
  }

  await db.topicPlan.update({
    where: { id: plan.id },
    data: {
      status: "PRICING",
      candidates: candidates.length,
      calls: { increment: calls },
      notes,
      startedAt: plan.startedAt ?? new Date(),
      error: null,
      hint: null,
    },
  });
  return { changed: true, note: `${candidates.length} candidates` };
}

/** Which phrases still need buying, in the order they are worth buying in. */
function pricingQueue(
  candidates: Candidate[],
  known: Map<string, { pricedAt: Date }>,
  refreshDays: number,
): { keyword: string; market: string }[] {
  const stale = Date.now() - refreshDays * 86_400_000;
  const seen = new Set<string>();
  const tiers: Record<string, { keyword: string; market: string }[]> = { country: [], region: [], city: [] };

  for (const candidate of candidates) {
    const composite = `${candidate.place.market}|${candidate.keyword}`;
    if (seen.has(composite)) continue;
    seen.add(composite);
    const priced = known.get(composite);
    if (priced && priced.pricedAt.getTime() > stale) continue;
    tiers[candidate.place.kind]?.push({ keyword: candidate.keyword, market: candidate.place.market });
  }

  // National before state before city: the broad phrases are the ones a whole
  // country of readers shares, and knowing them makes the local ones easier to
  // judge. Within a tier the generator's own order already alternates trades.
  return [...tiers.country, ...tiers.region, ...tiers.city];
}

/** Everything already known about the matrix, in one query per market. */
async function loadKnown(candidates: Candidate[]) {
  const markets = [...new Set(candidates.map((candidate) => candidate.place.market))];
  const known = new Map<
    string,
    {
      pricedAt: Date;
      volume: number | null;
      aiVolume: number | null;
      difficulty: number | null;
      intent: string | null;
      trend: number[];
      ourRank: number | null;
    }
  >();

  for (const market of markets) {
    const rows = await db.keywordMetric.findMany({ where: { market } });
    for (const row of rows) {
      known.set(`${market}|${row.keyword}`, {
        pricedAt: row.pricedAt,
        volume: row.volume,
        aiVolume: row.aiVolume,
        difficulty: row.difficulty,
        intent: row.intent,
        trend: parseJson<number[]>(row.trend, []),
        ourRank: row.ourRank,
      });
    }
  }

  return known;
}

/**
 * Buys one chunk of prices, or moves on when there is nothing left worth
 * buying.
 *
 * Staying in PRICING across several ticks rather than looping here keeps the
 * worker responsive: a review refresh queued behind a plan should not wait ten
 * minutes for thirty thousand phrases to be valued.
 */
async function pricePlan(plan: PlanRow, settings: TopicSettings): Promise<StepResult> {
  const matrix = await loadMatrix(settings);
  const candidates = generateCandidates({
    services: matrix.services,
    places: matrix.places,
    guideTypes: settings.guideTypes,
  });
  const known = await loadKnown(candidates);
  const queue = pricingQueue(candidates, known, settings.refreshDays);

  const budgetLeft = settings.callBudget - plan.calls;
  const quotaLeft = settings.maxNewPrices - plan.priced;
  const configured = await researchConfigured();

  // Four ways to be finished: nothing stale, the run's pricing quota is spent,
  // the call budget is spent, or there are no credentials to spend it with.
  if (queue.length === 0 || quotaLeft <= 0 || budgetLeft < 4 || !configured) {
    const reason = !configured
      ? "DataForSEO is not connected, so this plan is ranked on what was already known."
      : queue.length === 0
        ? "Every candidate has a current price."
        : quotaLeft <= 0
          ? `Priced ${plan.priced.toLocaleString()} new phrases this run; ${queue.length.toLocaleString()} still unpriced and waiting for a later week.`
          : `Stopped at the call budget with ${queue.length.toLocaleString()} phrases still unpriced.`;

    return shortlistFrom(plan, settings, matrix, candidates, known, reason);
  }

  // One market per call, and the market with the most waiting, because a chunk
  // that mixes two countries wastes most of an allowance that costs the same
  // whether it carries seven hundred phrases or seven.
  const byMarket = new Map<string, string[]>();
  for (const entry of queue) {
    const bucket = byMarket.get(entry.market) ?? [];
    bucket.push(entry.keyword);
    byMarket.set(entry.market, bucket);
  }
  const [market, waiting] = [...byMarket.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const phrases = waiting.slice(0, Math.min(PRICE_PER_TICK, quotaLeft));

  let calls = 0;
  let notes = plan.notes;

  const volumes = await bulkVolume(phrases, market);
  calls += volumes.calls;
  notes = withNote(notes, volumes.note);

  const difficulties = await bulkDifficulty(phrases, market);
  calls += difficulties.calls;
  notes = withNote(notes, difficulties.note);

  const intents = await bulkIntent(phrases);
  calls += intents.calls;
  notes = withNote(notes, intents.note);

  const aiVolumes = settings.includeAiVolume
    ? await bulkAiVolume(phrases)
    : { values: new Map<string, number>(), calls: 0, note: null };
  calls += aiVolumes.calls;
  notes = withNote(notes, aiVolumes.note);

  // Written even when every probe came back empty, so a phrase nobody can price
  // is not re-bought every single week.
  for (const phrase of phrases) {
    const priced = volumes.values.get(phrase);
    const intent = intents.values.get(phrase);
    await db.keywordMetric.upsert({
      where: { keyword_market: { keyword: phrase, market } },
      update: {
        volume: priced?.volume ?? null,
        cpc: priced?.cpc ?? null,
        competition: priced?.competition ?? null,
        trend: stringify(priced?.trend ?? []),
        difficulty: difficulties.values.get(phrase) ?? null,
        intent: intent?.label ?? null,
        intentScore: intent?.probability ?? null,
        aiVolume: aiVolumes.values.get(phrase) ?? null,
        pricedAt: new Date(),
      },
      create: {
        keyword: phrase,
        market,
        volume: priced?.volume ?? null,
        cpc: priced?.cpc ?? null,
        competition: priced?.competition ?? null,
        trend: stringify(priced?.trend ?? []),
        difficulty: difficulties.values.get(phrase) ?? null,
        intent: intent?.label ?? null,
        intentScore: intent?.probability ?? null,
        aiVolume: aiVolumes.values.get(phrase) ?? null,
      },
    });
  }

  await db.topicPlan.update({
    where: { id: plan.id },
    data: {
      priced: { increment: phrases.length },
      calls: { increment: calls },
      cachedHits: candidates.length - queue.length,
      notes,
    },
  });

  return { changed: true, note: `priced ${phrases.length} in ${market} (${calls} calls)` };
}

/** Scores everything the plan knows and keeps the best of it for probing. */
async function shortlistFrom(
  plan: PlanRow,
  settings: TopicSettings,
  matrix: Matrix,
  candidates: Candidate[],
  known: Awaited<ReturnType<typeof loadKnown>>,
  reason: string,
): Promise<StepResult> {
  type Row = ShortlistEntry & { serviceId: string; placeId: string | null };
  const rows: Row[] = [];

  for (const candidate of candidates) {
    const metric = known.get(`${candidate.place.market}|${candidate.keyword}`);
    if (!metric) continue;
    if (matrix.blocked.has(candidate.keyword)) continue;

    const listings =
      candidate.place.cityId !== null
        ? (matrix.listings.get(`${candidate.service.id}|${candidate.place.cityId}`) ?? 0)
        : 0;
    if (settings.minBusinesses > 0 && candidate.place.kind === "city" && listings < settings.minBusinesses) {
      continue;
    }

    const scored = scoreTopic({
      volume: metric.volume,
      aiVolume: metric.aiVolume,
      difficulty: metric.difficulty,
      intent: metric.intent,
      trend: metric.trend,
      ourRank: metric.ourRank,
      covered: matrix.covered.has(coverageKey(candidate.service.id, candidate.place.id, candidate.guideType)),
      listings,
      // Nothing is known about the first page until the probe step buys it.
      weakResults: null,
      questions: 0,
      aiOverview: false,
      minVolume: settings.minVolume,
      maxDifficulty: settings.maxDifficulty,
    });
    if (scored.excluded || scored.score <= 0) continue;

    rows.push({
      keyword: candidate.keyword,
      guideType: candidate.guideType,
      serviceId: candidate.service.id,
      serviceName: candidate.service.serviceName,
      placeId: candidate.place.kind === "country" ? null : candidate.place.id,
      placeName: candidate.place.kind === "country" ? null : candidate.place.name,
      placeKind: candidate.place.kind,
      countryId: candidate.place.countryId,
      regionId: candidate.place.regionId,
      cityId: candidate.place.cityId,
      volume: metric.volume,
      aiVolume: metric.aiVolume,
      difficulty: metric.difficulty,
      intent: metric.intent,
      ourRank: metric.ourRank,
      score: scored.score,
      reasons: scored.factors,
      questions: [],
      topDomains: [],
      features: [],
    });
  }

  if (rows.length === 0) {
    await db.topicPlan.update({
      where: { id: plan.id },
      data: {
        status: "READY",
        notes: withNote(plan.notes, `${reason} Nothing cleared the gates.`),
        finishedAt: new Date(),
      },
    });
    return { changed: true, note: "nothing cleared the gates" };
  }

  // Held apart by trade and place before probing, not after, so the money is
  // spent looking at a spread of the week rather than at nine roofing phrases.
  const wanted = Math.max(plan.target, Math.min(rows.length, plan.target * settings.probeMultiplier));
  const shortlist = spread(rows, {
    maxPerService: Math.max(settings.maxPerService, Math.ceil(settings.probeMultiplier)),
    maxPerPlace: Math.max(settings.maxPerPlace, Math.ceil(settings.probeMultiplier)),
    limit: wanted,
  });

  await db.topicPlan.update({
    where: { id: plan.id },
    data: {
      status: "PROBING",
      shortlist: stringify(shortlist),
      notes: withNote(plan.notes, `${reason} ${rows.length.toLocaleString()} cleared the gates; looking closely at ${shortlist.length}.`),
    },
  });
  return { changed: true, note: `shortlisted ${shortlist.length} of ${rows.length}` };
}

/** Pulls the live first page for a few shortlist entries and rescores them. */
async function probePlan(plan: PlanRow, settings: TopicSettings): Promise<StepResult> {
  const shortlist = parseJson<(ShortlistEntry & { serviceId: string; placeId: string | null; probed?: boolean })[]>(
    plan.shortlist,
    [],
  );
  const pending = shortlist.filter((entry) => !entry.probed);
  const budgetLeft = settings.callBudget - plan.calls;

  if (pending.length === 0 || budgetLeft <= 0 || !(await researchConfigured())) {
    await db.topicPlan.update({
      where: { id: plan.id },
      data: {
        status: "DRAFTING",
        shortlist: stringify([...shortlist].sort((a, b) => b.score - a.score)),
        notes:
          pending.length > 0
            ? withNote(plan.notes, `Stopped looking at search results with ${pending.length} unexamined: ${budgetLeft <= 0 ? "call budget spent" : "DataForSEO unavailable"}.`)
            : plan.notes,
      },
    });
    return { changed: true, note: "probing done" };
  }

  const matrix = await loadMatrix(settings);
  const batch = pending.slice(0, Math.min(PROBE_PER_TICK, budgetLeft));
  let calls = 0;

  for (const entry of batch) {
    const market =
      shortlistMarket(entry, matrix) ?? settings.market;
    const page = await probeSerp(entry.keyword, market);
    entry.probed = true;
    if (!page) continue;
    calls += 1;

    entry.questions = page.questions;
    entry.features = page.features;
    entry.topDomains = page.serp.map((result) => result.domain);

    const rescored = scoreTopic({
      volume: entry.volume,
      aiVolume: entry.aiVolume,
      difficulty: entry.difficulty,
      intent: entry.intent,
      trend: [],
      ourRank: entry.ourRank,
      covered: false,
      listings: entry.cityId ? (matrix.listings.get(`${entry.serviceId}|${entry.cityId}`) ?? 0) : 0,
      weakResults: countWeakResults(entry.topDomains),
      questions: entry.questions.length,
      aiOverview: page.features.includes("ai_overview"),
      minVolume: settings.minVolume,
      maxDifficulty: settings.maxDifficulty,
    });
    if (!rescored.excluded) {
      entry.score = rescored.score;
      entry.reasons = rescored.factors;
    }
  }

  await db.topicPlan.update({
    where: { id: plan.id },
    data: {
      shortlist: stringify(shortlist),
      probed: { increment: batch.length },
      calls: { increment: calls },
    },
  });
  return { changed: true, note: `looked at ${batch.length} search results` };
}

/** Which market a shortlist row's place sits in. */
function shortlistMarket(entry: { countryId: string | null }, matrix: Matrix): string | null {
  const country = matrix.places.find((place) => place.kind === "country" && place.id === entry.countryId);
  return country?.market ?? null;
}

/** One call to Claude, then the week's ideas. */
async function draftPlan(plan: PlanRow, settings: TopicSettings): Promise<StepResult> {
  const shortlist = parseJson<(ShortlistEntry & { serviceId: string; placeId: string | null })[]>(plan.shortlist, []);
  if (shortlist.length === 0) {
    await db.topicPlan.update({
      where: { id: plan.id },
      data: { status: "READY", finishedAt: new Date() },
    });
    return { changed: true, note: "nothing to draft" };
  }

  const matrix = await loadMatrix(settings);
  const target = Math.min(plan.target, shortlist.length);

  const { picks, notes, dropped } = await planTopics({
    entries: shortlist,
    target,
    existing: matrix.publishedTitles.slice(0, 60),
    effort: "high" as Effort,
  });

  // A model that returned nothing usable is a failure worth reporting, not a
  // quiet empty week.
  if (picks.length === 0) {
    throw new PermanentError(
      "The planner returned no usable picks.",
      "Every keyword it named was outside the shortlist. Run it again, or lower the gates so the shortlist is bigger.",
    );
  }

  await db.topicIdea.deleteMany({ where: { planId: plan.id, status: "SUGGESTED" } });

  for (const [index, pick] of picks.entries()) {
    const entry = pick.entry;
    await db.topicIdea.create({
      data: {
        planId: plan.id,
        rank: index + 1,
        keyword: entry.keyword,
        topic: pick.title,
        angle: [pick.angle, pick.whyNow].filter(Boolean).join("\n\n"),
        outline: stringify(pick.outline),
        guideType: pick.guideType,
        categoryId: entry.serviceId,
        countryId: entry.countryId,
        regionId: entry.regionId,
        cityId: entry.cityId,
        volume: entry.volume,
        aiVolume: entry.aiVolume,
        difficulty: entry.difficulty,
        intent: entry.intent,
        score: entry.score,
        reasons: stringify(entry.reasons),
        ourRank: entry.ourRank,
        evidence: stringify({
          questions: entry.questions,
          topDomains: entry.topDomains,
          features: entry.features,
        }),
      },
    });
  }

  await db.topicPlan.update({
    where: { id: plan.id },
    data: {
      status: "READY",
      finishedAt: new Date(),
      notes: withNote(
        withNote(plan.notes, notes.trim() || null),
        dropped > 0 ? `${dropped} picks named a phrase that was not on the shortlist and were dropped.` : null,
      ),
    },
  });

  // Only after the week exists, and only as drafts: an automatically written
  // guide still comes back needing a byline and a review before it is a page.
  let commissioned = 0;
  if (settings.autoCommission > 0) {
    const top = await db.topicIdea.findMany({
      where: { planId: plan.id, status: "SUGGESTED" },
      orderBy: { rank: "asc" },
      take: settings.autoCommission,
    });
    for (const idea of top) {
      try {
        await commissionIdea(idea.id);
        commissioned += 1;
      } catch {
        // A commissioning failure is not worth losing the week's plan over.
      }
    }
  }

  return {
    changed: true,
    note: `${picks.length} ideas${commissioned > 0 ? `, ${commissioned} commissioned` : ""}`,
  };
}

/* --------------------------------------------------------------- decisions */

/** Turns one idea into a job the guide writer will pick up. */
export async function commissionIdea(id: string): Promise<{ jobId: string }> {
  const idea = await db.topicIdea.findUnique({ where: { id } });
  if (!idea) throw new PermanentError("No such idea.", "It may have been deleted with its plan.");
  if (idea.jobId) return { jobId: idea.jobId };

  const guideType = guideTypeOf(idea.guideType) satisfies GuideType;
  const template = await db.promptTemplate.findFirst({
    where: { kind: "GUIDE", archived: false, OR: [{ guideType }, { isDefault: true }] },
    // A template written for this exact kind beats the general default.
    orderBy: [{ guideType: "desc" }, { isDefault: "desc" }],
    select: { id: true },
  });

  const outline = parseList(idea.outline);
  const brief = [
    idea.angle?.trim(),
    outline.length > 0 ? `Cover these:\n${outline.map((line) => `  ${line}`).join("\n")}` : null,
    idea.ourRank !== null
      ? `This site already appears at position ${idea.ourRank} for the phrase, so this guide is replacing something, not starting from nothing.`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const job = await db.guideJob.create({
    data: {
      topic: idea.topic,
      keyword: idea.keyword,
      guideType,
      brief: brief || null,
      templateId: template?.id ?? null,
      categoryId: idea.categoryId,
      countryId: idea.countryId,
      regionId: idea.regionId,
      cityId: idea.cityId,
    },
    select: { id: true },
  });

  await db.topicIdea.update({
    where: { id },
    data: { status: "COMMISSIONED", jobId: job.id },
  });

  return { jobId: job.id };
}

/** Not this one, and not again: a dismissed phrase stays off later weeks. */
export async function dismissIdea(id: string): Promise<void> {
  await db.topicIdea.update({ where: { id }, data: { status: "DISMISSED", snoozedUntil: null } });
}

/** Not now. Comes back once the date passes. */
export async function snoozeIdea(id: string, days = 90): Promise<void> {
  await db.topicIdea.update({
    where: { id },
    data: { status: "SNOOZED", snoozedUntil: new Date(Date.now() + days * 86_400_000) },
  });
}

/** Starts a plan for a week, or hands back the one already covering it. */
export async function openPlan({
  trigger = "MANUAL",
  when = new Date(),
}: { trigger?: "AUTO" | "MANUAL"; when?: Date } = {}): Promise<{ id: string; created: boolean }> {
  const settings = await loadTopicSettings();
  const week = weekStart(when);

  const existing = await db.topicPlan.findFirst({
    where: { weekOf: week, status: { notIn: ["FAILED", "CANCELLED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing && trigger === "AUTO") return { id: existing.id, created: false };

  const plan = await db.topicPlan.create({
    data: {
      weekOf: week,
      trigger,
      target: Math.max(1, settings.perWeek),
      settings: stringify(settings),
    },
    select: { id: true },
  });
  return { id: plan.id, created: true };
}

/**
 * Starts the week's plan when the configured day has come and nothing has run.
 *
 * Called by the worker on its own clock rather than by a cron on the host, for
 * the same reason the nightly rollup is: one fewer thing to configure outside
 * the compose file.
 */
export async function ensureWeeklyPlan(now = new Date()): Promise<string | null> {
  const settings = await loadTopicSettings();
  if (!settings.enabled) return null;

  const week = weekStart(now);
  // The configured day, expressed as days after the Monday the week starts on.
  const offset = (settings.dayOfWeek + 6) % 7;
  const due = new Date(week.getTime() + offset * 86_400_000);
  if (now < due) return null;

  const existing = await db.topicPlan.findFirst({
    where: { weekOf: week },
    select: { id: true },
  });
  if (existing) return null;

  const { id } = await openPlan({ trigger: "AUTO", when: now });
  return id;
}
