// Turning numbers into a week's work.
//
// By the time this runs, the hard question is already answered: the shortlist
// is a set of phrases with real volume, tolerable difficulty, informational
// intent and a first page somebody could beat. What is left is editorial, and
// it is the one part of the plan a model is genuinely better at than a scoring
// function: which two of these phrases are the same article, what the article
// should actually be called, and what it has to cover to be worth reading.
//
// The model may not add phrases. It picks from what it was handed, and anything
// it returns that was not on the list is dropped before it reaches the
// database, for the same reason the guide writer's citations are checked: a
// suggestion that came from nowhere is indistinguishable from a good one until
// somebody has already paid to write it.

import { z } from "zod";
import { askForJson, type Effort } from "./anthropic";
import { GUIDE_TYPES, GUIDE_TYPE_LABELS, type GuideType } from "./enums";
import { BRAND } from "./seo-copy";

export type ShortlistEntry = {
  keyword: string;
  guideType: GuideType;
  serviceId: string;
  serviceName: string;
  placeId: string | null;
  placeName: string | null;
  placeKind: string;
  countryId: string | null;
  regionId: string | null;
  cityId: string | null;
  volume: number | null;
  aiVolume: number | null;
  difficulty: number | null;
  intent: string | null;
  ourRank: number | null;
  score: number;
  reasons: { label: string; detail: string; delta: number }[];
  /** Filled in by the probe step, for the entries that got one. */
  questions: string[];
  topDomains: string[];
  features: string[];
};

const planJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["picks", "notes"],
  properties: {
    picks: {
      type: "array",
      minItems: 1,
      maxItems: 50,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["keyword", "title", "guideType", "angle", "outline", "whyNow"],
        properties: {
          keyword: {
            type: "string",
            description:
              "Copied exactly from the shortlist. The phrase the piece should rank for. Never a phrase that was not on the list.",
          },
          title: {
            type: "string",
            description:
              "What the guide should be called. Written for a reader, not stuffed with the keyword. Sentence case, under seventy characters.",
          },
          guideType: {
            enum: [...GUIDE_TYPES],
            description: "Which of the four kinds of guide this is. Usually the one suggested, but override it when the search results say otherwise.",
          },
          angle: {
            type: "string",
            description:
              "Two or three sentences on what this guide should do that the pages currently ranking do not. Concrete, not a restatement of the title.",
          },
          outline: {
            type: "array",
            minItems: 3,
            maxItems: 8,
            items: { type: "string" },
            description:
              "The sections it has to contain to be worth reading, each a short phrase. Where the search shows questions, answer them here.",
          },
          whyNow: {
            type: "string",
            description:
              "One sentence on why this is worth a week's slot, referring to the actual numbers rather than to how useful it would be in general.",
          },
        },
      },
    },
    notes: {
      type: "string",
      description:
        "What you noticed about the shortlist as a whole that the numbers do not say: a gap, a duplication, a trade that keeps surfacing. Two or three sentences, or an empty string if there is nothing worth saying.",
    },
  },
} as const;

const pickSchema = z.object({
  keyword: z.string(),
  title: z.string().min(8).max(140),
  guideType: z.enum(GUIDE_TYPES),
  angle: z.string().min(20).max(1200),
  outline: z.array(z.string()).min(1).max(12),
  whyNow: z.string().max(600),
});

export const planResultSchema = z.object({
  picks: z.array(pickSchema),
  notes: z.string(),
});

export type TopicPick = z.infer<typeof pickSchema>;

const SYSTEM = `You plan the editorial calendar for ${BRAND}, a directory that publishes researched shortlists of local service companies and the guides that sit alongside them.

You are given a shortlist of search phrases that have already passed every quantitative test: real volume, tolerable difficulty, informational intent, and a first page with room in it. You are not being asked whether these are good keywords. You are being asked which of them are the same article, what those articles should be called, and what each one has to contain.

Hold to these:

Merge before you pick. Two phrases that a single page would answer are one suggestion, not two, and the one with the better numbers is the one to name as the target. A site that publishes both ends up competing with itself.

Name the target honestly. Every keyword you return must be copied exactly from the shortlist. If the article you want to propose does not have a phrase on the list, propose a different article.

Titles are for readers. "How much does a new roof cost in Austin?" is a title. "Austin Roofing Cost Guide 2026 | Prices & Estimates" is a filename.

The angle has to be specific. "A comprehensive guide to choosing a plumber" is not an angle. "The pages ranking for this all list the same five certifications and none of them say which ones a homeowner can actually verify online" is an angle. Where you have been shown what currently ranks, say what is missing from it.

Prefer what only this site can write. It has company listings, licence and review data, and editors who talk to trades. A guide that leans on that beats a guide anyone could have written from the same ten search results.

Where the numbers are thin, say so in the note rather than inflating the angle.`;

