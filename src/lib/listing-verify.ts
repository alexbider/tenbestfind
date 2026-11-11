import "server-only";
import { z } from "zod";
import { askForJson } from "./anthropic";
import { db } from "./db";
import { checkEmail, domainOf } from "./email-quality";
import { isOwnWebsite, normalizeName, normalizePhone, websiteHost } from "./enrich";
import { parseJson } from "./json";
import { crawlSite, EMPTY_SITE, type SiteData } from "./site-crawl";
import { alertListingFlagged } from "./notify";

/**
 * Checking a paid new listing against the company's own website. The listing
 * is already live (it publishes on payment); this decides whether anyone needs
 * to look at it.
 *
 * Every check is something a reader could confirm in a minute on the site: the
 * name is there, the phone or the email domain is theirs, the site is about the
 * trade they picked, and nobody else already listed that website. A model then
 * reads the same pages for anything a rule cannot see. One doubt and the team
 * is alerted, with the reasons written down; they keep it, or decline it, which
 * takes it down and refunds the payment.
 */

export type CheckResult = { key: string; label: string; ok: boolean; required: boolean; detail: string };
export type AutoReview = {
  verdict: "APPROVED" | "NEEDS_REVIEW";
  checks: CheckResult[];
  checkedAt: string;
  /** An editor's decision on a flagged listing. Null until someone decides. */
  resolution?: { decision: "APPROVED" | "REJECTED"; by: string; at: string } | null;
};

const words = (value: string) => value.split(" ").filter((word) => word.length >= 3);

/** Share of the name's distinctive words that appear on the site (or in its domain). */
export function nameCoverage(name: string, siteText: string, host: string): number {
  const tokens = words(normalizeName(name));
  if (tokens.length === 0) return 0;
  const haystack = ` ${normalizeName(siteText)} `;
  const compactHost = host.replace(/[^a-z0-9]/g, "");
  const found = tokens.filter((token) => haystack.includes(` ${token} `) || compactHost.includes(token));
  return found.length / tokens.length;
}

function stem(word: string) {
  return word.toLowerCase().replace(/(ers|ing|ers|er|s)$/i, "");
}

const aiSchema = z.object({
  sameBusiness: z.boolean(),
  realLocalServiceBusiness: z.boolean(),
  offersTheTrade: z.boolean(),
  concerns: z.array(z.string()),
  blocking: z.boolean(),
  summary: z.string(),
});

const aiJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sameBusiness", "realLocalServiceBusiness", "offersTheTrade", "concerns", "blocking", "summary"],
  properties: {
    sameBusiness: { type: "boolean", description: "The website belongs to the submitted business." },
    realLocalServiceBusiness: {
      type: "boolean",
      description: "A real, operating business that serves customers locally, not a lead-gen site, directory, parked page or template.",
    },
    offersTheTrade: { type: "boolean", description: "The business offers the submitted trade." },
    concerns: { type: "array", items: { type: "string" }, description: "Short, specific doubts. Empty when none." },
    blocking: { type: "boolean", description: "True when any concern should stop automatic publication." },
    summary: { type: "string", description: "One sentence on what the site shows." },
  },
} as const;

const AI_SYSTEM =
  "You check business submissions for a local services directory against the company's own website. Be strict: only confirm what the pages actually show. Unclear is not confirmed.";

