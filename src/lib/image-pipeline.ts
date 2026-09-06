import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MAX_EDGE, widthsFor } from "./image-srcset";
import { MEDIA_DIR, MEDIA_PUBLIC_PATH } from "./media";

export { describeImage, LADDER, MAX_EDGE, srcSetFor, widthsFor } from "./image-srcset";

/**
 * Every image that enters the site goes through here.
 *
 * The hero images arrived as 2752x1536 PNGs, several megabytes each, dropped
 * whole into slots a few hundred pixels wide. That is three separate problems
 * at once: the wrong format for a photograph, far more pixels than any screen
 * asks for, and no way for the browser to pick a smaller copy. This module
 * fixes all three at the point of storage, so nothing downstream has to
 * remember to.
 *
 * What comes out, for one input:
 *
 *   plumber-a1b2c3d4-1920x1080.webp      the canonical file, stored on the record
 *   plumber-a1b2c3d4-1920x1080-480.webp  the ladder, in two modern formats
 *   plumber-a1b2c3d4-1920x1080-480.avif
 *   ...768, 1200, 1600, 1920
 *
 * The intrinsic size is in the filename on purpose. It means a template can
 * write correct `width`/`height` attributes and a complete `srcset` from the
 * URL alone, with no database column, no sidecar file and no filesystem read
 * while rendering a page.
 *
 * AVIF first, WebP second, and no JPEG fallback: between them the two modern
 * formats cover effectively every browser in use, and a third copy of every
 * image costs disk and cache space to serve a rounding error of traffic.
 */

/**
 * Quality settings. These are the "you cannot see it, the network can" band:
 * AVIF is a different scale from JPEG, where 50 is roughly a JPEG 80, and
 * WebP sits close to JPEG's numbering.
 */
const AVIF = { quality: 50, effort: 4 } as const;
const WEBP = { quality: 80, effort: 4 } as const;

export type OptimizedImage = {
  /** The path to store on the record, e.g. `/uploads/x-a1b2-1920x1080.webp`. */
  url: string;
  width: number;
  height: number;
  /** Bytes of the canonical file, for reporting. */
  bytes: number;
  /** Bytes of everything written, canonical and ladder. */
  totalBytes: number;
  /** Widths actually produced. */
  widths: number[];
};

/** Formats we re-encode. A GIF may be animated, so it is passed through. */
export function canOptimize(contentType: string): boolean {
  return contentType === "image/jpeg" || contentType === "image/png" || contentType === "image/webp" || contentType === "image/avif";
}

/**
 * Re-encodes one image into the ladder and writes it to MEDIA_DIR.
 *
 * `baseName` is a slug, without extension or dimensions; a short random suffix
 * is added so a re-upload of the same name never collides with, or silently
 * replaces, an image already being served from a cached URL.
 */
export async function optimizeImage(input: Buffer, baseName: string): Promise<OptimizedImage> {
  await mkdir(MEDIA_DIR, { recursive: true });

  // `rotate()` with no argument applies the EXIF orientation and then drops
  // it, so a photo taken sideways is stored the way it is meant to be seen.
  // Everything else in the metadata (camera, GPS, timestamps) goes with it,
  // which is bytes saved and a privacy leak closed.
  const source = sharp(input, { failOn: "none" }).rotate();
  const meta = await source.metadata();
  const sourceWidth = meta.width ?? 0;
  const sourceHeight = meta.height ?? 0;
  if (!sourceWidth || !sourceHeight) throw new Error("could not read the image dimensions");

  // Fit inside the cap without growing anything: an image smaller than the cap
  // keeps its own size, because upscaling invents detail and costs bytes.
  const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const stem = `${baseName.slice(0, 60)}-${randomBytes(4).toString("hex")}-${width}x${height}`;

  const resized = (target: number) =>
    sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: target, withoutEnlargement: true, fit: "inside" });

  const canonical = await resized(width).webp(WEBP).toBuffer();
  await writeFile(path.join(MEDIA_DIR, `${stem}.webp`), canonical);
  let totalBytes = canonical.length;

  // The ladder stops at the stored width: a browser is never offered a copy
  // that would have to be upscaled to fill its slot.
  const widths = widthsFor(width);

  for (const target of widths) {
    const [webp, avif] = await Promise.all([
      resized(target).webp(WEBP).toBuffer(),
      resized(target).avif(AVIF).toBuffer(),
    ]);
    await writeFile(path.join(MEDIA_DIR, `${stem}-${target}.webp`), webp);
    await writeFile(path.join(MEDIA_DIR, `${stem}-${target}.avif`), avif);
    totalBytes += webp.length + avif.length;
  }

  return {
    url: `${MEDIA_PUBLIC_PATH}/${stem}.webp`,
    width,
    height,
    bytes: canonical.length,
    totalBytes,
    widths,
  };
}
