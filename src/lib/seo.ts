import type { Metadata } from "next";
import { db } from "./db";
import { parseJson, parseList } from "./json";
import type { Resolved } from "./resolve";
import type { SeoEntityType } from "./enums";
import { loadSeoSettings, renderTemplate, type SeoSettings } from "./seo-settings";
import { absoluteUrl, routes } from "./urls";
import {
  cityCopy,
  countryCopy,
  rankingCopy,
  regionCopy,
  serviceCopy,
  subserviceCopy,
  type PageCopy,
} from "./seo-copy";

const FALLBACK_SITE_NAME = "TenBestFind";

type Tokens = Record<string, string | null | undefined>;

/**
 * Resolves the robots directives for one page: the global defaults set at
 * /admin/seo, plus anything the page's own SEO record adds on top. A directive
 * switched on globally cannot be switched off per page, which matches how the
 * site-wide switches are described in the admin.
 */
function robotsFor(
  settings: SeoSettings,
  record: {
    robotsIndex: boolean;
    robotsFollow: boolean;
    robotsNoArchive: boolean;
    robotsNoSnippet: boolean;
    robotsNoImageIndex: boolean;
    maxSnippet: number | null;
    maxImagePreview: string | null;
    maxVideoPreview: number | null;
  } | null,
  force?: { index?: boolean },
): Metadata["robots"] {
  if (!settings.bool("seo.searchEngineVisible")) return { index: false, follow: false };

  const index = force?.index === false ? false : record ? record.robotsIndex : true;

  return {
    index,
    follow: record ? record.robotsFollow : true,
    noarchive: record?.robotsNoArchive || settings.bool("seo.robots.noarchive"),
    nosnippet: record?.robotsNoSnippet || settings.bool("seo.robots.nosnippet"),
    noimageindex: record?.robotsNoImageIndex || settings.bool("seo.robots.noimageindex"),
    "max-snippet": record?.maxSnippet ?? settings.num("seo.robots.maxSnippet"),
    "max-image-preview": (record?.maxImagePreview ??
      settings.text("seo.robots.maxImagePreview")) as "none" | "standard" | "large",
    "max-video-preview": record?.maxVideoPreview ?? settings.num("seo.robots.maxVideoPreview"),
  };
}

/**
 * Per-entity SEO records written in the admin override anything computed here,
 * field by field. An empty field falls back to the global template, and then to
 * the derived default, rather than publishing a blank tag.
 */