/** The shortlist as the model reads it: dense, and honest about what is missing. */
function shortlistAsText(entries: ShortlistEntry[]): string {
  return entries
    .map((entry, index) => {
      const facts = [
        entry.volume !== null ? `${entry.volume.toLocaleString()}/mo` : "volume unknown",
        entry.difficulty !== null ? `difficulty ${entry.difficulty}` : null,
        entry.intent ? entry.intent : null,
        entry.aiVolume ? `${entry.aiVolume.toLocaleString()} AI searches/mo` : null,
        entry.ourRank !== null ? `we rank ${entry.ourRank}` : "we do not rank",
        `score ${entry.score}`,
      ]
        .filter(Boolean)
        .join(" · ");

      const lines = [
        `${index + 1}. "${entry.keyword}"`,
        `   ${entry.serviceName}${entry.placeName ? ` in ${entry.placeName}` : ""} · suggested as ${GUIDE_TYPE_LABELS[entry.guideType]}`,
        `   ${facts}`,
      ];

      if (entry.topDomains.length > 0) lines.push(`   currently ranking: ${entry.topDomains.slice(0, 6).join(", ")}`);
      if (entry.questions.length > 0) {
        lines.push(`   questions Google shows: ${entry.questions.slice(0, 6).join(" | ")}`);
      }
      if (entry.features.includes("ai_overview")) lines.push("   Google is generating an AI overview for this.");
      return lines.join("\n");
    })
    .join("\n\n");
}

export type PlanBriefInput = {
  entries: ShortlistEntry[];
  target: number;
  /** What is already published, so the model does not re-propose it. */
  existing: string[];
  model?: string;
  effort?: Effort;
};

export type PlanBriefResult = {
  picks: (TopicPick & { entry: ShortlistEntry })[];
  notes: string;
  dropped: number;
};

/**
 * One call, one week's calendar.
 *
 * Returns each pick paired with the shortlist row it came from, so everything
 * downstream keeps the numbers that argued for it rather than trusting the
 * model to have carried them across.
 */
export async function planTopics({
  entries,
  target,
  existing,
  model,
  effort = "high",
}: PlanBriefInput): Promise<PlanBriefResult> {
  const prompt = [
    `Pick the ${target} best articles from the shortlist below, in the order you would write them.`,
    "",
    existing.length > 0
      ? `Already published, so do not propose them again:\n${existing.map((title) => `  ${title}`).join("\n")}\n`
      : "",
    "SHORTLIST",
    shortlistAsText(entries),
  ]
    .filter(Boolean)
    .join("\n");

  const result = await askForJson({
    schema: planResultSchema,
    system: SYSTEM,
    prompt,
    jsonSchema: planJsonSchema as unknown as Record<string, unknown>,
    model,
    effort,
    maxTokens: 16_000,
  });

  // The check the schema cannot make. A keyword that was not on the list has no
  // numbers behind it, and a suggestion with no numbers behind it is a guess
  // wearing the same clothes as the rest of the week.
  const byKeyword = new Map(entries.map((entry) => [entry.keyword.toLowerCase(), entry]));
  const picks: (TopicPick & { entry: ShortlistEntry })[] = [];
  let dropped = 0;

  for (const pick of result.picks) {
    const entry = byKeyword.get(pick.keyword.trim().toLowerCase());
    if (!entry) {
      dropped += 1;
      continue;
    }
    if (picks.some((chosen) => chosen.entry.keyword === entry.keyword)) continue;
    picks.push({ ...pick, keyword: entry.keyword, entry });
    if (picks.length >= target) break;
  }

  return { picks, notes: result.notes, dropped };
}
