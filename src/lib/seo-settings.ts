// Site-wide SEO configuration.
//
// Everything here lives in the Setting table under a `seo.` key, so the values
// survive a redeploy and can be edited at /admin/seo without a code change. The
// list below is the single source of truth: it drives the admin form, the
// defaults, and the typed reader the pages use. Adding a field here is enough
// to make it editable and readable everywhere.

import { db } from "./db";
import { parseJson } from "./json";

export type SeoFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "media"
  | "lines"
  | "bots";

export type SeoField = {
  key: string;
  label: string;
  type: SeoFieldType;
  group: SeoGroupId;
  default: unknown;
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Half-width in the admin grid. */
  half?: boolean;
};

export type SeoGroupId =
  | "visibility"
  | "titles"
  | "templates"
  | "archives"
  | "social"
  | "schema"
  | "sitemap"
  | "robots"
  | "ai"
  | "verification";

export const SEO_GROUPS: { id: SeoGroupId; title: string; description: string }[] = [
  {
    id: "visibility",
    title: "Search engine visibility",
    description:
      "The master switch. Turning indexing off publishes noindex on every page, empties the sitemap and disallows every crawler in robots.txt.",
  },
  {
    id: "titles",
    title: "Titles and meta",
    description: "The separator and the homepage title, description and social image.",
  },
  {
    id: "templates",
    title: "Title templates",
    description:
      "The default title for each kind of page. Tokens: %title%, %sitename%, %sep%, %excerpt%, %city%, %region%, %category%, %year%. A title set on the page itself always wins.",
  },
  {
    id: "archives",
    title: "Archives and thin pages",
    description:
      "Which generated pages stay out of the index. Draft and archived content is never routable in the first place, so it needs no switch.",
  },
  {
    id: "social",
    title: "Social and Open Graph",
    description: "The defaults used when a page has no social image or card of its own.",
  },
  {
    id: "schema",
    title: "Knowledge graph and schema",
    description:
      "The Organization or Person that publishes the site. This becomes the publisher on every article and the entity in the sitewide JSON-LD.",
  },
  {
    id: "sitemap",
    title: "XML sitemap",
    description:
      "What the generated sitemap contains. It is served as a single file at /sitemap.xml, which is well inside the 50,000 URL limit.",
  },
  {
    id: "robots",
    title: "Robots and crawling",
    description: "Global robots directives and the rules written into robots.txt.",
  },
  {
    id: "ai",
    title: "AI and LLM crawlers",
    description:
      "Per-bot control over answer engines and training crawlers, plus llms.txt and the machine-readable opt-out signals.",
  },
  {
    id: "verification",
    title: "Webmaster verification",
    description: "Verification codes rendered as meta tags in the head. Paste the code only, not the whole tag.",
  },
];

/* ------------------------------------------------------------------ AI bots */

export type AiBotPurpose = "training" | "search" | "user";

export const AI_BOT_PURPOSE_LABEL: Record<AiBotPurpose, string> = {
  search: "Answer engines (send traffic back)",
  user: "User-triggered fetches (someone pasted your link)",
  training: "Bulk training crawlers (no traffic back)",
};

/**
 * The crawlers worth naming individually in robots.txt. Blocking an answer
 * engine also removes the site from its citations, which is why the defaults
 * only block the bulk scrapers that send nothing back.
 */
