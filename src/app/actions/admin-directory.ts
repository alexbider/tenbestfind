"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin, requireStaff } from "@/lib/auth";
import { syncPlanToStripe } from "@/lib/billing";
import { stripeConfigured } from "@/lib/stripe";
import { db } from "@/lib/db";
import { recordMove } from "@/lib/redirects";
import { parseJson, stringify } from "@/lib/json";
import { routes } from "@/lib/urls";
import type { ActionState } from "./admin-content";

const ok = (message: string): ActionState => ({ status: "ok", message });
const fail = (message: string): ActionState => ({ status: "error", message });

const slugField = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens");

function rows(value: string | undefined): Record<string, string>[] {
  const parsed = parseJson<Record<string, string>[]>(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function lines(value: string | undefined): string[] {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function int(value: string | undefined): number | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** A date field left blank means "not recorded", not the epoch. */
function date(value: string | undefined): Date | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const on = (value: string | undefined) => value === "on";

/* ---------------------------------------------------------------- people */

const personSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is required").max(160),
  slug: slugField,
  role: z.string().trim().min(2, "Role is required").max(160),
  bio: z.string().max(4000).optional(),
  limits: z.string().max(1000).optional(),
  portrait: z.string().max(500).optional(),
  email: z.string().max(200).optional(),
  yearsExperience: z.string().optional(),
  specializations: z.string().optional(),
  markets: z.string().optional(),
  links: z.string().optional(),
  credentials: z.string().optional(),
  experience: z.string().optional(),
  isAuthor: z.string().optional(),
  isReviewer: z.string().optional(),
  isExpert: z.string().optional(),
  published: z.string().optional(),
});

export async function savePerson(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = personSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  const clash = await db.person.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== data.id) return fail("Another person already uses that slug.");

  const previous = data.id ? await db.person.findUnique({ where: { id: data.id } }) : null;
  if (data.id && !previous) return fail("That person no longer exists.");

  const links = rows(data.links)
    .filter((row) => row.label?.trim() && row.url?.trim())
    .map((row) => ({ label: row.label.trim(), url: row.url.trim() }));

  const payload = {
    name: data.name,
    slug: data.slug,
    role: data.role,
    bio: data.bio || null,
    limits: data.limits || null,
    portrait: data.portrait || null,
    email: data.email || null,
    yearsExperience: int(data.yearsExperience),
    specializations: stringify(lines(data.specializations)),
    markets: stringify(lines(data.markets)),
    links: stringify(links),
    isAuthor: on(data.isAuthor),
    isReviewer: on(data.isReviewer),
    isExpert: on(data.isExpert),
    published: on(data.published),
  };

  const person = data.id
    ? await db.person.update({ where: { id: data.id }, data: payload })
    : await db.person.create({ data: payload });

  if (previous && previous.slug !== data.slug) {
    await recordMove(routes.expert(previous.slug), routes.expert(data.slug));
    revalidatePath(routes.expert(previous.slug));
  }

  await db.personCredential.deleteMany({ where: { personId: person.id } });
  for (const [index, row] of rows(data.credentials)
    .filter((row) => row.label?.trim())
    .entries()) {
    await db.personCredential.create({
      data: {
        personId: person.id,
        label: row.label.trim(),
        issuer: row.issuer?.trim() || null,
        status: ["VERIFIED", "SELF_REPORTED", "EXPIRED"].includes(row.status)
          ? row.status
          : "SELF_REPORTED",
        issuedAt: date(row.issuedAt),
        checkedAt: row.status === "VERIFIED" ? new Date() : null,
        sourceUrl: row.sourceUrl?.trim() || null,
        sortOrder: index,
      },
    });
  }

  await db.personExperience.deleteMany({ where: { personId: person.id } });
  for (const [index, row] of rows(data.experience)
    .filter((row) => row.role?.trim() && row.org?.trim())
    .entries()) {
    await db.personExperience.create({
      data: {
        personId: person.id,
        role: row.role.trim(),
        org: row.org.trim(),
        startedAt: date(row.startedAt),
        endedAt: date(row.endedAt),
        summary: row.summary?.trim() || null,
        sortOrder: index,
      },
    });
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "person",
    entityId: person.id,
    summary: `${data.name}, ${data.role}`,
  });

  revalidatePath(routes.expert(data.slug));
  revalidatePath(routes.expertsIndex());
  revalidatePath(routes.editorialTeam());
  revalidatePath("/admin/people");
  return ok("Person saved.");
}

export async function deletePerson(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const person = await db.person.findUnique({
    where: { id },
    include: {
      _count: {
        select: { authoredGuides: true, authoredRankings: true, reviewedGuides: true, reviewedRankings: true },
      },
    },
  });
  if (!person) return;

  const attached =
    person._count.authoredGuides +
    person._count.authoredRankings +
    person._count.reviewedGuides +
    person._count.reviewedRankings;

  // A byline has to keep pointing somewhere, so a person with published work is
  // unpublished rather than removed.
  if (attached > 0) {
    await db.person.update({ where: { id }, data: { published: false } });
    await audit({
      userId: user.id,
      action: "update",
      entityType: "person",
      entityId: id,
      summary: `${person.name} unpublished rather than deleted: ${attached} bylines`,
    });
  } else {
    await db.person.delete({ where: { id } });
    await audit({
      userId: user.id,
      action: "delete",
      entityType: "person",
      entityId: id,
      summary: person.name,
    });
  }
  revalidatePath(routes.expertsIndex());
  revalidatePath("/admin/people");
}

