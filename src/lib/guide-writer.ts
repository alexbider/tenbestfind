// Commissioning a guide.
//
// The research says what the search results already contain; this decides what
// the page says back. Two things are deliberately not in the code:
//
//   The instructions. They live in a PromptTemplate an editor edits, because
//   "open cost guides with the range" is an editorial decision and editorial
//   decisions should not need a deploy.
//
//   The facts. The model is given the research and told it may not go beyond
//   it. Every number it prints has to have come from the brief, every source it
//   cites has to be a URL it was handed, and where it has nothing it is told to
//   say so rather than produce a plausible figure. A directory whose guides
//   invent prices is worth less than one with no guides.
//
// What is in the code is the shape: what a finished guide must contain before
// it is worth publishing, expressed as a schema the model has to satisfy.

import { z } from "zod";
import { askForJson, ContentError, type Effort } from "./anthropic";
import { briefAsText, type ResearchBrief } from "./dataforseo";
import { GUIDE_TYPE_LABELS, type GuideType } from "./enums";
import { SKILLS } from "./guide-skills";
import { BRAND } from "./seo-copy";

/* ------------------------------------------------------------- the schema */

/**
 * The blocks the writer may use.
 *
 * `quote` exists in the renderer and is deliberately withheld here: a model
 * asked for a quotation will produce an attributed one, and an invented
 * attribution is the single worst thing that could end up on a page whose whole
 * argument is that it can be trusted.
 */
const blockSchema = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "text", "id"],
      properties: {
        kind: { const: "heading" },
        text: { type: "string", description: "An H2. Sentence case, no numbering." },
        id: { type: "string", description: "A short lowercase slug for the anchor." },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "text"],
      properties: {
        kind: { const: "paragraph" },
        text: { type: "string", description: "One paragraph. No markdown, no bullet characters." },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "items"],
      properties: {
        kind: { const: "list" },
        items: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "items"],
      properties: {
        kind: { const: "steps" },
        items: {
          type: "array",
          minItems: 3,
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "body"],
            properties: { title: { type: "string" }, body: { type: "string" } },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "tone", "title", "body"],
      properties: {
        kind: { const: "callout" },
        tone: { enum: ["note", "alert", "brand"] },
        title: { type: "string" },
        body: { type: "string" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "items"],
      properties: {
        kind: { const: "criteria" },
        items: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "body"],
            properties: { title: { type: "string" }, body: { type: "string" } },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "title", "items"],
      properties: {
        kind: { const: "checklist" },
        title: { type: "string" },
        items: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 10 },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "title", "rows"],
      properties: {
        kind: { const: "compare" },
        title: { type: "string" },
        intro: { type: "string" },
        rows: {
          type: "array",
          minItems: 3,
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["factor", "check", "why"],
            properties: {
              factor: { type: "string" },
              check: { type: "string" },
              why: { type: "string" },
            },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "title", "items"],
      properties: {
        kind: { const: "flags" },
        title: { type: "string", description: "For example: Walk away if you hear any of these" },
        items: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 7 },
      },
    },
  ],
};

export const guideJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "slug",
    "excerpt",
    "shortAnswer",
    "keyTakeaways",
    "body",
    "bottomLine",
    "faqs",
    "sources",
    "readingMinutes",
    "metaTitle",
    "metaDescription",
    "focusKeyword",
    "confidence",
  ],
  properties: {
    title: {
      type: "string",
      description:
        "The H1. What a reader would search, not a headline. 40 to 70 characters. No brand name, no year unless the guide is genuinely annual.",
    },
    slug: {
      type: "string",
      description: "Lowercase, hyphenated, no stop words padding it out. Derived from the title.",
    },
    excerpt: {
      type: "string",
      description: "One or two sentences for the card and the meta description fallback. 120 to 200 characters.",
    },
    shortAnswer: {
      type: "string",
      description:
        "The answer, before any preamble, in 40 to 80 words. This is what gets quoted by an AI assistant and lifted into a featured snippet, so it must stand alone: complete, specific, and useful to someone who reads nothing else. No 'it depends' opening.",
    },
    keyTakeaways: {
      type: "array",
      items: { type: "string" },
      minItems: 4,
      maxItems: 6,
      description: "One line each, each a claim rather than a topic. A reader should be able to act on any one of them.",
    },
    body: {
      type: "array",
      minItems: 8,
      maxItems: 40,
      items: blockSchema,
      description:
        "The guide. Open with a heading, then alternate prose and structure. Every heading must be a question or a claim a reader has, not a label like 'Introduction'.",
    },
    bottomLine: {
      type: "string",
      description: "The closing paragraph: what to actually do with everything above. Two to four sentences.",
    },
    faqs: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: {
          question: { type: "string", description: "Phrased the way a person would ask it." },
          answer: { type: "string", description: "40 to 90 words. Answers in the first sentence." },
        },
      },
      description: "Drawn from the questions in the research wherever they are relevant.",
    },
    sources: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "url", "tier"],
        properties: {
          label: { type: "string" },
          url: { type: "string", description: "Must be a URL that appeared in the research brief." },
          tier: { enum: ["PRIMARY", "SECONDARY", "REPORTED", "EDITORIAL"] },
        },
      },
      description:
        "Only URLs that appeared in the brief. An empty array is correct and expected when the brief had nothing citable. Never invent one.",
    },
    readingMinutes: { type: "number", description: "Honest estimate at 220 words a minute." },
    metaTitle: { type: "string", description: "50 to 60 characters. May differ from the H1." },
    metaDescription: { type: "string", description: "140 to 158 characters. Written to be clicked, not to be keyword stuffed." },
    focusKeyword: { type: "string", description: "The single phrase this page should rank for." },
    confidence: {
      type: "string",
      description:
        "What you were unsure about, or where the research was thin, addressed to the editor who will review this. Say 'none' only if there is genuinely nothing.",
    },
  },
};

