"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

/** What one row of a bulk run came to, so the admin sees each outcome. */
export type BulkOutcome = { id: string; name: string; note?: string };

export type BulkState = {
  status: "idle" | "ok" | "error";
  message?: string;
  done: BulkOutcome[];
  skipped: BulkOutcome[];
};

/** A page of the list holds at most 100 rows, so one run never covers more. */
const MAX_PER_RUN = 100;

/** Subscriptions that still bill or are being chased for payment. */
const LIVE_SUBSCRIPTION = ["ACTIVE", "PAST_DUE"];

const input = z.object({
  intent: z.enum(["archive", "delete"]),
  ids: z.array(z.string().min(1)).min(1).max(MAX_PER_RUN),
});

/**
 * Archives or deletes the businesses ticked on the list page. Each business is
 * handled and audited on its own, so one failure does not stop the rest and
 * the result says what happened to every row.
 *
 * Delete follows the single-business rules and adds one: a business with a
 * live (active or past-due) subscription is skipped, because erasing it would
 * leave Stripe charging a customer whose listing no longer exists. Cancel or
 * refund it from the business page first. A business on a ranking list or with
 * older billing history is archived instead, as the single delete does.
 */
export async function bulkBusinessAction(_prev: BulkState, formData: FormData): Promise<BulkState> {
  const user = await requireStaff();
  const parsed = input.safeParse({
    intent: formData.get("intent"),
    ids: [...new Set(formData.getAll("ids").map(String))],
  });
  if (!parsed.success) {
    return { status: "error", message: "Tick at least one business first.", done: [], skipped: [] };
  }
  const { intent, ids } = parsed.data;

  const businesses = await db.business.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      subscriptions: { select: { status: true } },
      _count: { select: { entries: true } },
    },
  });

  const done: BulkOutcome[] = [];
  const skipped: BulkOutcome[] = [];

  for (const id of ids) {
    if (!businesses.some((business) => business.id === id)) {
      skipped.push({ id, name: id, note: "Not found. It may have been deleted already." });
    }
  }

  for (const business of businesses) {
    const live = business.subscriptions.filter((sub) => LIVE_SUBSCRIPTION.includes(sub.status));
    try {
      if (intent === "archive") {
        if (business.status === "ARCHIVED") {
          skipped.push({ id: business.id, name: business.name, note: "Already archived." });
          continue;
        }
        await db.business.update({ where: { id: business.id }, data: { status: "ARCHIVED" } });
        await audit({
          userId: user.id,
          action: "update",
          entityType: "business",
          entityId: business.id,
          summary: `${business.name} → archived (bulk)`,
        });
        done.push({
          id: business.id,
          name: business.name,
          note: live.length > 0 ? "Archived, but its subscription is still billing. Cancel it on the business page." : undefined,
        });
      } else {
        if (live.length > 0) {
          skipped.push({
            id: business.id,
            name: business.name,
            note: `Has ${live.length === 1 ? "a live" : live.length + " live"} subscription${live.length === 1 ? "" : "s"} (${live.map((sub) => sub.status.toLowerCase().replace("_", "-")).join(", ")}). Cancel or refund ${live.length === 1 ? "it" : "them"} on the business page first.`,
          });
          continue;
        }
        if (business._count.entries > 0 || business.subscriptions.length > 0) {
          // Same rule as the single delete: lists would break and billing
          // records have to survive, so it is archived instead.
          if (business.status !== "ARCHIVED") {
            await db.business.update({ where: { id: business.id }, data: { status: "ARCHIVED" } });
          }
          await audit({
            userId: user.id,
            action: "update",
            entityType: "business",
            entityId: business.id,
            summary: `${business.name} archived rather than deleted (bulk): it has rankings or billing history`,
          });
          skipped.push({
            id: business.id,
            name: business.name,
            note: "Archived instead of deleted: it is on a ranking list or has billing history.",
          });
          continue;
        }
        await db.business.delete({ where: { id: business.id } });
        await audit({
          userId: user.id,
          action: "delete",
          entityType: "business",
          entityId: business.id,
          summary: `${business.name} (bulk)`,
        });
        done.push({ id: business.id, name: business.name });
      }
      revalidatePath(routes.business(business.slug));
    } catch (error) {
      skipped.push({
        id: business.id,
        name: business.name,
        note: `Failed: ${error instanceof Error ? error.message : "unknown error"}`,
      });
    }
  }

  revalidatePath("/admin/businesses");

  const verb = intent === "archive" ? "Archived" : "Deleted";
  const message =
    `${verb} ${done.length} of ${ids.length}.` +
    (skipped.length > 0 ? ` ${skipped.length} not ${intent === "archive" ? "archived" : "deleted"}, see below.` : "");
  return { status: done.length > 0 ? "ok" : "error", message, done, skipped };
}
