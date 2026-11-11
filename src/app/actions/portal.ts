"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit, hashPassword, requireOwner } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-tokens";
import { billingPortalUrl, startCheckout } from "@/lib/billing";
import { LEAD_STATUSES } from "@/lib/leads";
import { sendPasswordChanged } from "@/lib/notify";
import { billingOptions } from "@/lib/portal";
import { TOP10_PLAN_KEY } from "@/lib/top10";
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

/* ----------------------------------------------------------------- billing */

/** The business named on the form, if this session may act for it. */
async function ownBusiness(businessId: string) {
  const user = await requireOwner();
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true, owner: { select: { email: true, name: true } } },
  });
  if (!business) return null;

  const staff = user.role === "ADMIN" || user.role === "EDITOR";
  if (!staff && business.ownerId !== user.id) return null;
  return { user, business };
}

function billingPath(businessId: string, notice?: string) {
  const query = new URLSearchParams({ businessId, ...(notice ? { notice } : {}) });
  return `/portal/billing/?${query}`;
}

/** Opens TenBestFind's Stripe customer portal: card, invoices, cancel. */
export async function openOwnBillingPortal(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "");
  const owned = await ownBusiness(businessId);
  if (!owned) redirect("/portal/billing/");

  let url: string | null = null;
  try {
    url = await billingPortalUrl(businessId, billingPath(businessId));
  } catch (error) {
    console.error("[portal] billing portal failed:", error instanceof Error ? error.message : error);
    redirect(billingPath(businessId, "portal-error"));
  }
  redirect(url ?? billingPath(businessId, "no-customer"));
}

/** Restarts the last plan, or adds Top 10 to a live profile plan, via Checkout. */
export async function startOwnCheckout(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const owned = await ownBusiness(businessId);
  if (!owned) redirect("/portal/billing/");

  const options = await billingOptions(businessId);
  let input: { planKey: string; scopeCityId?: string; scopeCategoryId?: string } | null = null;
  if (kind === "restart" && options.restart) {
    input = options.restart;
  } else if (kind === "top10" && options.top10 && "cityId" in options.top10) {
    // Scoped to the listing's own city and trade, as a claim's add-on is.
    input = { planKey: TOP10_PLAN_KEY, scopeCityId: options.top10.cityId, scopeCategoryId: options.top10.categoryId };
  }
  if (!input) redirect(billingPath(businessId, "unavailable"));

  let target: string;
  try {
    const checkout = await startCheckout({
      businessId,
      ...input,
      email: owned.business.owner?.email ?? owned.user.email,
      name: owned.business.owner?.name ?? owned.user.name,
      // Stripe appends ?session=…, so the success path carries no query of its own.
      successPath: "/portal/billing/",
      cancelPath: billingPath(businessId),
    });
    target = checkout.mode === "stripe" ? checkout.url : billingPath(businessId, "recorded");
    await audit({
      userId: owned.user.id,
      action: "create",
      entityType: "subscription",
      entityId: checkout.subscriptionId,
      summary: `owner started checkout: ${input.planKey}`,
    }).catch(() => null);
  } catch (error) {
    console.error("[portal] checkout failed:", error instanceof Error ? error.message : error);
    target = billingPath(businessId, "checkout-error");
  }
  redirect(target);
}

/* ----------------------------------------------------------------- account */

export type PasswordState = { status: "idle" | "error" | "ok"; message?: string };

/** Changes the signed-in user's password after checking the current one. */
export async function changeOwnPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const session = await requireOwner();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const user = await db.user.findUnique({ where: { id: session.id } });
  if (!user || !user.active) return { status: "error", message: "This account is not active." };
  if (!user.passwordHash) {
    return {
      status: "error",
      message: "This account has no password yet. Use Forgot password on the sign-in page to set one.",
    };
  }
  if (!current || !(await bcrypt.compare(current, user.passwordHash))) {
    return { status: "error", message: "Your current password is not right." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { status: "error", message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirm) return { status: "error", message: "The two new passwords do not match." };
  if (password === current) return { status: "error", message: "Choose a password different from the current one." };

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await audit({ userId: user.id, action: "update", entityType: "user", entityId: user.id, summary: "changed own password" });
  try {
    await sendPasswordChanged({ to: user.email, name: user.name });
  } catch (error) {
    console.error("[portal] password-changed email not sent:", error instanceof Error ? error.message : error);
  }
  return { status: "ok", message: "Password changed. We have emailed you a note confirming it." };
}
