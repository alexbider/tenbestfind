// Real content on a hub page.
//
// A service, a subservice, a state and a city each had one line of description
// standing in for a page. Sixty-nine subservice pages averaged 365 words and
// twenty-nine state hubs came out three-quarters identical to one another,
// which is not a writing problem: there was nowhere to put the writing.
//
// So a hub now carries the same block array a guide carries, rendered by the
// same component, checked by the same link rule. One shape, one renderer, one
// editor to learn. When a hub has no body it falls back to the line it always
// had, so nothing changes until somebody writes something.

import type { GuideBlock } from "../../prisma/data/editorial";
import { db } from "./db";
import { keepKnownLinks, type LinkTarget } from "./guide-links";
import { routes } from "./urls";
import { parseJson } from "./json";

/** The block kinds a hub may use: the guide set, minus the two about guides. */
const HUB_KINDS = new Set([
  "heading",
  "paragraph",
  "list",
  "steps",
  "callout",
  "criteria",
  "checklist",
  "compare",
  "flags",
  "chart",
]);

/**
 * Blocks a hub can render, or nothing.
 *
 * Deliberately forgiving: a stored body that has drifted, or holds a block kind
 * this page type does not render, loses the block rather than the page.
 */
export function parseHubBody(value: string | null | undefined): GuideBlock[] {
  const rows = parseJson<unknown[]>(value, []);
  if (!Array.isArray(rows)) return [];

  return rows.filter((row): row is GuideBlock => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return false;
    const kind = (row as { kind?: unknown }).kind;
    return typeof kind === "string" && HUB_KINDS.has(kind);
  });
}

/** Whether a hub has anything worth rendering in place of its one-liner. */
export const hasHubBody = (value: string | null | undefined) => parseHubBody(value).length > 0;

/**
 * Every hub on the site, as somewhere a hub body may link.
 *
 * Deliberately wider than the list a guide is offered. A guide is handed the
 * handful of pages relevant to what it is about, because choosing from eight
 * good options beats wading through forty. A hub is different: a service page
 * pointing at another service page, or at a state it covers, is exactly the
 * internal linking this is for, and the only question worth asking is whether
 * the page exists.
 */
export async function hubLinkTargets(): Promise<LinkTarget[]> {
  const [categories, regions, cities, countries] = await Promise.all([
    db.category.findMany({
      where: { published: true },
      select: { slug: true, name: true, subservices: { select: { slug: true, name: true } } },
    }),
    db.region.findMany({
      where: { published: true },
      select: { slug: true, name: true, country: { select: { code: true } } },
    }),
    db.city.findMany({
      where: { published: true },
      select: { slug: true, name: true, region: { select: { slug: true, country: { select: { code: true } } } } },
    }),
    db.country.findMany({ where: { published: true }, select: { code: true, name: true } }),
  ]);

  return [
    ...categories.flatMap((category) => [
      { path: routes.category(category.slug), label: category.name, kind: "service" as const },
      ...category.subservices.map((sub) => ({
        path: routes.subservice(category.slug, sub.slug),
        label: sub.name,
        kind: "service" as const,
      })),
    ]),
    ...countries.map((country) => ({
      path: routes.country(country.code),
      label: country.name,
      kind: "place" as const,
    })),
    ...regions.map((region) => ({
      path: routes.region(region.country.code, region.slug),
      label: region.name,
      kind: "place" as const,
    })),
    ...cities.map((city) => ({
      path: routes.city(city.region.country.code, city.region.slug, city.slug),
      label: city.name,
      kind: "place" as const,
    })),
    { path: routes.guidesIndex(), label: "all guides", kind: "core" as const },
    { path: routes.rankingsIndex(), label: "every shortlist", kind: "core" as const },
    { path: routes.howWeRank(), label: "how we rank", kind: "core" as const },
  ];
}

/**
 * The same link rule guides live under, applied to a hub body on the way in.
 *
 * A path that is not a page on this site is removed rather than rendered, and
 * the caller is told how many went, because a writer that never hears about a
 * dropped link writes the same one again next time.
 */
export async function vetHubBody(blocks: GuideBlock[]): Promise<{ blocks: GuideBlock[]; dropped: number }> {
  const targets = await hubLinkTargets();
  let dropped = 0;

  const kept = blocks.map((block) => {
    if (block.kind !== "paragraph" || !block.links) return block;
    const links = keepKnownLinks(block.links, targets).slice(0, 2);
    dropped += block.links.length - links.length;
    return links.length > 0 ? { ...block, links } : { ...block, links: undefined };
  });

  return { blocks: kept, dropped };
}
