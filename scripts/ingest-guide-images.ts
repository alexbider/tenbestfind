/**
 * Gives the seeded guides their pictures.
 *
 * Three jobs, all idempotent, all safe on every deploy:
 *
 *   The briefs from prisma/data/guide-illustrations.ts are written onto each
 *   guide, so the admin can show what was asked for and a later regeneration
 *   can match the set.
 *
 *   A figure block is inserted into the body for each inline picture, under the
 *   heading the brief names. A guide that already carries a figure for that key
 *   is left alone, so re-running never duplicates one and an editor who moved a
 *   figure keeps it where they put it.
 *
 *   Each image is fetched once into MEDIA_DIR through the image pipeline, and
 *   the resulting /uploads path is stored. Nothing on the page ever points at
 *   somebody else's CDN.
 *
 * A guide whose illustrations somebody has edited by hand is left entirely
 * alone. The briefs are editorial, and an editor's version of one is worth more
 * than this file's.
 *
 *   npx tsx scripts/ingest-guide-images.ts          dry run
 *   npx tsx scripts/ingest-guide-images.ts --yes    write
 */
import { mkdir } from "node:fs/promises";
import { db } from "../src/lib/db";
import { optimizeImage } from "../src/lib/image-pipeline";
import { MEDIA_DIR, MEDIA_PUBLIC_PATH } from "../src/lib/media";
import {
  GUIDE_ILLUSTRATIONS,
  type GuideChartSource,
  type GuideIllustrationSource,
} from "../prisma/data/guide-illustrations";
import { parseIllustrations, type Illustration } from "../src/lib/guide-images";
import { parseJson, stringify } from "../src/lib/json";
import type { GuideBlock } from "../prisma/data/editorial";

const write = process.argv.includes("--yes");

/** The filename an image is stored under, so a re-shoot replaces rather than piles up. */
function fileStem(slug: string, source: GuideIllustrationSource): string {
  const revision = source.revision ?? 1;
  return `guide-${slug}-${source.key}${revision > 1 ? `-r${revision}` : ""}`;
}

/** Already fetched at this revision? */
function isCurrent(stored: string | undefined, stem: string): boolean {
  return Boolean(stored?.startsWith(`${MEDIA_PUBLIC_PATH}/${stem}-`));
}

/**
 * Puts a figure block under the heading its brief names.
 *
 * After the first block of that section rather than immediately under the
 * heading, because a picture wedged between a heading and its opening sentence
 * reads as an interruption. A brief with no heading named goes at the end.
 */
function withFigure(blocks: GuideBlock[], source: GuideIllustrationSource): GuideBlock[] {
  if (blocks.some((block) => block.kind === "figure" && block.key === source.key)) return blocks;

  const figure: GuideBlock = {
    kind: "figure",
    key: source.key,
    alt: source.alt,
    ...(source.caption ? { caption: source.caption } : {}),
  };

  if (!source.after) return [...blocks, figure];

  const heading = blocks.findIndex((block) => block.kind === "heading" && block.id === source.after);
  if (heading === -1) return [...blocks, figure];

  const at = heading + 1 < blocks.length ? heading + 2 : heading + 1;
  return [...blocks.slice(0, at), figure, ...blocks.slice(at)];
}

/** How a stored unit reads as an axis label. */
const UNIT_LABEL: Record<string, string> = {
  project: "dollars per project",
  sq_ft: "dollars per square foot",
  hour: "dollars per hour",
  visit: "dollars per visit",
};

type CostRow = { label: string; lowPrice: number | null; highPrice: number | null; typical: number | null; unit: string; note: string | null };

/**
 * Builds a chart from the guide's own cost rows.
 *
 * The manifest names labels; every number comes from the record the page
 * already prints. A row that is missing, or has no range, is skipped rather
 * than guessed at, and a chart left with fewer than three rows is dropped
 * entirely: three bars is the point at which a chart says more than a
 * sentence would.
 */
function chartFrom(spec: GuideChartSource, costs: CostRow[]): GuideBlock | null {
  const byLabel = new Map(costs.map((row) => [row.label, row]));
  const rows: { label: string; low: number; high: number; note?: string }[] = [];
  const units = new Set<string>();

  for (const label of spec.rows) {
    const row = byLabel.get(label);
    if (!row || row.lowPrice === null || row.highPrice === null) continue;
    units.add(row.unit);
    rows.push({
      label: row.label,
      low: row.lowPrice,
      high: row.highPrice,
      ...(row.note ? { note: row.note } : {}),
    });
  }

  // Mixing dollars per project with dollars per square foot on one axis would
  // be a chart that lies about scale.
  if (rows.length < 3 || units.size !== 1) return null;

  return {
    kind: "chart",
    title: spec.title,
    unit: UNIT_LABEL[[...units][0]] ?? "dollars",
    ...(spec.intro ? { intro: spec.intro } : {}),
    ...(spec.note ? { note: spec.note } : {}),
    rows,
  };
}

