"use server";

import { revalidatePath } from "next/cache";
import { audit, requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { onListingRejected } from "@/lib/listing-lifecycle";
import { resolveReview, reviewListing } from "@/lib/listing-verify";
import { routes } from "@/lib/urls";

async function refresh(id: string) {
  const business = await db.business.findUnique({ where: { id }, select: { slug: true } });
  revalidatePath(`/admin/businesses/${id}`);
  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
  if (business) revalidatePath(routes.business(business.slug));
}

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
    summary: `Website checks run again: ${review.verdict === "APPROVED" ? "passed" : "flagged"}`,
  });
  await refresh(id);
}

/** Keeps a flagged listing live: an editor looked and it is fine. */
export async function approveFlaggedListing(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  await resolveReview(id, "APPROVED", user.name);
  await audit({ userId: user.id, action: "approve", entityType: "business", entityId: id, summary: "Flagged listing checked and kept live" });
  await refresh(id);
}

/** Declines a flagged listing: it comes down, the plan is cancelled and the payment refunded. */
export async function rejectFlaggedListing(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const previous = await db.business.findUnique({ where: { id }, select: { status: true, name: true } });
  if (!previous) return;
  await db.business.update({ where: { id }, data: { status: "REJECTED" } });
  const outcome = previous.status === "REJECTED" ? null : await onListingRejected(id);
  await resolveReview(id, "REJECTED", user.name);
  await audit({
    userId: user.id,
    action: "reject",
    entityType: "business",
    entityId: id,
    summary: outcome?.refundFailures.length
      ? `${previous.name} declined; refund failed: ${outcome.refundFailures.join("; ")}`
      : `${previous.name} declined, taken down${outcome?.refunded ? " and refunded" : ""}`,
  });
  await refresh(id);
}
