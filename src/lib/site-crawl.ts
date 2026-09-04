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

// Ordered by what each page is worth, not alphabetically, because the crawl
// stops at MAX_PAGES. The contact page comes straight after the home page: it
// is where the email, the phone number and the address live, and on a site with
// a deep gallery it used to fall off the end of the list and never be read.
const PATHS = [
  "",
  "/contact",
  "/contact-us",
  "/about",
  "/about-us",
  "/services",
  "/gallery",
  "/photos",
  "/portfolio",
  "/projects",
  "/our-work",
  "/work",
  "/team",
  "/our-team",
  "/meet-the-team",
  "/staff",
  "/certifications",
];
const TIMEOUT_MS = 9000;
const MAX_BYTES = 900_000;
const MAX_PAGES = 10;

import { collectEmails, rankEmails, type EmailFind } from "./emails";

export type SiteData = {
  host: string | null;
  logo: string | null;
  images: { url: string; alt: string | null }[];
  /** Certification and accreditation marks, kept apart from the gallery. */
  badges: { url: string; label: string }[];
  /** Meta description, or the company's own opening paragraph. */
  summary: string | null;
  /** Plain text lifted from the pages, for the writer to work from. */
  text: string;
  social: Record<string, string>;
  /** YouTube videos the site embeds or links to, in the order they were met. */
  videos: { videoId: string; title: string | null }[];
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
  badges: [],
  summary: null,
  text: "",
  social: {},
  videos: [],
  yearFounded: null,
  licenseNumbers: [],
  phones: [],
  emails: [],
  pagesRead: 0,
  crawledAt: new Date(0).toISOString(),
};

