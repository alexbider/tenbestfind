import "server-only";
import { revalidatePath } from "next/cache";
import { announce } from "./announce";
import { audit, type SessionUser } from "./auth";
import { recomputeCompleteness } from "./completeness";
import { db } from "./db";
import { routes } from "./urls";

// What the owner profile editor needs on the server side, outside the actions
// file so the upload route can share it.

export const DESCRIPTION_EDIT = "DESCRIPTION_EDIT";
export const MAX_OWNER_PHOTOS = 30;

/**
 * The company this session may edit, or null. An owner gets only their own
 * listing; staff get any claimed listing, the same set `ownedBusinesses`
 * shows them in the portal.
 */
export async function editableBusiness(user: SessionUser, businessId: string) {
  if (!businessId) return null;
  const staff = user.role === "ADMIN" || user.role === "EDITOR";
  return db.business.findFirst({
    where: { id: businessId, ...(staff ? { claimed: true } : { ownerId: user.id }) },
  });
}

/** The marker stored at the front of a description edit's payload. */
export function descriptionEditKey(businessId: string) {
  return `{"businessId":${JSON.stringify(businessId)}`;
}

export type DescriptionEditPayload = {
  businessId: string;
  description: string;
  previous: string | null;
};

/** Records how a description edit ended, keeping businessId at the front. */
export function withDecision(payload: string | null, decision: "approved" | "declined" | "withdrawn") {
  let parsed: Partial<DescriptionEditPayload> = {};
  try {
    parsed = JSON.parse(payload ?? "{}") as Partial<DescriptionEditPayload>;
  } catch {
    // keep going with what we have
  }
  const { businessId, ...rest } = parsed;
  return JSON.stringify({ businessId, ...rest, decision });
}

/** The description change still waiting for an editor, if any. */
export function pendingDescriptionEdit(businessId: string) {
  return db.submission.findFirst({
    where: {
      kind: DESCRIPTION_EDIT,
      status: { in: ["NEW", "IN_REVIEW"] },
      payload: { startsWith: descriptionEditKey(businessId) },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** After a change the public can see: rescore, refresh the page, log it. */
export async function afterOwnerEdit(
  user: SessionUser,
  business: { id: string; slug: string; status: string; name: string },
  summary: string,
) {
  await recomputeCompleteness(business.id);
  await audit({
    userId: user.id,
    action: "update",
    entityType: "business",
    entityId: business.id,
    summary: `${business.name}: ${summary} (owner portal)`,
  });
  revalidatePath(routes.business(business.slug));
  revalidatePath("/portal/profile");
  if (business.status === "PUBLISHED") announce([routes.business(business.slug)]);
}