const blockValidator = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("heading"), text: z.string(), id: z.string() }),
  z.object({ kind: z.literal("paragraph"), text: z.string() }),
  z.object({ kind: z.literal("list"), items: z.array(z.string()) }),
  z.object({
    kind: z.literal("steps"),
    items: z.array(z.object({ title: z.string(), body: z.string() })),
  }),
  z.object({
    kind: z.literal("callout"),
    tone: z.enum(["note", "alert", "brand"]),
    title: z.string(),
    body: z.string(),
  }),
  z.object({
    kind: z.literal("criteria"),
    items: z.array(z.object({ title: z.string(), body: z.string() })),
  }),
  z.object({ kind: z.literal("checklist"), title: z.string(), items: z.array(z.string()) }),
  z.object({
    kind: z.literal("compare"),
    title: z.string(),
    intro: z.string().optional(),
    rows: z.array(z.object({ factor: z.string(), check: z.string(), why: z.string() })),
  }),
  z.object({ kind: z.literal("flags"), title: z.string(), items: z.array(z.string()) }),
]);

export const guideDraftSchema = z.object({
  title: z.string().min(10),
  slug: z.string().min(3),
  excerpt: z.string().min(40),
  shortAnswer: z.string().min(80),
  keyTakeaways: z.array(z.string()).min(3),
  body: z.array(blockValidator).min(6),
  bottomLine: z.string().min(40),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).min(1),
  sources: z.array(
    z.object({
      label: z.string(),
      url: z.string(),
      tier: z.enum(["PRIMARY", "SECONDARY", "REPORTED", "EDITORIAL"]),
    }),
  ),
  readingMinutes: z.number().min(1).max(60),
  metaTitle: z.string().min(10),
  metaDescription: z.string().min(60),
  focusKeyword: z.string().min(2),
  confidence: z.string(),
});

export type GuideDraft = z.infer<typeof guideDraftSchema>;

/* ------------------------------------------------------------- the prompt */

/**
 * The rules that are not an editor's to change.
 *
 * Everything here is either a factual-integrity rule or a house-voice rule that
 * the site's credibility rests on. The editable template sits on top of this
 * and decides what to write, not whether to make things up.
 */
export const DEFAULT_SYSTEM = `You write research guides for ${BRAND}, a directory that publishes shortlists of local service companies along with the reasoning behind them. The site's entire argument is that it can be trusted, so a guide that is confidently wrong costs more than no guide at all.

WHAT YOU MAY ASSERT
Only what you actually know, and only what the research brief supports. You may not invent a statistic, a price, a percentage, a study, a regulation, a licence requirement, a date or a quotation. Where a figure would help and you do not have one, write the sentence without it, or say plainly that it varies and what it varies with. "Roofers are licensed in Florida and not in Texas" is worth publishing; a made-up national average is not.

SOURCES
Cite only URLs that appear in the research brief. Do not construct a URL that looks plausible. An empty sources array is a correct answer when the brief contained nothing worth citing, and it is far better than a fabricated citation.

EXPERIENCE AND EXPERTISE
Write as someone who has seen the work go wrong. Specifics carry the expertise: the line item people forget, the certificate that comes from the insurer rather than the contractor, the question whose answer tells you who you are dealing with. Generalities carry nothing. Prefer one concrete detail to three abstract reassurances.

ANSWER FIRST
The short answer is not an introduction. It is the answer, complete, for a reader who stops there and for an assistant that quotes one paragraph. No throat-clearing, no "there are several factors to consider", no restating the question.

VOICE
Write like a person who knows the subject talking to someone who does not. Plain sentences of varied length. No em dashes. No emoji. No marketing register: nothing is seamless, robust, comprehensive, cutting-edge, or a game changer. No "not just X, but Y". No three-item lists that exist because three sounds complete. Do not open a paragraph with a participle. Do not end a section by summarising what it just said. Contractions where they read naturally. If a sentence would survive being cut, cut it.

WHAT NOT TO DO
Never claim the site tested, measured, inspected or surveyed anything. Never address the reader as "you" more than the prose needs. Never write a heading that is only a label. Never pad to hit a word count: a shorter guide that is entirely true beats a longer one carrying filler.`;

