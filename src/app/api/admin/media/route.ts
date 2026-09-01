import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { audit, getSession } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { MEDIA_DIR, MEDIA_PUBLIC_PATH, MEDIA_TYPES } from "@/lib/media";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

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
    return NextResponse.json({ error: "That file is larger than 8 MB." }, { status: 413 });
  }

  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
  const name = `${base.slice(0, 60)}-${randomBytes(4).toString("hex")}${extension}`;

  await mkdir(MEDIA_DIR, { recursive: true });
  await writeFile(path.join(MEDIA_DIR, name), Buffer.from(await file.arrayBuffer()));

  const url = `${MEDIA_PUBLIC_PATH}/${name}`;
  await audit({
    userId: user.id,
    action: "create",
    entityType: "media",
    summary: `${name} (${Math.round(file.size / 1024)} KB)`,
  });

  return NextResponse.json({ url, name, size: file.size });
}
