// The second pass.
//
// A model asked to write three thousand words and satisfy a schema at the same
// time will hit the schema and drift toward the register it was trained on:
// significance inflation, participle phrases doing the work of analysis, rule
// of three, elegant variation, generic upbeat closers. Telling it not to in the
// same breath as telling it what to write does not work well, because it is
// doing two jobs at once.
//
// So this is a separate call that does one job. It is handed the finished
// draft and the catalogue of tells, it names what still reads as machine
// writing, and then it fixes those things and nothing else. Two steps in one
// call, in that order, because naming a problem before fixing it produces a
// better fix than being told to fix problems in general.
//
// It may not add a fact. Every number, source and claim in the draft is
// already checked against the research, and a rewrite that introduces one
// undoes that. It moves words around; it does not learn anything.

import { z } from "zod";
import { askForJson, type Effort } from "./anthropic";
import { guideDraftSchema, type GuideDraft } from "./guide-writer";

/**
 * The tells, condensed from the Wikipedia signs-of-AI-writing catalogue that
 * the humanizer skill is built on.
 *
 * Written as things to find rather than things to avoid, because this call is
 * an audit rather than a brief.
 */
const CATALOGUE = `WHAT TO LOOK FOR

Significance inflation. "Stands as", "serves as", "is a testament to", "plays a vital role", "marks a pivotal moment", "underscores the importance of", "reflects a broader", "in the evolving landscape of". Anything that tells the reader a fact matters instead of letting the fact matter.

Participles doing the work of thinking. A sentence that ends with "...highlighting the importance of X" or "...ensuring that Y" or "...reflecting the Z" has usually stopped saying anything. Cut the tail or turn it into a real clause.

Promotional register. Vibrant, rich, robust, seamless, comprehensive, cutting edge, groundbreaking, renowned, nestled, in the heart of, boasts, showcases, must-have, game changer.

AI vocabulary. Additionally, crucial, delve, enhance, foster, garner, highlight as a verb, interplay, intricate, key as an adjective, landscape as an abstraction, pivotal, tapestry, testament, underscore, leverage, utilize, robust.

Copula avoidance. "Serves as", "functions as", "represents", "boasts", "features" where "is" or "has" is the true sentence.

Negative parallelism. "Not only X but Y". "It is not just A, it is B". Also the clipped tailing negation stuck on the end of a sentence: "no guessing", "no wasted motion".

Rule of three. Groups of three that exist because three sounds finished. Two is often the true number, and four is fine.

Elegant variation. The same thing called four different names across four sentences because repetition felt wrong. Say the word again.

False ranges. "From X to Y" where X and Y are not two ends of anything.

Vague attribution. "Experts say", "industry reports suggest", "it is widely regarded", "studies show" with no study.

Hedging stacks. "It could potentially possibly be argued that it might". Say it or drop it.

Filler. "In order to", "due to the fact that", "at this point in time", "it is important to note that", "has the ability to".

Signposting. "Let's look at", "here is what you need to know", "in this section we will". Do the thing instead of announcing it.

Fragmented headers. A heading followed by a one-line restatement of the heading before the real content starts.

Persuasive authority tropes. "The real question is", "at its core", "what really matters", "fundamentally", "the heart of the matter".

Generic upbeat closers. "The future looks bright", "a step in the right direction", "exciting times ahead".

Title case in headings. Headings are sentence case.

Mechanical emphasis. Bold used as a layout device rather than for a word that needs weight. Inline-header list items shaped "Thing: explanation of thing".

Formatting tells. Em dashes anywhere. Curly quotes. Emoji. Hyphenating every common word pair with perfect consistency: data-driven, high-quality, real-time, decision-making, long-term.

Rhythm. Every sentence the same length is as obvious as any phrase. So is a paragraph that is three sentences long, every time.

Voicelessness. No opinion anywhere, nothing the writer will commit to, no acknowledgement that something is genuinely uncertain or annoying or contested. A guide with no view is a guide nobody trusts.`;

const humanizeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["tells", "draft"],
  properties: {
    tells: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: { type: "string" },
      description:
        "Answer the question honestly first: what makes this obviously machine written? Name the specific tells you found, quoting the offending phrase where there is one. If a section is genuinely clean, say what carries it rather than inventing a fault.",
    },
    draft: {
      type: "object",
      additionalProperties: false,
      required: [
        "title",
        "excerpt",
        "shortAnswer",
        "keyTakeaways",
        "body",
        "bottomLine",
        "faqs",
        "metaTitle",
        "metaDescription",
      ],
      description:
        "The same guide with those tells fixed and nothing else changed. Same sections in the same order, same claims, same numbers, same sources, same figure keys, same chart rows.",
      properties: {
        title: { type: "string" },
        excerpt: { type: "string" },
        shortAnswer: { type: "string" },
        keyTakeaways: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 8 },
        body: { type: "array", items: {}, minItems: 8, maxItems: 70 },
        bottomLine: { type: "string" },
        faqs: {
          type: "array",
          minItems: 3,
          maxItems: 18,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["question", "answer"],
            properties: { question: { type: "string" }, answer: { type: "string" } },
          },
        },
        metaTitle: { type: "string" },
        metaDescription: { type: "string" },
      },
    },
  },
} as const;

