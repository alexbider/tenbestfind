/**
 * Running every SEO record through the scorer again.
 *
 * A stored score answers the questions the scorer asked on the day it was
 * written. When the questions change, every score is stale, and seo_report
 * reads the stored number rather than recomputing, so "what should I improve"
 * gets answered from history until something touches each record.
 *
 * A record whose score does not move is left alone rather than rewritten with
 * the same value, which is what keeps this cheap enough to run on a schedule.
 */

import { db } from "./db";
import { analyzeSeo } from "./seo";
import { savedContent, slugForScoring } from "./seo-content";

export type RescoreResult = {
  scored: number;
  moved: number;
  unchanged: number;
  up: number;
  down: number;
  byType: Record<string, { moved: number; averageDelta: number }>;
};

export async function rescoreSeo(options: { write: boolean }): Promise<RescoreResult> {
  const records = await db.seoMeta.findMany({
    select: {
      id: true,
      entityType: true,
      entityId: true,
      title: true,
      description: true,
      focusKeyword: true,
      ogImage: true,
      score: true,
    },
  });

  let moved = 0;
  let unchanged = 0;
  let up = 0;
  let down = 0;
  const buckets = new Map<string, { moved: number; delta: number }>();

  for (const record of records) {
    const [content, slug] = await Promise.all([
      savedContent(record.entityType, record.entityId),
      slugForScoring(record.entityType, record.entityId),
    ]);

    const analysis = analyzeSeo({
      title: record.title,
      description: record.description,
      focusKeyword: record.focusKeyword,
      slug,
      content: content || record.description,
      hasImage: Boolean(record.ogImage),
      internalLinks: 3,
    });

    if (analysis.score === record.score) {
      unchanged += 1;
      continue;
    }

    const delta = analysis.score - record.score;
    moved += 1;
    if (delta > 0) up += 1;
    else down += 1;

    const bucket = buckets.get(record.entityType) ?? { moved: 0, delta: 0 };
    bucket.moved += 1;
    bucket.delta += delta;
    buckets.set(record.entityType, bucket);

    if (options.write) {
      await db.seoMeta.update({
        where: { id: record.id },
        data: { score: analysis.score, analysis: JSON.stringify(analysis.checks) },
      });
    }
  }

  const byType: RescoreResult["byType"] = {};
  for (const [type, bucket] of [...buckets.entries()].sort()) {
    byType[type] = {
      moved: bucket.moved,
      averageDelta: bucket.moved === 0 ? 0 : Math.round(bucket.delta / bucket.moved),
    };
  }

  return { scored: records.length, moved, unchanged, up, down, byType };
}
