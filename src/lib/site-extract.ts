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

// A fact the site does not state comes back as an empty string, a zero or
// "unknown" rather than as null.
//
// That is not a style choice. The tool schema is sent to the model as JSON
// Schema, and a nullable field there is a union type; past about twenty of
// them the API refuses the request outright, which is what a profile this
// wide would hit. So the wire format carries a sentinel and these three
// helpers turn it back into the null the rest of the code expects. Each one
// also tolerates a model that ignores the instruction and sends null anyway.

const optionalText = (max: number) =>
  z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim() : ""),
      z.string().max(max),
    )
    .transform((value) => (value.length > 0 ? value : null));

const optionalNumber = (min: number, max: number) =>
  z
    .preprocess(
      (value) => (typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0),
      z.number().int(),
    )
    .transform((value) => (value >= min && value <= max ? value : null));

/** A yes/no the site may simply not make, which is different from a no. */
const claim = z
  .preprocess(
    (value) => {
      if (typeof value === "boolean") return value ? "yes" : "no";
      if (typeof value === "string" && ["yes", "no", "unknown"].includes(value.toLowerCase())) {
        return value.toLowerCase();
      }
      return "unknown";
    },
    z.enum(["yes", "no", "unknown"]),
  )
  .transform((value) => (value === "unknown" ? null : value === "yes"));

const staffSchema = z.object({
  name: z.string().min(2).max(120),
  role: optionalText(120),
  bio: optionalText(600),
  yearsExperience: optionalNumber(1, 80),
  credentials: z.array(z.string().min(2).max(120)).max(6),
});

export const extractionSchema = z.object({
  staff: z.array(staffSchema).max(12),
  yearFounded: optionalNumber(1850, 2100),
  employeeCount: optionalText(60),
  licenseNumbers: z.array(z.string().min(3).max(40)).max(4),
  certifications: z.array(z.string().min(3).max(90)).max(10),
  paymentMethods: z.array(z.string().min(2).max(40)).max(10),
  awards: z.array(z.string().min(4).max(120)).max(8),
  brands: z.array(z.string().min(2).max(60)).max(12),
  insured: claim,
  warrantyTerms: optionalText(200),
  services: z.array(z.string().min(3).max(70)).max(24),
  specialties: z.array(z.string().min(3).max(60)).max(8),
  areasServed: z.array(z.string().min(2).max(60)).max(30),
  serviceRadiusKm: optionalNumber(1, 400),
  hours: z
    .array(
      z.object({
        day: z.string().min(3).max(12),
        opens: optionalText(8),
        closes: optionalText(8),
        closed: z.boolean(),
      }),
    )
    .max(7),
  bbbRating: optionalText(4),
  bbbAccreditedSince: optionalNumber(1900, 2100),
  inspectionFee: optionalText(120),
  manufacturerWarranty: optionalText(160),
  bestFor: optionalText(90),
  tagline: optionalText(120),
  postalCode: optionalText(12),
  emergency: claim,
  financing: claim,
  freeEstimates: claim,
  phone: optionalText(40),
  email: optionalText(120),
  addressLine: optionalText(200),
  summary: optionalText(600),
});

export type Extraction = z.infer<typeof extractionSchema>;

// The wire shapes for the three sentinels. None of them is a union type, which
// is the whole point: the API rejects a schema carrying more than a couple of
// dozen of those, and this one describes a whole company profile.
const optionalStringField = (description: string, maxLength: number) => ({
  type: "string",
  maxLength,
  description: `${description} Empty string if the site does not say.`,
});

const optionalNumberField = (description: string) => ({
  type: "integer",
  description: `${description} Use 0 if the site does not say.`,
});

const claimField = (description: string) => ({
  type: "string",
  enum: ["yes", "no", "unknown"],
  description: `${description} "unknown" when the site makes no such claim, which is not the same as "no".`,
});

