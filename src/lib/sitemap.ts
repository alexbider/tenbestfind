// What the site offers a crawler.
//
// One file worked while there were forty cities. It stops working somewhere
// around fifty thousand URLs, which is the protocol's limit per file, and it
// stops being useful long before that: a single list gives no signal about
// which part of the site changed, so a crawler that has already read it has to
// read all of it again to find out.
//
// So the sitemap is an index of children, one per kind of page, with company
// profiles split across as many files as they need. A crawler that only cares
// about new rankings reads one small file.
//
// The rule for what goes in is the same rule the pages themselves apply: a URL
// belongs here when it returns 200, is canonical, and is allowed in the index.
// A city with nothing published under it is not offered, because being offered
// a page that says noindex is worse than not being offered it.

import { db } from "./db";
import { loadSeoSettings } from "./seo-settings";
import { absoluteUrl, routes } from "./urls";
import { SUBSERVICE_MIN_BUSINESSES } from "./seo-copy";

export type SitemapEntry = { path: string; lastModified?: Date | null };

/** The children the index can carry, in the order it lists them. */
export const SITEMAP_CHILDREN = [
  "pages",
  "services",
  "subservices",
  "countries",
  "states-provinces",
  "cities",
  "rankings",
  "guides",
  "posts",
  "people",
  "companies",
] as const;
export type SitemapChild = (typeof SITEMAP_CHILDREN)[number];

/**
 * How many company profiles go in one file. The protocol allows fifty
 * thousand; five is small enough to stay quick to generate and to re-read when
 * one company in it changes.
 */
export const COMPANIES_PER_FILE = 5_000;

/** The rules that apply to every URL, whichever child it lands in. */
async function gate() {
  const settings = await loadSeoSettings();
  const on = settings.bool("seo.sitemapEnabled") && settings.bool("seo.searchEngineVisible");

  const excluded = settings.list("seo.sitemap.exclude");
  const isExcluded = (path: string) =>
    excluded.some((rule) =>
      rule.endsWith("*") ? path.startsWith(rule.slice(0, -1)) : path === rule || path === `${rule}/`,
    );

  // A page an editor has set to noindex is not offered, whatever else is true
  // of it. Loaded once rather than joined per row: there are never many.
  const noindex = await db.seoMeta.findMany({
    where: { robotsIndex: false },
    select: { entityType: true, entityId: true },
  });
  const blocked = new Set(noindex.map((row) => `${row.entityType}:${row.entityId}`));

  return {
    on,
    include: (kind: string) => settings.bool(`seo.sitemap.include.${kind}`),
    // An operator who has turned this off wants the empty hubs indexed, and
    // the sitemap should agree with the pages rather than argue with them.
    hideEmpty: settings.bool("seo.noindexEmptyArchives"),
    keep: (path: string, key?: string) => !isExcluded(path) && !(key && blocked.has(key)),
  };
}

/** Published rankings counted every way the hubs need them. */
async function rankingCounts() {
  const rankings = await db.ranking.findMany({
    where: { status: "PUBLISHED" },
    select: {
      categoryId: true,
      cityId: true,
      city: { select: { regionId: true, region: { select: { countryId: true } } } },
    },
  });

  const byCity = new Map<string, number>();
  const byRegion = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string | null | undefined) => {
    if (key) map.set(key, (map.get(key) ?? 0) + 1);
  };

  for (const ranking of rankings) {
    bump(byCategory, ranking.categoryId);
    bump(byCity, ranking.cityId);
    bump(byRegion, ranking.city?.regionId);
    bump(byCountry, ranking.city?.region.countryId);
  }
  return { byCity, byRegion, byCountry, byCategory };
}

/** The fixed pages, which are always worth offering. */
async function pagesChild(g: Awaited<ReturnType<typeof gate>>): Promise<SitemapEntry[]> {
  const out: SitemapEntry[] = [
    { path: "/", lastModified: new Date() },
    { path: routes.servicesIndex() },
    { path: routes.rankingsIndex() },
    { path: routes.guidesIndex() },
    { path: routes.locationsIndex() },
    { path: routes.howWeRank() },
    { path: routes.forBusinesses() },
  ];

  if (g.include("pages")) {
    const pages = await db.page.findMany({ where: { status: "PUBLISHED" } });
    for (const page of pages) {
      if (g.keep(routes.page(page.slug), `page:${page.id}`)) {
        out.push({ path: routes.page(page.slug), lastModified: page.updatedAt });
      }
    }
  }

  return out.filter((entry) => g.keep(entry.path));
}

