// The pages a guide is allowed to link to.
//
// Contextual internal links are the ones that count, and they are also the
// easiest thing in the world for a model to get wrong: a plausible path is
// indistinguishable from a real one until somebody clicks it. So the writer
// never composes a URL. It is handed a list of pages that exist, chosen for
// this guide's trade and place, and it may only pick from that list.
//
// Anchors are not markdown either. A paragraph carries the phrase to link and
// the path to link it to, and the renderer wraps the first occurrence of that
// exact phrase in its own text. A phrase that is not in the paragraph links
// nothing, which is a missing link rather than a broken sentence.

import { db } from "./db";
import { rankingUrl, routes } from "./urls";

export type LinkTarget = {
  path: string;
  label: string;
  /** What it is, so the writer can tell a ranking from a hub from a guide. */
  kind: "service" | "place" | "ranking" | "guide" | "core";
  note?: string;
};

export type LinkContext = {
  categoryId?: string | null;
  countryId?: string | null;
  regionId?: string | null;
  cityId?: string | null;
  /** The guide being written, so it is never offered a link to itself. */
  excludeGuideId?: string | null;
};

/** The pages that are always worth linking, whatever the guide is about. */
const CORE: LinkTarget[] = [
  { path: routes.howWeRank(), label: "how we rank", kind: "core", note: "The method behind every shortlist" },
  { path: routes.guidesIndex(), label: "all guides", kind: "core" },
  { path: routes.rankingsIndex(), label: "every shortlist", kind: "core" },
  { path: routes.corrections(), label: "corrections policy", kind: "core", note: "How to report something wrong" },
];

/**
 * Everything this guide may link to, most relevant first.
 *
 * Relevance rather than volume: twenty links a writer has to wade through
 * produces worse choices than eight that all make sense here.
 */
export async function linkTargets(context: LinkContext): Promise<LinkTarget[]> {
  const targets: LinkTarget[] = [];

  const [category, city, region, country] = await Promise.all([
    context.categoryId
      ? db.category.findUnique({
          where: { id: context.categoryId },
          select: { slug: true, name: true, serviceName: true, published: true },
        })
      : null,
    context.cityId
      ? db.city.findUnique({
          where: { id: context.cityId },
          select: { slug: true, name: true, published: true, region: { select: { slug: true, country: { select: { code: true } } } } },
        })
      : null,
    context.regionId
      ? db.region.findUnique({
          where: { id: context.regionId },
          select: { slug: true, name: true, published: true, country: { select: { code: true } } },
        })
      : null,
    context.countryId
      ? db.country.findUnique({ where: { id: context.countryId }, select: { code: true, name: true, published: true } })
      : null,
  ]);

  if (category?.published) {
    targets.push({
      path: routes.category(category.slug),
      label: category.name.toLowerCase(),
      kind: "service",
      note: `The ${category.serviceName.toLowerCase()} hub, with the companies and the shortlists under it`,
    });
  }

  if (city?.published && city.region) {
    targets.push({
      path: routes.city(city.region.country.code, city.region.slug, city.slug),
      label: city.name,
      kind: "place",
      note: "Everything published for this city",
    });
  }
  if (region?.published) {
    targets.push({
      path: routes.region(region.country.code, region.slug),
      label: region.name,
      kind: "place",
      note: "The state or province hub, including its licensing notes",
    });
  }
  if (country?.published) {
    targets.push({ path: routes.country(country.code), label: country.name, kind: "place" });
  }

  // The shortlists this guide is really about. A hiring guide that never points
  // at the ranking it was written to support is a guide with no destination.
  const rankings = await db.ranking.findMany({
    where: {
      status: "PUBLISHED",
      ...(context.categoryId ? { categoryId: context.categoryId } : {}),
      ...(context.cityId
        ? { cityId: context.cityId }
        : context.regionId
          ? { regionId: context.regionId }
          : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 4,
    select: {
      title: true,
      category: { select: { slug: true } },
      city: { select: { slug: true, region: { select: { slug: true, country: { select: { code: true } } } } } },
    },
  });
  for (const ranking of rankings) {
    // A ranking with no city is the index, which is already in the core list.
    if (!ranking.city) continue;
    targets.push({ path: rankingUrl(ranking), label: ranking.title, kind: "ranking" });
  }

  const guides = await db.guide.findMany({
    where: {
      status: "PUBLISHED",
      ...(context.excludeGuideId ? { NOT: { id: context.excludeGuideId } } : {}),
      ...(context.categoryId ? { categoryId: context.categoryId } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 6,
    select: { slug: true, title: true },
  });
  for (const guide of guides) {
    targets.push({ path: routes.guide(guide.slug), label: guide.title, kind: "guide" });
  }

  // Padding out a thin list with guides from other trades, since a link to a
  // licence-checking guide is relevant whatever the trade is.
  if (guides.length < 3) {
    const others = await db.guide.findMany({
      where: {
        status: "PUBLISHED",
        ...(context.excludeGuideId ? { NOT: { id: context.excludeGuideId } } : {}),
        ...(context.categoryId ? { NOT: { categoryId: context.categoryId } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 4,
      select: { slug: true, title: true },
    });
    for (const guide of others) {
      if (targets.some((target) => target.path === routes.guide(guide.slug))) continue;
      targets.push({ path: routes.guide(guide.slug), label: guide.title, kind: "guide" });
    }
  }

  targets.push(...CORE);

  const seen = new Set<string>();
  return targets.filter((target) => {
    if (seen.has(target.path)) return false;
    seen.add(target.path);
    return true;
  });
}

/** The list as the writer reads it. */
export function linksAsText(targets: LinkTarget[]): string {
  if (targets.length === 0) return "No internal pages are available to link to. Do not invent any.";
  const lines = targets.map(
    (target) => `  ${target.path}  (${target.kind}) ${target.label}${target.note ? `. ${target.note}` : ""}`,
  );
  return ["PAGES ON THIS SITE YOU MAY LINK TO", ...lines].join("\n");
}

/** Drops any anchor pointing somewhere that was not offered. */
export function keepKnownLinks(
  links: { text: string; href: string }[] | undefined,
  targets: LinkTarget[],
): { text: string; href: string }[] {
  if (!links || links.length === 0) return [];
  const allowed = new Set(targets.map((target) => target.path));
  return links.filter((link) => allowed.has(link.href) && link.text.trim().length > 0);
}
