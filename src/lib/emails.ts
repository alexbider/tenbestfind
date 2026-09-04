// Finding a company's email address on a page that often does not want to give
// it up.
//
// A mailto link is the easy case and the one every crawler already handles. The
// addresses that get missed are the ones written to defeat exactly that: typed
// as plain text, spelled out as "info (at) company (dot) com", encoded as HTML
// entities, or scrambled by Cloudflare's email protection. All four are
// recoverable, and between them they account for most of the sites that look
// like they publish no address at all.
//
// Everything found is scored rather than taken in the order it was met, because
// a page usually carries several: the one that matters is the company's own,
// not the theme author's or the privacy contact for a cookie banner.

export type EmailFind = { email: string; score: number };

/** Local parts nobody wants a quote request going to. */
const JUNK_LOCAL =
  /^(noreply|no-reply|donotreply|do-not-reply|postmaster|webmaster|hostmaster|abuse|privacy|dpo|gdpr|unsubscribe|bounce|mailer-daemon|wordpress|sentry|example|test|your|youremail|name|user|username|email|firstname|lastname)$/i;

/** Domains that belong to the tooling rather than the company. */
const JUNK_DOMAIN =
  /(^|\.)(example|domain|yourdomain|yoursite|mysite|email|sentry\.io|wixpress\.com|godaddy\.com|squarespace\.com|w3\.org|schema\.org|sentry-cdn\.com|wp\.com|gravatar\.com)(\.|$)/i;

/** An image or asset filename that happens to contain an @. */
const ASSET_LIKE = /@\d+x|\.(png|jpe?g|gif|svg|webp|avif|css|js|woff2?|ttf|ico)$/i;

/** The addresses a business actually answers, best first. */
const CONTACT_LOCAL = [
  "info",
  "contact",
  "hello",
  "office",
  "sales",
  "enquiries",
  "inquiries",
  "estimates",
  "quotes",
  "service",
  "admin",
  "support",
  "team",
  "mail",
];

/** Where a small trade often keeps its only address. */
const FREE_PROVIDER =
  /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|aol|icloud|me|mac|comcast|verizon|att|sbcglobal|bellsouth|cox|charter|rogers|shaw|sympatico|telus|bell)\./i;

const ENTITIES: [RegExp, string][] = [
  [/&#0*64;|&#x0*40;|&commat;/gi, "@"],
  [/&#0*46;|&#x0*2e;|&period;/gi, "."],
  [/&#0*45;|&#x0*2d;/gi, "-"],
  [/&#0*95;|&#x0*5f;/gi, "_"],
  [/&amp;/gi, "&"],
];

/**
 * The whole address in one match, however it is written. The separators are
 * matched in place rather than by rewriting the page first, which is what stops
 * an ordinary sentence with the word "at" in it turning into nonsense.
 */
const EMAIL_ANYWHERE = new RegExp(
  [
    "([a-z0-9][a-z0-9._%+-]{0,63})",
    "\\s*(?:@|\\[\\s*at\\s*\\]|\\(\\s*at\\s*\\)|\\{\\s*at\\s*\\}|\\s+at\\s+)\\s*",
    "([a-z0-9](?:[a-z0-9-]*[a-z0-9])?",
    "(?:\\s*(?:\\.|\\[\\s*dot\\s*\\]|\\(\\s*dot\\s*\\)|\\{\\s*dot\\s*\\}|\\s+dot\\s+)\\s*",
    "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?){1,4})",
  ].join(""),
  "gi",
);

/**
 * Cloudflare rewrites every address on a protected page to a hex blob and puts
 * the real one back with JavaScript. The first byte is the key and the rest is
 * the address XORed against it, so a crawler that never runs the script can
 * still read it.
 */
export function decodeCloudflareEmail(hex: string): string | null {
  if (!/^[0-9a-f]{6,}$/i.test(hex) || hex.length % 2 !== 0) return null;
  const key = Number.parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) {
    out += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return out.includes("@") ? out : null;
}

/** Strips the obfuscation out of one match and lower-cases it. */
function rebuild(local: string, domain: string): string {
  const cleanDomain = domain
    .replace(/\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|\s+dot\s+)\s*/gi, ".")
    .replace(/\s+/g, "");
  return `${local.trim()}@${cleanDomain}`.toLowerCase();
}

/** True when the address is a real one somebody reads. */
function plausible(email: string): boolean {
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (email.length > 120) return false;
  if (ASSET_LIKE.test(email)) return false;
  if (JUNK_LOCAL.test(local)) return false;
  if (JUNK_DOMAIN.test(domain)) return false;
  // A real domain ends in a two letter or longer alphabetic suffix.
  return /^[a-z0-9.-]+\.[a-z]{2,24}$/.test(domain);
}

/**
 * How much this address looks like the one to write to.
 *
 * The company's own domain outweighs everything: a contractor with
 * roofing@theircompany.com and a webmaster@themeauthor.com is publishing one
 * address, not two. A free provider still scores well, because a two-truck
 * business often has nothing else.
 */
function scoreOf(email: string, host: string | null, path: string): number {
  const [local, domain] = email.split("@");
  let score = 0;

  if (host) {
    const bare = host.replace(/^www\./, "");
    if (domain === bare || domain.endsWith(`.${bare}`)) score += 100;
    else if (bare.split(".")[0] && domain.includes(bare.split(".")[0]!)) score += 40;
  }
  if (FREE_PROVIDER.test(`${domain}.`)) score += 30;

  const rank = CONTACT_LOCAL.indexOf(local);
  if (rank >= 0) score += 25 - rank;
  // A person's name is a real address, just less durable than a role one.
  else if (/^[a-z]+(\.[a-z]+)?$/.test(local)) score += 8;

  if (/contact/i.test(path)) score += 6;
  return score;
}

/**
 * Every address on one page, scored. The caller merges the pages and keeps the
 * best, which is why the score travels with the address rather than the order.
 */
export function collectEmails(html: string, host: string | null, path: string): EmailFind[] {
  const found = new Map<string, number>();
  const offer = (raw: string) => {
    const email = raw.trim().toLowerCase().replace(/^mailto:/, "").split("?")[0]!;
    if (!plausible(email)) return;
    const score = scoreOf(email, host, path);
    if ((found.get(email) ?? -1) < score) found.set(email, score);
  };

  // Cloudflare first: the blob is unreadable to every other pass.
  for (const match of html.matchAll(/data-cfemail\s*=\s*["']([0-9a-fA-F]+)["']/g)) {
    const decoded = decodeCloudflareEmail(match[1]!);
    if (decoded) offer(decoded);
  }

  // mailto, which is still the clearest statement of intent.
  for (const match of html.matchAll(/mailto:([^"'?>\s]+)/gi)) {
    try {
      offer(decodeURIComponent(match[1]!));
    } catch {
      offer(match[1]!);
    }
  }

  // Then the page as a reader sees it, entities resolved.
  let text = html;
  for (const [pattern, replacement] of ENTITIES) text = text.replace(pattern, replacement);
  for (const match of text.matchAll(EMAIL_ANYWHERE)) offer(rebuild(match[1]!, match[2]!));

  return [...found.entries()].map(([email, score]) => ({ email, score }));
}

/** Merges what several pages found and returns the best addresses first. */
export function rankEmails(finds: EmailFind[], limit = 3): string[] {
  const best = new Map<string, number>();
  for (const find of finds) {
    if ((best.get(find.email) ?? -1) < find.score) best.set(find.email, find.score);
  }
  return [...best.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([email]) => email);
}
