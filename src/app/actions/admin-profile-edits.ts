"use server";

import { revalidatePath } from "next/cache";
import { announce } from "@/lib/announce";
import { audit, requireStaff } from "@/lib/auth";
import { recomputeCompleteness } from "@/lib/completeness";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { DESCRIPTION_EDIT, withDecision, type DescriptionEditPayload } from "@/lib/portal-profile";
import { routes } from "@/lib/urls";

/**
 * An editor's call on a description an owner sent from the portal. Approving
 * publishes the text as sent; to adjust it, approve and then edit the listing.
 */
export async function decideDescriptionEdit(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  const approve = formData.get("decision") === "approve";

  const submission = await db.submission.findFirst({
    where: { id, kind: DESCRIPTION_EDIT, status: { in: ["NEW", "IN_REVIEW"] } },
  });
  if (!submission) return;

  const payload = parseJson<Partial<DescriptionEditPayload>>(submission.payload, {});
  const business = payload.businessId
    ? await db.business.findUnique({ where: { id: payload.businessId } })
    : null;

  if (approve && business && payload.description) {
    await db.business.update({ where: { id: business.id }, data: { description: payload.description } });
    await recomputeCompleteness(business.id);
    revalidatePath(routes.business(business.slug));
    if (business.status === "PUBLISHED") announce([routes.business(business.slug)]);
  }

  const approved = approve && Boolean(business && payload.description);
  await db.submission.update({
    where: { id: submission.id },
    data: {
      status: approved ? "RESOLVED" : "CLOSED",
      resolvedAt: new Date(),
      payload: withDecision(submission.payload, approved ? "approved" : "declined"),
    },
  });

  await audit({
    userId: user.id,
    action: "decide",
    entityType: "submission",
    entityId: submission.id,
    summary: `${business?.name ?? "Unknown listing"}: owner description ${approved ? "approved" : "declined"}`,
  });

  revalidatePath("/admin/submissions");
  revalidatePath("/portal/profile");
}