/**
 * The instructions an editor gets by default, and the tokens they can use.
 *
 * A template is a starting point rather than a fixed form: this one is what
 * ships, and it is expected to be edited.
 */
export const DEFAULT_INSTRUCTIONS = `Write a guide of about %wordcount% words answering: %topic%

It is a "%type%" guide%service%%location%.

The phrase it should rank for is %keyword%.

Structure it around the questions in the research rather than around a template. Where the research shows a question Google is already asking on this topic, answer it, either in the body or in the FAQs. Where the pages that currently rank all say the same thing, either say it better or say why it is incomplete. Do not simply cover the same ground in the same order.

Use the structured blocks where they earn their place: a checklist where a reader needs to work through something, a compare block where two things need lining up side by side, a flags block for the things that should end a conversation. Do not use all of them in one guide.

RESEARCH BRIEF
%research%`;

export type WriteContext = {
  topic: string;
  keyword: string;
  guideType: GuideType;
  /** The trade, when the guide is about one. */
  service?: string | null;
  /** Where it applies, when it is not national. */
  location?: string | null;
  wordTarget: number;
  /** House rules the editor has switched on, by name. */
  skills: string[];
  /** Anything specific to this one commission. */
  brief?: string | null;
};

/** Fills the %tokens% an editor can use in a template. */
export function renderInstructions(
  instructions: string,
  context: WriteContext,
  research: ResearchBrief,
): string {
  const tokens: Record<string, string> = {
    topic: context.topic,
    keyword: context.keyword || context.topic,
    type: GUIDE_TYPE_LABELS[context.guideType],
    service: context.service ? ` about ${context.service.toLowerCase()}` : "",
    location: context.location ? ` written for ${context.location}` : "",
    wordcount: String(context.wordTarget),
    research: briefAsText(research),
    sitename: BRAND,
  };

  return instructions.replace(/%([a-z]+)%/gi, (match, name: string) => {
    const value = tokens[name.toLowerCase()];
    return value === undefined ? match : value;
  });
}

/** The extra paragraphs the editor's switches add to the instructions. */
export function skillNotes(skills: string[]): string {
  const notes = skills.map((skill) => SKILLS[skill]).filter(Boolean);
  return notes.length === 0 ? "" : `\n\nHOUSE RULES FOR THIS PIECE\n${notes.join("\n\n")}`;
}

/** Re-exported so a caller that already has the writer does not need both. */
export { SKILLS, SKILL_LABELS } from "./guide-skills";

/* ------------------------------------------------------------- the writer */

export type WriteResult = { draft: GuideDraft; prompt: string };

export async function writeGuide({
  system,
  instructions,
  context,
  research,
  model,
  effort,
}: {
  system: string;
  instructions: string;
  context: WriteContext;
  research: ResearchBrief;
  model?: string;
  effort?: Effort;
}): Promise<WriteResult> {
  const prompt = [
    renderInstructions(instructions, context, research),
    skillNotes(context.skills),
    context.brief ? `\n\nFOR THIS ONE\n${context.brief}` : "",
  ]
    .join("")
    .trim();

  const draft = await askForJson({
    schema: guideDraftSchema,
    system: system || DEFAULT_SYSTEM,
    prompt,
    jsonSchema: guideJsonSchema as unknown as Record<string, unknown>,
    model,
    effort,
    // Long-form: a 1,400-word guide plus its blocks and FAQs is well past the
    // default, and hitting the ceiling loses the whole draft.
    maxTokens: 32_000,
  });

  // The one check the schema cannot make: a citation the model was not given.
  const allowed = new Set(research.serp.map((result) => result.url));
  const invented = draft.sources.filter((source) => !allowed.has(source.url));
  if (invented.length > 0) {
    draft.sources = draft.sources.filter((source) => allowed.has(source.url));
    if (draft.sources.length === 0 && invented.length > 2) {
      throw new ContentError(
        `The draft cited ${invented.length} sources that were not in the research. Rejected rather than published.`,
      );
    }
  }

  return { draft, prompt };
}