/** Everything one child of the index holds. */
export async function sitemapChild(name: string): Promise<SitemapEntry[] | null> {
  const g = await gate();
  if (!g.on) return [];

  const companies = /^companies(-\d+)?$/.exec(name);
  if (companies) {
    if (!g.include("businesses")) return [];
    const shard = companies[1] ? Number(companies[1].slice(1)) : 1;
    const rows = await db.business.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      skip: (shard - 1) * COMPANIES_PER_FILE,
      take: COMPANIES_PER_FILE,
      select: { id: true, slug: true, updatedAt: true },
    });
    return rows
      .filter((row) => g.keep(routes.business(row.slug), `business:${row.id}`))
      .map((row) => ({ path: routes.business(row.slug), lastModified: row.updatedAt }));
  }

  const counts = await rankingCounts();
  const keeps = (path: string, key: string) => g.keep(path, key);

  switch (name as SitemapChild) {
    case "pages":
      return pagesChild(g);

    case "services": {
      if (!g.include("categories")) return [];
      const categories = await db.category.findMany({ where: { published: true } });
      return categories
        .filter(
          (category) =>
            keeps(routes.category(category.slug), `category:${category.id}`) &&
            ((counts.byCategory.get(category.id) ?? 0) > 0 || !g.hideEmpty),
        )
        .map((category) => ({
          path: routes.category(category.slug),
          lastModified: category.updatedAt,
        }));
    }

    case "subservices": {
      if (!g.include("categories")) return [];
      const subservices = await db.subservice.findMany({
        include: { category: { select: { id: true, slug: true, published: true } } },
      });
      // The same bar the page itself applies: enough companies actually
      // offering it, and a parent trade with something published.
      const offered = await db.businessService.groupBy({
        by: ["subserviceId"],
        _count: { subserviceId: true },
      });
      const offerCount = new Map(offered.map((row) => [row.subserviceId, row._count.subserviceId]));

      return subservices
        .filter((subservice) => {
          if (!subservice.category.published) return false;
          const path = routes.subservice(subservice.category.slug, subservice.slug);
          if (!keeps(path, `subservice:${subservice.id}`)) return false;
          const enough = (offerCount.get(subservice.id) ?? 0) >= SUBSERVICE_MIN_BUSINESSES;
          return enough && (counts.byCategory.get(subservice.category.id) ?? 0) > 0;
        })
        .map((subservice) => ({
          path: routes.subservice(subservice.category.slug, subservice.slug),
          lastModified: subservice.updatedAt,
        }));
    }

    case "countries": {
      if (!g.include("locations")) return [];
      const countries = await db.country.findMany({ where: { published: true } });
      return countries
        .filter(
          (country) =>
            keeps(routes.country(country.code), `country:${country.id}`) &&
            ((counts.byCountry.get(country.id) ?? 0) > 0 || !g.hideEmpty),
        )
        .map((country) => ({ path: routes.country(country.code), lastModified: country.updatedAt }));
    }

    case "states-provinces": {
      if (!g.include("locations")) return [];
      const regions = await db.region.findMany({
        where: { published: true, country: { published: true } },
        include: { country: { select: { code: true } } },
      });
      return regions
        .filter(
          (region) =>
            keeps(routes.region(region.country.code, region.slug), `region:${region.id}`) &&
            ((counts.byRegion.get(region.id) ?? 0) > 0 || !g.hideEmpty),
        )
        .map((region) => ({
          path: routes.region(region.country.code, region.slug),
          lastModified: region.updatedAt,
        }));
    }

    case "cities": {
      if (!g.include("locations")) return [];
      const cities = await db.city.findMany({
        where: { published: true, region: { published: true, country: { published: true } } },
        include: { region: { include: { country: { select: { code: true } } } } },
      });
      return cities
        .filter(
          (city) =>
            keeps(
              routes.city(city.region.country.code, city.region.slug, city.slug),
              `city:${city.id}`,
            ) && ((counts.byCity.get(city.id) ?? 0) > 0 || !g.hideEmpty),
        )
        .map((city) => ({
          path: routes.city(city.region.country.code, city.region.slug, city.slug),
          lastModified: city.updatedAt,
        }));
    }

    case "rankings": {
      if (!g.include("rankings")) return [];
      const rankings = await db.ranking.findMany({
        where: { status: "PUBLISHED" },
        include: {
          category: { select: { slug: true } },
          city: { include: { region: { include: { country: { select: { code: true } } } } } },
          // A published list with nothing published on it is an empty page.
          _count: { select: { entries: { where: { business: { status: "PUBLISHED" } } } } },
        },
      });
      return rankings
        .filter((ranking) => ranking.city && ranking._count.entries > 0)
        .map((ranking) => ({
          ranking,
          path: routes.ranking(
            ranking.city!.region.country.code,
            ranking.city!.region.slug,
            ranking.city!.slug,
            ranking.category.slug,
          ),
        }))
        .filter(({ ranking, path }) => keeps(path, `ranking:${ranking.id}`))
        .map(({ ranking, path }) => ({
          path,
          lastModified: ranking.lastReviewedAt ?? ranking.updatedAt,
        }));
    }

    case "guides": {
      if (!g.include("guides")) return [];
      const guides = await db.guide.findMany({ where: { status: "PUBLISHED" } });
      return guides
        .filter((guide) => keeps(routes.guide(guide.slug), `guide:${guide.id}`))
        .map((guide) => ({
          path: routes.guide(guide.slug),
          lastModified: guide.reviewedAt ?? guide.updatedAt,
        }));
    }

    case "posts": {
      if (!g.include("posts")) return [];
      const posts = await db.post.findMany({ where: { status: "PUBLISHED" } });
      if (posts.length === 0) return [];
      return [
        { path: routes.blogIndex(), lastModified: new Date() },
        ...posts
          .filter((post) => keeps(routes.post(post.slug), `post:${post.id}`))
          .map((post) => ({ path: routes.post(post.slug), lastModified: post.updatedAt })),
      ];
    }

    case "people": {
      if (!g.include("people")) return [];
      const people = await db.person.findMany({ where: { published: true } });
      if (people.length === 0) return [];
      return [
        { path: routes.expertsIndex(), lastModified: new Date() },
        ...people
          .filter((person) => keeps(routes.expert(person.slug), `person:${person.id}`))
          .map((person) => ({ path: routes.expert(person.slug), lastModified: person.updatedAt })),
      ];
    }

    default:
      return null;
  }
}

