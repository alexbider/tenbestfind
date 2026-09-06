/**
 * Re-encodes images that were stored before the pipeline existed, and points
 * their records at the optimised copies.
 *
 * The 80 hero images went in as 2752px PNGs, several megabytes each. This
 * walks every column that can hold one of our own uploads, and for any value
 * that is not already a pipeline URL, reads the file, runs it through the
 * pipeline and writes the new path back.
 *
 * Only our own uploads are touched. A value that points at somebody else's
 * host is left exactly as it is, because it is not ours to re-encode and the
 * file is not on this disk.
 *
 * The original file is left on disk rather than deleted. It costs a little
 * space and it means a URL someone has already cached, linked or pasted into
 * a page does not turn into a 404 the moment this runs.
 *
 *   npx tsx scripts/optimize-media.ts          dry run
 *   npx tsx scripts/optimize-media.ts --yes    write
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";
import { describeImage, optimizeImage } from "../src/lib/image-pipeline";
import { MEDIA_DIR, MEDIA_PUBLIC_PATH, contentTypeFor } from "../src/lib/media";

const write = process.argv.includes("--yes");

/**
 * Every column that can hold a URL this site produced. `read` returns the
 * records with something in that column; `set` writes one back.
 *
 * SeoMeta's og and twitter images and OAuthClient.logoUri are deliberately
 * absent: those are addresses handed to other systems, and are usually
 * absolute URLs pointing anywhere.
 */
const COLUMNS = [
  {
    label: "country.heroImage",
    read: () => db.country.findMany({ select: { id: true, heroImage: true, name: true } }),
    value: (row: { heroImage: string | null }) => row.heroImage,
    set: (id: string, url: string) => db.country.update({ where: { id }, data: { heroImage: url } }),
  },
  {
    label: "region.heroImage",
    read: () => db.region.findMany({ select: { id: true, heroImage: true, name: true } }),
    value: (row: { heroImage: string | null }) => row.heroImage,
    set: (id: string, url: string) => db.region.update({ where: { id }, data: { heroImage: url } }),
  },
  {
    label: "city.heroImage",
    read: () => db.city.findMany({ select: { id: true, heroImage: true, name: true } }),
    value: (row: { heroImage: string | null }) => row.heroImage,
    set: (id: string, url: string) => db.city.update({ where: { id }, data: { heroImage: url } }),
  },
  {
    label: "guide.heroImage",
    read: () => db.guide.findMany({ select: { id: true, heroImage: true, title: true } }),
    value: (row: { heroImage: string | null }) => row.heroImage,
    set: (id: string, url: string) => db.guide.update({ where: { id }, data: { heroImage: url } }),
  },
  {
    label: "post.heroImage",
    read: () => db.post.findMany({ select: { id: true, heroImage: true, title: true } }),
    value: (row: { heroImage: string | null }) => row.heroImage,
    set: (id: string, url: string) => db.post.update({ where: { id }, data: { heroImage: url } }),
  },
  {
    label: "business.logoUrl",
    read: () => db.business.findMany({ select: { id: true, logoUrl: true, name: true } }),
    value: (row: { logoUrl: string | null }) => row.logoUrl,
    set: (id: string, url: string) => db.business.update({ where: { id }, data: { logoUrl: url } }),
  },
  {
    label: "staffMember.photoUrl",
    read: () => db.staffMember.findMany({ select: { id: true, photoUrl: true, name: true } }),
    value: (row: { photoUrl: string | null }) => row.photoUrl,
    set: (id: string, url: string) => db.staffMember.update({ where: { id }, data: { photoUrl: url } }),
  },
  {
    label: "credential.imageUrl",
    read: () => db.credential.findMany({ select: { id: true, imageUrl: true, label: true } }),
    value: (row: { imageUrl: string | null }) => row.imageUrl,
    set: (id: string, url: string) => db.credential.update({ where: { id }, data: { imageUrl: url } }),
  },
] as const;

/** Already optimised, or not one of ours, or missing from the disk. */
type Skip = "optimised" | "external" | "missing" | "unreadable";

const cache = new Map<string, string>();

async function reencode(url: string): Promise<{ url: string; before: number; after: number } | Skip> {
  if (!url.startsWith(`${MEDIA_PUBLIC_PATH}/`)) return "external";
  if (describeImage(url)) return "optimised";

  // The same file can be referenced by more than one record; encode it once.
  const done = cache.get(url);
  if (done) return { url: done, before: 0, after: 0 };

  const filename = url.slice(MEDIA_PUBLIC_PATH.length + 1);
  const file = path.resolve(MEDIA_DIR, filename);
  const root = path.resolve(MEDIA_DIR);
  if (file !== root && !file.startsWith(root + path.sep)) return "external";
  if (!contentTypeFor(filename)) return "unreadable";

  let bytes: Buffer;
  let before: number;
  try {
    before = (await stat(file)).size;
    bytes = await readFile(file);
  } catch {
    return "missing";
  }

  const base = filename.replace(/\.[^.]+$/, "").replace(/-[0-9a-f]{8}$/i, "");
  const image = await optimizeImage(bytes, base);
  cache.set(url, image.url);
  return { url: image.url, before, after: image.bytes };
}

async function main(): Promise<void> {
  let changed = 0;
  let skipped = 0;
  let failed = 0;
  let before = 0;
  let after = 0;

  for (const column of COLUMNS) {
    const rows = (await column.read()) as Record<string, unknown>[];
    for (const row of rows) {
      const url = column.value(row as never);
      if (!url) continue;

      if (!write) {
        if (!url.startsWith(`${MEDIA_PUBLIC_PATH}/`) || describeImage(url)) {
          skipped += 1;
          continue;
        }
        console.log(`  would re-encode ${column.label} ${url}`);
        changed += 1;
        continue;
      }

      try {
        const result = await reencode(url);
        if (typeof result === "string") {
          skipped += 1;
          if (result === "missing") console.log(`  ${column.label}: ${url} is not on disk`);
          continue;
        }
        await column.set(row.id as string, result.url);
        before += result.before;
        after += result.after;
        changed += 1;
        if (result.before > 0) {
          console.log(
            `  ${column.label}: ${Math.round(result.before / 1024)} KB -> ` +
              `${Math.round(result.after / 1024)} KB  ${result.url}`,
          );
        }
      } catch (error) {
        console.log(`  ${column.label}: ${url} failed (${String(error)})`);
        failed += 1;
      }
    }
  }

  const saved = before > 0 ? Math.round((1 - after / before) * 100) : 0;
  console.log(
    `media: ${changed} ${write ? "re-encoded" : "to re-encode"}, ${skipped} left alone, ${failed} failed` +
      (before > 0
        ? `, ${Math.round(before / 1024 / 1024)} MB -> ${Math.round(after / 1024 / 1024)} MB (${saved}% smaller)`
        : ""),
  );
  if (!write) console.log("dry run. Pass --yes to write.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
