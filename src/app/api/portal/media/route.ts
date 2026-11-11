import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { storeUploadedImage } from "@/lib/media-upload";
import { MAX_OWNER_PHOTOS, afterOwnerEdit, editableBusiness } from "@/lib/portal-profile";

export const runtime = "nodejs";

// An owner adding a photo or a logo to their own listing. The file goes through
// the same checks and the same optimiser as an editor's upload, and is attached
// to the listing in the same request, so an owner cannot fill the media folder
// with images that belong to nothing.

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in again to upload." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const target = form?.get("target") === "logo" ? "logo" : "photo";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }

  const business = await editableBusiness(user, String(form?.get("businessId") ?? ""));
  if (!business) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  if (target === "photo") {
    const count = await db.businessPhoto.count({ where: { businessId: business.id } });
    if (count >= MAX_OWNER_PHOTOS) {
      return NextResponse.json(
        { error: `A profile can hold ${MAX_OWNER_PHOTOS} photos. Remove one first.` },
        { status: 409 },
      );
    }
  }

  const result = await storeUploadedImage(file, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  if (target === "logo") {
    await db.business.update({ where: { id: business.id }, data: { logoUrl: result.image.url } });
    await afterOwnerEdit(user, business, "logo uploaded");
  } else {
    const last = await db.businessPhoto.aggregate({
      where: { businessId: business.id },
      _max: { sortOrder: true },
    });
    await db.businessPhoto.create({
      data: {
        businessId: business.id,
        url: result.image.url,
        alt: String(form?.get("alt") ?? "").trim().slice(0, 200) || null,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    await afterOwnerEdit(user, business, "photo added");
  }

  return NextResponse.json({ url: result.image.url });
}
