import { promises as dns } from "node:dns";

/**
 * Whether an address is this company's address.
 *
 * Enrichment reads a company's website and keeps the first thing that looks
 * like an email. What it kept included press@google.com off an embedded map,
 * admin@seocompanysantamonica.com out of the footer credit, and a run of
 * addresses that were never addresses at all: are@risk.if, find@times.fortunately,
 * soundly@night.we. Those last are a sentence with a full stop in it, read by
 * a regular expression that does not know what a sentence is.
 *
 * So there are two gates. This module holds the cheap one, which needs no
 * network and can run while a page renders, and the expensive one, which asks
 * DNS whether the domain exists and is for the cleanup script and enrichment.
 */

/** Domains that are never a company's own contact address. */
export const BLOCKED_DOMAINS = new Set([
  "google.com",
  "googlemail.com",
  "example.com",
  "example.org",
  "example.net",
  "domain.com",
  "email.com",
  "sentry.io",
  "wixpress.com",
  "wix.com",
  "godaddy.com",
  "squarespace.com",
  "shopify.com",
  "cloudflare.com",
  "wordpress.com",
  "sentry.wixpress.com",
]);

/**
 * Fragments that mark a domain as the agency that built the site rather than
 * the company the site is about. A match is reported, not deleted silently:
 * a real plumber can be called seoplumbing.com and the name alone cannot
 * settle it.
 */
export const AGENCY_MARKERS = [
  "seocompany",
  "seoagency",
  "webdesign",
  "webdesigner",
  "websitedesign",
  "digitalagency",
  "marketingagency",
  "webagency",
];

/**
 * Words that start a sentence rather than an address.
 *
 * "...fixtures once. This..." parsed as fixtures@once.this. The tell is the
 * local part: a real address is a name, an initial or a role, not a verb or a
 * preposition sitting mid-sentence.
 */
const PROSE_LOCAL_PARTS = new Set([
  "are", "is", "was", "were", "be", "been", "being",
  "find", "found", "fixtures", "soundly", "help", "call", "visit", "see",
  "the", "this", "that", "these", "those", "and", "but", "or", "if", "when",
  "we", "you", "they", "it", "he", "she", "i",
  "once", "after", "before", "during", "while", "because", "so", "then",
  "available", "please", "just", "only", "also", "however", "fortunately",
]);

/**
 * Top level domains that exist but almost never carry a company's contact
 * address, and which prose produces by accident. ".if" and ".we" are not real
 * TLDs at all; ".this" and ".fortunately" are the same accident.
 */
const SENTENCE_TLDS = /\.(if|we|this|that|fortunately|available|once|soundly|it)$/i;

const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailVerdict =
  | { ok: true; email: string }
  | { ok: false; reason: string; review?: boolean };

/** The part after the @, lowercased. */
export function domainOf(email: string): string {
  return email.split("@")[1]?.trim().toLowerCase() ?? "";
}

/**
 * Everything that can be decided without asking the network.
 *
 * `siteDomain` is the company's own website host when we know it. An address
 * on that domain is the one we want, so it skips the prose check: a company at
 * findpros.com can perfectly well use find@findpros.com.
 */
export function checkEmail(raw: string | null | undefined, siteDomain?: string | null): EmailVerdict {
  const email = (raw ?? "").trim().toLowerCase();
  if (!email) return { ok: false, reason: "empty" };
  if (!SHAPE.test(email)) return { ok: false, reason: "not the shape of an address" };

  const domain = domainOf(email);
  const local = email.split("@")[0] ?? "";
  const own = (siteDomain ?? "").replace(/^www\./, "").toLowerCase();
  const onOwnDomain = Boolean(own) && (domain === own || domain.endsWith(`.${own}`));

  if (BLOCKED_DOMAINS.has(domain)) return { ok: false, reason: `${domain} is never a company address` };

  if (SENTENCE_TLDS.test(domain)) {
    return { ok: false, reason: `${domain} is prose that was read as a domain` };
  }

  if (!onOwnDomain && PROSE_LOCAL_PARTS.has(local)) {
    return { ok: false, reason: `"${local}@" is a word from the page, not a mailbox` };
  }

  // A phone number with a domain glued to it, as in
  // waterworks@614-490-2149.available.
  if (/^\d[\d-]{6,}/.test(domain)) {
    return { ok: false, reason: "the domain is a phone number" };
  }

  const marker = AGENCY_MARKERS.find((needle) => domain.includes(needle));
  if (marker && !onOwnDomain) {
    return { ok: false, reason: `${domain} looks like the agency that built the site`, review: true };
  }

  return { ok: true, email };
}

/** The synchronous gate, for anywhere that cannot wait on DNS. */
export function isPublishableEmail(raw: string | null | undefined, siteDomain?: string | null): boolean {
  return checkEmail(raw, siteDomain).ok;
}

/**
 * The same checks, plus asking DNS whether anything is actually there.
 *
 * MX first, because that is what a mail server publishes. A domain with only
 * an A record still accepts mail by the old rules, so that counts too.
 */
export async function verifyEmail(
  raw: string | null | undefined,
  siteDomain?: string | null,
): Promise<EmailVerdict> {
  const verdict = checkEmail(raw, siteDomain);
  if (!verdict.ok) return verdict;

  const domain = domainOf(verdict.email);
  try {
    const mx = await dns.resolveMx(domain);
    if (mx.length > 0) return verdict;
  } catch {
    // No MX is not fatal on its own, so fall through to the A lookup.
  }

  try {
    const a = await dns.resolve4(domain);
    if (a.length > 0) return verdict;
  } catch {
    // Nothing there.
  }

  return { ok: false, reason: `${domain} does not resolve` };
}