export const AI_BOTS: { agent: string; label: string; purpose: AiBotPurpose; operator: string }[] = [
  { agent: "OAI-SearchBot", label: "OpenAI SearchBot", purpose: "search", operator: "OpenAI" },
  { agent: "ChatGPT-User", label: "ChatGPT browsing", purpose: "user", operator: "OpenAI" },
  { agent: "GPTBot", label: "GPTBot", purpose: "training", operator: "OpenAI" },
  { agent: "Claude-SearchBot", label: "Claude search", purpose: "search", operator: "Anthropic" },
  { agent: "Claude-User", label: "Claude browsing", purpose: "user", operator: "Anthropic" },
  { agent: "ClaudeBot", label: "ClaudeBot", purpose: "training", operator: "Anthropic" },
  { agent: "anthropic-ai", label: "anthropic-ai (legacy)", purpose: "training", operator: "Anthropic" },
  { agent: "PerplexityBot", label: "PerplexityBot", purpose: "search", operator: "Perplexity" },
  { agent: "Perplexity-User", label: "Perplexity browsing", purpose: "user", operator: "Perplexity" },
  { agent: "Google-Extended", label: "Google-Extended", purpose: "training", operator: "Google" },
  { agent: "Applebot-Extended", label: "Applebot-Extended", purpose: "training", operator: "Apple" },
  { agent: "DuckAssistBot", label: "DuckAssistBot", purpose: "search", operator: "DuckDuckGo" },
  { agent: "MistralAI-User", label: "Mistral browsing", purpose: "user", operator: "Mistral" },
  { agent: "YouBot", label: "YouBot", purpose: "search", operator: "You.com" },
  { agent: "meta-externalagent", label: "meta-externalagent", purpose: "training", operator: "Meta" },
  { agent: "Amazonbot", label: "Amazonbot", purpose: "training", operator: "Amazon" },
  { agent: "Bytespider", label: "Bytespider", purpose: "training", operator: "ByteDance" },
  { agent: "CCBot", label: "CCBot", purpose: "training", operator: "Common Crawl" },
  { agent: "Diffbot", label: "Diffbot", purpose: "training", operator: "Diffbot" },
  { agent: "omgili", label: "omgili", purpose: "training", operator: "Webz.io" },
  { agent: "ImagesiftBot", label: "ImagesiftBot", purpose: "training", operator: "Hive" },
  { agent: "cohere-ai", label: "cohere-ai", purpose: "training", operator: "Cohere" },
  { agent: "Timpibot", label: "Timpibot", purpose: "training", operator: "Timpi" },
];

const DEFAULT_BLOCKED_BOTS = [
  "Bytespider",
  "CCBot",
  "Diffbot",
  "omgili",
  "ImagesiftBot",
  "cohere-ai",
  "Timpibot",
];

/* ------------------------------------------------------------------ fields */

const PREVIEW_OPTIONS = [
  { value: "large", label: "Large" },
  { value: "standard", label: "Standard" },
  { value: "none", label: "None" },
];

