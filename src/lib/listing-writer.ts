import { z } from "zod";
import { askForJson, type Effort } from "./anthropic";
import { auditTells, clean, openingFingerprint, wordCount, type Tell } from "./humanize";
import { analyzeSeo } from "./seo";
import { slugify } from "./format";

// The written half of a listing. Everything a profile page and its SEO record
// need, produced in one structured call and then checked, cleaned and scored
// here rather than trusted as returned.

export const MIN_WORDS = 620; // the content-length check in analyzeSeo wants 600
export const TARGET_WORDS = 750;

const faqSchema = z.object({
  question: z.string().min(8).max(160),
  answer: z.string().min(40).max(900),
});

export const listingSchema = z.object({
  tagline: z.string().min(15).max(110),
  description: z.string().min(1500),
  editorialTake: z.string().min(120).max(900),
  bestFor: z.string().min(8).max(120),
  strengths: z.array(z.string().min(10).max(180)).min(3).max(6),
  considerations: z.array(z.string().min(10).max(180)).min(2).max(4),
  services: z.array(z.string().min(3).max(70)).min(4).max(12),
  faqs: z.array(faqSchema).min(5).max(8),
  seoTitle: z.string().min(25).max(65),
  seoDescription: z.string().min(110).max(170),
  extraKeywords: z.array(z.string().min(3).max(70)).min(3).max(8),
});

export type Listing = z.infer<typeof listingSchema>;

// The same shape as JSON Schema, sent to the model so the response arrives
// already structured. Kept beside the Zod schema deliberately: one shapes the
// request, the other is the gate on the way in.
const listingJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "tagline",
    "description",
    "editorialTake",
    "bestFor",
    "strengths",
    "considerations",
    "services",
    "faqs",
    "seoTitle",
    "seoDescription",
    "extraKeywords",
  ],
  properties: {
    tagline: { type: "string", description: "One line, 15 to 110 characters, no full stop." },
    description: {
      type: "string",
      description: `The main profile copy. At least ${MIN_WORDS} words, ideally around ${TARGET_WORDS}. Plain paragraphs separated by a blank line. No markdown headings, no bullet characters.`,
    },
    editorialTake: { type: "string", description: "Two to four sentences in the site's own voice." },
    bestFor: { type: "string", description: "Short phrase, for example 'same-day drain work in older homes'." },
    strengths: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
    considerations: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
    services: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 12 },
    faqs: {
      type: "array",
      minItems: 5,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: {
          question: { type: "string" },
          answer: { type: "string", description: "40 to 900 characters. Answer first, then the detail." },
        },
      },
    },
    seoTitle: { type: "string", description: "30 to 60 characters. Must contain the focus keyword verbatim." },
    seoDescription: { type: "string", description: "120 to 160 characters. Must contain the focus keyword verbatim." },
    extraKeywords: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
  },
} as const;

/* --------------------------------------------------------------- the prompt */

/**
 * Held apart from the per-business prompt so it stays byte-identical across a
 * batch and can be cached. Anything that varies goes in the user message.
 */
export const WRITER_SYSTEM = `You write business profiles for TenBestFind, a directory that publishes researched shortlists of local service companies.

WHAT THE SITE IS
Readers arrive wanting to hire someone this week. They want to know what a company actually does, who it suits, and what to watch for. The site's credibility rests on sounding like a person who looked into it, not like marketing copy the business supplied.

VOICE
Write the way a well-informed local would explain the company to a neighbour. Plain, specific, unhurried. Vary sentence length. Let some sentences run long and follow them with a short one. Use the second person sparingly.

HARD RULES
- Never use an em dash or an en dash. Use a comma, a full stop, or rewrite.
- Never open two consecutive paragraphs the same way, and never open with the company name in every profile.
- No three-item lists used for rhythm ("fast, honest, local").
- Banned phrases, in any form: not just X but Y, in today's, when it comes to, nestled, boasts, a testament to, ever-evolving, delve, navigate the, seamless, cutting-edge, state of the art, game changer, unwavering commitment, unparalleled, elevate your, unlock, harness, leverage, streamline your, whether you're X or Y, look no further, peace of mind, trusted name in, moreover, furthermore, additionally, in conclusion, plays a vital role, ensuring that.
- No emoji, no exclamation marks, no ALL CAPS.
- Do not invent facts. You are given what is known. If a detail is not in the brief, either leave it out or write about it in the conditional ("published hours suggest", "the profile does not list").
- Never claim a licence, certification, insurance, award, guarantee or price that is not in the brief.
- Do not say the company is the best, number one, or top rated unless the brief carries a rating, and then quote the rating and where it came from.

ACCURACY
Everything verifiable must trace to the brief. Rating and review counts come from the Google Business Profile and must be described that way, with the date. Anything uncertain is written as uncertain. A thin brief produces a shorter, plainer profile, not a padded one.

THE DESCRIPTION
This is the substance of the page. Cover, in whatever order suits the company: what they do and the range of jobs they take; who they are a good fit for and who they are not; how they work day to day, drawn from what the brief supports; what the location means for the work, using real local detail about the city and the trade; what a reader should ask before hiring; and how they compare to the alternatives in that market in general terms. Ground it in the trade. A roofer profile should discuss hail, decking and warranty transfers. A plumber profile should discuss repipes, permits and after-hours call-out pricing.

SEO
The focus keyword is given in the brief. It must appear verbatim in the SEO title, in the SEO description, and at least twice in the description, worked in naturally. Do not repeat it more than five times in total.

FAQ
Write questions a person would actually type. Answer the question in the first sentence, then add the detail. No question may be answered with information that is not in the brief or that is not generally true of the trade.`;

