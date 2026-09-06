/**
 * Pulls the hero images named in prisma/data/hero-images.ts into our own
 * media directory and points the records at them.
 *
 * Two things it deliberately does not do. It never overwrites a heroImage
 * that already holds a value, so anything an editor set by hand or uploaded
 * through the admin survives. And it never leaves the source URL on a
 * record: either the file is fetched and the record gets a local
 * `/uploads/...` path, or the record is left null and the placeholder keeps
 * showing. A hero pointing at somebody else's CDN is a broken image waiting
 * for their retention policy.
 *
 * Everything fetched goes through the image pipeline before it is stored, so
 * a 2752px PNG becomes a capped WebP with an AVIF and WebP ladder beside it.
 *
 * It is safe to run on every deploy: a record that already has an image is
 * skipped, so nothing is fetched twice.
 *
 *   npx tsx scripts/ingest-hero-images.ts          dry run
 *   npx tsx scripts/ingest-hero-images.ts --yes    write
 */
import { mkdir } from "node:fs/promises";
import { db } from "../src/lib/db";
import { optimizeImage } from "../src/lib/image-pipeline";
import { MEDIA_DIR } from "../src/lib/media";
import { HERO_IMAGES, type HeroImageSource } from "../prisma/data/hero-images";

const write = process.argv.includes("--yes");

/** A readable stem; the pipeline adds its own hash and dimensions. */
function baseNameFor(source: HeroImageSource): string {
  const slug = source.key.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `hero-${source.kind}-${slug}`;
}

/** Resolves the record this source belongs to, or null if it is not here. */
async function findTarget(source: HeroImageSource) {
  const parts = source.key.split("/");

  if (source.kind === "country") {
    const row = await db.country.findUnique({ where: { code: parts[0] } });
    return row ? { id: row.id, current: row.heroImage, label: row.name } : null;
  }

  if (source.kind === "guide") {
    const row = await db.guide.findUnique({ where: { slug: source.key } });
    return row ? { id: row.id, current: row.heroImage, label: row.title } : null;
  }

  if (source.kind === "region") {
    const row = await db.region.findFirst({
      where: { slug: parts[1], country: { code: parts[0] } },
    });
    return row ? { id: row.id, current: row.heroImage, label: row.name } : null;
  }

  const row = await db.city.findFirst({
    where: { slug: parts[2], region: { slug: parts[1], country: { code: parts[0] } } },
  });
  return row ? { id: row.id, current: row.heroImage, label: row.name } : null;
}

async function save(id: string, kind: HeroImageSource["kind"], url: string): Promise<void> {
  if (kind === "country") await db.country.update({ where: { id }, data: { heroImage: url } });
  else if (kind === "region") await db.region.update({ where: { id }, data: { heroImage: url } });
  else if (kind === "city") await db.city.update({ where: { id }, data: { heroImage: url } });
  else await db.guide.update({ where: { id }, data: { heroImage: url } });
}

async function main(): Promise<void> {
  await mkdir(MEDIA_DIR, { recursive: true });

  let filled = 0;
  let already = 0;
  let unknown = 0;
  let failed = 0;

  for (const source of HERO_IMAGES) {
    const target = await findTarget(source);
    if (!target) {
      console.log(`  no record for ${source.kind} ${source.key}`);
      unknown += 1;
      continue;
    }
    if (target.current) {
      already += 1;
      continue;
    }

    if (!write) {
      console.log(`  would fetch ${source.key}`);
      filled += 1;
      continue;
    }

    try {
      const response = await fetch(source.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length === 0) throw new Error("empty body");

      const image = await optimizeImage(body, baseNameFor(source));
      await save(target.id, source.kind, image.url);
      console.log(
        `  ${target.label} -> ${image.url} ` +
          `(${Math.round(body.length / 1024)} KB in, ${Math.round(image.bytes / 1024)} KB out)`,
      );
      filled += 1;
    } catch (error) {
      // A hero nobody can fetch is not worth failing a deploy over: the
      // placeholder is a perfectly good fallback and the next run retries.
      console.log(`  ${source.key}: could not fetch (${String(error)})`);
      failed += 1;
    }
  }

  console.log(
    `hero images: ${filled} ${write ? "set" : "to set"}, ${already} already had one, ` +
      `${unknown} with no matching record, ${failed} failed`,
  );
  if (!write) console.log("dry run. Pass --yes to write.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
