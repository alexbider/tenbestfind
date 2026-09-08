// Bringing older guides up to the current standard.
//
// The eight guides this site launched with were written before there was a
// writer, a research brief, a three thousand word floor, an answer-first
// opening, fifteen FAQs, contextual internal links or an editing pass. They are
// good and they are short, which on a site whose argument is depth is a problem
// that compounds.
//
// A rewrite is not a new guide. It replaces the one that exists, keeping the
// slug and therefore the URL, the author, the review history and the position
// in the sitemap. Writing a second page for a topic the site already covers is
// exactly the duplication this is meant to prevent.

import { db } from "./db";
import { guideTypeOf } from "./enums";
import { templateForGuideType } from "./guide-templates";

export type RewriteCandidate = {
  guideId: string;
  slug: string;
  title: string;
  /** What it currently targets, which is what the rewrite should keep winning. */
  keyword: string;
  words: number;
  faqs: number;
  hasJob: boolean;
};

/** Roughly how long a guide is, from the blocks it actually renders. */
function wordCount(body: string | null): number {
  if (!body) return 0;
  try {
    return JSON.stringify(JSON.parse(body))
      .replace(/[^A-Za-z' ]+/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1).length;
  } catch {
    return 0;
  }
}

/**
 * Every guide short of the current standard, shortest first.
 *
 * `floor` is the word count below which a guide is considered unfinished rather
 * than merely brief. A guide already carrying an open rewrite is listed but
 * flagged, so pressing the button twice does not queue it twice.
 */
export async function rewriteCandidates(floor = 3000): Promise<RewriteCandidate[]> {
  const guides = await db.guide.findMany({
    where: { status: { in: ["PUBLISHED", "REVIEW", "DRAFT"] } },
    select: {
      id: true,
      slug: true,
      title: true,
      body: true,
      _count: { select: { faqs: true } },
      rewrites: {
        where: { status: { notIn: ["FAILED", "CANCELLED", "PUBLISHED"] } },
        select: { id: true },
      },
    },
  });

  const meta = await db.seoMeta.findMany({
    where: { entityType: "guide", entityId: { in: guides.map((guide) => guide.id) } },
    select: { entityId: true, focusKeyword: true },
  });
  const keywordOf = new Map(meta.map((row) => [row.entityId, row.focusKeyword?.trim() ?? ""]));

  return guides
    .map((guide) => ({
      guideId: guide.id,
      slug: guide.slug,
      title: guide.title,
      // The phrase it already targets, or its own title, which is the closest
      // honest guess at what it was written to win.
      keyword: keywordOf.get(guide.id) || guide.title,
      words: wordCount(guide.body),
      faqs: guide._count.faqs,
      hasJob: guide.rewrites.length > 0,
    }))
    .filter((candidate) => candidate.words < floor || candidate.faqs < 15)
    .sort((a, b) => a.words - b.words);
}

/**
 * Queues a rewrite for each candidate that does not already have one.
 *
 * Spread across days rather than fired at once. Eight guides is eight research
 * calls and sixteen model calls, and a queue that empties over a week is easier
 * to read, easier to stop, and easier to judge: the first one back tells you
 * whether the rest are worth writing.
 */
export async function queueRewrites({
  candidates,
  everyHours = 24,
  startAt = new Date(),
}: {
  candidates: RewriteCandidate[];
  everyHours?: number;
  startAt?: Date;
}): Promise<{ queued: number; skipped: number }> {
  let queued = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    if (candidate.hasJob) {
      skipped += 1;
      continue;
    }

    const guide = await db.guide.findUnique({
      where: { id: candidate.guideId },
      select: { type: true, categoryId: true, countryId: true, regionId: true, cityId: true, title: true },
    });
    if (!guide) {
      skipped += 1;
      continue;
    }

    const guideType = guideTypeOf(guide.type);
    const templateId = await templateForGuideType(guideType);

    await db.guideJob.create({
      data: {
        topic: guide.title,
        keyword: candidate.keyword,
        guideType,
        templateId,
        categoryId: guide.categoryId,
        countryId: guide.countryId,
        regionId: guide.regionId,
        cityId: guide.cityId,
        rewriteOfId: candidate.guideId,
        scheduledFor: new Date(startAt.getTime() + queued * everyHours * 3_600_000),
        brief: [
          `This replaces the guide already published at /guides/${candidate.slug}/, which runs to about ${candidate.words.toLocaleString()} words and carries ${candidate.faqs} FAQs.`,
          "Keep what that page got right and keep the phrase it already ranks for. Everything else is yours: the opening, the structure, the depth, the tables, the questions.",
          "Do not repeat its shape out of deference. It was written short, and the reason this is being rewritten is that short was the problem.",
        ].join("\n\n"),
      },
    });
    queued += 1;
  }

  return { queued, skipped };
}
