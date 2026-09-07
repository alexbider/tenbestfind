// What the site offers a crawler.
//
// One file worked while there were forty cities. It stops working somewhere
// around fifty thousand URLs, which is the protocol's limit per file, and a
// file over the limit is rejected whole rather than truncated. It stops being
// useful long before that: a single list gives no signal about which part of
// the site changed, so a crawler that has already read it has to read all of
// it again to find out.
//
// So the sitemap is an index of children, one per kind of page, and any child
// that outgrows a file is split across as many as it needs. A crawler that
// only cares about new rankings reads one small file.
//
// Which means the lastmod on each child has to be true. It is the only thing
// in the index a crawler can act on: if every child claims to have changed
// whenever the file was generated, the split has bought nothing and the field
// gets discounted. So every timestamp here comes from the newest record the
// file actually contains, and a file whose contents have no timestamp carries
// no lastmod at all rather than a flattering one.
//
// The rule for what goes in is the same rule the pages themselves apply: a URL
// belongs here when it returns 200, is canonical, and is allowed in the index.
// A city with nothing published under it is not offered, because being offered
// a page that says noindex is worse than not being offered it. The reverse
// holds too: a page that is indexable is offered, which is why the blog and
// expert indexes are listed whether or not anything is published under them.

import { db } from "./db";
import { getGuideHubs, guidesForHub } from "./guide-hubs";
import { loadSeoSettings } from "./seo-settings";
import { absoluteUrl, routes } from "./urls";
import { SUBSERVICE_MIN_BUSINESSES } from "./seo-copy";

export type SitemapEntry = {
  path: string;
  lastModified?: Date | null;
  /** Images on this page, for the image extension. Absolute or site-relative. */
  images?: (string | null | undefined)[];
};

export type SitemapIndexEntry = { path: string; lastModified?: Date };

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
 * How many URLs go in one file. The protocol allows fifty thousand; five is
 * small enough to stay quick to generate and to re-read when one record in it
 * changes, and it leaves an order of magnitude of headroom under the limit.
 */
export const URLS_PER_FILE = 5_000;

/** Kept under the old name because the number means the same thing. */
export const COMPANIES_PER_FILE = URLS_PER_FILE;

/** The newest of a set of dates, or undefined when there is nothing to report. */
function newest(...dates: (Date | null | undefined)[]): Date | undefined {
  let best = 0;
  for (const date of dates) {
    const time = date?.getTime();
    if (time && time > best) best = time;
  }
  return best > 0 ? new Date(best) : undefined;
}

/** Splits a child name into its base and its one-based shard number. */
function parseShard(name: string): { base: string; shard: number } {
  const match = /^(.*?)-(\d+)$/.exec(name);
  return match ? { base: match[1], shard: Number(match[2]) } : { base: name, shard: 1 };
}

/** The shard names a child of this size needs, in order. */
function shardNames(base: string, total: number): string[] {
  const count = Math.max(1, Math.ceil(total / URLS_PER_FILE));
  if (count === 1) return [base];
  return Array.from({ length: count }, (_, index) => `${base}-${index + 1}`);
}

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

/**
 * The fixed pages, which are always worth offering.
 *
 * The hubs get a real lastmod derived from what they list, because that is
 * when they actually changed. The editorial pages get none: nothing here knows
 * when somebody last reworded the advertising policy, and inventing a date is
 * worse than admitting there isn't one.
 */
