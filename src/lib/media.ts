import path from "node:path";

/**
 * Where uploads live and how they are addressed.
 *
 * They deliberately do not live in public/: Next reads that directory once at
 * boot, so a file written afterwards would 404 until the next restart. They are
 * written to a plain directory and served by a route handler instead, which
 * also means MEDIA_DIR can point at a mounted volume, and MEDIA_PUBLIC_PATH at
 * a CDN, without touching any of the code that stores a URL.
 */
export const MEDIA_DIR = process.env.MEDIA_DIR ?? path.join(process.cwd(), "media");
export const MEDIA_PUBLIC_PATH = process.env.MEDIA_PUBLIC_PATH ?? "/uploads";

export const MEDIA_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
};

const BY_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(MEDIA_TYPES).map(([type, extension]) => [extension, type]),
);

export function contentTypeFor(filename: string): string | null {
  return BY_EXTENSION[path.extname(filename).toLowerCase()] ?? null;
}
