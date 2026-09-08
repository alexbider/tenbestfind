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
import { authorityPromptBlock, isAuthorityUrl } from "./guide-authorities";
import { keepKnownLinks, type LinkTarget } from "./guide-links";
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
 *
 * Nothing below counts, and nothing below should be made to. A schema for
 * structured output is compiled into a grammar, and `maxItems: 12` is not a
 * note about length there, it is twelve copies of the rows. Twelve rows inside
 * a union of eleven block shapes inside a body of up to seventy blocks is how
 * this schema grew past what the API would compile, which it says so at the
 * moment of the call, long after the research has been paid for. So the counts
 * live in the descriptions, where the model reads them, and the shapes that
 * would embarrass us if they came back wrong are enforced by the validator
 * underneath. scripts/check-schemas.ts holds the line.
 */
const blockSchema = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "text", "id"],
      properties: {
        kind: { type: "string", const: "heading" },
        text: { type: "string", description: "An H2. Sentence case, no numbering." },
        id: { type: "string", description: "A short lowercase slug for the anchor." },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "text"],
      properties: {
        kind: { type: "string", const: "paragraph" },
        text: { type: "string", description: "One paragraph. No markdown, no bullet characters." },
        links: {
          type: "array",
          description:
            "Internal links, where this paragraph genuinely leads somewhere on this site. Each names a phrase that appears verbatim in the text above and a path from the list you were given. Write the sentence around the link rather than bolting the link onto a sentence; a phrase that is not in the paragraph links nothing. At most two, and most paragraphs should have none.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["text", "href"],
            properties: {
              text: { type: "string", description: "The exact phrase to link, copied from this paragraph." },
              href: { type: "string", description: "A path copied exactly from the list of pages on this site." },
            },
          },
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "items"],
      properties: {
        kind: { type: "string", const: "list" },
        items: {
          type: "array",
          items: { type: "string" },
          description: "Three to eight of them. Two is a sentence and nine is a wall.",
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "items"],
      properties: {
        kind: { type: "string", const: "steps" },
        items: {
          type: "array",
          description: "Three to eight steps, in the order they happen.",
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
        kind: { type: "string", const: "callout" },
        tone: { type: "string", enum: ["note", "alert", "brand"] },
        title: { type: "string" },
        body: { type: "string" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "items"],
      properties: {
        kind: { type: "string", const: "criteria" },
        items: {
          type: "array",
          description: "Three to six of them.",
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
        kind: { type: "string", const: "checklist" },
        title: { type: "string" },
        items: {
          type: "array",
          items: { type: "string" },
          description: "Three to ten things to work through, in order.",
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "title", "rows"],
      properties: {
        kind: { type: "string", const: "compare" },
        title: { type: "string" },
        intro: { type: "string" },
        rows: {
          type: "array",
          description: "Three to twelve rows. Fewer than three is a paragraph pretending to be a table.",
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
        kind: { type: "string", const: "flags" },
        title: { type: "string", description: "For example: Walk away if you hear any of these" },
        items: {
          type: "array",
          items: { type: "string" },
          description: "Three to seven of them.",
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "key", "alt"],
      properties: {
        kind: { type: "string", const: "figure" },
        key: {
          type: "string",
          description:
            "The key of one of the inline illustrations you commissioned below. Lowercase and hyphenated. Place the block where the picture belongs in the argument, not where it would break up a wall of text.",
        },
        alt: {
          type: "string",
          description:
            "What the picture shows, for a reader who cannot see it. Describe the scene, not the topic, and never start with 'image of'.",
        },
        caption: {
          type: "string",
          description: "Optional. A sentence that adds something the picture cannot say by itself.",
        },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "title", "unit", "rows"],
      properties: {
        kind: { type: "string", const: "chart" },
        title: { type: "string" },
        unit: {
          type: "string",
          description: "What the numbers are, as a short label: \"dollars\", \"dollars per square foot\", \"days\", \"hours\".",
        },
        intro: { type: "string", description: "Optional. One sentence on what the chart shows." },
        note: { type: "string", description: "Optional. What the ranges do not capture." },
        rows: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "low", "high"],
            properties: {
              label: { type: "string" },
              low: { type: "number" },
              high: { type: "number" },
              typical: { type: "number", description: "Optional. Marked inside the range." },
              note: { type: "string", description: "Optional. One short line under the bar." },
            },
          },
          description:
            "Three to ten rows. Every number here is published as a figure a reader will quote back. Use this block only where the research supports the ranges, and leave it out entirely rather than estimating.",
        },
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
    "illustrations",
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
      description:
        "Four to eight of them. The extraction-ready half of the opening. One line each, each a claim with a number or a named qualifier attached rather than a topic. A reader should be able to act on any one of them, and an assistant should be able to quote any one of them.",
    },
    body: {
      type: "array",
      items: blockSchema,
      description:
        "The guide, and on a three thousand word piece that is somewhere between thirty and sixty blocks. Open with a heading, then alternate prose and structure. Every heading must be a question or a claim a reader has, not a label like 'Introduction'.",
    },
    bottomLine: {
      type: "string",
      description: "The closing paragraph: what to actually do with everything above. Two to four sentences.",
    },
    faqs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: {
          question: { type: "string", description: "Phrased the way a person would ask it." },
          answer: { type: "string", description: "40 to 90 words. Answers in the first sentence." },
        },
      },
      description:
        "Fifteen to eighteen on a full-length guide, drawn from the questions in the research first and the gaps second.",
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "url", "tier"],
        properties: {
          label: { type: "string" },
          url: { type: "string", description: "Must be a URL that appeared in the research brief." },
          tier: { type: "string", enum: ["PRIMARY", "SECONDARY", "REPORTED", "EDITORIAL"] },
        },
      },
      description:
        "At most a dozen. Only URLs that appeared in the brief. An empty array is correct and expected when the brief had nothing citable. Never invent one.",
    },
    readingMinutes: { type: "number", description: "Honest estimate at 220 words a minute." },
    metaTitle: {
      type: "string",
      description:
        "50 to 60 characters. The phrase this ranks for, in words a person would search, plus whatever separates this page from the nine others in the results. No brand name, no pipe-separated keyword list, no year unless the guide is genuinely annual.",
    },
    metaDescription: {
      type: "string",
      description:
        "140 to 158 characters, and it is the short answer compressed rather than a summary of the page. Lead with the number or the rule, then what the guide adds. If Google is already showing an AI overview for this search, this is the sentence competing with it.",
    },
    focusKeyword: { type: "string", description: "The single phrase this page should rank for." },
    confidence: {
      type: "string",
      description:
        "What you were unsure about, or where the research was thin, addressed to the editor who will review this. Say 'none' only if there is genuinely nothing.",
    },
    illustrations: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      description:
        "The three photographs this guide should carry: one cover and two inline. You are commissioning them, not making them, so describe a scene somebody could photograph. Real work, real materials, real hands. No text in the picture, no logos, no charts, no diagrams, no before-and-after, nobody recognisable, and nothing staged to look like stock photography. The two inline ones must each have a matching figure block in the body.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "slot", "scene", "alt"],
        properties: {
          key: {
            type: "string",
            description: "Lowercase, hyphenated, specific to this guide. The figure blocks refer to it.",
          },
          slot: { type: "string", enum: ["cover", "inline"] },
          scene: {
            type: "string",
            description:
              "What to photograph, in two or three sentences. Name the subject, the setting, the light and the angle. Concrete enough that two people reading it would come back with the same picture.",
          },
          alt: { type: "string", description: "What the picture shows, for a reader who cannot see it." },
          caption: { type: "string", description: "Optional, and only where it adds something." },
        },
      },
    },
  },
};

