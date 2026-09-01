import type { Metadata } from "next";
import { db } from "./db";
import { parseJson, parseList } from "./json";
import type { Resolved } from "./resolve";
import type { SeoEntityType } from "./enums";
import { absoluteUrl } from "./urls";

const SITE_NAME = "TenBestFind";

/**
 * Per-entity SEO records written in the admin override anything computed here,
 * field by field. An empty field falls back to the derived default rather than
 * publishing a blank tag.
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
  },
): Promise<Metadata> {
  const record = await db.seoMeta.findUnique({
    where: { entityType_entityId: { entityType, entityId } },
  });

  const title = record?.title?.trim() || fallback.title;
  const description = record?.description?.trim() || fallback.description || undefined;
  const canonical = record?.canonical?.trim() || absoluteUrl(fallback.path);
  const image = record?.ogImage?.trim() || fallback.image || undefined;

  const robots = record
    ? {
        index: record.robotsIndex,
        follow: record.robotsFollow,
        noarchive: record.robotsNoArchive,
        nosnippet: record.robotsNoSnippet,
        noimageindex: record.robotsNoImageIndex,
        "max-snippet": record.maxSnippet ?? undefined,
        "max-image-preview": (record.maxImagePreview as "none" | "standard" | "large") ?? undefined,
        "max-video-preview": record.maxVideoPreview ?? undefined,
      }
    : { index: true, follow: true };

  return {
    title,
    description,
    keywords: record?.focusKeyword
      ? [record.focusKeyword, ...parseList(record.extraKeywords)]
      : undefined,
    alternates: { canonical },
    robots,
    openGraph: {
      title: record?.ogTitle?.trim() || title,
      description: record?.ogDescription?.trim() || description,
      url: canonical,
      siteName: SITE_NAME,
      type: fallback.type ?? "website",
      images: image ? [image] : undefined,
      publishedTime: fallback.publishedAt?.toISOString(),
      modifiedTime: fallback.modifiedAt?.toISOString(),
    },
    twitter: {
      card: (record?.twitterCard as "summary_large_image" | "summary") ?? "summary_large_image",
      title: record?.twitterTitle?.trim() || title,
      description: record?.twitterDescription?.trim() || description,
      images: record?.twitterImage?.trim() || image ? [record?.twitterImage?.trim() || image!] : undefined,
    },
  };
}

/** Metadata for anything the catch-all route resolves. */
export async function buildMetadata(resolved: Resolved, segments: string[]): Promise<Metadata> {
  const path = `/${segments.join("/")}/`;

  switch (resolved.type) {
    case "country": {
      const country = await db.country.findUnique({ where: { code: resolved.countryCode } });
      if (!country) return {};
      return seoFor("country", country.id, {
        title: `Home services in the ${country.name} — the ten best, city by city`,
        description: country.blurb,
        path,
        image: country.heroImage,
      });
    }
    case "region": {
      const country = await db.country.findUnique({ where: { code: resolved.countryCode } });
      if (!country) return {};
      const region = await db.region.findUnique({
        where: { countryId_slug: { countryId: country.id, slug: resolved.regionSlug } },
      });
      if (!region) return {};
      return seoFor("region", region.id, {
        title: `The ten best local businesses in ${region.name}`,
        description:
          region.blurb ??
          `Published city rankings across ${region.name}, with licensing checked against the authority that issues it.`,
        path,
        image: region.heroImage,
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
      return seoFor("city", city.id, {
        title: `The ten best local businesses in ${city.name}, ${region.code.toUpperCase()}`,
        description:
          city.blurb ??
          `Researched shortlists for ${city.name}, with credentials checked, sources cited and every ranking reviewed on a schedule.`,
        path,
        image: city.heroImage,
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
      return seoFor("ranking", ranking.id, {
        title: ranking.title,
        description: ranking.summary,
        path,
        image: city.heroImage,
        type: "article",
        publishedAt: ranking.publishedAt,
        modifiedAt: ranking.lastReviewedAt,
      });
    }
    case "category": {
      const category = await db.category.findUnique({ where: { slug: resolved.categorySlug } });
      if (!category) return {};
      return seoFor("category", category.id, {
        title: `The ten best ${category.name.toLowerCase()}, city by city`,
        description:
          category.description ??
          `Researched shortlists of ${category.name.toLowerCase()} with credentials checked and the reasoning published.`,
        path,
      });
    }
    case "subservice": {
      const category = await db.category.findUnique({
        where: { slug: resolved.categorySlug },
        include: { subservices: true },
      });
      const subservice = category?.subservices.find((item) => item.slug === resolved.subserviceSlug);
      if (!category || !subservice) return {};
      return {
        title: `${subservice.name} — ${category.serviceName}`,
        description:
          subservice.description ??
          `${subservice.name} sits within ${category.serviceName.toLowerCase()}. Who does it, what to check, and where we have published a shortlist.`,
        alternates: { canonical: absoluteUrl(path) },
      };
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