export const extractionJsonSchema = {
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
    "specialties",
    "areasServed",
    "serviceRadiusKm",
    "hours",
    "bbbRating",
    "bbbAccreditedSince",
    "inspectionFee",
    "manufacturerWarranty",
    "bestFor",
    "tagline",
    "postalCode",
    "emergency",
    "financing",
    "freeEstimates",
    "phone",
    "email",
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
          role: optionalStringField("Their job title as the site gives it.", 120),
          bio: optionalStringField(
            "Two or three sentences, rewritten in plain third person. Not copied from the page.",
            600,
          ),
          yearsExperience: optionalNumberField("Years of experience this person has."),
          credentials: {
            type: "array",
            maxItems: 6,
            items: { type: "string" },
            description: "Licences or certifications named against this person.",
          },
        },
      },
    },
    yearFounded: optionalNumberField("The year the company was founded."),
    employeeCount: optionalStringField("A range if given, for example '10 to 20'.", 60),
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
    insured: claimField("Whether the site says they are insured or bonded."),
    warrantyTerms: optionalStringField(
      "What they warranty and for how long, in a short phrase such as '10-year workmanship warranty'.",
      200,
    ),
    services: {
      type: "array",
      maxItems: 24,
      items: { type: "string" },
      description:
        "Every job they say they do, as short noun phrases: one per service, taken from the services menu and the service pages, not only the three on the home page.",
    },
    specialties: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
      description:
        "The work they present themselves as specialists in, where the site singles something out: 'storm damage', 'standing seam metal', 'insurance restoration'. Empty when the site makes no such claim.",
    },
    serviceRadiusKm: optionalNumberField(
      "How far they say they travel from their base, in kilometres. Convert from miles when the site uses miles.",
    ),
    hours: {
      type: "array",
      maxItems: 7,
      description:
        "Opening hours, one row per day the site lists. Times in 24-hour HH:MM. A day the site marks closed has closed true and null times. Empty when the site gives no hours.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day", "opens", "closes", "closed"],
        properties: {
          day: { type: "string", description: "The full English day name, for example 'Monday'." },
          opens: optionalStringField("Opening time as HH:MM.", 8),
          closes: optionalStringField("Closing time as HH:MM.", 8),
          closed: { type: "boolean", description: "True when the site says they are closed that day." },
        },
      },
    },
    bbbRating: optionalStringField(
      "Their Better Business Bureau grade if the site shows one, as the grade alone: 'A+', 'B'.",
      4,
    ),
    bbbAccreditedSince: optionalNumberField("The year BBB accreditation started."),
    inspectionFee: optionalStringField(
      "What they say an inspection, estimate or call-out costs, in a short phrase such as 'Free, including storm inspections' or '$89, credited against the work'.",
      120,
    ),
    manufacturerWarranty: optionalStringField(
      "The materials or manufacturer warranty, which is separate from their own workmanship warranty. A short phrase such as 'Up to 50 years by system'.",
      160,
    ),
    bestFor: optionalStringField(
      "The one job this company is most clearly set up for, as a short phrase in lower case such as 'residential roof replacement'. Null unless the site makes it obvious.",
      90,
    ),
    tagline: optionalStringField("Their own strapline, as printed, when they have one.", 120),
    postalCode: optionalStringField("The postcode or ZIP of the address, alone.", 12),
    areasServed: {
      type: "array",
      maxItems: 30,
      items: { type: "string" },
      description: "Town, city or neighbourhood names they say they cover. Names only, no counties.",
    },
    emergency: claimField("Whether they advertise emergency or 24-hour call-outs."),
    financing: claimField("Whether they advertise financing or payment plans."),
    freeEstimates: claimField("Whether they advertise free estimates or quotes."),
    phone: optionalStringField("The main number, as printed.", 40),
    email: optionalStringField(
      "The address they ask people to write to, as printed. Read one written to defeat a scraper, such as \"info (at) company (dot) com\", back into an ordinary address. Never invent a local part for a domain.",
      120,
    ),
    addressLine: optionalStringField("The street address, without the city and postcode.", 200),
    summary: optionalStringField(
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
- A fact the site does not state is an empty string, a 0, or "unknown". Never null, and never a guess.
- The yes/no fields are "yes" only when the site advertises that thing. If it says nothing, that is "unknown", not "no".
- List every service the site offers, not a sample. Look at the services menu and the service pages, not only the home page.
- Specialties are what the site singles out as its own strength. If it singles nothing out, return an empty array rather than repeating the service list.
- A distance, a warranty length, a grade or a fee is reported only when the site prints it.`;

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