const blockValidator = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("heading"), text: z.string(), id: z.string() }),
  z.object({
    kind: z.literal("paragraph"),
    text: z.string(),
    links: z.array(z.object({ text: z.string(), href: z.string() })).optional(),
  }),
  z.object({ kind: z.literal("list"), items: z.array(z.string()).min(2) }),
  z.object({
    kind: z.literal("steps"),
    items: z.array(z.object({ title: z.string(), body: z.string() })).min(2),
  }),
  z.object({
    kind: z.literal("callout"),
    tone: z.enum(["note", "alert", "brand"]),
    title: z.string(),
    body: z.string(),
  }),
  z.object({
    kind: z.literal("criteria"),
    items: z.array(z.object({ title: z.string(), body: z.string() })).min(2),
  }),
  z.object({ kind: z.literal("checklist"), title: z.string(), items: z.array(z.string()).min(2) }),
  z.object({
    kind: z.literal("compare"),
    title: z.string(),
    intro: z.string().optional(),
    rows: z.array(z.object({ factor: z.string(), check: z.string(), why: z.string() })).min(2),
  }),
  z.object({ kind: z.literal("flags"), title: z.string(), items: z.array(z.string()).min(2) }),
  z.object({
    kind: z.literal("figure"),
    key: z.string(),
    alt: z.string(),
    caption: z.string().optional(),
  }),
  z.object({
    kind: z.literal("chart"),
    title: z.string(),
    unit: z.string(),
    intro: z.string().optional(),
    note: z.string().optional(),
    rows: z
      .array(
        z.object({
          label: z.string(),
          low: z.number(),
          high: z.number(),
          typical: z.number().optional(),
          note: z.string().optional(),
        }),
      )
      .min(2),
  }),
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
  illustrations: z
    .array(
      z.object({
        key: z.string(),
        slot: z.enum(["cover", "inline"]),
        scene: z.string(),
        alt: z.string(),
        caption: z.string().optional(),
      }),
    )
    .default([]),
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