export async function seoFor(
  entityType: SeoEntityType,
  entityId: string,
  fallback: {
    title: string;
    description?: string | null;
    path: string;
    image?: string | null;
    type?: "website" | "article";
    publishedAt?: Date | null;
    modifiedAt?: Date | null;
    /** Extra %tokens% the title template for this entity type can use. */
    tokens?: Tokens;
    /** Set false for a thin or empty page the archive rules should keep out. */
    indexable?: boolean;
    /**
     * The title is already final and must not go through the global template.
     * Everything built in seo-copy sets this: half those titles carry the brand
     * deliberately and half deliberately do not, and a template that appends it
     * either way would undo the decision.
     */
    titleIsFinal?: boolean;
  },
): Promise<Metadata> {
  const [record, settings] = await Promise.all([
    db.seoMeta.findUnique({ where: { entityType_entityId: { entityType, entityId } } }),
    loadSeoSettings(),
  ]);

  const siteName = settings.text("seo.siteName") || FALLBACK_SITE_NAME;
  const sep = settings.text("seo.titleSeparator") || "|";
  const template = settings.text(`seo.template.${entityType}`) || "%title% %sep% %sitename%";

  const description = record?.description?.trim() || fallback.description || undefined;

  // A title written on the page is used exactly as typed; otherwise the global
  // template for this entity type builds it.
  const title =
    record?.title?.trim() ||
    (fallback.titleIsFinal ? fallback.title : "") ||
    renderTemplate(template, {
      title: fallback.title,
      sitename: siteName,
      sep,
      excerpt: description,
      year: String(new Date().getFullYear()),
      ...fallback.tokens,
    }) ||
    fallback.title;

  const canonical = record?.canonical?.trim() || absoluteUrl(fallback.path);
  const image =
    record?.ogImage?.trim() || fallback.image || settings.text("seo.social.defaultImage") || undefined;
  const twitterImage = record?.twitterImage?.trim() || image;
  const twitterSite = settings.text("seo.social.twitterSite");
  const facebookAppId = settings.text("seo.social.facebookAppId");

  return {
    title: { absolute: title },
    description,
    keywords: record?.focusKeyword
      ? [record.focusKeyword, ...parseList(record.extraKeywords)]
      : undefined,
    alternates: { canonical },
    robots: robotsFor(settings, record, { index: fallback.indexable }),
    ...(facebookAppId ? { other: { "fb:app_id": facebookAppId } } : {}),
    openGraph: {
      title: record?.ogTitle?.trim() || title,
      description: record?.ogDescription?.trim() || description,
      url: canonical,
      siteName,
      locale: settings.text("seo.social.ogLocale") || undefined,
      type: fallback.type ?? "website",
      images: image ? [image] : undefined,
      publishedTime: fallback.publishedAt?.toISOString(),
      modifiedTime: fallback.modifiedAt?.toISOString(),
    },
    twitter: {
      card: (record?.twitterCard ||
        settings.text("seo.social.twitterCard") ||
        "summary_large_image") as "summary_large_image" | "summary",
      site: twitterSite || undefined,
      title: record?.twitterTitle?.trim() || title,
      description: record?.twitterDescription?.trim() || description,
      images: twitterImage ? [twitterImage] : undefined,
    },
  };
}

/**
 * The metadata the root layout publishes: the homepage title and description,
 * the verification codes, and the AI opt-out tags when they are switched on.
 */
export async function globalMetadata(): Promise<Metadata> {
  const settings = await loadSeoSettings();
  const siteName = settings.text("seo.siteName") || FALLBACK_SITE_NAME;
  const sep = settings.text("seo.titleSeparator") || "|";
  const homeTitle = settings.text("seo.homeTitle") || siteName;
  const description = settings.text("seo.homeDescription") || undefined;
  const image = settings.text("seo.social.defaultImage");

  const other: Record<string, string> = {};
  for (const [key, name] of [
    ["seo.verify.bing", "msvalidate.01"],
    ["seo.verify.yandex", "yandex-verification"],
    ["seo.verify.pinterest", "p:domain_verify"],
    ["seo.verify.baidu", "baidu-site-verification"],
    ["seo.verify.facebook", "facebook-domain-verification"],
  ] as const) {
    const code = settings.text(key);
    if (code) other[name] = code;
  }

  const facebookAppId = settings.text("seo.social.facebookAppId");
  if (facebookAppId) other["fb:app_id"] = facebookAppId;

  // Opt-out signals rather than enforcement, so both are off by default and
  // only published when someone asks for them. The noai pair goes out as its
  // own robots tag: engines combine multiple robots meta tags, and the values
  // Next generates for indexing have to stay untouched.
  if (settings.bool("seo.ai.noaiMeta")) other.robots = "noai, noimageai";
  if (settings.bool("seo.ai.tdmReservation")) other["tdm-reservation"] = "1";

  const tdmPolicy = settings.text("seo.ai.tdmPolicy");
  if (settings.bool("seo.ai.tdmReservation") && tdmPolicy) other["tdm-policy"] = tdmPolicy;

  const google = settings.text("seo.verify.google");

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: homeTitle, template: `%s ${sep} ${siteName}` },
    description,
    alternates: { canonical: absoluteUrl("/") },
    robots: robotsFor(settings, null),
    ...(google ? { verification: { google } } : {}),
    ...(Object.keys(other).length > 0 ? { other } : {}),
    openGraph: {
      siteName,
      type: "website",
      locale: settings.text("seo.social.ogLocale") || undefined,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: (settings.text("seo.social.twitterCard") || "summary_large_image") as
        | "summary_large_image"
        | "summary",
      site: settings.text("seo.social.twitterSite") || undefined,
    },
  };
}