/* ----------------------------------------------------------------- plans */

const planSchema = z.object({
  id: z.string().optional(),
  key: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Plan key is lowercase letters, numbers and hyphens"),
  name: z.string().trim().min(2, "Name is required").max(120),
  description: z.string().max(1000).optional(),
  priceCents: z.string().optional(),
  currency: z.string().trim().min(3).max(3),
  interval: z.enum(["month", "year", "quote"]),
  unitLabel: z.string().max(80).optional(),
  features: z.string().optional(),
  sortOrder: z.string().optional(),
  editorial: z.string().optional(),
  active: z.string().optional(),
});

export async function savePlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  const clash = await db.plan.findUnique({ where: { key: data.key } });
  if (clash && clash.id !== data.id) return fail("Another plan already uses that key.");

  const payload = {
    key: data.key,
    name: data.name,
    description: data.description || null,
    priceCents: int(data.priceCents) ?? 0,
    currency: data.currency.toUpperCase(),
    interval: data.interval,
    unitLabel: data.unitLabel || "per location",
    features: stringify(lines(data.features)),
    sortOrder: int(data.sortOrder) ?? 0,
    editorial: on(data.editorial),
    active: on(data.active),
  };

  const plan = data.id
    ? await db.plan.update({ where: { id: data.id }, data: payload })
    : await db.plan.create({ data: payload });

  // Stripe prices are immutable, so a price change creates a new one. Existing
  // subscribers keep the price they signed up on until they change plan.
  let note = "";
  if (plan.interval === "quote") {
    note = " Quoted plans have no fixed price, so nothing was sent to Stripe.";
  } else if (!stripeConfigured()) {
    note = " Stripe is not configured, so the price was not pushed.";
  } else {
    try {
      await syncPlanToStripe(plan.id);
      note = " Stripe product and price updated.";
    } catch (error) {
      note = ` Saved, but Stripe rejected the sync: ${error instanceof Error ? error.message : "unknown error"}`;
    }
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "plan",
    entityId: plan.id,
    summary: `${data.name} at ${(payload.priceCents / 100).toFixed(2)} ${payload.currency}`,
  });

  revalidatePath("/admin/packages");
  revalidatePath(routes.forBusinesses());
  revalidatePath(routes.advertise());
  return ok(`Plan saved.${note}`);
}

/* --------------------------------------------------- sponsored placements */

const placementSchema = z.object({
  id: z.string().optional(),
  businessId: z.string().min(1, "Pick a business"),
  cityId: z.string().optional(),
  categoryId: z.string().optional(),
  kind: z.enum(["FEATURED_PARTNER", "TOP10_LISTING", "CATEGORY_BANNER"]),
  label: z.string().trim().min(2).max(60),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "ENDED"]),
});

export async function savePlacement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = placementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  // One active featured partner per city and category, or the ranking page has
  // to choose between two paying advertisers on its own.
  if (data.status === "ACTIVE" && data.kind === "FEATURED_PARTNER") {
    const held = await db.sponsoredPlacement.findFirst({
      where: {
        status: "ACTIVE",
        kind: "FEATURED_PARTNER",
        cityId: data.cityId || null,
        categoryId: data.categoryId || null,
        NOT: data.id ? { id: data.id } : undefined,
      },
      include: { business: { select: { name: true } } },
    });
    if (held) {
      return fail(`${held.business.name} already holds that slot. Pause it first.`);
    }
  }

  const payload = {
    businessId: data.businessId,
    cityId: data.cityId || null,
    categoryId: data.categoryId || null,
    kind: data.kind,
    label: data.label,
    startsAt: date(data.startsAt) ?? new Date(),
    endsAt: date(data.endsAt),
    status: data.status,
  };

  const placement = data.id
    ? await db.sponsoredPlacement.update({ where: { id: data.id }, data: payload })
    : await db.sponsoredPlacement.create({ data: payload });

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "placement",
    entityId: placement.id,
    summary: `${data.kind.toLowerCase().replace(/_/g, " ")} (${data.status.toLowerCase()})`,
  });

  revalidatePath("/admin/sponsored");
  revalidatePath("/", "layout");
  return ok("Placement saved.");
}

export async function setPlacementStatus(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["ACTIVE", "PAUSED", "ENDED"].includes(status)) return;

  const placement = await db.sponsoredPlacement.update({
    where: { id },
    data: { status, endsAt: status === "ENDED" ? new Date() : undefined },
    include: { business: { select: { name: true } } },
  });

  await audit({
    userId: user.id,
    action: "update",
    entityType: "placement",
    entityId: id,
    summary: `${placement.business.name} set to ${status.toLowerCase()}`,
  });
  revalidatePath("/admin/sponsored");
  revalidatePath("/", "layout");
}