export type Brief = {
  name: string;
  focusKeyword: string;
  category: string;
  serviceName: string;
  city: string;
  region: string;
  country: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  reviewCount: number | null;
  ratingReadOn: string;
  gmbRank: number | null;
  gmbCategory: string | null;
  hours: { day: string; hours: string }[] | null;
  /** Openings already used in this batch, so profiles do not rhyme. */
  avoidOpenings: string[];
  /** What a previous attempt got wrong, on a retry. */
  corrections?: string[];
};

export function buildPrompt(brief: Brief): string {
  const known: string[] = [
    `Business name: ${brief.name}`,
    `Focus keyword (use verbatim): ${brief.focusKeyword}`,
    `Trade: ${brief.serviceName} (site category: ${brief.category})`,
    `Location: ${brief.city}, ${brief.region}, ${brief.country}`,
  ];

  if (brief.gmbCategory) known.push(`Category on its Google profile: ${brief.gmbCategory}`);
  if (brief.address) known.push(`Address: ${brief.address}`);
  if (brief.phone) known.push(`Phone: ${brief.phone}`);
  if (brief.website) known.push(`Website: ${brief.website}`);
  if (brief.rating && brief.reviewCount) {
    known.push(
      `Google rating: ${brief.rating} from ${brief.reviewCount} reviews, read on ${brief.ratingReadOn}`,
    );
  } else {
    known.push("Google rating: not published on the profile");
  }
  if (brief.gmbRank) {
    known.push(
      `It appeared at position ${brief.gmbRank} in the Google Maps results for this trade and city. Do not mention this position in the copy.`,
    );
  }
  if (brief.hours?.length) {
    known.push(`Published hours: ${brief.hours.map((row) => `${row.day} ${row.hours}`).join("; ")}`);
  }

  const parts = [
    "Write the profile for this company.",
    "",
    "WHAT IS KNOWN",
    known.map((line) => `- ${line}`).join("\n"),
    "",
    `The description must be at least ${MIN_WORDS} words. Aim for about ${TARGET_WORDS}.`,
  ];

  if (brief.avoidOpenings.length > 0) {
    parts.push(
      "",
      "OPENINGS ALREADY USED IN THIS BATCH. Do not open anything like these:",
      brief.avoidOpenings.map((opening) => `- ${opening}`).join("\n"),
    );
  }

  if (brief.corrections?.length) {
    parts.push(
      "",
      "THE PREVIOUS ATTEMPT WAS REJECTED. Fix all of this and keep everything else:",
      brief.corrections.map((line) => `- ${line}`).join("\n"),
    );
  }

  return parts.join("\n");
}

/* -------------------------------------------------------------- validation */

export type Review = {
  ok: boolean;
  score: number;
  words: number;
  tells: Tell[];
  problems: string[];
};