const humanizeSchema = z.object({
  tells: z.array(z.string()),
  draft: z.object({
    title: z.string().min(10),
    excerpt: z.string().min(40),
    shortAnswer: z.string().min(80),
    keyTakeaways: z.array(z.string()).min(3),
    body: z.array(z.unknown()).min(6),
    bottomLine: z.string().min(40),
    faqs: z.array(z.object({ question: z.string(), answer: z.string() })).min(1),
    metaTitle: z.string().min(10),
    metaDescription: z.string().min(60),
  }),
});

const SYSTEM = `You are an editor, not a writer. You are handed a finished guide and one job: take out what makes it read as machine writing, and leave everything else exactly as it is.

WHAT YOU MAY NOT DO
Do not add a fact, a number, a price, a date, a source, a regulation or a name. Every figure in this draft has been checked against research you cannot see, and anything you introduce is unchecked. Do not remove a fact either: if a sentence carries a number, the rewritten sentence carries the same number.

Do not reorder the sections, rename the headings' anchors, change a figure block's key, change a chart's rows, or drop a section. The body comes back with the same blocks in the same order, changed only in their words.

Do not make it shorter for the sake of it. Cutting filler will shorten it a little; that is the only shrinkage there should be.

WHAT YOU ARE FOR
Work in two steps, in this order, because naming a fault before fixing it produces a better fix than a general instruction to improve things.

First, answer the question plainly: what makes this obviously AI generated? Quote the phrases. Be specific and be honest, including where the answer is "less than you would expect, but here is what is left".

Then fix exactly those things, and give the guide a pulse while you are in there. A human writer has a view. They say when something is genuinely uncertain, or when the common advice is wrong, or when a step is tedious but worth doing. They vary sentence length without thinking about it: a short one lands, then a longer one takes its time. They use contractions. They allow themselves the occasional aside, the kind an experienced tradesperson would drop into a sentence, without ever becoming chatty or cute.

${CATALOGUE}`;

export type HumanizeResult = { draft: GuideDraft; tells: string[] };

/**
 * Runs the audit and applies it.
 *
 * The fields this does not touch, sources and slug and focus keyword and the
 * illustration briefs, are carried straight across from the original draft, so
 * there is no path by which an edit pass can lose a checked citation.
 */
export async function humanizeGuide({
  draft,
  model,
  effort = "high",
}: {
  draft: GuideDraft;
  model?: string;
  effort?: Effort;
}): Promise<HumanizeResult> {
  const prompt = [
    "Here is the finished guide. Audit it, then fix what the audit found.",
    "",
    JSON.stringify(
      {
        title: draft.title,
        excerpt: draft.excerpt,
        shortAnswer: draft.shortAnswer,
        keyTakeaways: draft.keyTakeaways,
        body: draft.body,
        bottomLine: draft.bottomLine,
        faqs: draft.faqs,
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
      },
      null,
      1,
    ),
  ].join("\n");

  const result = await askForJson({
    schema: humanizeSchema,
    system: SYSTEM,
    prompt,
    jsonSchema: humanizeJsonSchema as unknown as Record<string, unknown>,
    model,
    effort,
    maxTokens: 48_000,
  });

  // Re-validated against the real draft schema, because the loose body shape
  // above lets the model return a block this site cannot render. A rewrite that
  // does not parse is discarded and the original stands.
  const merged = guideDraftSchema.safeParse({
    ...draft,
    ...result.draft,
    // Never the editor's to change.
    slug: draft.slug,
    sources: draft.sources,
    focusKeyword: draft.focusKeyword,
    readingMinutes: draft.readingMinutes,
    illustrations: draft.illustrations,
    confidence: draft.confidence,
  });

  if (!merged.success) {
    return {
      draft,
      tells: [
        ...result.tells,
        `The revision did not fit the guide's own shape, so the original wording stands: ${merged.error.issues[0]?.message ?? "unknown"}`,
      ],
    };
  }

  return { draft: merged.data, tells: result.tells };
}