async function aiReview(input: {
  name: string;
  trade: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  website: string;
  site: SiteData;
}) {
  return askForJson({
    schema: aiSchema,
    system: AI_SYSTEM,
    effort: "low",
    maxTokens: 2000,
    jsonSchema: aiJsonSchema as unknown as Record<string, unknown>,
    prompt: [
      "SUBMISSION",
      `Business name: ${input.name}`,
      `Trade: ${input.trade}`,
      input.city ? `City: ${input.city}` : "",
      input.phone ? `Phone: ${input.phone}` : "",
      input.email ? `Email: ${input.email}` : "",
      `Website: ${input.website}`,
      input.description ? `Their description: ${input.description.slice(0, 1500)}` : "",
      "",
      "WEBSITE PAGES",
      input.site.summary ? `Summary: ${input.site.summary}` : "",
      input.site.text.slice(0, 18_000),
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

/** Runs every check for one listing. Never throws: a failure becomes a failed check. */
export async function checkListing(businessId: string): Promise<CheckResult[]> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: { category: true, city: true },
  });
  if (!business) return [{ key: "exists", label: "Listing exists", ok: false, required: true, detail: "Not found." }];

  const checks: CheckResult[] = [];
  const add = (key: string, label: string, ok: boolean, detail: string, required = true) =>
    checks.push({ key, label, ok, required, detail });

  const host = websiteHost(business.website);
  const own = isOwnWebsite(business.website);
  let site: SiteData = EMPTY_SITE;
  if (own) site = await crawlSite(business.website).catch(() => EMPTY_SITE);
  add(
    "website",
    "Has its own working website",
    own && site.pagesRead > 0,
    !business.website
      ? "No website was given."
      : !own
        ? `${host} is a profile on another platform, not the company's own site.`
        : site.pagesRead > 0
          ? `Read ${site.pagesRead} page${site.pagesRead === 1 ? "" : "s"} on ${host}.`
          : `${host} could not be read.`,
  );

  const text = `${site.summary ?? ""} ${site.text}`;
  const readable = site.pagesRead > 0;

  const coverage = readable ? nameCoverage(business.name, text, host) : 0;
  add(
    "name",
    "Business name appears on the site",
    coverage >= 0.75,
    readable ? `${Math.round(coverage * 100)}% of the name's words found.` : "Site not read.",
  );

  const phone = normalizePhone(business.phone);
  const sitePhones = site.phones.map(normalizePhone);
  const phoneOk = phone.length >= 10 && (sitePhones.includes(phone) || text.replace(/\D+/g, "").includes(phone));
  const emailVerdict = business.email ? checkEmail(business.email, host || null) : null;
  const emailDomainOk = Boolean(business.email && host && domainOf(business.email) === host && emailVerdict?.ok);
  const emailOnSite = Boolean(business.email && site.emails.map((e) => e.toLowerCase()).includes(business.email.toLowerCase()));
  add(
    "contact",
    "Phone or email matches the site",
    phoneOk || emailDomainOk || emailOnSite,
    [
      phone ? (phoneOk ? "Phone found on the site." : "Phone not found on the site.") : "No phone given.",
      business.email
        ? emailDomainOk
          ? "Email is on the site's own domain."
          : emailOnSite
            ? "Email is listed on the site."
            : "Email is not on the site's domain."
        : "No email given.",
    ].join(" "),
  );

  const tradeTerms = [business.category.name, business.category.singular, business.category.serviceName]
    .flatMap((term) => term.split(/\s+/))
    .map(stem)
    .filter((term) => term.length >= 3);
  const lowered = text.toLowerCase();
  const tradeOk = readable && tradeTerms.some((term) => lowered.includes(term));
  add(
    "trade",
    `Site is about ${business.category.serviceName.toLowerCase()}`,
    tradeOk,
    readable ? (tradeOk ? "Trade words found on the site." : "No mention of the trade found.") : "Site not read.",
  );

  const cityName = business.city?.name ?? null;
  add(
    "location",
    "City is mentioned on the site",
    Boolean(cityName && readable && lowered.includes(cityName.toLowerCase())),
    cityName ? `Looked for "${cityName}".` : "No city on the listing.",
    false,
  );

  const duplicates = host
    ? await db.business.findMany({
        where: { id: { not: business.id }, website: { contains: host }, status: { in: ["PUBLISHED", "PENDING"] } },
        select: { name: true, status: true },
        take: 3,
      })
    : [];
  const sameName = await db.business.findMany({
    where: { id: { not: business.id }, cityId: business.cityId, status: "PUBLISHED" },
    select: { name: true },
  });
  const nameClash = sameName.filter((other) => normalizeName(other.name) === normalizeName(business.name));
  add(
    "duplicate",
    "Not already listed",
    duplicates.length === 0 && nameClash.length === 0,
    duplicates.length || nameClash.length
      ? `Also listed: ${[...duplicates, ...nameClash].map((other) => other.name).join(", ")}.`
      : "No other listing uses this website or name in this city.",
  );

  if (readable && own) {
    try {
      const ai = await aiReview({
        name: business.name,
        trade: business.category.serviceName,
        city: cityName,
        phone: business.phone,
        email: business.email,
        description: business.description,
        website: business.website!,
        site,
      });
      const ok = ai.sameBusiness && ai.realLocalServiceBusiness && ai.offersTheTrade && !ai.blocking;
      add("ai", "AI review of the website", ok, [ai.summary, ...ai.concerns].join(" ").slice(0, 600));
    } catch (error) {
      add("ai", "AI review of the website", false, `Could not run: ${error instanceof Error ? error.message : "unknown error"}.`);
    }
  } else {
    add("ai", "AI review of the website", false, "Skipped: no readable website.");
  }

  return checks;
}

/** The BUSINESS submission that carries a listing's form data and its review. */
async function submissionFor(businessId: string) {
  return db.submission.findFirst({
    where: { kind: "BUSINESS", payload: { contains: `"businessId":"${businessId}"` } },
    orderBy: { createdAt: "desc" },
  });
}

export async function autoReviewFor(businessId: string): Promise<AutoReview | null> {
  const submission = await submissionFor(businessId);
  const payload = parseJson<{ autoReview?: AutoReview }>(submission?.payload ?? null, {});
  return payload.autoReview ?? null;
}

async function saveReview(businessId: string, review: AutoReview, status: string) {
  const submission = await submissionFor(businessId);
  if (!submission) return;
  const payload = parseJson<Record<string, unknown>>(submission.payload, {});
  await db.submission.update({
    where: { id: submission.id },
    data: { payload: JSON.stringify({ ...payload, autoReview: review }), status },
  });
}

/**
 * Checks one paid listing against its website and records the outcome. A clean
 * result closes the matter; anything doubtful is flagged for the team (shown on
 * the admin dashboard and emailed) without taking the listing down. Publishing
 * happens at payment, not here.
 */
export async function reviewListing(businessId: string): Promise<AutoReview> {
  const checks = await checkListing(businessId);
  const passed = checks.every((check) => check.ok || !check.required);
  const business = await db.business.findUnique({ where: { id: businessId } });

  const review: AutoReview = {
    verdict: passed ? "APPROVED" : "NEEDS_REVIEW",
    checks,
    checkedAt: new Date().toISOString(),
    resolution: null,
  };
  await saveReview(businessId, review, passed ? "RESOLVED" : "IN_REVIEW");

  const failed = checks.filter((check) => check.required && !check.ok);
  await db.auditLog.create({
    data: {
      action: "review",
      entityType: "business",
      entityId: businessId,
      summary: passed
        ? `${business?.name ?? businessId} passed every website check`
        : `${business?.name ?? businessId} flagged for review: ${failed.map((check) => check.label).join(", ")}`,
    },
  });

  if (!passed && business) {
    await alertListingFlagged({
      businessName: business.name,
      businessId,
      live: business.status === "PUBLISHED",
      problems: failed.map((check) => `${check.label}: ${check.detail}`),
    }).catch(() => null);
  }
  return review;
}

/** An editor's decision on a flagged listing, kept with the review it settles. */
export async function resolveReview(businessId: string, decision: "APPROVED" | "REJECTED", by: string) {
  const current = await autoReviewFor(businessId);
  if (!current) return;
  await saveReview(
    businessId,
    { ...current, resolution: { decision, by, at: new Date().toISOString() } },
    "RESOLVED",
  );
}

/** Flagged listings nobody has decided on yet, newest first. */
export async function flaggedListings(): Promise<{ id: string; name: string }[]> {
  const open = await db.submission.findMany({
    where: { kind: "BUSINESS", status: "IN_REVIEW" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const ids = open
    .map((row) => parseJson<{ businessId?: string; autoReview?: AutoReview }>(row.payload, {}))
    .filter((payload) => payload.autoReview?.verdict === "NEEDS_REVIEW" && !payload.autoReview.resolution && payload.businessId)
    .map((payload) => payload.businessId as string);
  if (ids.length === 0) return [];
  return db.business.findMany({
    where: { id: { in: ids }, status: { in: ["PUBLISHED", "PENDING"] } },
    select: { id: true, name: true },
  });
}

/**
 * The next paid new listing that has not been checked yet: live (published on
 * payment) or still pending, with an ACTIVE Directory Listing subscription.
 */
export async function nextListingToReview(): Promise<string | null> {
  const candidates = await db.business.findMany({
    where: {
      status: { in: ["PUBLISHED", "PENDING"] },
      subscriptions: { some: { status: "ACTIVE", plan: { key: "listing" } } },
    },
    orderBy: { submittedAt: "asc" },
    select: { id: true },
    take: 40,
  });
  for (const candidate of candidates) {
    const submission = await submissionFor(candidate.id);
    if (!submission) continue;
    if (!(await autoReviewFor(candidate.id))) return candidate.id;
  }
  return null;
}
