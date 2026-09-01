import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { contentTypeFor, MEDIA_DIR } from "@/lib/media";

export const runtime = "nodejs";

type Props = { params: Promise<{ path: string[] }> };

/**
 * Serves an uploaded file. Uploads are not in public/, because Next reads that
 * directory at boot and a file written afterwards would 404 until a restart.
 *
 * Names are generated on upload, so a request for anything that resolves
 * outside the media directory, or that is not an image type we accept, is a
 * request for something we did not write. It gets a 404 rather than an
 * explanation.
 */
export async function GET(_request: Request, { params }: Props) {
  const { path: segments } = await params;
  const requested = path.join(...segments);

  const type = contentTypeFor(requested);
  if (!type) return new NextResponse(null, { status: 404 });

  const root = path.resolve(MEDIA_DIR);
  const file = path.resolve(root, requested);
  if (file !== root && !file.startsWith(root + path.sep)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const info = await stat(file);
    if (!info.isFile()) return new NextResponse(null, { status: 404 });
    const body = await readFile(file);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(info.size),
        // The filename carries a random suffix, so a given URL never changes.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