/**
 * The publisher entity and, optionally, the sitelinks search box. Rendered once
 * in the root layout so every page carries the same knowledge-graph node.
 */
export async function publisherSchema(): Promise<Record<string, unknown>[]> {
  const settings = await loadSeoSettings();
  if (!settings.bool("seo.searchEngineVisible")) return [];

  const siteName = settings.text("seo.siteName") || FALLBACK_SITE_NAME;
  const name = settings.text("seo.schema.name") || siteName;
  const id = absoluteUrl("/#publisher");

  const address: Record<string, string> = {};
  const street = settings.text("seo.schema.streetAddress");
  const locality = settings.text("seo.schema.locality");
  const region = settings.text("seo.schema.region");
  const postalCode = settings.text("seo.schema.postalCode");
  const country = settings.text("seo.schema.country");
  if (street) address.streetAddress = street;
  if (locality) address.addressLocality = locality;
  if (region) address.addressRegion = region;
  if (postalCode) address.postalCode = postalCode;
  if (country) address.addressCountry = country;

  const publisher: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": settings.text("seo.schema.type") || "Organization",
    "@id": id,
    name,
    url: absoluteUrl("/"),
  };

  const legalName = settings.text("seo.schema.legalName");
  const logo = settings.text("seo.schema.logo");
  const email = settings.text("seo.schema.email");
  const phone = settings.text("seo.schema.phone");
  const founded = settings.text("seo.schema.foundingDate");
  const sameAs = settings.list("seo.schema.sameAs");

  if (legalName) publisher.legalName = legalName;
  if (logo) publisher.logo = { "@type": "ImageObject", url: absoluteUrl(logo) };
  if (email) publisher.email = email;
  if (phone) publisher.telephone = phone;
  if (founded) publisher.foundingDate = founded;
  if (Object.keys(address).length > 0) publisher.address = { "@type": "PostalAddress", ...address };
  if (sameAs.length > 0) publisher.sameAs = sameAs;

  const graph: Record<string, unknown>[] = [publisher];

  const website: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: siteName,
    url: absoluteUrl("/"),
    publisher: { "@id": id },
  };

  if (settings.bool("seo.schema.searchbox")) {
    website.potentialAction = {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(routes.search())}?service={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    };
  }

  graph.push(website);
  return graph;
}

/** Whether a hub with nothing published under it should stay out of the index. */
async function emptyArchivesHidden(): Promise<boolean> {
  const settings = await loadSeoSettings();
  return settings.bool("seo.noindexEmptyArchives");
}

/**
 * Hands one PageCopy to seoFor. The title and description are already final, so
 * the global template is bypassed and only an admin override can replace them.
 */
function fromCopy(
  copy: PageCopy,
  entityType: SeoEntityType,
  entityId: string,
  rest: {
    path: string;
    image?: string | null;
    tokens?: Tokens;
    type?: "website" | "article";
    publishedAt?: Date | null;
    modifiedAt?: Date | null;
    indexable?: boolean;
  },
): Promise<Metadata> {
  return seoFor(entityType, entityId, {
    title: copy.title,
    titleIsFinal: true,
    description: copy.description,
    indexable: rest.indexable ?? copy.indexable,
    ...rest,
  });
}

