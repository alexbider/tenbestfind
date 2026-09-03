"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireOwner } from "@/lib/auth";
import { LEAD_STATUSES } from "@/lib/leads";
import { db } from "@/lib/db";

// Everything a company owner can change from the portal. Each action re-checks
// that the row belongs to a company on their account rather than trusting the
// id that arrived with the form.

async function ownLead(leadId: string) {
  const user = await requireOwner();
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: { business: { select: { id: true, ownerId: true } } },
  });
  if (!lead) return null;

  const staff = user.role === "ADMIN" || user.role === "EDITOR";
  if (!staff && lead.business.ownerId !== user.id) return null;
  return { user, lead };
}

const statusSchema = z.enum(LEAD_STATUSES);

/** Moves a lead along the owner's own pipeline. */
export async function setOwnLeadStatus(formData: FormData) {
  const owned = await ownLead(String(formData.get("id")));
  if (!owned) return;

  const parsed = statusSchema.safeParse(String(formData.get("status")));
  if (!parsed.success) return;

  await db.lead.update({
    where: { id: owned.lead.id },
    data: { status: parsed.data, ownerReadAt: owned.lead.ownerReadAt ?? new Date() },
  });
  await audit({
    userId: owned.user.id,
    action: "update",
    entityType: "lead",
    entityId: owned.lead.id,
    summary: `owner set ${parsed.data.toLowerCase()}`,
  });
  revalidatePath("/portal/leads");
  revalidatePath(`/portal/leads/${owned.lead.id}`);
}

/** The owner's own note on a job, and what it was worth if they won it. */
export async function saveOwnLeadNote(formData: FormData) {
  const owned = await ownLead(String(formData.get("id")));
  if (!owned) return;

  const notes = String(formData.get("notes") ?? "").slice(0, 4000);
  const rawValue = String(formData.get("value") ?? "").trim();
  const value = rawValue ? Math.round(Number(rawValue) * 100) : null;

  await db.lead.update({
    where: { id: owned.lead.id },
    data: {
      notes: notes || null,
      valueCents: value !== null && Number.isFinite(value) && value >= 0 ? value : null,
    },
  });
  revalidatePath(`/portal/leads/${owned.lead.id}`);
}

/** Marks a lead as read the first time its detail page is opened. */
export async function markLeadRead(leadId: string) {
  const owned = await ownLead(leadId);
  if (!owned || owned.lead.ownerReadAt) return;
  await db.lead.update({
    where: { id: leadId },
    data: {
      ownerReadAt: new Date(),
      status: owned.lead.status === "NEW" ? "VIEWED" : owned.lead.status,
    },
  });
}