LENGTH
Three thousand words is the floor, not the target. A guide under it is not finished. But length is a consequence of covering the subject properly and never the goal: if you find yourself restating a section in different words, or writing a paragraph that would survive being cut, you have stopped writing and started padding. Get there by covering more ground, not by covering the same ground more slowly.

WHAT YOU MAY ASSERT
Only what you actually know, and only what the research brief supports. You may not invent a statistic, a price, a percentage, a study, a regulation, a licence requirement, a permit fee, a code section, a warranty term, a certification body, a date or a quotation. Where a figure would help and you do not have one, write the sentence without it, or say plainly that it varies and what it varies with. "Roofers are licensed in Florida and not in Texas" is worth publishing; a made-up national average is not.

SOURCES
Cite only URLs that appear in the research brief, plus the authorities listed at the end of these rules where they are genuinely relevant. Never construct a URL that looks plausible. For an authority, link the section you are certain of rather than a deep link you are guessing at. An empty sources array is a correct answer when there was nothing worth citing, and it is far better than a fabricated citation.

THE DISTINCTIONS THAT KEEP THIS HONEST
Keep these apart every time, and make clear which one you mean:
  general guidance from advice about a specific property or job
  a legal requirement from a common practice
  licensed from insured from bonded from certified
  a manufacturer warranty from a workmanship warranty
  what a state requires from what a city requires from what a building or an association requires
  a permit from an inspection from a certificate of occupancy
  a trade association's membership from an accreditation with a testable standard
  a typical range from a quote
  what usually happens from what is guaranteed
Never claim a job is simple, safe, cheap, quick or risk free in general. Never tell a reader they do not need a permit, an inspection or a licensed contractor. Where the honest answer is to check with the local building department, say that, and say what to ask when they do.

ANSWER FIRST
The short answer is the answer, complete, for a reader who stops there and for an assistant that quotes one paragraph. Lead with the specific: a number, a range, a name, a rule. No throat clearing, no "there are several factors to consider", no restating the question.

EXPERIENCE AND EXPERTISE
Write as someone who has seen the work go wrong. Specifics carry the expertise: the line item people forget, the certificate that comes from the insurer rather than the contractor, the question whose answer tells you who you are dealing with. Generalities carry nothing. Prefer one concrete detail to three abstract reassurances.

