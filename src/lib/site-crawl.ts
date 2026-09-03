// Reading a company's own website for what the Google profile does not carry.
//
// A Maps record gives a name, a phone number, an address and a rating. It does
// not give a logo, more than a handful of photos, the year the company started,
// a licence number, or a single sentence the company wrote about itself. All of
// that is usually sitting on the front page of its site, so the importer reads
// it there before anything is written.
//
// The crawl is deliberately small and polite: a handful of known paths on one
// host, a short timeout, no JavaScript, nothing followed off-domain.

const PATHS = ["", "/about", "/about-us", "/services", "/contact", "/gallery", "/our-work"];
const TIMEOUT_MS = 9000;
const MAX_BYTES = 600_000;
const MAX_PAGES = 5;

export type SiteData = {
  host: string | null;
  logo: string | null;
  images: string[];
  /** Meta description, or the company's own opening paragraph. */
  summary: string | null;
  /** Plain text lifted from the pages, for the writer to work from. */
  text: string;
  social: Record<string, string>;
  yearFounded: number | null;
  licenseNumbers: string[];
  phones: string[];
  emails: string[];
  pagesRead: number;
  crawledAt: string;
};

export const EMPTY_SITE: SiteData = {
  host: null,
  logo: null,
  images: [],
  summary: null,
  text: "",
  social: {},
  yearFounded: null,
  licenseNumbers: [],
  phones: [],
  emails: [],
  pagesRead: 0,
  crawledAt: new Date(0).toISOString(),
};

const SOCIAL_HOSTS: Record<string, string> = {
  "facebook.com": "facebook",
  "instagram.com": "instagram",
  "linkedin.com": "linkedin",
  "youtube.com": "youtube",
  "x.com": "x",
  "twitter.com": "x",
  "tiktok.com": "tiktok",
  "yelp.com": "yelp",
  "bbb.org": "bbb",
};

// Sprites, spacers, tracking pixels and share icons are never the photo we want.
const JUNK_IMAGE = /(sprite|placeholder|spacer|pixel|1x1|blank|icon|favicon|badge|payment|visa|mastercard|arrow|loader|spinner)/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|avif)(\?|$)/i;

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": "TenBestFindBot/1.0 (+https://tenbestfind.com/how-we-rank/)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return null;
    if (!(response.headers.get("content-type") ?? "").includes("html")) return null;
    return (await response.text()).slice(0, MAX_BYTES);
  } catch {
    return null;
  }
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match ? match[1].trim() : null;
}

