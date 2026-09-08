// What a guide is, and what it has to survive before it becomes a page.
//
// The writing happens in Claude now, over MCP. What lives here is the contract
// between the two sides: the shape a submitted draft must have, the house style
// an editor maintains and a writer is handed, and the two checks that cannot be
// made by whoever wrote it.
//
// Those checks are the point of this file. A writer can be told not to invent a
// citation and not to link a page that does not exist, and told well, and still
// do both, because both look exactly like the real thing from the inside. So
// every source is either one the research handed over or one that answers on
// the authority list, and every internal link is a path that is really on this
// site. Neither is a matter of trust.

import { z } from "zod";
import { ContentError } from "./anthropic";
import { authorityPromptBlock, isAuthorityUrl } from "./guide-authorities";
import { keepKnownLinks, type LinkTarget } from "./guide-links";
import { briefAsText, type ResearchBrief } from "./dataforseo";
import { GUIDE_TYPE_LABELS, type GuideType } from "./enums";
import { SKILLS } from "./guide-skills";
import { BRAND } from "./seo-copy";

/* ---------------------------------------------------------- the validator */

/**
 * What a submitted draft has to be.
 *
 * This is the whole contract. A writer builds this object and hands it over;
 * anything that does not parse is refused with the reason, and nothing half
 * valid is ever stored. `quote` exists in the renderer and is deliberately not
 * here: an attributed quotation that was invented is the single worst thing
 * that could end up on a page whose argument is that it can be trusted.
 */
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

/**
 * The same union, in words, for whoever is writing to it.
 *
 * A validator says what is refused; it does not say what any of it is for. This
 * does, and it lives here so that adding a block kind without describing it is
 * an obvious omission rather than an invisible one.
 */
export const BLOCK_REFERENCE: Record<string, string> = {
  heading: "{ text, id }. An H2 and its anchor slug. Sentence case, a question or a claim, never a label like Introduction.",
  paragraph:
    "{ text, links? }. One paragraph, no markdown. links is at most two { text, href }, where text appears verbatim in the paragraph and href is a path from the internal link list. Most paragraphs have none.",
  list: "{ items }. Two or more plain lines. Use it where order does not matter.",
  steps: "{ items }. Two or more { title, body }, numbered on the page. Use it where order does.",
  callout: "{ tone, title, body }. tone is note, alert or brand. One idea the reader must not miss.",
  criteria: "{ items }. Two or more { title, body }. What to judge something on, one heading each.",
  checklist: "{ title, items }. Two or more lines the reader works through in order.",
  compare: "{ title, intro?, rows }. Two or more { factor, check, why }. A real table, where lining things up beats prose.",
  flags: "{ title, items }. Two or more things that should end a conversation.",
  figure:
    "{ key, alt, caption? }. Places one of the pictures you commissioned in illustrations. key must match one of them. Put it where the picture belongs in the argument.",
  chart:
    "{ title, unit, intro?, note?, rows }. Two or more { label, low, high, typical?, note? }. Every number is published as a figure a reader will quote back, so use it only where the research supports the ranges and leave it out rather than estimating.",
};

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

/**
 * The two checks a writer cannot make about its own draft, made here.
 *
 * Sources first, then internal links, and both the same way: only something
 * that was handed over or can be reached survives. Whatever is removed is said
 * out loud in the confidence note rather than quietly dropped, because an
 * editor reading the draft should know what was taken out of it.
 */
export async function vetDraft(
  draft: GuideDraft,
  input: { research: ResearchBrief; linkTargets?: LinkTarget[] },
): Promise<{ draft: GuideDraft; notes: string[] }> {
  const notes: string[] = [];

  const { sources, note } = await checkSources(draft.sources, input.research);
  draft.sources = sources;
  if (note) {
    notes.push(note);
    draft.confidence = `${draft.confidence}\n\n${note}`.trim();
  }

  // A path that was not on the list is a page that does not exist, however
  // plausible it looks. Two links to a paragraph, which is as many as a
  // paragraph can carry without reading like a link farm.
  const targets = input.linkTargets ?? [];
  if (targets.length > 0) {
    let dropped = 0;
    draft.body = draft.body.map((block) => {
      if (block.kind !== "paragraph" || !block.links) return block;
      const kept = keepKnownLinks(block.links, targets).slice(0, 2);
      dropped += block.links.length - kept.length;
      return kept.length > 0 ? { ...block, links: kept } : { ...block, links: undefined };
    });
    if (dropped > 0) {
      const line = `LINK CHECK\n${dropped} internal link${dropped === 1 ? " pointed" : "s pointed"} at a path that is not a page on this site and ${dropped === 1 ? "was" : "were"} removed.`;
      notes.push(line);
      draft.confidence = `${draft.confidence}\n\n${line}`.trim();
    }
  }

  return { draft, notes };
}