VOICE
Write like a person who knows the subject talking to someone who does not, and who has a view. Contractions where they read naturally. The occasional aside of the kind an experienced tradesperson drops into a sentence, never chatty and never cute. Say when something is genuinely uncertain, when the usual advice is wrong, or when a step is tedious but worth doing anyway. A guide with no opinion anywhere in it is a guide nobody trusts.

Vary the rhythm without thinking about it. A short sentence lands. Then a longer one takes its time getting where it is going. Paragraphs that are all three sentences long read as machine-set as any phrase does.

Never: em dashes. Emoji. Curly quotes. Title case in a heading. Bold used as a layout device. A list whose items are all shaped "Thing: explanation of thing". Marketing register, so nothing is seamless, robust, comprehensive, cutting edge or a game changer. "Not just X, but Y", or a clipped negation tacked on the end like "no guessing". Three-item lists that exist because three sounds complete. A paragraph opening with a participle, or a sentence ending with one doing the work of analysis. Announcing what you are about to do instead of doing it. A heading followed by a line that restates the heading. Calling the same thing four different names in four sentences because repeating a word felt wrong. Hyphenating every common word pair with perfect consistency. "The real question is", "at its core", "what really matters". Ending on how bright the future is.

WHAT NOT TO DO
Never claim the site tested, measured, inspected or surveyed anything. Never write a heading that is only a label. Never shame a reader for the state of their home, their budget or the state anything is in. Never promise an outcome beyond the work itself: a good contractor fixes a roof, and that is the whole claim. Nothing here changes how anybody feels about their house, their neighbours or their life.

BEFORE YOU RETURN, CHECK
  The short answer stands alone and leads with something specific.
  Every number came from the brief or is described as varying.
  Every source URL was in the brief or is on the authority list below.
  Fifteen or more FAQs, each answering in its first sentence.
  At least one compare block used as a real table, where a table beats prose.
  Three thousand words or more, with nothing in it that could be cut.
  No em dash anywhere.
Use the confidence field to say what you were unsure about, what you left out for lack of evidence, and anything an editor should check before this is published. That field is read, and being candid in it costs you nothing.

${authorityPromptBlock()}`;

/**
 * The instructions an editor gets by default, and the tokens they can use.
 *
 * A template is a starting point rather than a fixed form: this one is what
 * ships, and it is expected to be edited.
 */
export const DEFAULT_INSTRUCTIONS = `Write a guide of at least %wordcount% words answering: %topic%

It is a "%type%" guide%service%%location%. The phrase it should rank for is %keyword%.

BEAT WHAT IS ALREADY THERE
If the brief carries Google's own AI overview, that is the answer you are competing with and the version an assistant is already giving people. Read it, then be better than it: more specific where it generalises, honest about a variable it flattens, and carrying the thing it leaves out. Do not paraphrase it and do not contradict it without a reason you can point at.

If there is no overview in the brief, write the opening as though you were composing the one Google should be showing.

Either way, cover everything the ten ranking pages cover between them, then at least two things none of them do. The descriptions in the brief say what each of those pages leads with; where they all lead with the same thing, that is either the answer or the gap.

OPEN IN FOUR PARTS
The opening is what an assistant quotes and what a featured snippet lifts, so it is built rather than written.

  shortAnswer: the direct answer. The phrase above and a concrete number, range or rule in the first sentence, then the typical case, then the two or three things that move it. Sixty to ninety words. No hedging opener, no call to action.

  keyTakeaways: extraction-ready facts, one per line, each a claim with a number or a named qualifier attached. Not topics.

  The first body block: a criteria or list block of definition-style one-liners covering the terms a reader has to know to follow the rest.

  Then one paragraph on how much this varies between properties and jobs, and the single caution that matters most here. Nothing promotional.

STRUCTURE
Every heading is a question a reader actually has or a claim, never a label. The first sentence under a question-style heading answers it. Build the section order from the questions in the research rather than from a template. Where the pages that currently rank all say the same thing, either say it better or say why it is incomplete.

Answer every question the research shows being asked, in the body or in the FAQs. Then cover at least two things none of the ranking pages cover.

