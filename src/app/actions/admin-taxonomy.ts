"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/auth";
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

function decimal(value: string | undefined): number | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

const on = (value: string | undefined) => value === "on";

/* ------------------------------------------------------------ categories */

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is required").max(120),
  singular: z.string().trim().min(2, "Singular name is required").max(120),
  serviceName: z.string().trim().min(2, "Service name is required").max(120),
  slug: slugField,
  iconKey: z.string().trim().max(60).optional(),
  tagline: z.string().max(240).optional(),
  description: z.string().max(2000).optional(),
  groupName: z.string().max(120).optional(),
  navGroup: z.string().max(120).optional(),
  navOrder: z.string().optional(),
  sortOrder: z.string().optional(),
  featured: z.string().optional(),
  wide: z.string().optional(),
  trending: z.string().optional(),
  published: z.string().optional(),
  subservices: z.string().optional(),
});

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  const clash = await db.category.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== data.id) return fail("Another service already uses that slug.");

  const previous = data.id ? await db.category.findUnique({ where: { id: data.id } }) : null;
  if (data.id && !previous) return fail("That service no longer exists.");

  const payload = {
    name: data.name,
    singular: data.singular,
    serviceName: data.serviceName,
    slug: data.slug,
    iconKey: data.iconKey || "wrench",
    tagline: data.tagline || null,
    description: data.description || null,
    groupName: data.groupName || null,
    navGroup: data.navGroup || null,
    navOrder: int(data.navOrder) ?? 0,
    sortOrder: int(data.sortOrder) ?? 0,
    featured: on(data.featured),
    wide: on(data.wide),
    trending: on(data.trending),
    published: on(data.published),
  };

  const category = data.id
    ? await db.category.update({ where: { id: data.id }, data: payload })
    : await db.category.create({ data: payload });

  if (previous && previous.slug !== data.slug) {
    await recordMove(routes.category(previous.slug), routes.category(data.slug));
    revalidatePath(routes.category(previous.slug));
  }

  // Subservices are matched on slug so an existing one keeps its id, and with it
  // every business that offers it.
  const subRows = rows(data.subservices).filter((row) => row.name?.trim() && row.slug?.trim());
  const keptSlugs = subRows.map((row) => row.slug.trim());
  await db.subservice.deleteMany({
    where: { categoryId: category.id, slug: { notIn: keptSlugs.length ? keptSlugs : ["__none__"] } },
  });
  for (const [index, row] of subRows.entries()) {
    const values = {
      name: row.name.trim(),
      description: row.description?.trim() || null,
      iconKey: row.iconKey?.trim() || null,
      trending: row.trending === "yes",
      sortOrder: index,
    };
    const existing = await db.subservice.findFirst({
      where: { categoryId: category.id, slug: row.slug.trim() },
    });
    if (existing) {
      await db.subservice.update({ where: { id: existing.id }, data: values });
    } else {
      await db.subservice.create({
        data: { ...values, categoryId: category.id, slug: row.slug.trim() },
      });
    }
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "category",
    entityId: category.id,
    summary: `${data.name} (${subRows.length} subservices)`,
  });

  revalidatePath(routes.category(data.slug));
  revalidatePath("/services/");
  revalidatePath("/admin/taxonomy");
  revalidatePath("/", "layout");
  return ok("Service saved.");
}

export async function deleteCategory(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const category = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { businesses: true, rankings: true } } },
  });
  if (!category) return;
  // Deleting a service with live content would orphan URLs, so it is archived.
  if (category._count.businesses > 0 || category._count.rankings > 0) {
    await db.category.update({ where: { id }, data: { published: false } });
    await audit({
      userId: user.id,
      action: "update",
      entityType: "category",
      entityId: id,
      summary: `${category.name} hidden rather than deleted: it still has content`,
    });
  } else {
    await db.category.delete({ where: { id } });
    await audit({
      userId: user.id,
      action: "delete",
      entityType: "category",
      entityId: id,
      summary: category.name,
    });
  }
  revalidatePath("/services/");
  revalidatePath("/admin/taxonomy");
}

/* ------------------------------------------------------------- countries */

const countrySchema = z.object({
  id: z.string().optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(4)
    .regex(/^[a-z]+$/, "Country code is lowercase letters only"),
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: slugField,
  demonym: z.string().max(60).optional(),
  currency: z.string().trim().min(3).max(3),
  blurb: z.string().max(2000).optional(),
  heroImage: z.string().max(500).optional(),
  regionLabel: z.enum(["states", "provinces"]),
  sortOrder: z.string().optional(),
  published: z.string().optional(),
  faqs: z.string().optional(),
});

export async function saveCountry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = countrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  const clash = await db.country.findFirst({
    where: { OR: [{ code: data.code }, { slug: data.slug }] },
  });
  if (clash && clash.id !== data.id) return fail("Another country already uses that code or slug.");

  const previous = data.id ? await db.country.findUnique({ where: { id: data.id } }) : null;
  if (data.id && !previous) return fail("That country no longer exists.");

  const payload = {
    code: data.code,
    name: data.name,
    slug: data.slug,
    demonym: data.demonym || null,
    currency: data.currency.toUpperCase(),
    blurb: data.blurb || null,
    heroImage: data.heroImage || null,
    regionLabel: data.regionLabel,
    sortOrder: int(data.sortOrder) ?? 0,
    published: on(data.published),
  };

  const country = data.id
    ? await db.country.update({ where: { id: data.id }, data: payload })
    : await db.country.create({ data: payload });

  // The public address is the country code, not the slug.
  if (previous && previous.code !== data.code) {
    await recordMove(routes.country(previous.code), routes.country(data.code));
    revalidatePath(routes.country(previous.code));
  }

  await db.faq.deleteMany({ where: { countryId: country.id } });
  for (const [index, row] of rows(data.faqs)
    .filter((row) => row.question?.trim())
    .entries()) {
    await db.faq.create({
      data: {
        countryId: country.id,
        scope: "COUNTRY",
        question: row.question.trim(),
        answer: (row.answer ?? "").trim(),
        sortOrder: index,
      },
    });
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "country",
    entityId: country.id,
    summary: data.name,
  });

  revalidatePath(routes.country(data.code));
  revalidatePath("/admin/taxonomy");
  revalidatePath("/", "layout");
  return ok("Country saved.");
}

