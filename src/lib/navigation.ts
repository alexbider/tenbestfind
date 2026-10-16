import { cache } from "react";
import { db } from "./db";
import { routes } from "./urls";
import type { IconName } from "@/lib/icon-paths";
import { hasIcon } from "@/lib/icon-paths";

export type NavItem = { name: string; href: string; icon?: IconName; count?: number };
export type NavGroup = { title: string; items: NavItem[] };

export type CountryNav = {
  code: string;
  name: string;
  href: string;
  meta: string;
  unit: string;
  hubLabel: string;
  groups: NavGroup[];
  cities: NavItem[];
};

export type SiteNav = {
  /** Cities with a published ranking, quoted in the header's utility bar. */
  cityCount: number;
  /** Published trades, quoted in the services mega panel. */
  serviceCount: number;
  serviceGroups: NavGroup[];
  mostSearched: NavItem[];
  countries: CountryNav[];
  guideTypes: NavItem[];
  guideTopics: NavItem[];
  editorsPick: { title: string; summary: string; href: string } | null;
};

function icon(key: string | null | undefined, fallback: IconName = "house"): IconName {
  return key && hasIcon(key) ? key : fallback;
}

/**
 * Nav data is read once per request and shared by the header, the footer and
 * the mobile accordion. Every link is rendered server-side so the whole
 * taxonomy stays crawlable without JavaScript.
 */
export const getSiteNav = cache(async (): Promise<SiteNav> => {
  const [categories, countries, guides, trending, cityCount] = await Promise.all([
    // The menu and footer are on every page, so a trade in them gets a link
    // from every page. Only trades with a published ranking are indexable, so
    // only those are linked site-wide; the rest are listed on /home-services/.
    db.category.findMany({
      where: { published: true, rankings: { some: { status: "PUBLISHED" } } },
      orderBy: [{ navOrder: "asc" }, { sortOrder: "asc" }],
    }),
    db.country.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: {
        regions: {
          where: { published: true },
          orderBy: { sortOrder: "asc" },
          include: {
            cities: {
              where: { published: true },
              orderBy: { sortOrder: "asc" },
              include: { _count: { select: { rankings: { where: { status: "PUBLISHED" } } } } },
            },
          },
        },
      },
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 12,
      include: { category: true },
    }),
    db.subservice.findMany({
      where: { trending: true, category: { rankings: { some: { status: "PUBLISHED" } } } },
      orderBy: { sortOrder: "asc" },
      take: 4,
      include: { category: true },
    }),
    db.city.count({ where: { published: true, rankings: { some: { status: "PUBLISHED" } } } }),
  ]);

  const groupOrder = ["Repair & emergency", "Remodel & interior", "Exterior & structure", "Outdoor & property"];
  const grouped = new Map<string, NavItem[]>();
  for (const category of categories) {
    if (!category.navGroup) continue;
    const list = grouped.get(category.navGroup) ?? [];
    list.push({
      name: category.name,
      href: routes.category(category.slug),
      icon: icon(category.iconKey),
    });
    grouped.set(category.navGroup, list);
  }

  const serviceGroups: NavGroup[] = [...grouped.entries()]
    .sort((a, b) => groupOrder.indexOf(a[0]) - groupOrder.indexOf(b[0]))
    .map(([title, items]) => ({ title, items: items.slice(0, 5) }));

  const countryNav: CountryNav[] = countries.map((country) => {
    const regionGroups = new Map<string, NavItem[]>();
    const metros: NavItem[] = [];

    for (const region of country.regions) {
      const key = region.groupName ?? "Regions";
      const list = regionGroups.get(key) ?? [];
      list.push({ name: region.name, href: routes.region(country.code, region.slug) });
      regionGroups.set(key, list);

      for (const city of region.cities) {
        if (city.topMetro) {
          metros.push({
            name: `${city.name}, ${region.code.toUpperCase()}`,
            href: routes.city(country.code, region.slug, city.slug),
            count: city._count.rankings,
          });
        }
      }
    }

    // Counted the way the header counts: a city with no published ranking is a
    // page with a search box on it, and counting it made the menu say 41 while
    // the header said 38. A region counts when one of its cities does.
    const liveRegions = country.regions.filter((region) => region.cities.some((city) => city._count.rankings > 0));
    const cityCount = liveRegions.reduce(
      (total, region) => total + region.cities.filter((city) => city._count.rankings > 0).length,
      0,
    );
    const unit = country.regionLabel === "provinces" ? "province" : "state";

    return {
      code: country.code,
      name: country.name,
      href: routes.country(country.code),
      meta: `${liveRegions.length} ${liveRegions.length === 1 ? unit : country.regionLabel} · ${cityCount} ${cityCount === 1 ? "city" : "cities"}`,
      unit,
      hubLabel: `${country.name} hub`,
      groups: [...regionGroups.entries()].map(([title, items]) => ({ title, items })),
      cities: metros.slice(0, 8),
    };
  });

  const topicSeen = new Set<string>();
  const guideTopics: NavItem[] = [];
  for (const guide of guides) {
    if (!guide.category || topicSeen.has(guide.category.slug)) continue;
    topicSeen.add(guide.category.slug);
    guideTopics.push({
      name: guide.category.serviceName,
      href: `${routes.guidesIndex()}${guide.category.slug}/`,
    });
    if (guideTopics.length === 5) break;
  }

  const pick = guides[0];

  return {
    cityCount,
    // Every published trade, linked or not, since the copy says how many we cover.
    serviceCount: await db.category.count({ where: { published: true } }),
    serviceGroups,
    mostSearched: trending.map((sub) => ({
      name: sub.name,
      href: routes.subservice(sub.category.slug, sub.slug),
    })),
    countries: countryNav,
    guideTypes: [
      { name: "How to choose a pro", href: "/guides/how-to-choose/", icon: "check" },
      { name: "What things cost", href: "/guides/cost/", icon: "coin" },
      { name: "Questions to ask", href: "/guides/questions-to-ask/", icon: "help" },
      { name: "Project checklists", href: "/guides/checklists/", icon: "list" },
    ],
    guideTopics,
    editorsPick: pick
      ? {
          title: pick.title,
          summary: pick.excerpt ?? "",
          href: routes.guide(pick.slug),
        }
      : null,
  };
});

export type NavKey =
  | "none"
  | "home"
  | "search"
  | "services"
  | "locations"
  | "rankings"
  | "guides"
  | "trust"
  | "business";
