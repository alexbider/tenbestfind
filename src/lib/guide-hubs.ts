// The pages that hold the guides.
//
// The Guides menu offers nine links: four by question and one per trade. Every
// one of them pointed at /guides/<something>/, which is the guide detail route,
// so every one of them was a 404. The menu was describing a structure the site
// did not have.
//
// This is that structure. Two kinds of hub live at the same depth, because a
// reader thinks about guides in exactly two ways, and neither is a subset of
// the other:
//
//   /guides/how-to-choose/    every guide about picking a company
//   /guides/roofers/          every guide about roofing, whatever it asks
//
// The question hubs are fixed, because the four questions are the site's own
// editorial promise rather than data. The trade hubs are derived, because the
// trades are.
//
// A hub is never invented for a trade with nothing published under it: an empty
// page offered to a crawler is worse than a page that does not exist.

import { cache } from "react";
import { db } from "./db";
import { GUIDE_TYPE_LABELS, guideTypeOf, type GuideType } from "./enums";
import { BRAND } from "./seo-copy";
import { routes } from "./urls";

export type GuideHubKind = "question" | "trade";

export type GuideHub = {
  kind: GuideHubKind;
  /** The segment under /guides/. */
  slug: string;
  path: string;
  /** The small label above the H1. */
  eyebrow: string;
  h1: string;
  lead: string;
  title: string;
  description: string;
  /** Set on a question hub: the type of guide it collects. */
  guideType?: GuideType;
  /** Set on a trade hub. */
  categoryId?: string;
};

/**
 * The four questions, in the order the menu lists them.
 *
 * The slugs are reserved: a guide that took one of these would shadow its hub,
 * because a real guide always wins its own URL. There are four of them and they
 * read nothing like a guide title, so this has stayed theoretical.
 */
const QUESTION_HUBS: {
  slug: string;
  guideType: GuideType;
  lead: string;
  description: string;
}[] = [
  {
    slug: "how-to-choose",
    guideType: "HOW_TO_CHOOSE",
    lead: "What separates a company worth calling from one that merely ranks well. How to read a quote, what a licence actually proves, and which reassurances mean nothing.",
    description:
      "How to choose a contractor: reading quotes, checking licences and insurance, and the differences that actually predict whether a job goes well.",
  },
  {
    slug: "cost",
    guideType: "COST",
    lead: "Sourced price ranges with the reasoning behind them, and an honest note wherever we have no figure worth publishing.",
    description:
      "What home services cost: researched price ranges by trade, what moves a quote up or down, and where the numbers come from.",
  },
  {
    slug: "questions-to-ask",
    guideType: "QUESTIONS",
    lead: "The questions that separate a real quote from a number written on the back of a card, and what a good answer to each one sounds like.",
    description:
      "Questions to ask a contractor before you hire, with the answers that should reassure you and the ones that should not.",
  },
  {
    slug: "checklists",
    guideType: "CHECKLIST",
    lead: "What to have in hand before the work starts, what to watch while it runs, and what to confirm before the last invoice is paid.",
    description:
      "Step by step checklists for home service projects: what to confirm before, during and after the work.",
  },
];

/** The reserved question slugs, so callers can keep guides off them. */
export const QUESTION_HUB_SLUGS = QUESTION_HUBS.map((hub) => hub.slug);

function questionHub(definition: (typeof QUESTION_HUBS)[number]): GuideHub {
  const h1 = GUIDE_TYPE_LABELS[definition.guideType];
  return {
    kind: "question",
    slug: definition.slug,
    path: `${routes.guidesIndex()}${definition.slug}/`,
    eyebrow: "By question",
    h1,
    lead: definition.lead,
    title: `${h1} | Guides | ${BRAND}`,
    description: definition.description,
    guideType: definition.guideType,
  };
}

function tradeHub(category: { id: string; slug: string; serviceName: string }): GuideHub {
  const service = category.serviceName;
  return {
    kind: "trade",
    slug: category.slug,
    path: `${routes.guidesIndex()}${category.slug}/`,
    eyebrow: "By trade",
    h1: `${service} guides`,
    lead: `Everything we have published about hiring for ${service.toLowerCase()} work: what it costs, what to ask, and what to check before anyone starts.`,
    title: `${service} Guides | Costs, Questions and Checklists | ${BRAND}`,
    description: `${service} guides from ${BRAND}: what the work costs, the questions worth asking, and the checks to make before you hire.`,
    categoryId: category.id,
  };
}

/**
 * Every hub that has something on it, loaded once per request.
 *
 * A question hub with nothing published is still listed, because the four
 * questions are the shape of the section rather than a reflection of what
 * happens to exist this week, and the menu links to all four regardless. A
 * trade hub with nothing published is not, because it would be a page about a
 * trade with no content about that trade.
 */
export const getGuideHubs = cache(async (): Promise<GuideHub[]> => {
  const categories = await db.category.findMany({
    where: { published: true, guides: { some: { status: "PUBLISHED" } } },
    orderBy: [{ navOrder: "asc" }, { sortOrder: "asc" }],
    select: { id: true, slug: true, serviceName: true },
  });

  return [...QUESTION_HUBS.map(questionHub), ...categories.map(tradeHub)];
});

/** The hub at this slug, or null when the slug is not one. */
export async function findGuideHub(slug: string): Promise<GuideHub | null> {
  const hubs = await getGuideHubs();
  return hubs.find((hub) => hub.slug === slug) ?? null;
}

export type HubGuide = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  heroImage: string | null;
  readingMinutes: number;
  type: GuideType;
  typicalLow: number | null;
  typicalHigh: number | null;
  publishedAt: Date | null;
  reviewedAt: Date | null;
  updatedAt: Date;
  categoryName: string | null;
  categorySlug: string | null;
  authorName: string | null;
};

/** The published guides on one hub, newest first. */
export async function guidesForHub(hub: GuideHub): Promise<HubGuide[]> {
  const rows = await db.guide.findMany({
    where: {
      status: "PUBLISHED",
      ...(hub.kind === "trade"
        ? { categoryId: hub.categoryId }
        : // A legacy row still stored as EDITORIAL reads as HOW_TO_CHOOSE, so
          // that hub asks for both rather than losing guides to a value the
          // backfill has not reached yet.
          hub.guideType === "HOW_TO_CHOOSE"
          ? { OR: [{ type: "HOW_TO_CHOOSE" }, { type: "EDITORIAL" }] }
          : { type: hub.guideType }),
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      heroImage: true,
      readingMinutes: true,
      type: true,
      typicalLow: true,
      typicalHigh: true,
      publishedAt: true,
      reviewedAt: true,
      updatedAt: true,
      category: { select: { serviceName: true, slug: true } },
      author: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    ...row,
    type: guideTypeOf(row.type),
    categoryName: row.category?.serviceName ?? null,
    categorySlug: row.category?.slug ?? null,
    authorName: row.author?.name ?? null,
  }));
}