/** Metadata for anything the catch-all route resolves. */
export async function buildMetadata(resolved: Resolved, segments: string[]): Promise<Metadata> {
  const path = `/${segments.join("/")}/`;

  switch (resolved.type) {
    case "country": {
      const country = await db.country.findUnique({ where: { code: resolved.countryCode } });
      if (!country) return {};
      const published = await db.ranking.count({
        where: { status: "PUBLISHED", city: { region: { countryId: country.id } } },
      });
      const copy = countryCopy(country, { publishedRankings: published });
      return fromCopy(copy, "country", country.id, {
        path,
        image: country.heroImage,
        tokens: { country: country.name },
        indexable: copy.indexable || !(await emptyArchivesHidden()),
      });
    }
    case "region": {
      const country = await db.country.findUnique({ where: { code: resolved.countryCode } });
      if (!country) return {};
      const region = await db.region.findUnique({
        where: { countryId_slug: { countryId: country.id, slug: resolved.regionSlug } },
      });
      if (!region) return {};
      const published = await db.ranking.count({
        where: { status: "PUBLISHED", city: { regionId: region.id } },
      });
      const copy = regionCopy(region, { publishedRankings: published });
      return fromCopy(copy, "region", region.id, {
        path,
        image: region.heroImage,
        tokens: { region: region.name, country: country.name },
        indexable: copy.indexable || !(await emptyArchivesHidden()),
      });
    }
    case "city": {
      const country = await db.country.findUnique({ where: { code: resolved.countryCode } });
      if (!country) return {};
      const region = await db.region.findUnique({
        where: { countryId_slug: { countryId: country.id, slug: resolved.regionSlug } },
      });
      if (!region) return {};
      const city = await db.city.findUnique({
        where: { regionId_slug: { regionId: region.id, slug: resolved.citySlug } },
      });
      if (!city) return {};
      const published = await db.ranking.count({ where: { status: "PUBLISHED", cityId: city.id } });
      const copy = cityCopy(city, region, { publishedRankings: published });
      return fromCopy(copy, "city", city.id, {
        path,
        image: city.heroImage,
        tokens: { city: city.name, region: region.name, country: country.name },
        indexable: copy.indexable || !(await emptyArchivesHidden()),
      });
    }
    case "ranking": {
      const category = await db.category.findUnique({ where: { slug: resolved.categorySlug } });
      const country = await db.country.findUnique({ where: { code: resolved.countryCode } });
      if (!category || !country) return {};
      const region = await db.region.findUnique({
        where: { countryId_slug: { countryId: country.id, slug: resolved.regionSlug } },
      });
      if (!region) return {};
      const city = await db.city.findUnique({
        where: { regionId_slug: { regionId: region.id, slug: resolved.citySlug } },
      });
      if (!city) return {};
      const ranking = await db.ranking.findUnique({
        where: { categoryId_cityId: { categoryId: category.id, cityId: city.id } },
      });
      if (!ranking) return {};
      // The count is of published companies actually on the list, because that
      // is what the page shows and what the title is allowed to claim.
      const publishedEntries = await db.rankingEntry.count({
        where: { rankingId: ranking.id, business: { status: "PUBLISHED" } },
      });
      const copy = rankingCopy(ranking, category, city, region, { publishedEntries });
      return fromCopy(copy, "ranking", ranking.id, {
        path,
        image: city.heroImage,
        tokens: { city: city.name, region: region.name, category: category.name },
        type: "article",
        publishedAt: ranking.publishedAt,
        modifiedAt: ranking.lastReviewedAt,
        indexable: copy.indexable,
      });
    }
    case "category": {
      const category = await db.category.findUnique({ where: { slug: resolved.categorySlug } });
      if (!category) return {};
      const published = await db.ranking.count({
        where: { status: "PUBLISHED", categoryId: category.id },
      });
      const copy = serviceCopy(category, { publishedRankings: published });
      return fromCopy(copy, "category", category.id, {
        path,
        tokens: { category: category.name },
        indexable: copy.indexable || !(await emptyArchivesHidden()),
      });
    }
    case "subservice": {
      const category = await db.category.findUnique({
        where: { slug: resolved.categorySlug },
        include: { subservices: true },
      });
      const subservice = category?.subservices.find((item) => item.slug === resolved.subserviceSlug);
      if (!category || !subservice) return {};
      const [businesses, publishedRankings] = await Promise.all([
        db.businessService.count({ where: { subserviceId: subservice.id } }),
        db.ranking.count({ where: { status: "PUBLISHED", categoryId: category.id } }),
      ]);
      const copy = subserviceCopy(subservice, category, { businesses, publishedRankings });
      return fromCopy(copy, "subservice", subservice.id, {
        path,
        tokens: { category: category.name, subservice: subservice.name },
        indexable: copy.indexable,
      });
    }
    case "page": {
      const page = await db.page.findUnique({ where: { slug: resolved.slug } });
      if (!page) return {};
      return seoFor("page", page.id, {
        title: page.title,
        description: page.excerpt,
        path,
        modifiedAt: page.updatedAt,
      });
    }
    default:
      return {};
  }
}

