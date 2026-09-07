"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { GUIDE_TYPES } from "@/lib/enums";
import { acceptGuideJob, retryGuideJob } from "@/lib/guide-jobs";
import { DEFAULT_INSTRUCTIONS, DEFAULT_SYSTEM, SKILLS } from "@/lib/guide-writer";
import { flushIndexQueue, queueForIndexing } from "@/lib/google-indexing";
import { stringify } from "@/lib/json";

export type ActionState = { status: "idle" | "ok" | "error"; message?: string };

const ok = (message: string): ActionState => ({ status: "ok", message });
const fail = (message: string): ActionState => ({ status: "error", message });

const optional = (value: FormDataEntryValue | null): string | null => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};

/* -------------------------------------------------------------- templates */

const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80),
  guideType: z.string().optional(),
  system: z.string().min(40).max(20_000),
  instructions: z.string().min(40).max(20_000),
  model: z.string().min(3).max(60),
  effort: z.enum(["low", "medium", "high", "xhigh", "max"]),
  wordTarget: z.coerce.number().int().min(300).max(6000),
  notes: z.string().max(2000).optional(),
});

export async function savePromptTemplate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  // Only the switches the writer actually knows about, so a stale checkbox
  // cannot smuggle an instruction the code has no text for.
  const skills = formData.getAll("skills").map(String).filter((skill) => skill in SKILLS);

  const slug = data.slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const clash = await db.promptTemplate.findFirst({
    where: { slug, ...(data.id ? { NOT: { id: data.id } } : {}) },
    select: { id: true },
  });
  if (clash) return fail("Another template already uses that slug.");

  const payload = {
    name: data.name,
    slug,
    kind: "GUIDE",
    guideType: data.guideType && data.guideType !== "any" ? data.guideType : null,
    system: data.system,
    instructions: data.instructions,
    model: data.model,
    effort: data.effort,
    wordTarget: data.wordTarget,
    skills: stringify(skills),
    notes: optional(formData.get("notes")),
    isDefault: formData.get("isDefault") === "on",
    archived: formData.get("archived") === "on",
  };

  const template = data.id
    ? await db.promptTemplate.update({ where: { id: data.id }, data: payload })
    : await db.promptTemplate.create({ data: payload });

  // Only one default, or the writer has to guess.
  if (payload.isDefault) {
    await db.promptTemplate.updateMany({
      where: { kind: "GUIDE", NOT: { id: template.id } },
      data: { isDefault: false },
    });
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "promptTemplate",
    entityId: template.id,
    summary: `${template.name} (${skills.length} house rules)`,
  });

  revalidatePath("/admin/prompts");
  revalidatePath(`/admin/prompts/${template.id}`);
  if (!data.id) redirect(`/admin/prompts/${template.id}`);
  return ok("Template saved.");
}

export async function deletePromptTemplate(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const template = await db.promptTemplate.findUnique({ where: { id }, select: { name: true } });
  // Jobs keep a nullable reference, so a template can go without taking the
  // record of what it once wrote with it.
  await db.guideJob.updateMany({ where: { templateId: id }, data: { templateId: null } });
  await db.promptTemplate.delete({ where: { id } });

  await audit({
    userId: user.id,
    action: "delete",
    entityType: "promptTemplate",
    entityId: id,
    summary: template?.name ?? id,
  });

  revalidatePath("/admin/prompts");
  redirect("/admin/prompts");
}

/* -------------------------------------------------------------------- jobs */

const jobSchema = z.object({
  topic: z.string().min(8).max(300),
  keyword: z.string().max(200).optional(),
  guideType: z.enum(GUIDE_TYPES),
  templateId: z.string().optional(),
  categoryId: z.string().optional(),
  countryId: z.string().optional(),
  regionId: z.string().optional(),
  cityId: z.string().optional(),
  brief: z.string().max(4000).optional(),
});

export async function createGuideJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = jobSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the brief.");
  const data = parsed.data;

  const templateId =
    data.templateId ||
    (await db.promptTemplate.findFirst({
      where: { kind: "GUIDE", archived: false, isDefault: true },
      select: { id: true },
    }))?.id ||
    null;

  const job = await db.guideJob.create({
    data: {
      topic: data.topic,
      keyword: data.keyword || null,
      guideType: data.guideType,
      templateId,
      categoryId: data.categoryId || null,
      countryId: data.countryId || null,
      regionId: data.regionId || null,
      cityId: data.cityId || null,
      brief: data.brief || null,
    },
    select: { id: true },
  });

  await audit({
    userId: user.id,
    action: "create",
    entityType: "guideJob",
    entityId: job.id,
    summary: data.topic,
  });

  revalidatePath("/admin/writer");
  redirect(`/admin/writer/${job.id}`);
}

export async function retryJob(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await retryGuideJob(id, formData.get("fresh") === "on");
  revalidatePath("/admin/writer");
  revalidatePath(`/admin/writer/${id}`);
}

export async function cancelJob(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.guideJob.update({ where: { id }, data: { status: "CANCELLED", finishedAt: new Date() } });
  revalidatePath("/admin/writer");
  revalidatePath(`/admin/writer/${id}`);
}

/** Turns the draft into a real guide, as a draft for a person to finish. */
export async function acceptJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("No job.");

  try {
    const { guideId, slug } = await acceptGuideJob(id, {
      authorId: optional(formData.get("authorId")),
      reviewerId: optional(formData.get("reviewerId")),
    });

    await audit({
      userId: user.id,
      action: "create",
      entityType: "guide",
      entityId: guideId,
      summary: `Accepted from the writer: /guides/${slug}/`,
    });

    revalidatePath("/admin/writer");
    revalidatePath("/admin/guides");
    redirect(`/admin/guides/${guideId}`);
  } catch (error) {
    // redirect() throws by design; anything else is a real failure.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if (typeof error === "object" && error !== null && "digest" in error) throw error;
    return fail(error instanceof Error ? error.message : "Could not accept that draft.");
  }
}

/* ---------------------------------------------------------------- indexing */

export async function flushIndexing(): Promise<void> {
  await requireStaff();
  await flushIndexQueue(50);
  revalidatePath("/admin/indexing");
}

/** Puts everything the sitemap offers into the queue, oldest first. */
export async function queueEverything(): Promise<void> {
  await requireStaff();
  const { sitemapIndex, sitemapChild } = await import("@/lib/sitemap");
  const index = await sitemapIndex();
  const paths: string[] = [];
  for (const child of index) {
    const entries = await sitemapChild(child.path.replace(/^\/sitemaps\/|\.xml$/g, ""));
    for (const entry of entries ?? []) paths.push(entry.path);
  }
  await queueForIndexing(paths);
  revalidatePath("/admin/indexing");
}

export async function clearFailedIndexing(): Promise<void> {
  await requireStaff();
  await db.indexRequest.deleteMany({ where: { status: "FAILED" } });
  revalidatePath("/admin/indexing");
}