// The four shapes a YouTube video is referenced in: the privacy-mode embed, the
// ordinary embed, a share link, and a watch URL anywhere in the markup. Shorts
// are deliberately absent, since a company's shorts are rarely the job.
const VIDEO_PATTERNS = [
  /youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/gi,
  /youtu\.be\/([A-Za-z0-9_-]{11})/gi,
  /youtube\.com\/watch\?(?:[^"'&\s]*&)*v=([A-Za-z0-9_-]{11})/gi,
];

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

// Sprites, spacers, tracking pixels and chrome are never the photo we want.
const JUNK_IMAGE =
  /(sprite|placeholder|spacer|pixel|1x1|blank|favicon|arrow|loader|spinner|chevron|caret|bullet|divider|pattern-|bg-tile|avatar-default|no-image|dummy)/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|avif)(\?|$)/i;

// A certification mark, which belongs beside the credentials rather than in the
// gallery of the company's work.
// The short trade acronyms need word boundaries or they match inside ordinary
// words: "epa" sits inside "repair", "nate" inside "donate".
const BADGE_HINT = new RegExp(
  [
    "badge",
    "certified",
    "certification",
    "accredit",
    "\\baward\\b",
    "\\bmember\\b",
    "\\bseal\\b",
    "logo-partner",
    "\\bgaf\\b",
    "owens[- ]?corning",
    "certainteed",
    "\\bbbb\\b",
    "\\bnate\\b",
    "\\bangi\\b",
    "\\bhouzz\\b",
    "energy[- ]?star",
    "\\bepa\\b",
    "\\bnari\\b",
    "\\biicrc\\b",
  ].join("|"),
  "i",
);

// Chrome that is an image but not a picture of anything.
const NOT_A_PHOTO = /(icon|logo|badge|payment|visa|mastercard|amex|paypal|financing|google-?play|app-?store|stars?-|rating)/i;

/** How wide a picture has to look before it is worth publishing. */
const MIN_WIDTH = 400;
const MIN_AREA = 90_000; // roughly 400x225

type Candidate = {
  url: string;
  alt: string | null;
  width: number;
  height: number;
  /** Higher wins. Built from size, where it was found and what it is called. */
  score: number;
};

/**
 * Picks the largest URL out of a srcset. Modern sites put the useful image
 * there and leave a thumbnail in `src`, so reading only `src` collects
 * postage stamps.
 */
function fromSrcset(value: string | null): { url: string; width: number } | null {
  if (!value) return null;
  let best: { url: string; width: number } | null = null;

  for (const part of value.split(",")) {
    const [url, descriptor] = part.trim().split(/\s+/);
    if (!url) continue;
    const width = descriptor?.endsWith("w") ? Number(descriptor.slice(0, -1)) : 0;
    if (!best || width > best.width) best = { url, width: Number.isFinite(width) ? width : 0 };
  }
  return best;
}

const dimensionOf = (value: string | null): number => {
  const parsed = Number((value ?? "").replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Reads a number out of a filename like hero-1920x1080.jpg or img_2400.jpg. */
function widthFromName(url: string): number {
  const pair = url.match(/(\d{3,5})\s*[x\u00d7]\s*(\d{3,5})/);
  if (pair) return Number(pair[1]);
  const single = url.match(/[-_](\d{3,5})\.(?:jpe?g|png|webp|avif)/i);
  return single ? Number(single[1]) : 0;
}

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
// "Licence number TX-123", "Lic #TX-123" and a bare "Texas licence TX-123" are
// all the same claim, so the connector between the word and the number is
// optional. The number itself still has to look like one.
const LICENCE =
  /\b(?:licen[cs]e|lic|reg(?:istration)?|permit|certificate)\s*(?:no\.?|number|#|:)?\s*([A-Z]{0,4}[-]?\d[A-Z0-9-]{3,19})\b/gi;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

/**
 * Checks the shortlist actually resolves, and drops anything too small to be
 * worth publishing. One HEAD request each, run together, with a short timeout:
 * a slow image host should cost the crawl a second, not the whole pass.
 */
async function keepReal(candidates: Candidate[], want: number): Promise<Candidate[]> {
  if (candidates.length === 0) return [];

  const checked = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const response = await fetch(candidate.url, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(5000),
          headers: { "user-agent": "TenBestFindBot/1.0 (+https://tenbestfind.com/how-we-rank/)" },
        });
        if (!response.ok) return null;
        if (!(response.headers.get("content-type") ?? "").startsWith("image/")) return null;

        // Under about 12kB is a thumbnail, an icon or a spacer whatever its
        // filename claims. Servers that do not report a length get the benefit
        // of the doubt.
        const length = Number(response.headers.get("content-length") ?? 0);
        if (length > 0 && length < 12_000) return null;
        return candidate;
      } catch {
        return null;
      }
    }),
  );

  return checked.filter((row): row is Candidate => row !== null).slice(0, want);
}

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
  const candidates = new Map<string, Candidate>();
  const badges: { url: string; label: string }[] = [];
  const social: Record<string, string> = {};
  // Keyed by id so the same video embedded on three pages is one video, and the
  // first title found for it is kept.
  const videos = new Map<string, string | null>();

  /**
   * Records one picture. The same image usually turns up on several pages at
   * several sizes, so the biggest sighting wins and the rest are folded into it.
   */
  const offer = (
    url: string,
    alt: string | null,
    width: number,
    height: number,
    bonus: number,
    path: string,
  ) => {
    const area = width && height ? width * height : 0;
    // Size is the strongest signal a parser has without downloading anything.
    const size = width >= 1600 ? 30 : width >= 1000 ? 22 : width >= MIN_WIDTH ? 12 : 0;
    const score = size + bonus + (area >= MIN_AREA ? 6 : 0) + (path === "" ? 2 : 0);

    const existing = candidates.get(url);
    if (!existing || score > existing.score) {
      // The site's own alt text describes the job in the picture, which is
      // better than anything we could write about a photo we cannot see.
      candidates.set(url, { url, alt: alt?.trim() || existing?.alt || null, width, height, score });
    }
  };
  const licences = new Set<string>();
  const phones = new Set<string>();
  // Scored rather than a set: several pages usually carry an address and the
  // company's own is not always the first one met.
  const emailFinds: EmailFind[] = [];
  const texts: string[] = [];

  let logo: string | null = null;
  let summary: string | null = null;
  let yearFounded: number | null = null;
  let pagesRead = 0;

  for (const path of PATHS) {
    if (pagesRead >= MAX_PAGES) break;
    if (candidates.size > 120) break;
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
        // An address in the structured data is the company stating it outright,
        // so it outranks anything scraped out of the prose.
        const declared = firstString(node.email);
        if (declared) emailFinds.push({ email: declared.trim().toLowerCase(), score: 150 });
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
      if (nodeImage && IMAGE_EXT.test(nodeImage) && !JUNK_IMAGE.test(nodeImage)) {
        // Whatever the company chose to represent itself with, which is nearly
        // always one of the better pictures on the site.
        offer(nodeImage, null, 0, 0, 40, path);
      }
    }

    // ---- meta tags
    summary ??= meta(html, "og:description") ?? meta(html, "description");
    const ogImage = absolute(meta(html, "og:image") ?? meta(html, "twitter:image"), base);
    if (ogImage && !JUNK_IMAGE.test(ogImage)) offer(ogImage, null, 1200, 630, 35, path);

    // ---- the logo, from the several places a site might declare it
    logo ??= absolute(meta(html, "og:logo"), base);
    logo ??= absolute(meta(html, "msapplication-TileImage"), base);

    if (!logo) {
      // A named image inside the header is the logo far more reliably than a
      // named image anywhere on the page.
      const header = html.match(/<header[\s\S]{0,4000}?<\/header>/i)?.[0] ?? "";
      for (const source of [header, html]) {
        for (const tag of source.match(/<img[^>]*>/gi) ?? []) {
          const haystack = `${attr(tag, "class") ?? ""} ${attr(tag, "id") ?? ""} ${attr(tag, "alt") ?? ""} ${attr(tag, "src") ?? ""}`;
          if (!/logo|brand|wordmark/i.test(haystack)) continue;
          const src = absolute(
            attr(tag, "src") ?? attr(tag, "data-src") ?? attr(tag, "data-lazy-src"),
            base,
          );
          if (src && !/sprite|placeholder/i.test(src)) {
            logo = src;
            break;
          }
        }
        if (logo) break;
      }
    }

    // A touch icon is a square mark of the brand, which beats nothing at all.
    if (!logo) {
      let bestIcon: { url: string; size: number } | null = null;
      for (const tag of html.match(/<link[^>]+rel\s*=\s*["'][^"']*icon[^"']*["'][^>]*>/gi) ?? []) {
        const href = absolute(attr(tag, "href"), base);
        if (!href || /\.ico(\?|$)/i.test(href)) continue;
        const size = dimensionOf(attr(tag, "sizes")) || (/apple-touch/i.test(tag) ? 180 : 32);
        if (!bestIcon || size > bestIcon.size) bestIcon = { url: href, size };
      }
      if (bestIcon && bestIcon.size >= 96) logo = bestIcon.url;
    }

    // ---- every picture on the page, sized and scored
    for (const tag of html.match(/<img[^>]*>/gi) ?? []) {
      const set =
        fromSrcset(attr(tag, "srcset")) ??
        fromSrcset(attr(tag, "data-srcset")) ??
        fromSrcset(attr(tag, "data-lazy-srcset"));

      // Lazy loaders park the real URL in any of a dozen attributes. The plain
      // `src` on such a page is usually a grey placeholder.
      const raw =
        set?.url ??
        attr(tag, "data-src") ??
        attr(tag, "data-lazy-src") ??
        attr(tag, "data-original") ??
        attr(tag, "data-image") ??
        attr(tag, "data-large-file") ??
        attr(tag, "src");

      const src = absolute(raw, base);
      if (!src || !IMAGE_EXT.test(src) || JUNK_IMAGE.test(src)) continue;
      if (src === logo) continue;

      const alt = attr(tag, "alt") ?? "";
      const classes = `${attr(tag, "class") ?? ""} ${attr(tag, "id") ?? ""}`;
      const haystack = `${src} ${alt} ${classes}`;

      // A certification mark is not a photo of their work, so it goes to its
      // own pile and gets shown beside the credentials instead.
      if (BADGE_HINT.test(haystack)) {
        const label = alt.trim() || "Certification";
        if (!badges.some((badge) => badge.url === src)) badges.push({ url: src, label });
        continue;
      }
      if (NOT_A_PHOTO.test(haystack)) continue;

      const width = set?.width || dimensionOf(attr(tag, "width")) || widthFromName(src);
      const height = dimensionOf(attr(tag, "height"));

      // Where it was found matters: a picture on the gallery page is the work,
      // a picture on the contact page is usually a map or a stock handshake.
      const fromGallery = /gallery|photo|portfolio|project|work/i.test(path) ? 15 : 0;
      const describedWell = alt.trim().length > 12 ? 6 : 0;

      offer(src, alt, width, height, fromGallery + describedWell, path);
    }

    // ---- embedded video
    // The iframe is read first so its title, which is usually the video's own,
    // is what gets stored; a bare link elsewhere then adds nothing but the id.
    for (const tag of html.match(/<iframe[^>]+>/gi) ?? []) {
      const src = attr(tag, "src") ?? attr(tag, "data-src") ?? "";
      for (const pattern of VIDEO_PATTERNS) {
        pattern.lastIndex = 0;
        const found = pattern.exec(src);
        if (found && !videos.has(found[1])) videos.set(found[1], attr(tag, "title"));
      }
    }
    for (const pattern of VIDEO_PATTERNS) {
      for (const match of html.matchAll(pattern)) {
        if (!videos.has(match[1])) videos.set(match[1], null);
      }
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
    emailFinds.push(...collectEmails(html, host, path));
  }

  // The best twelve, largest and best placed first, then checked to be sure
  // they are really there and really pictures. A listing showing a broken image
  // is worse than a listing showing none.
  const ranked = [...candidates.values()].sort((a, b) => b.score - a.score).slice(0, 24);
  const kept = await keepReal(ranked, 12);
  const checkedLogo = await keepReal(
    logo ? [{ url: logo, alt: null, width: 0, height: 0, score: 0 }] : [],
    1,
  );

  return {
    host,
    logo: checkedLogo[0]?.url ?? null,
    images: kept.map((row) => ({ url: row.url, alt: row.alt })),
    badges: badges.slice(0, 8),
    summary: summary ? summary.slice(0, 600) : null,
    text: texts.join("\n\n").slice(0, 12_000),
    social,
    videos: [...videos.entries()].slice(0, 12).map(([videoId, title]) => ({ videoId, title })),
    yearFounded,
    licenseNumbers: [...licences].slice(0, 3),
    phones: [...phones].slice(0, 3),
    emails: rankEmails(emailFinds),
    pagesRead,
    crawledAt: now,
  };
}