function meta(html: string, key: string): string | null {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`,
    "i",
  );
  const tag = html.match(pattern)?.[0];
  return tag ? attr(tag, "content") : null;
}

function absolute(value: string | null, base: URL): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Everything between the tags, with scripts, styles and entities dealt with. */
export function toText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** JSON-LD blocks, flattened, so an @graph is as readable as a bare object. */
function jsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const match of html.matchAll(
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        out.push(record);
        const graph = record["@graph"];
        if (Array.isArray(graph)) {
          for (const node of graph) {
            if (node && typeof node === "object") out.push(node as Record<string, unknown>);
          }
        }
      }
    } catch {
      // A broken block on someone else's site is not our problem to report.
    }
  }
  return out;
}

function firstString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstString(entry);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    const url = (value as Record<string, unknown>).url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return null;
}

const YEAR = /\b(?:since|established|est\.?|founded|serving [a-z .'-]+ since|in business since)\s*(?:in\s*)?(19[5-9]\d|20[0-2]\d)\b/i;
const LICENCE = /\b(?:licen[cs]e|lic|reg(?:istration)?|permit|certificate)\s*(?:no\.?|number|#|:)\s*([A-Z0-9][A-Z0-9-]{3,19})\b/gi;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

/**
 * Reads a company's website and returns what it could find. Never throws: a
 * site that is down, slow or hostile to crawlers returns an empty result and
 * the import carries on with what Google gave it.
 */
export async function crawlSite(website: string | null): Promise<SiteData> {
  const now = new Date().toISOString();
  if (!website) return { ...EMPTY_SITE, crawledAt: now };

  let base: URL;
  try {
    base = new URL(website.startsWith("http") ? website : `https://${website}`);
  } catch {
    return { ...EMPTY_SITE, crawledAt: now };
  }
  if (base.protocol !== "http:" && base.protocol !== "https:") {
    return { ...EMPTY_SITE, crawledAt: now };
  }

  const host = base.hostname.replace(/^www\./, "");
  const images = new Set<string>();
  const social: Record<string, string> = {};
  const licences = new Set<string>();
  const phones = new Set<string>();
  const emails = new Set<string>();
  const texts: string[] = [];

  let logo: string | null = null;
  let summary: string | null = null;
  let yearFounded: number | null = null;
  let pagesRead = 0;

  for (const path of PATHS) {
    if (pagesRead >= MAX_PAGES) break;
    const html = await fetchHtml(new URL(path, base).toString());
    if (!html) continue;
    pagesRead += 1;

    const text = toText(html);
    // Below this a page is a menu and a footer, which tells the writer nothing.
    if (text.length > 120) texts.push(text.slice(0, 6000));

    // ---- structured data first: it is what the site says about itself
    for (const node of jsonLd(html)) {
      const type = String(node["@type"] ?? "");
      if (/Organization|LocalBusiness|Store|Contractor|Service/i.test(type)) {
        logo ??= absolute(firstString(node.logo), base);
        summary ??= firstString(node.description);
        const founded = firstString(node.foundingDate);
        if (founded && yearFounded === null) {
          const year = Number(founded.slice(0, 4));
          if (year >= 1850 && year <= new Date().getFullYear()) yearFounded = year;
        }
        const same = node.sameAs;
        for (const link of Array.isArray(same) ? same : [same]) {
          const url = firstString(link);
          if (!url) continue;
          for (const [needle, key] of Object.entries(SOCIAL_HOSTS)) {
            if (url.includes(needle)) social[key] ??= url;
          }
        }
      }
      const nodeImage = absolute(firstString(node.image), base);
      if (nodeImage && IMAGE_EXT.test(nodeImage) && !JUNK_IMAGE.test(nodeImage)) images.add(nodeImage);
    }

    // ---- meta tags
    summary ??= meta(html, "og:description") ?? meta(html, "description");
    const ogImage = absolute(meta(html, "og:image"), base);
    if (ogImage && !JUNK_IMAGE.test(ogImage)) images.add(ogImage);

    // ---- the logo, if the markup says which image it is
    if (!logo) {
      for (const tag of html.match(/<img[^>]*>/gi) ?? []) {
        const haystack = `${attr(tag, "class") ?? ""} ${attr(tag, "id") ?? ""} ${attr(tag, "alt") ?? ""} ${attr(tag, "src") ?? ""}`;
        if (!/logo|brand|wordmark/i.test(haystack)) continue;
        const src = absolute(attr(tag, "src") ?? attr(tag, "data-src"), base);
        if (src) {
          logo = src;
          break;
        }
      }
    }

    // ---- gallery images, biggest-looking first, junk names dropped
    for (const tag of html.match(/<img[^>]*>/gi) ?? []) {
      const src = absolute(attr(tag, "src") ?? attr(tag, "data-src"), base);
      if (!src || !IMAGE_EXT.test(src) || JUNK_IMAGE.test(src)) continue;
      if (src === logo) continue;
      images.add(src);
      if (images.size > 40) break;
    }

    // ---- social profiles linked in the footer
    for (const tag of html.match(/<a[^>]+href\s*=\s*["'][^"']+["'][^>]*>/gi) ?? []) {
      const href = attr(tag, "href");
      if (!href) continue;
      for (const [needle, key] of Object.entries(SOCIAL_HOSTS)) {
        if (href.includes(needle) && !social[key]) {
          const url = absolute(href, base);
          if (url) social[key] = url;
        }
      }
    }

    // ---- loose facts in the prose
    if (yearFounded === null) {
      const year = text.match(YEAR)?.[1];
      if (year) yearFounded = Number(year);
    }
    for (const match of text.matchAll(LICENCE)) licences.add(match[1].toUpperCase());
    for (const match of text.match(PHONE) ?? []) phones.add(match.trim());
    for (const match of html.matchAll(/mailto:([^"'?>\s]+)/gi)) {
      emails.add(decodeURIComponent(match[1]).toLowerCase());
    }
  }

  return {
    host,
    logo,
    images: [...images].slice(0, 12),
    summary: summary ? summary.slice(0, 600) : null,
    text: texts.join("\n\n").slice(0, 12_000),
    social,
    yearFounded,
    licenseNumbers: [...licences].slice(0, 3),
    phones: [...phones].slice(0, 3),
    emails: [...emails].slice(0, 3),
    pagesRead,
    crawledAt: now,
  };
}
