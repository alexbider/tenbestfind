"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AI_BOTS, SEO_FIELDS } from "@/lib/seo-settings";
import type { ActionState } from "./admin-system";

/**
 * Writes the global SEO configuration. Every field in SEO_FIELDS is upserted,
 * so a key that was never seeded is created on first save and the form stays
 * the source of truth for what exists.
 */
export async function saveSeoSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();

  const blockedBots = AI_BOTS.map((bot) => bot.agent).filter(
    (agent) => formData.get(`bot:${agent}`) === "on",
  );

  const writes: { key: string; value: unknown }[] = [];

  for (const field of SEO_FIELDS) {
    const raw = formData.get(`seo:${field.key}`);
    let value: unknown;

    switch (field.type) {
      case "boolean":
        value = raw === "on";
        break;
      case "number": {
        const parsed = Number(String(raw ?? "").trim());
        value = Number.isFinite(parsed) ? parsed : field.default;
        break;
      }
      case "lines":
        value = String(raw ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        break;
      case "bots":
        value = blockedBots;
        break;
      default:
        value = String(raw ?? "").trim();
    }

    writes.push({ key: field.key, value });
  }

  const separator = writes.find((write) => write.key === "seo.titleSeparator");
  if (separator && !String(separator.value).trim()) separator.value = "|";

  for (const write of writes) {
    const field = SEO_FIELDS.find((candidate) => candidate.key === write.key)!;
    const value = JSON.stringify(write.value);
    await db.setting.upsert({
      where: { key: write.key },
      create: { key: write.key, value, groupName: "seo", label: field.label },
      update: { value, groupName: "seo", label: field.label },
    });
  }

  await audit({
    userId: user.id,
    action: "update",
    entityType: "settings",
    summary: `Global SEO saved (${blockedBots.length} AI crawlers blocked)`,
  });

  // The robots file, the sitemap and every page's metadata read these.
  revalidatePath("/", "layout");

  return { status: "ok", message: "Global SEO saved." };
}