/** Places a chart under the heading its spec names, once. */
function withChart(blocks: GuideBlock[], chart: GuideBlock, after?: string): GuideBlock[] {
  if (chart.kind !== "chart") return blocks;
  if (blocks.some((block) => block.kind === "chart" && block.title === chart.title)) return blocks;

  if (!after) return [...blocks, chart];
  const heading = blocks.findIndex((block) => block.kind === "heading" && block.id === after);
  if (heading === -1) return [...blocks, chart];

  const at = heading + 1 < blocks.length ? heading + 2 : heading + 1;
  return [...blocks.slice(0, at), chart, ...blocks.slice(at)];
}

async function main(): Promise<void> {
  await mkdir(MEDIA_DIR, { recursive: true });

  let fetched = 0;
  let already = 0;
  let placed = 0;
  let waiting = 0;
  let failed = 0;
  let untouched = 0;
  let charted = 0;

  for (const set of GUIDE_ILLUSTRATIONS) {
    const guide = await db.guide.findUnique({
      where: { slug: set.slug },
      select: {
        id: true,
        title: true,
        body: true,
        illustrations: true,
        costs: {
          orderBy: { sortOrder: "asc" },
          select: { label: true, lowPrice: true, highPrice: true, typical: true, unit: true, note: true },
        },
      },
    });
    if (!guide) {
      console.log(`  no guide called ${set.slug}`);
      continue;
    }

    const stored = parseIllustrations(guide.illustrations);
    const ours = new Set(set.images.map((image) => image.key));
    // A guide carrying illustrations this file does not know about has been
    // edited. Its briefs are somebody's work, not ours to overwrite.
    if (stored.length > 0 && stored.some((illustration) => !ours.has(illustration.key))) {
      console.log(`  ${set.slug}: illustrations edited by hand, left alone`);
      untouched += 1;
      continue;
    }

    const byKey = new Map(stored.map((illustration) => [illustration.key, illustration]));
    const next: Illustration[] = [];
    let blocks = parseJson<GuideBlock[]>(guide.body, []);
    const before = blocks.length;

    for (const source of set.images) {
      const stem = fileStem(set.slug, source);
      const existing = byKey.get(source.key);
      let path = isCurrent(existing?.path, stem) ? existing?.path : undefined;

      if (!path && source.url) {
        if (!write) {
          console.log(`  would fetch ${source.key}`);
          fetched += 1;
        } else {
          try {
            const response = await fetch(source.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const body = Buffer.from(await response.arrayBuffer());
            if (body.length === 0) throw new Error("empty body");
            const image = await optimizeImage(body, stem);
            path = image.url;
            console.log(`  fetched ${source.key} -> ${image.url}`);
            fetched += 1;
          } catch (error) {
            console.log(`  could not fetch ${source.key}: ${error instanceof Error ? error.message : error}`);
            failed += 1;
          }
        }
      } else if (path) {
        already += 1;
      } else if (!source.url) {
        // A brief with no picture yet. It still goes on the guide so the admin
        // can show what needs making.
        waiting += 1;
      }

      next.push({
        key: source.key,
        slot: source.slot,
        scene: source.scene,
        alt: source.alt,
        caption: source.caption,
        ...(path ? { path } : {}),
      });

      if (source.slot === "inline") blocks = withFigure(blocks, source);
    }

    for (const spec of set.charts ?? []) {
      const chart = chartFrom(spec, guide.costs);
      if (!chart) {
        console.log(`  ${set.slug}: chart "${spec.title}" skipped, its rows are not all present with ranges`);
        continue;
      }
      const grown = withChart(blocks, chart, spec.after);
      if (grown.length !== blocks.length) charted += 1;
      blocks = grown;
    }

    placed += blocks.length - before;

    if (write) {
      await db.guide.update({
        where: { id: guide.id },
        data: { illustrations: stringify(next), body: stringify(blocks) },
      });
    }
  }

  console.log(
    `guide images: ${fetched} ${write ? "fetched" : "to fetch"}, ${already} already there, ` +
      `${placed} blocks placed of which ${charted} charts, ${waiting} still to be made, ${failed} failed, ${untouched} left alone`,
  );
  if (!write) console.log("dry run. Pass --yes to write.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