async function pagesChild(g: Awaited<ReturnType<typeof gate>>): Promise<SitemapEntry[]> {
  const [rankings, guides, posts, people, categories, cities, regions, countries] =
    await Promise.all([
      db.ranking.aggregate({
        where: { status: "PUBLISHED" },
        _max: { updatedAt: true, lastReviewedAt: true },
      }),
      db.guide.aggregate({ where: { status: "PUBLISHED" }, _max: { updatedAt: true } }),
      db.post.aggregate({ where: { status: "PUBLISHED" }, _max: { updatedAt: true } }),
      db.person.aggregate({ where: { published: true }, _max: { updatedAt: true } }),
      db.category.aggregate({ where: { published: true }, _max: { updatedAt: true } }),
      db.city.aggregate({ where: { published: true }, _max: { updatedAt: true } }),
      db.region.aggregate({ where: { published: true }, _max: { updatedAt: true } }),
      db.country.aggregate({ where: { published: true }, _max: { updatedAt: true } }),
    ]);

  const newestRanking = newest(rankings._max.updatedAt, rankings._max.lastReviewedAt);
  const newestLocation = newest(
    cities._max.updatedAt,
    regions._max.updatedAt,
    countries._max.updatedAt,
  );

  const out: SitemapEntry[] = [
    // The homepage carries the newest ranking, guide and post, so it changes
    // when they do and not on a timer.
    {
      path: "/",
      lastModified: newest(newestRanking, guides._max.updatedAt, posts._max.updatedAt),
    },
    { path: routes.servicesIndex(), lastModified: categories._max.updatedAt },
    { path: routes.rankingsIndex(), lastModified: newestRanking },
    { path: routes.guidesIndex(), lastModified: guides._max.updatedAt },
    { path: routes.locationsIndex(), lastModified: newestLocation },
    // Listed unconditionally: both pages are indexable whether or not anything
    // is published under them, so leaving them out would be the sitemap
    // disagreeing with the pages.
    { path: routes.blogIndex(), lastModified: posts._max.updatedAt },
    { path: routes.expertsIndex(), lastModified: people._max.updatedAt },
    { path: routes.howWeRank() },
    { path: routes.forBusinesses() },
    { path: "/advertise/" },
    { path: "/add-business/" },
    { path: "/claim/" },
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

/** Everything one kind of page contributes, before it is split into files. */
async function childEntries(name: string): Promise<SitemapEntry[] | null> {
  const g = await gate();
  if (!g.on) return [];

  if (name === "companies") {
    if (!g.include("businesses")) return [];
    const rows = await db.business.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, updatedAt: true, logoUrl: true },
    });
    return rows
      .filter((row) => g.keep(routes.business(row.slug), `business:${row.id}`))
      .map((row) => ({
        path: routes.business(row.slug),
        lastModified: row.updatedAt,
        images: [row.logoUrl],
      }));
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
        .map((country) => ({
          path: routes.country(country.code),
          lastModified: country.updatedAt,
          images: [country.heroImage],
        }));
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
          images: [region.heroImage],
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
          images: [city.heroImage],
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
          images: [ranking.city?.heroImage],
        }));
    }

    case "guides": {
      if (!g.include("guides")) return [];
      const guides = await db.guide.findMany({ where: { status: "PUBLISHED" } });

      // The hubs the guides section navigates by, offered alongside the guides
      // themselves. A hub with nothing on it publishes noindex, so it is left
      // out here for the same reason an empty city hub is.
      const hubs = await getGuideHubs();
      const hubEntries: SitemapEntry[] = [];
      for (const hub of hubs) {
        if (!g.keep(hub.path)) continue;
        const onHub = await guidesForHub(hub);
        if (onHub.length === 0) continue;
        hubEntries.push({
          path: hub.path,
          lastModified: newest(...onHub.map((entry) => entry.reviewedAt ?? entry.updatedAt)),
          images: [onHub.find((entry) => entry.heroImage)?.heroImage],
        });
      }

      return [
        ...hubEntries,
        ...guides
          .filter((guide) => keeps(routes.guide(guide.slug), `guide:${guide.id}`))
          .map((guide) => ({
            path: routes.guide(guide.slug),
            lastModified: guide.reviewedAt ?? guide.updatedAt,
            images: [guide.heroImage],
          })),
      ];
    }

    case "posts": {
      if (!g.include("posts")) return [];
      const posts = await db.post.findMany({ where: { status: "PUBLISHED" } });
      return posts
        .filter((post) => keeps(routes.post(post.slug), `post:${post.id}`))
        .map((post) => ({
          path: routes.post(post.slug),
          lastModified: post.updatedAt,
          images: [post.heroImage],
        }));
    }

    case "people": {
      if (!g.include("people")) return [];
      const people = await db.person.findMany({ where: { published: true } });
      return people
        .filter((person) => keeps(routes.expert(person.slug), `person:${person.id}`))
        .map((person) => ({
          path: routes.expert(person.slug),
          lastModified: person.updatedAt,
          images: [person.portrait],
        }));
    }

    default:
      return null;
  }
}

/**
 * One file of the sitemap, by the name the index gave it.
 *
 * A name with no shard suffix is the first file, which for a child that fits
 * in one file is the whole of it. An unknown name returns null so the route
 * can 404 rather than hand back an empty file a crawler will keep revisiting.
 */
export async function sitemapChild(name: string): Promise<SitemapEntry[] | null> {
  const { base, shard } = parseShard(name);
  if (shard < 1) return null;

  const entries = await childEntries(base);
  if (entries === null) return null;

  const start = (shard - 1) * URLS_PER_FILE;
  // A shard number past the end is a name the index never published.
  if (shard > 1 && start >= entries.length) return null;
  return entries.slice(start, start + URLS_PER_FILE);
}

/**
 * The files that actually have something in them, each carrying the date of
 * the newest thing inside it. An index that lists an empty file wastes a
 * fetch, and one that lists a false date wastes every fetch after it.
 */
export async function sitemapIndex(): Promise<SitemapIndexEntry[]> {
  const g = await gate();
  if (!g.on) return [];

  const out: SitemapIndexEntry[] = [];
  for (const child of SITEMAP_CHILDREN) {
    const entries = await childEntries(child);
    if (!entries || entries.length === 0) continue;

    const names = shardNames(child, entries.length);
    names.forEach((name, index) => {
      const slice = entries.slice(index * URLS_PER_FILE, (index + 1) * URLS_PER_FILE);
      if (slice.length === 0) return;
      out.push({
        path: `/sitemaps/${name}.xml`,
        lastModified: newest(...slice.map((entry) => entry.lastModified)),
      });
    });
  }
  return out;
}

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Only the location is emitted: Google dropped the other image tags in 2022. */
function imagesXml(images: SitemapEntry["images"]): string {
  if (!images) return "";
  const seen = new Set<string>();
  for (const image of images) {
    const trimmed = image?.trim();
    if (trimmed) seen.add(absoluteUrl(trimmed));
  }
  return [...seen].map((url) => `<image:image><image:loc>${escape(url)}</image:loc></image:image>`).join("");
}

export function urlsetXml(entries: SitemapEntry[]): string {
  const rows = entries.map((entry) => {
    const modified = entry.lastModified
      ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
      : "";
    return `<url><loc>${escape(absoluteUrl(entry.path))}</loc>${modified}${imagesXml(entry.images)}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows.join("\n")}\n</urlset>\n`;
}

export function sitemapIndexXml(children: SitemapIndexEntry[]): string {
  const rows = children.map((child) => {
    const modified = child.lastModified
      ? `<lastmod>${child.lastModified.toISOString()}</lastmod>`
      : "";
    return `<sitemap><loc>${escape(absoluteUrl(child.path))}</loc>${modified}</sitemap>`;
  });
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