/** Rank Math style content analysis, run in the admin editor. */
export type SeoCheck = {
  id: string;
  label: string;
  status: "good" | "warn" | "bad";
  hint: string;
};

export function analyzeSeo(input: {
  title?: string | null;
  description?: string | null;
  focusKeyword?: string | null;
  slug?: string | null;
  content?: string | null;
  hasImage?: boolean;
  internalLinks?: number;
}): { score: number; checks: SeoCheck[] } {
  const checks: SeoCheck[] = [];
  const keyword = input.focusKeyword?.trim().toLowerCase() ?? "";
  const title = input.title?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const content = input.content?.toLowerCase() ?? "";
  const words = content.split(/\s+/).filter(Boolean).length;

  const push = (id: string, label: string, ok: boolean, warnOnly: boolean, hint: string) =>
    checks.push({ id, label, status: ok ? "good" : warnOnly ? "warn" : "bad", hint });

  push(
    "focus-keyword",
    "Focus keyword is set",
    keyword.length > 0,
    false,
    "Set the phrase this page should rank for so the rest of the checks can run.",
  );

  push(
    "title-length",
    "Title is 30 to 60 characters",
    title.length >= 30 && title.length <= 60,
    true,
    `Currently ${title.length}. Longer titles get truncated in results.`,
  );

  if (keyword) {
    push(
      "title-keyword",
      "Focus keyword appears in the title",
      title.toLowerCase().includes(keyword),
      false,
      "Search engines weight the title heavily. Work the phrase in naturally.",
    );
    push(
      "slug-keyword",
      "Focus keyword appears in the URL",
      (input.slug ?? "").toLowerCase().includes(keyword.replace(/\s+/g, "-")),
      true,
      "A slug carrying the phrase reads better in results and in links.",
    );
    push(
      "description-keyword",
      "Focus keyword appears in the description",
      description.toLowerCase().includes(keyword),
      true,
      "Matching terms get bolded in the results snippet.",
    );
    push(
      "content-keyword",
      "Focus keyword appears in the content",
      content.includes(keyword),
      false,
      "The phrase should appear in the body, particularly in the opening paragraph.",
    );
  }

  push(
    "description-length",
    "Description is 120 to 160 characters",
    description.length >= 120 && description.length <= 160,
    true,
    `Currently ${description.length}. Short descriptions waste the snippet; long ones get cut.`,
  );

  push(
    "content-length",
    "Content is at least 600 words",
    words >= 600,
    true,
    `Currently ${words} words. Thin pages struggle against established results.`,
  );

  push(
    "has-image",
    "Page has an image",
    Boolean(input.hasImage),
    true,
    "An image improves the social card and the click-through rate.",
  );

  push(
    "internal-links",
    "Page links to at least three other pages",
    (input.internalLinks ?? 0) >= 3,
    true,
    "Internal links spread authority and help crawlers find related pages.",
  );

  const weights = { good: 1, warn: 0.5, bad: 0 } as const;
  const score = Math.round(
    (checks.reduce((total, check) => total + weights[check.status], 0) / checks.length) * 100,
  );

  return { score, checks };
}

export function parseAnalysis(value: string | null | undefined): SeoCheck[] {
  return parseJson<SeoCheck[]>(value, []);
}
