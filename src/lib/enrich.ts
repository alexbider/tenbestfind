// Reading one scraped record against another, and against what is already in
// the directory, so the same company does not arrive twice under two
// spellings of its own name.
//
// Finding an address on a website is not here: the crawler reads the contact
// pages anyway, and it scores what it finds against the company's own domain,
// so there is nothing a second pass over the same pages could add.

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