/* --------------------------------------------------------------- regions */

const regionSchema = z.object({
  id: z.string().optional(),
  countryId: z.string().min(1, "Pick a country"),
  code: z
    .string()
    .trim()
    .min(2)
    .max(6)
    .regex(/^[a-z]+$/, "Region code is lowercase letters only"),
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: slugField,
  blurb: z.string().max(2000).optional(),
  heroImage: z.string().max(500).optional(),
  groupName: z.string().max(120).optional(),
  sortOrder: z.string().optional(),
  published: z.string().optional(),
  licensing: z.string().optional(),
});

export async function saveRegion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = regionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  const clash = await db.region.findFirst({
    where: { countryId: data.countryId, slug: data.slug },
  });
  if (clash && clash.id !== data.id) return fail("Another region in that country uses that slug.");

  const previous = data.id
    ? await db.region.findUnique({ where: { id: data.id }, include: { country: true } })
    : null;
  if (data.id && !previous) return fail("That region no longer exists.");

  const country = await db.country.findUnique({ where: { id: data.countryId } });
  if (!country) return fail("That country no longer exists.");

  const licensing = rows(data.licensing)
    .filter((row) => row.trade?.trim())
    .map((row) => ({
      trade: row.trade.trim(),
      authority: row.authority?.trim() ?? "",
      licensed: row.licensed !== "no",
      note: row.note?.trim() ?? "",
    }));

  const payload = {
    countryId: data.countryId,
    code: data.code,
    name: data.name,
    slug: data.slug,
    blurb: data.blurb || null,
    heroImage: data.heroImage || null,
    groupName: data.groupName || null,
    sortOrder: int(data.sortOrder) ?? 0,
    published: on(data.published),
    licensing: stringify(licensing),
  };

  const region = data.id
    ? await db.region.update({ where: { id: data.id }, data: payload })
    : await db.region.create({ data: payload });

  if (previous && (previous.slug !== data.slug || previous.countryId !== data.countryId)) {
    await recordMove(
      routes.region(previous.country.code, previous.slug),
      routes.region(country.code, data.slug),
    );
    revalidatePath(routes.region(previous.country.code, previous.slug));
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "region",
    entityId: region.id,
    summary: `${data.name}, ${country.name}`,
  });

  revalidatePath(routes.region(country.code, data.slug));
  revalidatePath(routes.country(country.code));
  revalidatePath("/admin/taxonomy");
  revalidatePath("/", "layout");
  return ok("Region saved.");
}

/* ---------------------------------------------------------------- cities */

const citySchema = z.object({
  id: z.string().optional(),
  regionId: z.string().min(1, "Pick a region"),
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: slugField,
  county: z.string().max(120).optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  population: z.string().optional(),
  blurb: z.string().max(2000).optional(),
  heroImage: z.string().max(500).optional(),
  neighborhoods: z.string().optional(),
  conditions: z.string().optional(),
  topMetro: z.string().optional(),
  sortOrder: z.string().optional(),
  published: z.string().optional(),
});

export async function saveCity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = citySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  const clash = await db.city.findFirst({ where: { regionId: data.regionId, slug: data.slug } });
  if (clash && clash.id !== data.id) return fail("Another city in that region uses that slug.");

  const previous = data.id
    ? await db.city.findUnique({
        where: { id: data.id },
        include: { region: { include: { country: true } } },
      })
    : null;
  if (data.id && !previous) return fail("That city no longer exists.");

  const region = await db.region.findUnique({
    where: { id: data.regionId },
    include: { country: true },
  });
  if (!region) return fail("That region no longer exists.");

  const conditions = rows(data.conditions)
    .filter((row) => row.title?.trim())
    .map((row) => ({
      title: row.title.trim(),
      body: row.body?.trim() ?? "",
      iconKey: row.iconKey?.trim() || undefined,
    }));

  const payload = {
    regionId: data.regionId,
    name: data.name,
    slug: data.slug,
    county: data.county || null,
    latitude: decimal(data.latitude),
    longitude: decimal(data.longitude),
    population: int(data.population),
    blurb: data.blurb || null,
    heroImage: data.heroImage || null,
    neighborhoods: stringify(lines(data.neighborhoods)),
    conditions: stringify(conditions),
    topMetro: on(data.topMetro),
    sortOrder: int(data.sortOrder) ?? 0,
    published: on(data.published),
  };

  const city = data.id
    ? await db.city.update({ where: { id: data.id }, data: payload })
    : await db.city.create({ data: payload });

  if (previous && (previous.slug !== data.slug || previous.regionId !== data.regionId)) {
    const oldPath = routes.city(
      previous.region.country.code,
      previous.region.slug,
      previous.slug,
    );
    const newPath = routes.city(region.country.code, region.slug, data.slug);
    await recordMove(oldPath, newPath);
    revalidatePath(oldPath);
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "city",
    entityId: city.id,
    summary: `${data.name}, ${region.name}`,
  });

  revalidatePath(routes.city(region.country.code, region.slug, data.slug));
  revalidatePath(routes.region(region.country.code, region.slug));
  revalidatePath("/admin/taxonomy");
  revalidatePath("/", "layout");
  return ok("City saved.");
}
