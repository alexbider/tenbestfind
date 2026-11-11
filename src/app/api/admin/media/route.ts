import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { storeUploadedImage } from "@/lib/media-upload";

export const runtime = "nodejs";

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

  const result = await storeUploadedImage(file, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.image);
}