export const SEO_FIELDS: SeoField[] = [
  /* visibility */
  {
    key: "seo.searchEngineVisible",
    label: "Let search engines index this site",
    type: "boolean",
    group: "visibility",
    default: true,
    hint: "Turn this off on a staging copy. On the live site it takes every page out of search.",
  },

  /* titles */
  { key: "seo.titleSeparator", label: "Title separator", type: "text", group: "titles", default: "|", half: true },
  {
    key: "seo.siteName",
    label: "Site name",
    type: "text",
    group: "titles",
    default: "TenBestFind",
    half: true,
    hint: "Used by the %sitename% token and by Open Graph.",
  },
  {
    key: "seo.homeTitle",
    label: "Homepage title",
    type: "text",
    group: "titles",
    default: "TenBestFind — the ten best local businesses, researched",
  },
  {
    key: "seo.homeDescription",
    label: "Homepage description",
    type: "textarea",
    group: "titles",
    default:
      "Independent research on local service companies. We publish the shortlist and the reasoning behind it.",
    hint: "Aim for 120 to 160 characters.",
  },

  /* templates */
  { key: "seo.template.page", label: "Pages", type: "text", group: "templates", default: "%title% %sep% %sitename%" },
  { key: "seo.template.post", label: "Blog posts", type: "text", group: "templates", default: "%title% %sep% %sitename%" },
  {
    key: "seo.template.ranking",
    label: "Rankings",
    type: "text",
    group: "templates",
    default: "%title% %sep% %sitename%",
  },
  { key: "seo.template.guide", label: "Guides", type: "text", group: "templates", default: "%title% %sep% %sitename%" },
  {
    key: "seo.template.business",
    label: "Business profiles",
    type: "text",
    group: "templates",
    default: "%title% %sep% %sitename%",
  },
  {
    key: "seo.template.category",
    label: "Service hubs",
    type: "text",
    group: "templates",
    default: "%title% %sep% %sitename%",
  },
  { key: "seo.template.city", label: "City hubs", type: "text", group: "templates", default: "%title% %sep% %sitename%" },
  {
    key: "seo.template.region",
    label: "Region hubs",
    type: "text",
    group: "templates",
    default: "%title% %sep% %sitename%",
  },
  {
    key: "seo.template.country",
    label: "Country hubs",
    type: "text",
    group: "templates",
    default: "%title% %sep% %sitename%",
  },
  {
    key: "seo.template.person",
    label: "Expert profiles",
    type: "text",
    group: "templates",
    default: "%title% %sep% %sitename%",
  },

  /* archives */
  { key: "seo.noindexSearch", label: "Noindex search results", type: "boolean", group: "archives", default: true },
  {
    key: "seo.noindexEmptyArchives",
    label: "Noindex empty archives",
    type: "boolean",
    group: "archives",
    default: true,
    hint: "A city or service hub with nothing published under it yet.",
  },

  /* social */
  {
    key: "seo.social.defaultImage",
    label: "Default social image",
    type: "media",
    group: "social",
    default: "",
    hint: "Used when a page has no image of its own. 1200×630 works everywhere.",
  },
  { key: "seo.social.ogLocale", label: "Open Graph locale", type: "text", group: "social", default: "en_US", half: true },
  {
    key: "seo.social.twitterCard",
    label: "Default Twitter card",
    type: "select",
    group: "social",
    default: "summary_large_image",
    half: true,
    options: [
      { value: "summary_large_image", label: "Large image" },
      { value: "summary", label: "Summary" },
    ],
  },
  { key: "seo.social.twitterSite", label: "X / Twitter handle", type: "text", group: "social", default: "", half: true, placeholder: "@tenbestfind" },
  { key: "seo.social.facebookAppId", label: "Facebook app ID", type: "text", group: "social", default: "", half: true },

  /* schema */
  {
    key: "seo.schema.type",
    label: "Publisher type",
    type: "select",
    group: "schema",
    default: "Organization",
    half: true,
    options: [
      { value: "Organization", label: "Organization" },
      { value: "Person", label: "Person" },
      { value: "NewsMediaOrganization", label: "News media organization" },
      { value: "LocalBusiness", label: "Local business" },
    ],
  },
  { key: "seo.schema.name", label: "Name", type: "text", group: "schema", default: "TenBestFind", half: true },
  { key: "seo.schema.legalName", label: "Legal name", type: "text", group: "schema", default: "", half: true },
  { key: "seo.schema.foundingDate", label: "Founding date", type: "text", group: "schema", default: "", half: true, placeholder: "2021-04-01" },
  { key: "seo.schema.logo", label: "Logo", type: "media", group: "schema", default: "" },
  { key: "seo.schema.email", label: "Contact email", type: "text", group: "schema", default: "hello@tenbestfind.com", half: true },
  { key: "seo.schema.phone", label: "Contact phone", type: "text", group: "schema", default: "", half: true },
  { key: "seo.schema.streetAddress", label: "Street address", type: "text", group: "schema", default: "" },
  { key: "seo.schema.locality", label: "City", type: "text", group: "schema", default: "", half: true },
  { key: "seo.schema.region", label: "State or region", type: "text", group: "schema", default: "", half: true },
  { key: "seo.schema.postalCode", label: "Postal code", type: "text", group: "schema", default: "", half: true },
  { key: "seo.schema.country", label: "Country code", type: "text", group: "schema", default: "US", half: true },
  {
    key: "seo.schema.sameAs",
    label: "Social profiles",
    type: "lines",
    group: "schema",
    default: [],
    hint: "One full URL per line. These become sameAs on the publisher entity.",
  },
  {
    key: "seo.schema.searchbox",
    label: "Publish the sitelinks search box",
    type: "boolean",
    group: "schema",
    default: true,
    hint: "Adds a WebSite SearchAction pointing at /search/.",
  },
  { key: "seo.schema.breadcrumbs", label: "Publish breadcrumb schema", type: "boolean", group: "schema", default: true },

  /* sitemap */
  { key: "seo.sitemapEnabled", label: "Generate the XML sitemap", type: "boolean", group: "sitemap", default: true },
  { key: "seo.sitemap.include.rankings", label: "Include rankings", type: "boolean", group: "sitemap", default: true },
  { key: "seo.sitemap.include.guides", label: "Include guides", type: "boolean", group: "sitemap", default: true },
  { key: "seo.sitemap.include.posts", label: "Include blog posts", type: "boolean", group: "sitemap", default: true },
  { key: "seo.sitemap.include.businesses", label: "Include business profiles", type: "boolean", group: "sitemap", default: true },
  { key: "seo.sitemap.include.pages", label: "Include pages", type: "boolean", group: "sitemap", default: true },
  { key: "seo.sitemap.include.people", label: "Include expert profiles", type: "boolean", group: "sitemap", default: true },
  { key: "seo.sitemap.include.locations", label: "Include location hubs", type: "boolean", group: "sitemap", default: true },
  { key: "seo.sitemap.include.categories", label: "Include service hubs", type: "boolean", group: "sitemap", default: true },
  {
    key: "seo.sitemap.exclude",
    label: "Excluded paths",
    type: "lines",
    group: "sitemap",
    default: [],
    hint: "One path per line. A trailing * matches everything below it, for example /companies/*.",
  },

  /* robots */
  {
    key: "seo.robots.noarchive",
    label: "noarchive",
    type: "boolean",
    group: "robots",
    default: false,
    hint: "Stops engines showing a cached copy.",
  },
  { key: "seo.robots.nosnippet", label: "nosnippet", type: "boolean", group: "robots", default: false },
  { key: "seo.robots.noimageindex", label: "noimageindex", type: "boolean", group: "robots", default: false },
  {
    key: "seo.robots.maxSnippet",
    label: "max-snippet",
    type: "number",
    group: "robots",
    default: -1,
    half: true,
    hint: "-1 for no limit, 0 for no snippet.",
  },
  {
    key: "seo.robots.maxImagePreview",
    label: "max-image-preview",
    type: "select",
    group: "robots",
    default: "large",
    half: true,
    options: PREVIEW_OPTIONS,
  },
  {
    key: "seo.robots.maxVideoPreview",
    label: "max-video-preview",
    type: "number",
    group: "robots",
    default: -1,
    half: true,
  },
  {
    key: "seo.robots.crawlDelay",
    label: "Crawl delay (seconds)",
    type: "number",
    group: "robots",
    default: 0,
    half: true,
    hint: "0 leaves the directive out. Google ignores it; Bing and Yandex honour it.",
  },
  {
    key: "seo.robots.extraDisallow",
    label: "Extra disallowed paths",
    type: "lines",
    group: "robots",
    default: [],
    hint: "One path per line, on top of /admin and /search.",
  },
  {
    key: "seo.robots.custom",
    label: "Extra robots.txt lines",
    type: "textarea",
    group: "robots",
    default: "",
    hint: "Appended verbatim at the end of the file.",
  },

  /* ai */
  {
    key: "seo.ai.blockedBots",
    label: "Blocked AI crawlers",
    type: "bots",
    group: "ai",
    default: DEFAULT_BLOCKED_BOTS,
    hint: "Ticked bots get a Disallow: / block in robots.txt. Everything unticked is allowed.",
  },
  {
    key: "seo.ai.llmsTxt",
    label: "Publish /llms.txt",
    type: "boolean",
    group: "ai",
    default: true,
    hint: "A plain-language map of the site for language models, generated from published content.",
  },
  {
    key: "seo.ai.llmsIntro",
    label: "llms.txt introduction",
    type: "textarea",
    group: "ai",
    default:
      "TenBestFind publishes researched shortlists of local service companies. Every ranking names its criteria, cites its sources and records when it was last reviewed.",
  },
  {
    key: "seo.ai.noaiMeta",
    label: "Publish noai and noimageai meta tags",
    type: "boolean",
    group: "ai",
    default: false,
    hint: "An opt-out signal some crawlers honour. It is a request, not enforcement.",
  },
  {
    key: "seo.ai.tdmReservation",
    label: "Publish a TDM reservation",
    type: "boolean",
    group: "ai",
    default: false,
    hint: "Serves /.well-known/tdmrep.json, the machine-readable text and data mining opt-out used under EU copyright law.",
  },
  {
    key: "seo.ai.tdmPolicy",
    label: "TDM policy URL",
    type: "text",
    group: "ai",
    default: "",
    hint: "Optional. A page describing the licence terms for mining this site.",
  },

  /* verification */
  { key: "seo.verify.google", label: "Google Search Console", type: "text", group: "verification", default: "", half: true },
  { key: "seo.verify.bing", label: "Bing Webmaster Tools", type: "text", group: "verification", default: "", half: true },
  { key: "seo.verify.yandex", label: "Yandex Webmaster", type: "text", group: "verification", default: "", half: true },
  { key: "seo.verify.pinterest", label: "Pinterest", type: "text", group: "verification", default: "", half: true },
  { key: "seo.verify.baidu", label: "Baidu", type: "text", group: "verification", default: "", half: true },
  { key: "seo.verify.facebook", label: "Facebook domain verification", type: "text", group: "verification", default: "", half: true },
];

