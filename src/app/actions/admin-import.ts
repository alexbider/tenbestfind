"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin, requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { abortRun } from "@/lib/apify";
import { resumeStage } from "@/lib/import-pipeline";
import { putSecret, SECRET_KEYS, type SecretKey } from "@/lib/secrets";
import type { ActionState } from "./admin-system";

const batchSchema = z.object({
  name: z.string().trim().min(3, "Name the batch so you can find it later").max(120),
  categoryId: z.string().min(1, "Pick a service"),
  cityIds: z.string().min(1, "Pick at least one city"),
  perCity: z.coerce.number().int().min(1).max(120),
  minRating: z.string().optional(),
  minReviews: z.string().optional(),
  autoPublishScore: z.coerce.number().int().min(0).max(100),
  rankingSize: z.coerce.number().int().min(3).max(20),
  buildRanking: z.string().optional(),
  language: z.string().trim().min(2).max(8).optional(),
  note: z.string().trim().max(600).optional(),
});

/**
 * Queues a batch. Nothing is scraped here: the worker picks it up, so a slow
 * Apify run never blocks a request and a redeploy never loses a batch.
 */
export async function createBatch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = batchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the fields." };
  const data = parsed.data;

  const cityIds = data.cityIds.split(",").map((id) => id.trim()).filter(Boolean);
  if (cityIds.length === 0) return { status: "error", message: "Pick at least one city." };
  if (cityIds.length > 40) {
    return { status: "error", message: "Keep a batch to 40 cities or fewer so a failure is cheap to retry." };
  }

  const category = await db.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return { status: "error", message: "That service no longer exists." };

  const cities = await db.city.count({ where: { id: { in: cityIds } } });
  if (cities !== cityIds.length) return { status: "error", message: "One of those cities no longer exists." };

  const batch = await db.importBatch.create({
    data: {
      name: data.name,
      categoryId: data.categoryId,
      cityIds: JSON.stringify(cityIds),
      perCity: data.perCity,
      minRating: data.minRating ? Number(data.minRating) : null,
      minReviews: data.minReviews ? Number(data.minReviews) : null,
      autoPublishScore: data.autoPublishScore,
      rankingSize: data.rankingSize,
      buildRanking: data.buildRanking === "on",
      language: data.language || "en",
      note: data.note || null,
      createdById: user.id,
    },
  });

  await audit({
    userId: user.id,
    action: "create",
    entityType: "importBatch",
    entityId: batch.id,
    summary: `${data.name}: ${category.name} across ${cityIds.length} cities, up to ${data.perCity} each`,
  });

  revalidatePath("/admin/imports");
  return { status: "ok", message: `Queued. Up to ${cityIds.length * data.perCity} places will be scraped.` };
}

export async function pauseBatch(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  const batch = await db.importBatch.findUnique({ where: { id } });
  if (!batch) return;

  // Aborting the Apify run stops the meter as well as the batch.
  if (batch.status === "SCRAPING" && batch.apifyRunId) await abortRun(batch.apifyRunId);

  await db.importBatch.update({ where: { id }, data: { status: "PAUSED" } });
  await audit({ userId: user.id, action: "update", entityType: "importBatch", entityId: id, summary: "paused" });
  revalidatePath(`/admin/imports/${id}`);
  revalidatePath("/admin/imports");
}

/**
 * Puts a paused or failed batch back in the queue at the stage its items imply.
 * Anything that failed to write is queued again, because the usual cause is
 * outside the batch and gets fixed between the failure and the resume. Nothing
 * already scraped is scraped again, so a resume costs nothing on Apify.
 */
export async function resumeBatch(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  const batch = await db.importBatch.findUnique({ where: { id } });
  if (!batch) return;

  const status = await resumeStage(id);
  await audit({
    userId: user.id,
    action: "update",
    entityType: "importBatch",
    entityId: id,
    summary: `resumed at ${status.toLowerCase()}`,
  });
  revalidatePath(`/admin/imports/${id}`);
  revalidatePath("/admin/imports");
}

/** Sends one item back to be written again, for a listing that came out weak. */
export async function retryItem(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id"));
  const item = await db.importItem.findUnique({ where: { id } });
  if (!item || item.status === "IMPORTED") return;

  await db.importItem.update({
    where: { id },
    data: { status: "ENRICHED", attempts: 0, reason: null, draft: null },
  });
  await db.importBatch.update({
    where: { id: item.batchId },
    data: { status: "WRITING", finishedAt: null },
  });
  revalidatePath(`/admin/imports/${item.batchId}`);
}

export async function skipItem(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id"));
  const item = await db.importItem.findUnique({ where: { id } });
  if (!item) return;
  await db.importItem.update({ where: { id }, data: { status: "SKIPPED", reason: "skipped by an editor" } });
  revalidatePath(`/admin/imports/${item.batchId}`);
}

/** Publishes every draft this batch created, after a skim. */
export async function publishBatchDrafts(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));

  const items = await db.importItem.findMany({
    where: { batchId: id, status: "IMPORTED", businessId: { not: null } },
    select: { businessId: true },
  });
  const ids = items.map((item) => item.businessId!).filter(Boolean);
  if (ids.length === 0) return;

  const result = await db.business.updateMany({
    where: { id: { in: ids }, status: "DRAFT" },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });

  await db.importBatch.update({ where: { id }, data: { published: { increment: result.count } } });
  await audit({
    userId: user.id,
    action: "update",
    entityType: "importBatch",
    entityId: id,
    summary: `published ${result.count} drafts`,
  });
  revalidatePath(`/admin/imports/${id}`);
}

export async function deleteBatch(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  const batch = await db.importBatch.findUnique({ where: { id } });
  if (!batch) return;

  // Deleting the batch drops its items. The businesses it created stay: they
  // are content now, and removing them belongs on the businesses screen.
  await db.importBatch.delete({ where: { id } });
  await audit({ userId: user.id, action: "delete", entityType: "importBatch", entityId: id, summary: batch.name });
  revalidatePath("/admin/imports");
}

/* --------------------------------------------------------------- API keys */

export async function saveSecret(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const key = String(formData.get("key")) as SecretKey;
  const value = String(formData.get("value") ?? "");

  if (!Object.values(SECRET_KEYS).includes(key)) {
    return { status: "error", message: "Unknown credential." };
  }

  await putSecret(key, value);
  await audit({
    userId: user.id,
    action: "update",
    entityType: "secret",
    summary: value.trim() ? `${key} set` : `${key} cleared`,
  });
  revalidatePath("/admin/integrations");
  return { status: "ok", message: value.trim() ? "Saved and encrypted." : "Removed." };
}
