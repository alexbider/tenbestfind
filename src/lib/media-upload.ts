import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { audit } from "./auth";
import { slugify } from "./format";
import { canOptimize, optimizeImage } from "./image-pipeline";
import { MEDIA_DIR, MEDIA_PUBLIC_PATH, MEDIA_TYPES } from "./media";

// One uploaded image, checked and stored. The admin media endpoint and the
// owner portal both come through here, so the limits are the same for both.

// What someone may hand us, not what we store. A 20 MB phone photo is
// perfectly normal and comes out the other side of the pipeline at a few
// hundred kilobytes.
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export type StoredUpload = {
  url: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
  originalSize?: number;
};

export type UploadResult = { ok: true; image: StoredUpload } | { ok: false; error: string; status: number };

export async function storeUploadedImage(file: File, userId: string): Promise<UploadResult> {
  // The extension comes from the accepted type list, not the filename, so an
  // upload cannot name itself .html and be served back as a page. SVG is
  // deliberately absent: it can carry script, from our own origin.
  const extension = MEDIA_TYPES[file.type];
  if (!extension) {
    return { ok: false, error: "That file type is not accepted. Use JPEG, PNG, WebP, AVIF or GIF.", status: 415 };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "That file is larger than 20 MB.", status: 413 };
  }

  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
  const bytes = Buffer.from(await file.arrayBuffer());

  // Everything that can be re-encoded is, here, once, rather than asking
  // whoever uploads to have exported it correctly. What lands is a capped
  // WebP plus an AVIF and WebP ladder for the browser to choose from.
  if (canOptimize(file.type)) {
    try {
      const image = await optimizeImage(bytes, base);
      await audit({
        userId,
        action: "create",
        entityType: "media",
        summary:
          `${path.basename(image.url)} ${image.width}x${image.height}, ` +
          `${Math.round(file.size / 1024)} KB in, ${Math.round(image.bytes / 1024)} KB out`,
      });
      return {
        ok: true,
        image: {
          url: image.url,
          name: path.basename(image.url),
          size: image.bytes,
          width: image.width,
          height: image.height,
          originalSize: file.size,
        },
      };
    } catch (error) {
      // A file sharp cannot read is stored as it came in rather than
      // rejected: the upload still lands and the page still renders it.
      console.error("image optimisation failed, storing the original", error);
    }
  }

  const name = `${base.slice(0, 60)}-${randomBytes(4).toString("hex")}${extension}`;
  await mkdir(MEDIA_DIR, { recursive: true });
  await writeFile(path.join(MEDIA_DIR, name), bytes);

  await audit({
    userId,
    action: "create",
    entityType: "media",
    summary: `${name} (${Math.round(file.size / 1024)} KB, stored as uploaded)`,
  });

  return { ok: true, image: { url: `${MEDIA_PUBLIC_PATH}/${name}`, name, size: file.size } };
}
