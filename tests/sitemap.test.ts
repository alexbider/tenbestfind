import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { sitemapChild, sitemapIndex, URLS_PER_FILE } from "@/lib/sitemap";
import { seoFor } from "@/lib/seo";
import { routes, absoluteUrl } from "@/lib/urls";

/**
 * The rules in the header of src/lib/sitemap.ts, checked against the database
 * rather than described. A city appears once it has a published ranking, a
 * profile appears once it is published, and nothing appears that the page
 * itself would tell a crawler to ignore.
 */

const KEYS = ["seo.sitemapEnabled", "seo.searchEngineVisible"];
const before = new Map<string, string | null>();

beforeAll(async () => {
  for (const key of KEYS) {
    const row = await db.setting.findUnique({ where: { key } });
    before.set(key, row?.value ?? null);
    await db.setting.upsert({
      where: { key },
      create: { key, value: "true", groupName: "seo", label: key },
      update: { value: "true" },
    });
  }
});

afterAll(async () => {
  for (const key of KEYS) {
    const value = before.get(key);
    if (value === null) await db.setting.delete({ where: { key } }).catch(() => {});
    else await db.setting.update({ where: { key }, data: { value: value! } }).catch(() => {});
  }
});

describe("what the sitemap offers", () => {
  it("lists every published company and nothing that is not published", async () => {
    const entries = (await sitemapChild("companies")) ?? [];
    const offered = new Set(entries.map((entry) => entry.path));

    const published = await db.business.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
    });
    for (const row of published) expect(offered.has(routes.business(row.slug))).toBe(true);

    const hidden = await db.business.findMany({
      where: { status: { not: "PUBLISHED" } },
      select: { slug: true },
    });
    for (const row of hidden) expect(offered.has(routes.business(row.slug))).toBe(false);
  });

  it("offers a city once it has a published ranking, and not before", async () => {
    const entries = (await sitemapChild("cities")) ?? [];
    const offered = new Set(entries.map((entry) => entry.path));

    const cities = await db.city.findMany({
      where: { published: true, region: { published: true, country: { published: true } } },
      include: {
        region: { include: { country: { select: { code: true } } } },
        _count: { select: { rankings: { where: { status: "PUBLISHED" } } } },
      },
    });

    for (const city of cities) {
      const path = routes.city(city.region.country.code, city.region.slug, city.slug);
      expect(offered.has(path), `${city.name} has ${city._count.rankings} rankings`).toBe(
        city._count.rankings > 0,
      );
    }
  });

  it("dates a city by the ranking on it rather than by its own row", async () => {
    const ranking = await db.ranking.findFirst({
      where: { status: "PUBLISHED", city: { published: true } },
      include: { city: { include: { region: { include: { country: true } } } } },
    });
    if (!ranking?.city) return;

    const path = routes.city(
      ranking.city.region.country.code,
      ranking.city.region.slug,
      ranking.city.slug,
    );
    const entry = ((await sitemapChild("cities")) ?? []).find((row) => row.path === path);
    expect(entry).toBeDefined();
    expect(entry!.lastModified!.getTime()).toBeGreaterThanOrEqual(
      Math.max(
        ranking.city.updatedAt.getTime(),
        ranking.updatedAt.getTime(),
        ranking.publishedAt?.getTime() ?? 0,
      ) - 1000,
    );
  });

  it("carries the company's own pictures, not just its logo", async () => {
    const withPhotos = await db.business.findFirst({
      where: { status: "PUBLISHED", photos: { some: {} } },
      select: { slug: true, photos: { select: { url: true }, take: 1 } },
    });
    if (!withPhotos) return;

    const entry = ((await sitemapChild("companies")) ?? []).find(
      (row) => row.path === routes.business(withPhotos.slug),
    );
    expect(entry?.images).toContain(withPhotos.photos[0]!.url);
  });

  it("splits a child that outgrows one file", async () => {
    const index = await sitemapIndex();
    expect(index.length).toBeGreaterThan(0);

    for (const child of index) {
      const name = child.path.replace("/sitemaps/", "").replace(".xml", "");
      const entries = (await sitemapChild(name)) ?? [];
      expect(entries.length).toBeLessThanOrEqual(URLS_PER_FILE);
    }
  });
});

describe("what a published page tells a crawler", () => {
  it("points a profile's canonical at itself and lets it be indexed", async () => {
    const business = await db.business.findFirst({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, name: true },
    });
    if (!business) return;

    const path = routes.business(business.slug);
    const meta = await seoFor("business", business.id, { title: business.name, path });

    expect(meta.alternates?.canonical).toBe(absoluteUrl(path));
    expect(meta.robots).toMatchObject({ index: true, follow: true });

    const offered = ((await sitemapChild("companies")) ?? []).map((entry) => entry.path);
    expect(offered).toContain(path);
  });

  it("does the same for a published ranking", async () => {
    const ranking = await db.ranking.findFirst({
      where: { status: "PUBLISHED", entries: { some: { business: { status: "PUBLISHED" } } } },
      include: {
        category: true,
        city: { include: { region: { include: { country: true } } } },
      },
    });
    if (!ranking?.city) return;

    const path = routes.ranking(
      ranking.city.region.country.code,
      ranking.city.region.slug,
      ranking.city.slug,
      ranking.category.slug,
    );
    const meta = await seoFor("ranking", ranking.id, { title: ranking.title ?? "Ranking", path });

    expect(meta.alternates?.canonical).toBe(absoluteUrl(path));
    expect(meta.robots).toMatchObject({ index: true, follow: true });

    const offered = ((await sitemapChild("rankings")) ?? []).map((entry) => entry.path);
    expect(offered).toContain(path);
  });
});
