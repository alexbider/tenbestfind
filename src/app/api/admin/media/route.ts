import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { audit, getSession } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { canOptimize, optimizeImage } from "@/lib/image-pipeline";
import { MEDIA_DIR, MEDIA_PUBLIC_PATH, MEDIA_TYPES } from "@/lib/media";

export const runtime = "nodejs";

// What an editor may hand us, not what we store. A 20 MB phone photo is
// perfectly normal and comes out the other side of the pipeline at a few
// hundred kilobytes, so the old 8 MB ceiling was rejecting files it no
// longer had any reason to.
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }

  // The extension comes from the accepted type list, not the filename, so an
  // upload cannot name itself .html and be served back as a page. SVG is
  // deliberately absent: it can carry script, from our own origin.
  const extension = MEDIA_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "That file type is not accepted. Use JPEG, PNG, WebP, AVIF or GIF." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is larger than 20 MB." }, { status: 413 });
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
        userId: user.id,
        action: "create",
        entityType: "media",
        summary:
          `${path.basename(image.url)} ${image.width}x${image.height}, ` +
          `${Math.round(file.size / 1024)} KB in, ${Math.round(image.bytes / 1024)} KB out`,
      });
      return NextResponse.json({
        url: image.url,
        name: path.basename(image.url),
        size: image.bytes,
        width: image.width,
        height: image.height,
        originalSize: file.size,
      });
    } catch (error) {
      // A file sharp cannot read is stored as it came in rather than
      // rejected: an editor with an unusual image still gets their upload,
      // and the page still renders it.
      console.error("image optimisation failed, storing the original", error);
    }
  }

  const name = `${base.slice(0, 60)}-${randomBytes(4).toString("hex")}${extension}`;
  await mkdir(MEDIA_DIR, { recursive: true });
  await writeFile(path.join(MEDIA_DIR, name), bytes);

  const url = `${MEDIA_PUBLIC_PATH}/${name}`;
  await audit({
    userId: user.id,
    action: "create",
    entityType: "media",
    summary: `${name} (${Math.round(file.size / 1024)} KB, stored as uploaded)`,
  });

  return NextResponse.json({ url, name, size: file.size });
}