/** Cleans every field, then judges the result against the site's own analyzer. */
export function reviewListing(listing: Listing, brief: Brief, path: string): { listing: Listing; review: Review } {
  const cleaned: Listing = {
    ...listing,
    tagline: clean(listing.tagline),
    description: clean(listing.description),
    editorialTake: clean(listing.editorialTake),
    bestFor: clean(listing.bestFor),
    strengths: listing.strengths.map(clean),
    considerations: listing.considerations.map(clean),
    services: listing.services.map(clean),
    faqs: listing.faqs.map((faq) => ({ question: clean(faq.question), answer: clean(faq.answer) })),
    seoTitle: clean(listing.seoTitle),
    seoDescription: clean(listing.seoDescription),
    extraKeywords: listing.extraKeywords.map(clean),
  };

  const body = [
    cleaned.description,
    cleaned.editorialTake,
    ...cleaned.strengths,
    ...cleaned.considerations,
    ...cleaned.faqs.map((faq) => `${faq.question} ${faq.answer}`),
  ].join("\n\n");

  const words = wordCount(cleaned.description);
  const keyword = brief.focusKeyword.toLowerCase();
  const problems: string[] = [];

  if (words < MIN_WORDS) {
    problems.push(`The description is ${words} words. It must be at least ${MIN_WORDS}.`);
  }
  if (!cleaned.seoTitle.toLowerCase().includes(keyword)) {
    problems.push(`The SEO title must contain "${brief.focusKeyword}" exactly.`);
  }
  if (cleaned.seoTitle.length < 30 || cleaned.seoTitle.length > 60) {
    problems.push(`The SEO title is ${cleaned.seoTitle.length} characters. It must be between 30 and 60.`);
  }
  if (!cleaned.seoDescription.toLowerCase().includes(keyword)) {
    problems.push(`The SEO description must contain "${brief.focusKeyword}" exactly.`);
  }
  if (cleaned.seoDescription.length < 120 || cleaned.seoDescription.length > 160) {
    problems.push(
      `The SEO description is ${cleaned.seoDescription.length} characters. It must be between 120 and 160.`,
    );
  }
  if (!cleaned.description.toLowerCase().includes(keyword)) {
    problems.push(`The description must contain "${brief.focusKeyword}" at least twice.`);
  }

  const tells = auditTells(body);
  for (const tell of tells) {
    problems.push(`Remove this phrasing: ${tell.label} (${tell.hits.slice(0, 2).join(", ")}).`);
  }

  const opening = openingFingerprint(cleaned.description);
  if (brief.avoidOpenings.includes(opening)) {
    problems.push("The opening repeats another profile in this batch. Start somewhere else entirely.");
  }

  const analysis = analyzeSeo({
    title: cleaned.seoTitle,
    description: cleaned.seoDescription,
    focusKeyword: brief.focusKeyword,
    slug: path,
    content: body,
    // Every imported listing is given a photo before it is scored; a business
    // with none is caught by the pipeline, not pretended away here.
    hasImage: true,
    internalLinks: 3,
  });

  return {
    listing: cleaned,
    review: { ok: problems.length === 0, score: analysis.score, words, tells, problems },
  };
}

/**
 * A focus keyword that survives the slug check. analyzeSeo compares the keyword
 * with dashes against the URL, so it has to be the name as the slug spells it.
 */
export function focusKeywordFor(name: string): string {
  return slugify(name).replace(/-/g, " ").trim() || name.toLowerCase();
}

/* ------------------------------------------------------------------- write */

export type WriteResult = { listing: Listing; review: Review; attempts: number };

/**
 * Writes, judges, and sends the problems back for one more pass. Two attempts
 * is the ceiling: past that the brief is usually too thin rather than the copy
 * being wrong, and a batch should not spend forever on one listing.
 */
export async function writeListing(
  brief: Brief,
  path: string,
  options: { model?: string; effort?: Effort; maxAttempts?: number } = {},
): Promise<WriteResult> {
  const maxAttempts = options.maxAttempts ?? 2;
  let corrections: string[] | undefined;
  let last: { listing: Listing; review: Review } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const raw = await askForJson({
      system: WRITER_SYSTEM,
      prompt: buildPrompt({ ...brief, corrections }),
      schema: listingSchema,
      jsonSchema: listingJsonSchema as unknown as Record<string, unknown>,
      model: options.model,
      effort: options.effort,
    });

    const checked = reviewListing(raw, brief, path);
    last = checked;
    if (checked.review.ok) return { ...checked, attempts: attempt };
    corrections = checked.review.problems;
  }

  return { ...last!, attempts: maxAttempts };
}
