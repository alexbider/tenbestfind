import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { loadSeoSettings } from "@/lib/seo-settings";
import { absoluteUrl, routes } from "@/lib/urls";

export const revalidate = 3600;

/**
 * Generated from the database rather than a static list, so a new city or
 * ranking is discoverable as soon as it publishes. Entities with a noindex SEO
 * record are excluded, as are the content types switched off at /admin/seo.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await loadSeoSettings();
  if (!settings.bool("seo.sitemapEnabled")) return [];
  if (!settings.bool("seo.searchEngineVisible")) return [];

  const include = (kind: string) => settings.bool(`seo.sitemap.include.${kind}`);

  // A trailing * matches everything below the path.
  const excluded = settings.list("seo.sitemap.exclude");
  const isExcluded = (path: string) =>
    excluded.some((rule) =>
      rule.endsWith("*") ? path.startsWith(rule.slice(0, -1)) : path === rule || path === `${rule}/`,
    );

  const [noindexRecords, countries, categories, rankings, guides, posts, businesses, pages, people] =
    await Promise.all([
      db.seoMeta.findMany({ where: { robotsIndex: false }, select: { entityType: true, entityId: true } }),
      db.country.findMany({
        where: { published: true },
        include: {
          regions: {
            where: { published: true },
            include: { cities: { where: { published: true } } },
          },
        },
      }),
      db.category.findMany({ where: { published: true }, include: { subservices: true } }),
      db.ranking.findMany({
        where: { status: "PUBLISHED" },
        include: { category: true, city: { include: { region: { include: { country: true } } } } },
      }),
      db.guide.findMany({ where: { status: "PUBLISHED" } }),
      db.post.findMany({ where: { status: "PUBLISHED" } }),
      db.business.findMany({ where: { status: "PUBLISHED" } }),
      db.page.findMany({ where: { status: "PUBLISHED" } }),
      db.person.findMany({ where: { published: true } }),
    ]);

  const blocked = new Set(noindexRecords.map((record) => `${record.entityType}:${record.entityId}`));
  const entries: MetadataRoute.Sitemap = [];

  const add = (
    path: string,
    lastModified: Date | null | undefined,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  ) => {
    if (isExcluded(path)) return;
    entries.push({
      url: absoluteUrl(path),
      lastModified: lastModified ?? undefined,
      changeFrequency,
      priority,
    });
  };

  add("/", new Date(), 1, "daily");
  add(routes.servicesIndex(), new Date(), 0.8, "weekly");
  add(routes.rankingsIndex(), new Date(), 0.8, "daily");
  add(routes.guidesIndex(), new Date(), 0.8, "weekly");
  add(routes.locationsIndex(), new Date(), 0.7, "weekly");
  if (posts.length > 0 && include("posts")) add(routes.blogIndex(), new Date(), 0.6, "weekly");
  if (include("people")) add(routes.expertsIndex(), new Date(), 0.5, "monthly");
  add(routes.howWeRank(), new Date(), 0.7, "monthly");
  add(routes.forBusinesses(), new Date(), 0.5, "monthly");

  for (const country of include("locations") ? countries : []) {
    if (blocked.has(`country:${country.id}`)) continue;
    add(routes.country(country.code), country.updatedAt, 0.8, "weekly");
    for (const region of country.regions) {
      if (blocked.has(`region:${region.id}`)) continue;
      add(routes.region(country.code, region.slug), region.updatedAt, 0.7, "weekly");
      for (const city of region.cities) {
        if (blocked.has(`city:${city.id}`)) continue;
        add(routes.city(country.code, region.slug, city.slug), city.updatedAt, 0.7, "weekly");
      }
    }
  }

  for (const category of include("categories") ? categories : []) {
    if (blocked.has(`category:${category.id}`)) continue;
    add(routes.category(category.slug), category.updatedAt, 0.8, "weekly");
    for (const subservice of category.subservices) {
      add(routes.subservice(category.slug, subservice.slug), subservice.updatedAt, 0.5, "monthly");
    }
  }

  for (const ranking of include("rankings") ? rankings : []) {
    if (blocked.has(`ranking:${ranking.id}`) || !ranking.city) continue;
    add(
      routes.ranking(
        ranking.city.region.country.code,
        ranking.city.region.slug,
        ranking.city.slug,
        ranking.category.slug,
      ),
      ranking.lastReviewedAt ?? ranking.updatedAt,
      0.9,
      "weekly",
    );
  }

  for (const guide of include("guides") ? guides : []) {
    if (blocked.has(`guide:${guide.id}`)) continue;
    add(routes.guide(guide.slug), guide.reviewedAt ?? guide.updatedAt, 0.7, "monthly");
  }

  for (const post of include("posts") ? posts : []) {
    if (blocked.has(`post:${post.id}`)) continue;
    add(routes.post(post.slug), post.updatedAt, 0.6, "monthly");
  }

  for (const business of include("businesses") ? businesses : []) {
    if (blocked.has(`business:${business.id}`)) continue;
    add(routes.business(business.slug), business.updatedAt, 0.6, "monthly");
  }

  for (const page of include("pages") ? pages : []) {
    if (blocked.has(`page:${page.id}`)) continue;
    add(routes.page(page.slug), page.updatedAt, 0.4, "monthly");
  }

  for (const person of include("people") ? people : []) {
    if (blocked.has(`person:${person.id}`)) continue;
    add(routes.expert(person.slug), person.updatedAt, 0.4, "monthly");
  }

  return entries;
}