/**
 * The children that actually have something in them, with the company files
 * split out. An index that lists an empty file wastes a fetch and tells a
 * crawler nothing.
 */
export async function sitemapIndex(): Promise<{ path: string; lastModified: Date }[]> {
  const g = await gate();
  if (!g.on) return [];

  const published = g.include("businesses")
    ? await db.business.count({ where: { status: "PUBLISHED" } })
    : 0;
  const shards = Math.max(1, Math.ceil(published / COMPANIES_PER_FILE));

  const names: string[] = [];
  for (const child of SITEMAP_CHILDREN) {
    if (child === "companies") {
      if (published === 0) continue;
      for (let index = 1; index <= shards; index += 1) {
        names.push(shards === 1 ? "companies" : `companies-${index}`);
      }
      continue;
    }
    const entries = await sitemapChild(child);
    if (entries && entries.length > 0) names.push(child);
  }

  const now = new Date();
  return names.map((name) => ({ path: `/sitemaps/${name}.xml`, lastModified: now }));
}

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function urlsetXml(entries: SitemapEntry[]): string {
  const rows = entries.map((entry) => {
    const modified = entry.lastModified
      ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
      : "";
    return `<url><loc>${escape(absoluteUrl(entry.path))}</loc>${modified}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

export function sitemapIndexXml(children: { path: string; lastModified: Date }[]): string {
  const rows = children.map(
    (child) =>
      `<sitemap><loc>${escape(absoluteUrl(child.path))}</loc><lastmod>${child.lastModified.toISOString()}</lastmod></sitemap>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</sitemapindex>\n`;
}

export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}
