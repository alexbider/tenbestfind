import { z } from "zod";
import { askForJson, type Effort } from "./anthropic";
import type { SiteData } from "./site-crawl";

// Reading a crawled website for the facts a listing is missing.
//
// The crawler already finds what a parser can find: a logo, images, social
// links, a founding year in the prose. This is the second pass, for the things
// that only make sense to a reader: who works there, what the warranty actually
// covers, which of the trade's jobs this company takes.
//
// Everything here is a claim the company makes about itself. It is stored as
// such, and the profile labels it that way.

const staffSchema = z.object({
  name: z.string().min(2).max(120),
  role: z.string().max(120).nullable(),
  bio: z.string().max(600).nullable(),
  yearsExperience: z.number().int().min(0).max(80).nullable(),
  credentials: z.array(z.string().min(2).max(120)).max(6),
});

export const extractionSchema = z.object({
  staff: z.array(staffSchema).max(12),
  yearFounded: z.number().int().min(1850).max(2100).nullable(),
  employeeCount: z.string().max(60).nullable(),
  licenseNumbers: z.array(z.string().min(3).max(40)).max(4),
  certifications: z.array(z.string().min(3).max(90)).max(10),
  paymentMethods: z.array(z.string().min(2).max(40)).max(10),
  awards: z.array(z.string().min(4).max(120)).max(8),
  brands: z.array(z.string().min(2).max(60)).max(12),
  insured: z.boolean().nullable(),
  warrantyTerms: z.string().max(200).nullable(),
  services: z.array(z.string().min(3).max(70)).max(20),
  areasServed: z.array(z.string().min(2).max(60)).max(30),
  emergency: z.boolean().nullable(),
  financing: z.boolean().nullable(),
  freeEstimates: z.boolean().nullable(),
  phone: z.string().max(40).nullable(),
  addressLine: z.string().max(200).nullable(),
  summary: z.string().max(600).nullable(),
});

export type Extraction = z.infer<typeof extractionSchema>;

const nullableString = (description: string, maxLength: number) => ({
  type: ["string", "null"],
  maxLength,
  description,
});

const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "staff",
    "yearFounded",
    "employeeCount",
    "licenseNumbers",
    "certifications",
    "paymentMethods",
    "awards",
    "brands",
    "insured",
    "warrantyTerms",
    "services",
    "areasServed",
    "emergency",
    "financing",
    "freeEstimates",
    "phone",
    "addressLine",
    "summary",
  ],
  properties: {
    staff: {
      type: "array",
      maxItems: 12,
      description:
        "Named people the site introduces: the owner, the founder, tradespeople, an office manager. Only real names actually on the page. Never invent one, and never turn a department into a person.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "role", "bio", "yearsExperience", "credentials"],
        properties: {
          name: { type: "string", description: "As written on the page." },
          role: nullableString("Their job title as the site gives it.", 120),
          bio: nullableString(
            "Two or three sentences, rewritten in plain third person. Not copied from the page.",
            600,
          ),
          yearsExperience: {
            type: ["integer", "null"],
            description: "Only when the page states it.",
          },
          credentials: {
            type: "array",
            maxItems: 6,
            items: { type: "string" },
            description: "Licences or certifications named against this person.",
          },
        },
      },
    },
    yearFounded: { type: ["integer", "null"], description: "Only when the site states it." },
    employeeCount: nullableString("A range if given, for example '10 to 20'.", 60),
    licenseNumbers: {
      type: "array",
      maxItems: 4,
      items: { type: "string" },
      description: "Licence or registration numbers printed on the site.",
    },
    certifications: {
      type: "array",
      maxItems: 10,
      items: { type: "string" },
      description:
        "Named accreditations and certifications the site claims, as they are written: 'GAF Master Elite', 'BBB Accredited Business', 'NATE certified', 'IICRC certified'. Names only, no sentences, and nothing that is merely a brand they stock.",
    },
    paymentMethods: {
      type: "array",
      maxItems: 10,
      items: { type: "string" },
      description: "How they say they take payment: 'Visa', 'Cash', 'Financing', 'Cheque'.",
    },
    awards: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
      description: "Awards with the year where the site gives one, for example 'Angi Super Service Award 2023'.",
    },
    brands: {
      type: "array",
      maxItems: 12,
      items: { type: "string" },
      description: "Manufacturers they install, carry or are certified for.",
    },
    insured: {
      type: ["boolean", "null"],
      description: "True only if the site says they are insured or bonded.",
    },
    warrantyTerms: nullableString(
      "What they warranty and for how long, in a short phrase such as '10-year workmanship warranty'.",
      200,
    ),
    services: {
      type: "array",
      maxItems: 20,
      items: { type: "string" },
      description: "The jobs they say they do, as short noun phrases.",
    },
    areasServed: {
      type: "array",
      maxItems: 30,
      items: { type: "string" },
      description: "Town, city or neighbourhood names they say they cover. Names only, no counties.",
    },
    emergency: { type: ["boolean", "null"], description: "True only if they advertise emergency or 24-hour call-outs." },
    financing: { type: ["boolean", "null"], description: "True only if they advertise financing or payment plans." },
    freeEstimates: { type: ["boolean", "null"], description: "True only if they advertise free estimates or quotes." },
    phone: nullableString("The main number, as printed.", 40),
    addressLine: nullableString("The street address, without the city and postcode.", 200),
    summary: nullableString(
      "Two or three sentences describing what the company does, written in plain third person rather than copied from the site.",
      600,
    ),
  },
} as const;

const SYSTEM = `You read a small-business website and report only what it actually says.

RULES
- Report nothing that is not on the pages you were given. A field with no evidence is null, or an empty array.
- Never guess a name, a licence number, a year or a warranty. A missing fact is more useful than an invented one.
- A department, a phone extension or a stock-photo caption is not a person. Only report someone the site names as a person.
- Rewrite bios and the summary in your own plain words. Do not copy sentences from the site, and do not carry over its marketing voice.
- Never use an em dash or an en dash.
- Services and areas are short plain names, not sentences.
- The three booleans are true only when the site advertises that thing. Absence of a claim is null, not false.`;

/**
 * Reads the pages the crawler collected. Returns null when there is not enough
 * text to be worth a call, which is the common case for a one-page brochure
 * site behind a script.
 */
export async function extractFromSite(
  business: { name: string; city: string | null; trade: string },
  site: SiteData,
  options: { model?: string; effort?: Effort } = {},
): Promise<Extraction | null> {
  const text = site.text.trim();
  if (text.length < 400) return null;

  const known = [
    `Company: ${business.name}`,
    business.city ? `City: ${business.city}` : "",
    `Trade: ${business.trade}`,
    site.summary ? `Their own summary: ${site.summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = [
    "Read these pages from one company's website and report what they say.",
    "",
    known,
    "",
    "PAGES",
    text.slice(0, 24_000),
  ].join("\n");

  return askForJson({
    system: SYSTEM,
    prompt,
    schema: extractionSchema,
    jsonSchema: extractionJsonSchema,
    model: options.model,
    effort: options.effort ?? "low",
    maxTokens: 8000,
  });
}
