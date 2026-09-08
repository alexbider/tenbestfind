"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { commissionIdea, dismissIdea, openPlan, snoozeIdea } from "@/lib/topic-plans";
import { saveTopicSettings } from "@/lib/topic-settings";
import { TOPIC_FIELDS } from "@/lib/topic-fields";

export type ActionState = { status: "idle" | "ok" | "error"; message?: string };

const ok = (message: string): ActionState => ({ status: "ok", message });
const fail = (message: string): ActionState => ({ status: "error", message });

/* --------------------------------------------------------------- settings */

export async function saveTopicDials(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();

  const values: Record<string, unknown> = {};
  for (const field of TOPIC_FIELDS) {
    switch (field.type) {
      case "boolean":
        values[field.key] = formData.get(field.key) === "on";
        break;
      case "types":
      case "services":
        values[field.key] = formData.getAll(field.key).map(String).filter(Boolean);
        break;
      default: {
        const raw = formData.get(field.key);
        if (raw === null) break;
        values[field.key] = typeof raw === "string" ? raw.trim() : raw;
      }
    }
  }

  try {
    await saveTopicSettings(values);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not save.");
  }

  await audit({ userId: user.id, action: "topics.settings", entityType: "settings", entityId: "topics" });
  revalidatePath("/admin/guides/topics");
  return ok("Saved.");
}

/* ------------------------------------------------------------------- plans */

export async function planThisWeek(): Promise<void> {
  const user = await requireStaff();
  const { id } = await openPlan({ trigger: "MANUAL" });
  await audit({ userId: user.id, action: "topics.plan", entityType: "topicPlan", entityId: id });
  revalidatePath("/admin/guides/topics");
  redirect(`/admin/guides/topics/${id}`);
}

export async function cancelPlan(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.topicPlan.update({
    where: { id },
    data: { status: "CANCELLED", finishedAt: new Date() },
  });
  revalidatePath(`/admin/guides/topics/${id}`);
  revalidatePath("/admin/guides/topics");
}

export async function retryPlan(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const plan = await db.topicPlan.findUnique({ where: { id }, select: { shortlist: true } });
  await db.topicPlan.update({
    where: { id },
    data: {
      // A plan that already has a shortlist resumes from the drafting step,
      // because the expensive half is bought and there is no reason to buy it
      // again to fix a bad minute at the end.
      status: plan?.shortlist ? "DRAFTING" : "QUEUED",
      // A fresh set of attempts, or the retry gives up before it has tried.
      attempts: 0,
      error: null,
      hint: null,
      finishedAt: null,
    },
  });
  revalidatePath(`/admin/guides/topics/${id}`);
}

export async function deletePlan(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.topicPlan.delete({ where: { id } });
  revalidatePath("/admin/guides/topics");
  redirect("/admin/guides/topics");
}

/* ------------------------------------------------------------------- ideas */

export async function commissionTopic(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("No idea named.");

  try {
    const { jobId } = await commissionIdea(id);
    await audit({ userId: user.id, action: "topics.commission", entityType: "topicIdea", entityId: id });
    revalidatePath(`/admin/guides/pipeline/${jobId}`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not commission it.");
  }

  revalidatePath("/admin/guides/topics", "layout");
  revalidatePath("/admin/guides/pipeline");
  return ok("Commissioned. It is in the writer's queue.");
}

export async function dismissTopic(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await dismissIdea(id);
  revalidatePath("/admin/guides/topics", "layout");
}

export async function snoozeTopic(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await snoozeIdea(id, Number(formData.get("days") ?? 90) || 90);
  revalidatePath("/admin/guides/topics", "layout");
}

export async function restoreTopic(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.topicIdea.update({ where: { id }, data: { status: "SUGGESTED", snoozedUntil: null } });
  revalidatePath("/admin/guides/topics", "layout");
}