export const SEO_FIELD_BY_KEY = new Map(SEO_FIELDS.map((field) => [field.key, field]));

/* ------------------------------------------------------------------ reader */

export type SeoSettings = {
  raw: Record<string, unknown>;
  bool(key: string): boolean;
  text(key: string): string;
  num(key: string): number;
  list(key: string): string[];
};

function coerce(field: SeoField, stored: unknown): unknown {
  if (stored === undefined || stored === null) return field.default;
  switch (field.type) {
    case "boolean":
      return typeof stored === "boolean" ? stored : stored === "true" || stored === "on";
    case "number": {
      const parsed = Number(stored);
      return Number.isFinite(parsed) ? parsed : field.default;
    }
    case "lines":
    case "bots":
      return Array.isArray(stored) ? stored.map(String) : field.default;
    default:
      return String(stored);
  }
}

/**
 * Reads every `seo.` setting in one query and layers it over the defaults, so a
 * key that has never been saved still returns something sensible.
 */
export async function loadSeoSettings(): Promise<SeoSettings> {
  let stored: Record<string, unknown> = {};
  try {
    const rows = await db.setting.findMany({ where: { key: { startsWith: "seo." } } });
    stored = Object.fromEntries(rows.map((row) => [row.key, parseJson<unknown>(row.value, undefined)]));
  } catch {
    // A build running before the schema exists should still render defaults.
    stored = {};
  }

  const raw: Record<string, unknown> = {};
  for (const field of SEO_FIELDS) raw[field.key] = coerce(field, stored[field.key]);

  return {
    raw,
    bool: (key) => raw[key] === true,
    text: (key) => (typeof raw[key] === "string" ? (raw[key] as string).trim() : ""),
    num: (key) => (typeof raw[key] === "number" ? (raw[key] as number) : 0),
    list: (key) => (Array.isArray(raw[key]) ? (raw[key] as string[]) : []),
  };
}

/* --------------------------------------------------------------- templates */

/** Fills %token% placeholders and tidies up the separators left behind. */
export function renderTemplate(
  template: string,
  tokens: Record<string, string | null | undefined>,
): string {
  const filled = template.replace(/%([a-z]+)%/gi, (_match, name: string) => {
    const value = tokens[name.toLowerCase()];
    return value ? String(value) : "";
  });

  const sep = (tokens.sep ?? "|").trim() || "|";
  const escaped = sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return filled
    .replace(/\s+/g, " ")
    .trim()
    // A dropped token can leave a dangling or doubled separator behind.
    .replace(new RegExp(`\\s*${escaped}\\s*(?:${escaped}\\s*)+`, "g"), ` ${sep} `)
    .replace(new RegExp(`^${escaped}\\s*|\\s*${escaped}$`, "g"), "")
    .trim();
}