USE THE BLOCKS
At least one compare block, used as a real table, where lining things up side by side beats prose. A checklist where a reader works through something in order. A flags block for what should end a conversation. A steps block where sequence matters. Not all of them in every guide, but three thousand words of unbroken paragraphs is a wall.

CHARTS
Where the research gives you real ranges, use a chart block and let the numbers be seen rather than described. Every figure in it is published as a number a reader will quote back, so use it only where the brief supports the ranges and leave it out entirely rather than estimating. A cost guide almost always earns one. A guide with no numbers in it does not.

PICTURES
Commission three photographs in the illustrations array: one cover and two inline. Describe scenes somebody could actually go and photograph. Real work, real materials, real hands, real weather. Name the subject, the setting, the light and the angle, concretely enough that two people reading the brief would come back with the same picture.

Nothing in a picture may carry information the text has not earned: no text in the image, no logos, no signage, no numbers, no charts or diagrams, no before-and-after pairs, nobody recognisable, no branded vehicles or products. Prefer the specific and unglamorous over the polished: a hand on a moisture meter reads as true where a smiling family in a bright kitchen reads as stock.

Place a figure block for each inline picture where the picture belongs in the argument, not wherever the text needs breaking up.

FAQS
Fifteen to eighteen, from the research questions first and the gaps second. Each answers in its first sentence, then adds the qualifier.

LINK INSIDE THE PROSE
Somewhere between eight and fourteen paragraphs should carry an internal link, and the sentence should be written around the link rather than the link bolted on. Each one names a phrase from its own paragraph and a path copied exactly from the list below; anything not on that list is not a page and linking it is a broken promise to the reader.

Link the trade hub and the place hub early, where a reader first needs them. Link a shortlist where the guide has just told somebody what to look for, because that is the moment they want the list. Link another guide where this one stops and that one carries on. Do not link the same page twice.

%links%

