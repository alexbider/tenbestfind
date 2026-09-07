/**
 * Pulls the hero images named in prisma/data/hero-images.ts into our own
 * media directory and points the records at them.
 *
 * It only ever touches an image of its own. A record whose heroImage was set
 * by hand or uploaded through the admin is left exactly as it is, because the
 * filename says whose it is. And it never leaves the source URL on a record:
 * either the file is fetched and the record gets a local `/uploads/...` path,
 * or the record is left null and the placeholder keeps showing. A hero
 * pointing at somebody else's CDN is a broken image waiting for their
 * retention policy.
 *
 * Everything fetched goes through the image pipeline before it is stored, so
 * a 2752px PNG becomes a capped WebP with an AVIF and WebP ladder beside it.
 *
 * It is safe to run on every deploy: a record already holding the current
 * revision of its image is skipped, so nothing is fetched twice.
 *
 *   npx tsx scripts/ingest-hero-images.ts          dry run
 *   npx tsx scripts/ingest-hero-images.ts --yes    write
 */
import { mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";
import { optimizeImage } from "../src/lib/image-pipeline";
import { MEDIA_DIR, MEDIA_PUBLIC_PATH } from "../src/lib/media";
import { HERO_IMAGES, type HeroImageSource } from "../prisma/data/hero-images";

const write = process.argv.includes("--yes");

/**
 * The two names a source answers to.
 *
 * `family` is every image this source has ever produced; `base` is the one it
 * produces now. Between them they replace a schema change: a stored value
 * starting with `base` is already current and is skipped, one starting with
 * `family` is an older revision and is replaced, and anything else belongs to
 * somebody else and is never touched. Re-shooting an image is then a matter
 * of bumping `revision` in the data file.
 */
function namesFor(source: HeroImageSource): { base: string; family: string } {
  const slug = source.key.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const family = `hero-${source.kind}-${slug}`;
  const revision = source.revision ?? 1;
  return { base: revision > 1 ? `${family}-r${revision}` : family, family };
}

/** How a stored value relates to what this source would write now. */
function statusOf(stored: string | null, names: { base: string; family: string }): "empty" | "current" | "stale" | "theirs" {
  if (!stored) return "empty";
  if (stored.startsWith(`${MEDIA_PUBLIC_PATH}/${names.base}-`)) return "current";
  if (stored.startsWith(`${MEDIA_PUBLIC_PATH}/${names.family}`)) return "stale";
  return "theirs";
}

/**
 * Deletes a superseded image and every derivative beside it. The stem carries
 * a random hash, so nothing else on disk can share the prefix. A file that has
 * already gone is not an error.
 */
async function removeLocalImage(url: string | null): Promise<number> {
  if (!url?.startsWith(`${MEDIA_PUBLIC_PATH}/`)) return 0;
  const filename = url.slice(MEDIA_PUBLIC_PATH.length + 1);
  if (filename.includes("/")) return 0;
  const stem = filename.replace(/\.[^.]+$/, "");

  let entries: string[];
  try {
    entries = await readdir(MEDIA_DIR);
  } catch {
    return 0;
  }

  let removed = 0;
  for (const entry of entries) {
    if (entry !== filename && !entry.startsWith(`${stem}-`) && !entry.startsWith(`${stem}.`)) continue;
    try {
      await unlink(path.join(MEDIA_DIR, entry));
      removed += 1;
    } catch {
      // Already gone, or not ours to delete. Either way there is nothing to do.
    }
  }
  return removed;
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
  let replaced = 0;
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

    const names = namesFor(source);
    const status = statusOf(target.current, names);
    if (status === "current" || status === "theirs") {
      already += 1;
      continue;
    }

    if (!write) {
      console.log(`  would ${status === "stale" ? "replace" : "fetch"} ${source.key}`);
      if (status === "stale") replaced += 1;
      else filled += 1;
      continue;
    }

    try {
      const response = await fetch(source.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length === 0) throw new Error("empty body");

      const image = await optimizeImage(body, names.base);
      await save(target.id, source.kind, image.url);

      // Only once the record points at the new file, so a crash in between
      // leaves a working page rather than a dangling path.
      const swept = status === "stale" ? await removeLocalImage(target.current) : 0;

      console.log(
        `  ${target.label} -> ${image.url} ` +
          `(${Math.round(body.length / 1024)} KB in, ${Math.round(image.bytes / 1024)} KB out` +
          `${swept > 0 ? `, ${swept} old files removed` : ""})`,
      );
      if (status === "stale") replaced += 1;
      else filled += 1;
    } catch (error) {
      // A hero nobody can fetch is not worth failing a deploy over: the
      // placeholder is a perfectly good fallback and the next run retries.
      console.log(`  ${source.key}: could not fetch (${String(error)})`);
      failed += 1;
    }
  }

  console.log(
    `hero images: ${filled} ${write ? "set" : "to set"}, ${replaced} ${write ? "replaced" : "to replace"}, ` +
      `${already} left alone, ${unknown} with no matching record, ${failed} failed`,
  );
  if (!write) console.log("dry run. Pass --yes to write.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
