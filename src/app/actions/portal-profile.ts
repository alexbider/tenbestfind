"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireOwner } from "@/lib/auth";
import { hoursFromForm, idsFromForm, replaceAreas, replaceServices } from "@/lib/business-edits";
import { db } from "@/lib/db";
import { parseRows } from "@/lib/json";
import {
  DESCRIPTION_EDIT,
  afterOwnerEdit,
  editableBusiness,
  pendingDescriptionEdit,
  withDecision,
  type DescriptionEditPayload,
} from "@/lib/portal-profile";
import { routes } from "@/lib/urls";
import type { ActionState } from "./admin-content";

// What an owner can change about their own listing. Contact details, hours,
// services, areas, licence, insurance and photos go live on save. The
// description goes to an editor first. Ranking position and the editorial
// summary are not here at all.
//
// Every action re-checks that the company belongs to this account rather than
// trusting the id that came with the form.

const ok = (message: string): ActionState => ({ status: "ok", message });
const fail = (message: string): ActionState => ({ status: "error", message });

async function ownBusiness(formData: FormData) {
  const user = await requireOwner();
  const business = await editableBusiness(user, String(formData.get("businessId") ?? ""));
  return business ? { user, business } : null;
}

/** Accepts "example.com" as well as a full address, and stores the full one. */
function normaliseWebsite(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

const detailsSchema = z.object({
  phone: z.string().trim().max(40, "Phone number is too long."),
  website: z.string().trim().max(300, "Website address is too long."),
  email: z.union([z.literal(""), z.string().trim().email("That email address does not look right.").max(200)]),
  addressLine: z.string().trim().max(300, "Address is too long."),
  postalCode: z.string().trim().max(40, "Postal code is too long."),
  licenseNumber: z.string().trim().max(80, "Licence number is too long."),
  hours: z.string().max(4000).optional(),
});

/** Contact details, address, hours, licence and insurance. Live on save. */
export async function saveProfileDetails(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const owned = await ownBusiness(formData);
  if (!owned) return fail("You can't edit that listing.");

  const parsed = detailsSchema.safeParse({
    phone: String(formData.get("phone") ?? ""),
    website: String(formData.get("website") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    addressLine: String(formData.get("addressLine") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    licenseNumber: String(formData.get("licenseNumber") ?? ""),
    hours: String(formData.get("hours") ?? ""),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  if (data.phone && data.phone.replace(/\D/g, "").length < 7) {
    return fail("That phone number looks too short.");
  }

  const website = normaliseWebsite(data.website);
  if (data.website && !website) return fail("That website address does not look right.");

  for (const row of parseRows(data.hours)) {
    if (row.closed === "yes") continue;
    for (const time of [row.opens, row.closes]) {
      if (time?.trim() && !TIME.test(time.trim())) {
        return fail(`Use 24-hour times like 08:00 or 17:30 (${row.day || "a day"}).`);
      }
    }
  }

  await db.business.update({
    where: { id: owned.business.id },
    data: {
      phone: data.phone || null,
      website,
      email: data.email || null,
      addressLine: data.addressLine || null,
      postalCode: data.postalCode || null,
      licenseNumber: data.licenseNumber || null,
      insured: formData.get("insured") === "on",
      hours: hoursFromForm(data.hours),
    },
  });

  await afterOwnerEdit(owned.user, owned.business, "contact details and hours");
  return ok("Saved. The changes are on your profile now.");
}

/** Services offered and areas served. Live on save. */
export async function saveProfileServices(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const owned = await ownBusiness(formData);
  if (!owned) return fail("You can't edit that listing.");

  const services = idsFromForm(String(formData.get("services") ?? ""));
  const areas = idsFromForm(String(formData.get("areas") ?? ""));
  if (areas.length === 0) return fail("Pick at least one area you serve.");

  // Only work under the company's own trade, the same limit the admin editor
  // puts on its list.
  await replaceServices(owned.business.id, services, owned.business.categoryId);
  await replaceAreas(owned.business.id, areas);

  await afterOwnerEdit(owned.user, owned.business, "services and areas");
  return ok("Saved. The changes are on your profile now.");
}

const descriptionSchema = z
  .string()
  .trim()
  .min(40, "Write at least a couple of sentences.")
  .max(8000, "Keep it under 8,000 characters.");

/**
 * Sends a new description to an editor. Nothing on the public profile changes
 * until it is approved. A second change while one is waiting replaces it.
 */
export async function submitDescription(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const owned = await ownBusiness(formData);
  if (!owned) return fail("You can't edit that listing.");

  const parsed = descriptionSchema.safeParse(String(formData.get("description") ?? ""));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the description.");
  const description = parsed.data;

  if (description === (owned.business.description ?? "").trim()) {
    return fail("That is the description already on your profile.");
  }

  const payload: DescriptionEditPayload = {
    businessId: owned.business.id,
    description,
    previous: owned.business.description,
  };
  const fields = {
    subject: `New description for ${owned.business.name}`,
    email: owned.user.email,
    name: owned.user.name,
    pageUrl: routes.business(owned.business.slug),
    message: description.slice(0, 500),
    // businessId first: the pending lookup matches on the start of this string.
    payload: JSON.stringify(payload),
  };

  const waiting = await pendingDescriptionEdit(owned.business.id);
  const submission = waiting
    ? await db.submission.update({ where: { id: waiting.id }, data: { ...fields, status: "NEW" } })
    : await db.submission.create({ data: { kind: DESCRIPTION_EDIT, status: "NEW", ...fields } });

  await audit({
    userId: owned.user.id,
    action: waiting ? "update" : "create",
    entityType: "submission",
    entityId: submission.id,
    summary: `${owned.business.name}: description sent for review (owner portal)`,
  });

  revalidatePath("/portal/profile");
  revalidatePath("/admin/submissions");
  return ok("Sent. An editor will check it before it goes on your profile.");
}

/** Takes back a description change that has not been reviewed yet. */
export async function withdrawDescription(formData: FormData) {
  const owned = await ownBusiness(formData);
  if (!owned) return;
  const waiting = await pendingDescriptionEdit(owned.business.id);
  if (!waiting) return;

  await db.submission.update({
    where: { id: waiting.id },
    data: {
      status: "CLOSED",
      resolvedAt: new Date(),
      payload: withDecision(waiting.payload, "withdrawn"),
    },
  });
  await audit({
    userId: owned.user.id,
    action: "update",
    entityType: "submission",
    entityId: waiting.id,
    summary: `${owned.business.name}: description change withdrawn by owner`,
  });
  revalidatePath("/portal/profile");
  revalidatePath("/admin/submissions");
}

/* ---------------------------------------------------------------- photos */

async function ownPhoto(formData: FormData) {
  const owned = await ownBusiness(formData);
  if (!owned) return null;
  const photo = await db.businessPhoto.findFirst({
    where: { id: String(formData.get("photoId") ?? ""), businessId: owned.business.id },
  });
  return photo ? { ...owned, photo } : null;
}

export async function savePhotoAlt(formData: FormData) {
  const owned = await ownPhoto(formData);
  if (!owned) return;
  const alt = String(formData.get("alt") ?? "").trim().slice(0, 200);
  await db.businessPhoto.update({ where: { id: owned.photo.id }, data: { alt: alt || null } });
  await afterOwnerEdit(owned.user, owned.business, "photo description");
}

export async function movePhoto(formData: FormData) {
  const owned = await ownPhoto(formData);
  if (!owned) return;
  const step = formData.get("direction") === "up" ? -1 : 1;

  const photos = await db.businessPhoto.findMany({
    where: { businessId: owned.business.id },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const from = photos.findIndex((row) => row.id === owned.photo.id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= photos.length) return;

  [photos[from], photos[to]] = [photos[to], photos[from]];
  for (const [index, row] of photos.entries()) {
    await db.businessPhoto.update({ where: { id: row.id }, data: { sortOrder: index } });
  }
  await afterOwnerEdit(owned.user, owned.business, "photo order");
}

export async function deletePhoto(formData: FormData) {
  const owned = await ownPhoto(formData);
  if (!owned) return;
  await db.businessPhoto.delete({ where: { id: owned.photo.id } });
  await afterOwnerEdit(owned.user, owned.business, "photo removed");
}

export async function removeLogo(formData: FormData) {
  const owned = await ownBusiness(formData);
  if (!owned || !owned.business.logoUrl) return;
  await db.business.update({ where: { id: owned.business.id }, data: { logoUrl: null } });
  await afterOwnerEdit(owned.user, owned.business, "logo removed");
}