RESEARCH BRIEF
%research%`;

export type WriteContext = {
  topic: string;
  keyword: string;
  guideType: GuideType;
  /** The trade, when the guide is about one. */
  service?: string | null;
  /** The pages this guide may link to, already rendered for the prompt. */
  links?: string;
  /** The same list, for checking what came back. */
  linkTargets?: LinkTarget[];
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
    links: context.links ?? "No internal pages are available to link to. Do not invent any.",
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

/** How long a citation gets to prove it exists. */
const LINK_TIMEOUT_MS = 8_000;

/** Identifies the fetch, which several government sites require before answering. */
const LINK_AGENT = `${BRAND}LinkCheck/1.0 (+link verification for an editorial citation)`;

export type LinkVerdict = "live" | "dead" | "unknown";

const alive = (status: number) => status >= 200 && status < 400;
const gone = (status: number) => status === 404 || status === 410 || status === 451;

/**
 * Does this URL answer?
 *
 * HEAD first, because none of the content is wanted and these pages are large.
 * A refusal is not a verdict: plenty of sites reject HEAD outright, and plenty
 * more reject a request whose user agent they do not recognise, so anything
 * that is neither a clear yes nor a clear no is retried once as a GET and then
 * reported as unknown rather than guessed at.
 */
export async function probe(url: string): Promise<LinkVerdict> {
  const headers = { "user-agent": LINK_AGENT, accept: "text/html,*/*" };

  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers,
      signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
    });
    if (alive(head.status)) return "live";
    if (gone(head.status)) return "dead";
  } catch {
    // Fall through to the GET, which sometimes succeeds where HEAD does not.
  }

  try {
    const get = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers,
      signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
    });
    if (alive(get.status)) return "live";
    if (gone(get.status)) return "dead";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Every source is either one the research handed over or one this fetches.
 *
 * The research URLs are taken on trust because a search engine returned them
 * minutes ago. Everything else has to be on the authority list and has to
 * answer, because the failure this exists to prevent is a guide that links a
 * licensing board at a URL nobody ever checked.
 *
 * Only a definite negative removes a link. A timeout, a proxy refusal or a
 * connection reset means this side could not tell, and a live page dropped
 * because the network had a bad second is a worse outcome than an uncertain
 * one kept and mentioned.
 */
export async function checkSources(
  sources: GuideDraft["sources"],
  research: ResearchBrief,
): Promise<{ sources: GuideDraft["sources"]; note: string | null }> {
  const fromBrief = new Set(research.serp.map((result) => result.url));
  const kept: GuideDraft["sources"] = [];
  const invented: string[] = [];
  const dead: string[] = [];
  const unknown: string[] = [];

  const checks = sources.map(async (source) => {
    if (fromBrief.has(source.url)) return { source, verdict: "brief" as const };
    if (!isAuthorityUrl(source.url)) return { source, verdict: "invented" as const };

    try {
      // Only a positive answer counts as verified. Anything else is unknown,
      // because a network in front of this one can answer 403 for a page that
      // is perfectly alive, and reading that as a pass would make the whole
      // check falsely reassuring: every link would come back green whether or
      // not anything had actually been reached.
      const verdict = await probe(source.url);
      return { source, verdict };
    } catch {
      return { source, verdict: "unknown" as const };
    }
  });

  for (const result of await Promise.all(checks)) {
    switch (result.verdict) {
      case "invented":
        invented.push(result.source.url);
        break;
      case "dead":
        dead.push(result.source.url);
        break;
      case "unknown":
        unknown.push(result.source.url);
        kept.push(result.source);
        break;
      default:
        kept.push(result.source);
    }
  }

  // A draft whose citations are mostly made up is not a draft with a citation
  // problem, it is a draft that invented its way through the whole subject.
  if (invented.length > 2 && kept.length === 0) {
    throw new ContentError(
      `The draft cited ${invented.length} sources that were neither in the research nor on the authority list. Rejected rather than published.`,
    );
  }

  const lines = [
    invented.length > 0
      ? `${invented.length} citation${invented.length === 1 ? " was" : "s were"} removed for coming from neither the research nor the authority list: ${invented.join(", ")}`
      : null,
    dead.length > 0
      ? `${dead.length} authority link${dead.length === 1 ? "" : "s"} removed after returning not found: ${dead.join(", ")}`
      : null,
    unknown.length > 0
      ? `${unknown.length} authority link${unknown.length === 1 ? "" : "s"} could not be confirmed from the server and ${unknown.length === 1 ? "was" : "were"} kept unverified. Open ${unknown.length === 1 ? "it" : "each of these"} before publishing: ${unknown.join(", ")}`
      : null,
  ].filter(Boolean);

  return { sources: kept, note: lines.length > 0 ? `SOURCE CHECK\n${lines.join("\n")}` : null };
}

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
    // Long-form, with headroom. A three thousand word guide carrying eighteen
    // FAQs and a dozen blocks lands somewhere near twelve thousand tokens once
    // it is JSON, and running into the ceiling loses the entire draft rather
    // than truncating it.
    maxTokens: 48_000,
  });

  // The one check the schema cannot make: a citation the model was not given.
  const { sources, note } = await checkSources(draft.sources, research);
  draft.sources = sources;
  if (note) draft.confidence = `${draft.confidence}\n\n${note}`.trim();

  // And the same rule for internal links. A path that was not on the list is a
  // page that does not exist, however plausible it looks.
  if (context.linkTargets && context.linkTargets.length > 0) {
    let dropped = 0;
    draft.body = draft.body.map((block) => {
      if (block.kind !== "paragraph" || !block.links) return block;
      // Two per paragraph, which the schema used to say and now nothing does.
      const kept = keepKnownLinks(block.links, context.linkTargets ?? []).slice(0, 2);
      dropped += block.links.length - kept.length;
      return kept.length > 0 ? { ...block, links: kept } : { ...block, links: undefined };
    });
    if (dropped > 0) {
      draft.confidence =
        `${draft.confidence}\n\nLINK CHECK\n${dropped} internal link${dropped === 1 ? " pointed" : "s pointed"} at a path that is not a page on this site and ${dropped === 1 ? "was" : "were"} removed.`.trim();
    }
  }

  return { draft, prompt };
}
