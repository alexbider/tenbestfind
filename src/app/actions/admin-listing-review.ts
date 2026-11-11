"use server";

import { revalidatePath } from "next/cache";
import { audit, requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviewListing } from "@/lib/listing-verify";
import { routes } from "@/lib/urls";

/** Runs the website checks again, for example after the owner fixed their details. */
export async function rerunListingReview(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const review = await reviewListing(id);
  await audit({
    userId: user.id,
    action: "review",
    entityType: "business",
    entityId: id,
    summary: `Website checks run again: ${review.published ? "published" : review.verdict.toLowerCase()}`,
  });
  const business = await db.business.findUnique({ where: { id }, select: { slug: true } });
  revalidatePath(`/admin/businesses/${id}`);
  revalidatePath("/admin/businesses");
  if (business) revalidatePath(routes.business(business.slug));
}
