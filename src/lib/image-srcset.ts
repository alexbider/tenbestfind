/**
 * Reading the pipeline's filenames back, for whoever is rendering an image.
 *
 * This is deliberately separate from `image-pipeline.ts`. That module needs
 * sharp and the filesystem, and the moment a component imports it the bundler
 * tries to follow `node:fs` and `node:child_process` into the browser. What a
 * template actually needs is arithmetic on a string, which is all this is.
 */

/** Widths a browser may choose from. Anything above the source is skipped. */
export const LADDER: number[] = [480, 768, 1200, 1600, 1920];

/**
 * Nothing is stored larger than this on the longest side. A 2752px hero is
 * about four times the pixels a 1440px laptop can show in a full-bleed band,
 * and every one of them is paid for on a phone.
 */
export const MAX_EDGE = 1920;

/**
 * Reads back what the filename records, for a URL this pipeline produced.
 * Returns null for anything else, so an older upload or an external URL falls
 * through to being rendered as a plain image.
 */
export function describeImage(url: string): { stem: string; width: number; height: number } | null {
  const match = /^(.*)-(\d+)x(\d+)\.(?:webp|avif|jpg|jpeg|png)$/i.exec(url);
  if (!match) return null;
  return { stem: `${match[1]}-${match[2]}x${match[3]}`, width: Number(match[2]), height: Number(match[3]) };
}

/** The widths actually written for an image of this stored width. */
export function widthsFor(width: number): number[] {
  const widths = LADDER.filter((w) => w < width);
  if (!widths.includes(width)) widths.push(width);
  return widths;
}

/** The `srcset` for one format, given a URL this pipeline produced. */
export function srcSetFor(url: string, format: "avif" | "webp"): string | null {
  const info = describeImage(url);
  if (!info) return null;
  return widthsFor(info.width)
    .map((w) => `${info.stem}-${w}.${format} ${w}w`)
    .join(", ");
}
