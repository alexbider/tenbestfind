// Finding a business's main contact address when the Google profile does not
// carry one. It reads the site's own pages only, follows nothing off-domain,
// and gives up quickly: a listing without an email is better than a slow batch.

import { plausibleEmail } from "./emails";

const CANDIDATE_PATHS = ["", "/contact", "/contact-us", "/about", "/about-us", "/get-a-quote", "/quote"];
const TIMEOUT_MS = 8000;
const MAX_BYTES = 400_000;

// Addresses that belong to a platform rather than the business.
const JUNK_DOMAINS = [
  "example.com",
  "sentry.io",
  "wixpress.com",
  "godaddy.com",
  "squarespace.com",
  "wordpress.com",
  "shopify.com",
  "cloudflare.com",
  "google.com",
  "facebook.com",
  "gstatic.com",
  "schema.org",
  "w3.org",
  "sentry-next.wixpress.com",
];

const JUNK_LOCAL = ["noreply", "no-reply", "donotreply", "postmaster", "abuse", "webmaster@wix"];

// Image and asset names routinely parse as addresses without the extension guard.
const ASSET_SUFFIX = /\.(png|jpe?g|gif|webp|svg|css|js|woff2?|ico)$/i;

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi;

/** Ranks candidates so info@ or contact@ wins over a personal address. */
function score(email: string, siteHost: string | null): number {
  const [local, domain] = email.split("@");
  let value = 0;
  if (siteHost && domain.endsWith(siteHost.replace(/^www\./, ""))) value += 50;
  if (/^(info|contact|hello|enquiries|inquiries|office|sales|admin|service|support)$/i.test(local)) value += 20;
  if (/^(help|team|mail|reception|bookings|estimates|quotes)$/i.test(local)) value += 12;
  if (local.includes(".")) value += 4; // firstname.lastname reads as a real person
  if (/gmail|yahoo|hotmail|outlook|aol|icloud/i.test(domain)) value -= 8;
  return value;
}

function usable(email: string): boolean {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split("@");
  if (!local || !domain) return false;
  // One rule for what counts as a real address, shared with the crawler, so
  // the fallback path cannot let through something the main one rejects.
  if (!plausibleEmail(lower)) return false;
  if (JUNK_LOCAL.some((junk) => local.startsWith(junk))) return false;
  if (JUNK_DOMAINS.some((junk) => domain === junk || domain.endsWith(`.${junk}`))) return false;
  if (domain.length > 60 || local.length > 64) return false;
  return true;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Identifying the crawler is the polite thing to do and lets a site
        // block it in robots.txt if it would rather not be read.
        "user-agent": "TenBestFindBot/1.0 (+https://tenbestfind.com/how-we-rank/)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("html")) return null;
    const body = await response.text();
    return body.slice(0, MAX_BYTES);
  } catch {
    return null;
  }
}

export type EmailFind = { email: string; source: "gmb" | "website" } | null;

/**
 * Tries the address Google already published, then the business's own site.
 * Stops at the first page that yields a usable address.
 */
export async function findEmail(input: { gmbEmail: string | null; website: string | null }): Promise<EmailFind> {
  if (input.gmbEmail && usable(input.gmbEmail)) {
    return { email: input.gmbEmail.toLowerCase(), source: "gmb" };
  }
  if (!input.website) return null;

  let base: URL;
  try {
    base = new URL(input.website.startsWith("http") ? input.website : `https://${input.website}`);
  } catch {
    return null;
  }
  if (base.protocol !== "http:" && base.protocol !== "https:") return null;

  const host = base.hostname;
  const seen = new Set<string>();

  for (const path of CANDIDATE_PATHS) {
    const html = await fetchText(new URL(path, base).toString());
    if (!html) continue;

    // mailto links first: they are deliberate, unlike an address in body text.
    const mailtos = [...html.matchAll(/mailto:([^"'?>\s]+)/gi)].map((match) => match[1]);
    const inline = html.match(EMAIL) ?? [];

    for (const candidate of [...mailtos, ...inline]) {
      const email = decodeURIComponent(candidate).toLowerCase().replace(/[.,;:)]+$/, "");
      if (!usable(email) || seen.has(email)) continue;
      seen.add(email);
    }

    if (seen.size > 0) {
      const best = [...seen].sort((a, b) => score(b, host) - score(a, host))[0];
      return { email: best, source: "website" };
    }
  }

  return null;
}

/* --------------------------------------------------------------- duplicates */

/** Strips the noise that makes the same company look like two records. */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b(the|inc|llc|ltd|limited|corp|corporation|co|company|services|service|group|plc|pty|gmbh)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeAddress(value: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/\b(street|st|road|rd|avenue|ave|drive|dr|boulevard|blvd|lane|ln|suite|ste|unit|#)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Bare host, so http://www.x.com/ and https://x.com match. */
export function websiteHost(value: string | null): string {
  if (!value) return "";
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Hosts that are somebody's profile on somebody else's platform. Google often
 * gives one of these as a company's "website", and a listing built from one has
 * no email to find, no description to read and no photos of its own, which is
 * exactly what the import gate exists to keep out.
 */
const NOT_A_WEBSITE =
  /^(m\.)?(facebook|instagram|twitter|x|tiktok|linkedin|pinterest|youtube|yelp|nextdoor|angi|angieslist|homeadvisor|thumbtack|houzz|porch|bark|checkatrade|trustpilot|bbb|mapquest|foursquare|linktr)\.(com|co|ee|org|net|uk)$/i;

/** True when the address is the company's own site rather than a profile on one. */
export function isOwnWebsite(value: string | null): boolean {
  const host = websiteHost(value);
  return host.length > 0 && !NOT_A_WEBSITE.test(host);
}

export function normalizePhone(value: string | null): string {
  if (!value) return "";
  const digits = value.replace(/\D+/g, "");
  // Compare the last ten digits so a country prefix does not split a match.
  return digits.length >= 10 ? digits.slice(-10) : digits;
}
