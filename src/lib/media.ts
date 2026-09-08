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

/**
 * Pulls an image off somebody else's server and keeps a copy here.
 *
 * Pictures for guides are generated elsewhere, and a generator's CDN is not a
 * place to leave the only copy of an image a published page depends on. So the
 * bytes come here, once, and the page points at this site.
 *
 * The extension comes from the content type the server actually sent, never
 * from the URL, so a .jpg that is really something else is refused rather than
 * stored under a name that lies about it.
 */
export async function storeImageFromUrl(
  source: string,
  options: { maxBytes?: number; timeoutMs?: number } = {},
): Promise<{ path: string; bytes: number; type: string }> {
  const { randomBytes } = await import("node:crypto");
  const { mkdir, writeFile } = await import("node:fs/promises");

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new Error("That is not a valid URL.");
  }
  if (url.protocol !== "https:") throw new Error("The URL must be https.");

  const response = await fetch(url, { signal: AbortSignal.timeout(options.timeoutMs ?? 20_000) });
  if (!response.ok) throw new Error(`Fetching that image returned ${response.status}.`);

  const type = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  const extension = MEDIA_TYPES[type];
  if (!extension) {
    throw new Error(
      `${type || "That file"} is not an image type this site accepts. Allowed: ${Object.keys(MEDIA_TYPES).join(", ")}.`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const cap = options.maxBytes ?? 8 * 1024 * 1024;
  if (buffer.byteLength > cap) throw new Error(`That image is larger than ${Math.round(cap / 1024 / 1024)} MB.`);

  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}${extension}`;
  await mkdir(MEDIA_DIR, { recursive: true });
  await writeFile(path.join(MEDIA_DIR, name), buffer);

  return { path: `${MEDIA_PUBLIC_PATH}/${name}`, bytes: buffer.byteLength, type };
}
