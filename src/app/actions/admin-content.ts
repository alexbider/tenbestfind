"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/auth";
import { refundAndCancel } from "@/lib/billing";
import { db } from "@/lib/db";
import { recordMove } from "@/lib/redirects";
import { analyzeSeo } from "@/lib/seo";
import { parseJson, stringify } from "@/lib/json";
import { rankingUrl, routes } from "@/lib/urls";
import { DEFAULT_RADIUS_KM, fillServiceAreas } from "@/lib/geo";
import { queueRefresh } from "@/lib/reviews";
import { BUSINESS_STATUSES, type SeoEntityType } from "@/lib/enums";

export type ActionState = { status: "idle" | "ok" | "error"; message?: string };

const ok = (message: string): ActionState => ({ status: "ok", message });
const fail = (message: string): ActionState => ({ status: "error", message });

/* ------------------------------------------------------------------- SEO */

const seoSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  path: z.string().min(1),
  title: z.string().max(200).optional(),
  description: z.string().max(400).optional(),
  canonical: z.string().max(500).optional(),
  focusKeyword: z.string().max(120).optional(),
  extraKeywords: z.string().max(500).optional(),
  breadcrumbTitle: z.string().max(200).optional(),
  robotsIndex: z.string().optional(),
  robotsFollow: z.string().optional(),
  robotsNoArchive: z.string().optional(),
  robotsNoSnippet: z.string().optional(),
  robotsNoImageIndex: z.string().optional(),
  maxImagePreview: z.string().optional(),
  ogTitle: z.string().max(200).optional(),
  ogDescription: z.string().max(400).optional(),
  ogImage: z.string().max(500).optional(),
  twitterCard: z.string().max(40).optional(),
  schemaType: z.string().max(60).optional(),
  schemaJson: z.string().max(8000).optional(),
  contentSample: z.string().optional(),
});

/** Saves the Rank Math style SEO record and re-runs the content analysis. */
export async function saveSeo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = seoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Check the SEO fields.");
  const data = parsed.data;

  const analysis = analyzeSeo({
    title: data.title,
    description: data.description,
    focusKeyword: data.focusKeyword,
    slug: data.path,
    content: data.contentSample,
    hasImage: Boolean(data.ogImage),
    internalLinks: 3,
  });

  const payload = {
    title: data.title || null,
    description: data.description || null,
    canonical: data.canonical || null,
    focusKeyword: data.focusKeyword || null,
    extraKeywords: stringify(
      (data.extraKeywords ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
    breadcrumbTitle: data.breadcrumbTitle || null,
    robotsIndex: data.robotsIndex === "on",
    robotsFollow: data.robotsFollow === "on",
    robotsNoArchive: data.robotsNoArchive === "on",
    robotsNoSnippet: data.robotsNoSnippet === "on",
    robotsNoImageIndex: data.robotsNoImageIndex === "on",
    maxImagePreview: data.maxImagePreview || null,
    ogTitle: data.ogTitle || null,
    ogDescription: data.ogDescription || null,
    ogImage: data.ogImage || null,
    twitterCard: data.twitterCard || "summary_large_image",
    schemaType: data.schemaType || null,
    schemaJson: data.schemaJson || null,
    score: analysis.score,
    analysis: JSON.stringify(analysis.checks),
  };

  await db.seoMeta.upsert({
    where: {
      entityType_entityId: {
        entityType: data.entityType as SeoEntityType,
        entityId: data.entityId,
      },
    },
    create: { entityType: data.entityType, entityId: data.entityId, ...payload },
    update: payload,
  });

  await audit({
    userId: user.id,
    action: "update",
    entityType: "seo",
    entityId: data.entityId,
    summary: `SEO updated for ${data.entityType} (score ${analysis.score})`,
  });

  revalidatePath(data.path);
  return ok(`Saved. Content score is now ${analysis.score} out of 100.`);
}

/* ----------------------------------------------------------------- pages */

const pageSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),
  template: z.enum(["document", "contact", "sitemap"]),
  excerpt: z.string().max(500).optional(),
  noticeTitle: z.string().max(200).optional(),
  noticeBody: z.string().max(1000).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  printable: z.string().optional(),
  body: z.string().optional(),
  faqs: z.string().optional(),
});

/** Parses the JSON a block or repeatable editor posted, tolerating junk. */
function rows(value: string | undefined): Record<string, string>[] {
  const parsed = parseJson<Record<string, string>[]>(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function blocks(value: string | undefined) {
  const parsed = parseJson<unknown[]>(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

export async function savePage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = pageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  const existingSlug = await db.page.findUnique({ where: { slug: data.slug } });
  if (existingSlug && existingSlug.id !== data.id) {
    return fail("Another page already uses that slug.");
  }

  const previous = data.id ? await db.page.findUnique({ where: { id: data.id } }) : null;

  const payload = {
    title: data.title,
    slug: data.slug,
    template: data.template,
    excerpt: data.excerpt || null,
    noticeTitle: data.noticeTitle || null,
    noticeBody: data.noticeBody || null,
    printable: data.printable === "on",
    status: data.status,
    body: stringify(blocks(data.body)),
    publishedAt:
      data.status === "PUBLISHED" ? (previous?.publishedAt ?? new Date()) : null,
  };

  const page = data.id
    ? await db.page.update({ where: { id: data.id }, data: payload })
    : await db.page.create({ data: payload });

  if (previous && previous.slug !== data.slug) {
    await recordMove(`/${previous.slug}/`, `/${data.slug}/`);
  }

  // FAQs are replaced wholesale: the editor posts the list it wants to exist.
  const faqRows = rows(data.faqs).filter((row) => row.question?.trim());
  await db.faq.deleteMany({ where: { pageId: page.id } });
  for (const [index, row] of faqRows.entries()) {
    await db.faq.create({
      data: {
        pageId: page.id,
        scope: "PAGE",
        question: row.question.trim(),
        answer: (row.answer ?? "").trim(),
        sortOrder: index,
      },
    });
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "page",
    entityId: page.id,
    summary: `${data.title} (${data.status.toLowerCase()})`,
  });

  revalidatePath(`/${data.slug}/`);
  if (previous && previous.slug !== data.slug) revalidatePath(`/${previous.slug}/`);
  revalidatePath("/admin/pages");
  return ok("Page saved.");
}

export async function deletePage(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const page = await db.page.findUnique({ where: { id } });
  if (!page) return;
  await db.page.delete({ where: { id } });
  await audit({ userId: user.id, action: "delete", entityType: "page", entityId: id, summary: page.title });
  revalidatePath("/admin/pages");
}

/* ---------------------------------------------------------------- guides */

const guideSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Title is required").max(240),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),
  type: z.enum(["EDITORIAL", "COST"]),
  categoryId: z.string().optional(),
  authorId: z.string().optional(),
  reviewerId: z.string().optional(),
  excerpt: z.string().max(600).optional(),
  shortAnswer: z.string().max(1200).optional(),
  heroImage: z.string().max(500).optional(),
  readingMinutes: z.string().optional(),
  typicalLow: z.string().optional(),
  typicalHigh: z.string().optional(),
  unitLow: z.string().optional(),
  unitHigh: z.string().optional(),
  unitLabel: z.string().max(120).optional(),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
  keyTakeaways: z.string().optional(),
  body: z.string().optional(),
  costs: z.string().optional(),
  sources: z.string().optional(),
  faqs: z.string().optional(),
});

/** Empty means "we have no figure", which is different from zero. */
function int(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function lines(value: string | undefined): string[] {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function saveGuide(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = guideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  const clash = await db.guide.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== data.id) return fail("Another guide already uses that slug.");

  const previous = data.id ? await db.guide.findUnique({ where: { id: data.id } }) : null;
  if (data.id && !previous) return fail("That guide no longer exists.");

  const payload = {
    title: data.title,
    slug: data.slug,
    type: data.type,
    categoryId: data.categoryId || null,
    authorId: data.authorId || null,
    reviewerId: data.reviewerId || null,
    excerpt: data.excerpt || null,
    shortAnswer: data.shortAnswer || null,
    heroImage: data.heroImage || null,
    readingMinutes: int(data.readingMinutes) ?? 9,
    typicalLow: data.type === "COST" ? int(data.typicalLow) : null,
    typicalHigh: data.type === "COST" ? int(data.typicalHigh) : null,
    unitLow: data.type === "COST" ? int(data.unitLow) : null,
    unitHigh: data.type === "COST" ? int(data.unitHigh) : null,
    unitLabel: data.type === "COST" ? data.unitLabel || null : null,
    status: data.status,
    keyTakeaways: stringify(lines(data.keyTakeaways)),
    body: stringify(blocks(data.body)),
    publishedAt: data.status === "PUBLISHED" ? (previous?.publishedAt ?? new Date()) : null,
    // A reviewer being named is what "reviewed" means here, so the date follows it.
    reviewedAt: data.reviewerId ? (previous?.reviewedAt ?? new Date()) : null,
  };

  const guide = data.id
    ? await db.guide.update({ where: { id: data.id }, data: payload })
    : await db.guide.create({ data: payload });

  if (previous && previous.slug !== data.slug) {
    await recordMove(`/guides/${previous.slug}/`, `/guides/${data.slug}/`);
  }

  // Cost rows, sources and questions are replaced wholesale: the editor posts
  // the list it wants to exist, so a removed row genuinely disappears.
  await db.costRow.deleteMany({ where: { guideId: guide.id } });
  for (const [index, row] of rows(data.costs)
    .filter((row) => row.label?.trim())
    .entries()) {
    await db.costRow.create({
      data: {
        guideId: guide.id,
        label: row.label.trim(),
        lowPrice: int(row.low),
        highPrice: int(row.high),
        typical: int(row.typical),
        unit: ["project", "sq_ft", "hour", "visit"].includes(row.unit) ? row.unit : "project",
        note: row.note?.trim() || null,
        sortOrder: index,
      },
    });
  }

  await db.source.deleteMany({ where: { guideId: guide.id } });
  for (const [index, row] of rows(data.sources)
    .filter((row) => row.label?.trim())
    .entries()) {
    await db.source.create({
      data: {
        guideId: guide.id,
        label: row.label.trim(),
        publisher: row.publisher?.trim() || null,
        url: row.url?.trim() || null,
        tier: ["PRIMARY", "SECONDARY", "REPORTED", "EDITORIAL"].includes(row.tier)
          ? row.tier
          : "PRIMARY",
        accessedAt: new Date(),
        sortOrder: index,
      },
    });
  }

  await db.faq.deleteMany({ where: { guideId: guide.id } });
  for (const [index, row] of rows(data.faqs)
    .filter((row) => row.question?.trim())
    .entries()) {
    await db.faq.create({
      data: {
        guideId: guide.id,
        scope: "GUIDE",
        question: row.question.trim(),
        answer: (row.answer ?? "").trim(),
        sortOrder: index,
      },
    });
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "guide",
    entityId: guide.id,
    summary: `${data.title} (${data.status.toLowerCase()})`,
  });

  revalidatePath(`/guides/${data.slug}/`);
  if (previous && previous.slug !== data.slug) revalidatePath(`/guides/${previous.slug}/`);
  revalidatePath("/guides/");
  revalidatePath("/admin/guides");
  return ok("Guide saved.");
}

export async function deleteGuide(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const guide = await db.guide.findUnique({ where: { id } });
  if (!guide) return;
  await db.guide.delete({ where: { id } });
  await audit({ userId: user.id, action: "delete", entityType: "guide", entityId: id, summary: guide.title });
  revalidatePath("/guides/");
  revalidatePath("/admin/guides");
}

/* -------------------------------------------------------------- rankings */

const rankingSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Title is required").max(240),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),
  categoryId: z.string().min(1, "Pick a category"),
  cityId: z.string().min(1, "Pick a city"),
  summary: z.string().max(1200).optional(),
  intro: z.string().max(4000).optional(),
  methodologyNote: z.string().max(2000).optional(),
  companiesReviewed: z.string().optional(),
  readingMinutes: z.string().optional(),
  authorId: z.string().optional(),
  reviewerId: z.string().optional(),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
  entries: z.string().optional(),
  criteria: z.string().optional(),
  costs: z.string().optional(),
  sources: z.string().optional(),
  faqs: z.string().optional(),
});

async function rankingPath(categoryId: string, cityId: string) {
  const [category, city] = await Promise.all([
    db.category.findUnique({ where: { id: categoryId }, select: { slug: true } }),
    db.city.findUnique({
      where: { id: cityId },
      select: { slug: true, region: { select: { slug: true, country: { select: { code: true } } } } },
    }),
  ]);
  if (!category || !city) return null;
  return routes.ranking(city.region.country.code, city.region.slug, city.slug, category.slug);
}

export async function saveRanking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = rankingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  // One ranking per category and city: the URL is built from that pair, so a
  // second one would be unreachable.
  const clash = await db.ranking.findFirst({
    where: { categoryId: data.categoryId, cityId: data.cityId },
  });
  if (clash && clash.id !== data.id) {
    return fail("A ranking already exists for that category in that city.");
  }

  const previous = data.id
    ? await db.ranking.findUnique({
        where: { id: data.id },
        select: { publishedAt: true, lastReviewedAt: true, categoryId: true, cityId: true },
      })
    : null;
  if (data.id && !previous) return fail("That ranking no longer exists.");

  const city = await db.city.findUnique({
    where: { id: data.cityId },
    select: { regionId: true, region: { select: { countryId: true } } },
  });
  if (!city) return fail("That city no longer exists.");

  const payload = {
    title: data.title,
    slug: data.slug,
    categoryId: data.categoryId,
    cityId: data.cityId,
    regionId: city.regionId,
    countryId: city.region.countryId,
    summary: data.summary || null,
    intro: data.intro || null,
    methodologyNote: data.methodologyNote || null,
    companiesReviewed: int(data.companiesReviewed) ?? 0,
    readingMinutes: int(data.readingMinutes) ?? 8,
    authorId: data.authorId || null,
    reviewerId: data.reviewerId || null,
    status: data.status,
    publishedAt: data.status === "PUBLISHED" ? (previous?.publishedAt ?? new Date()) : null,
    lastReviewedAt: previous?.lastReviewedAt ?? new Date(),
  };

  const ranking = data.id
    ? await db.ranking.update({ where: { id: data.id }, data: payload })
    : await db.ranking.create({ data: payload });

  // Moving a ranking to another city or category moves its public address.
  if (previous && (previous.categoryId !== data.categoryId || previous.cityId !== data.cityId)) {
    const [oldPath, newPath] = await Promise.all([
      previous.cityId ? rankingPath(previous.categoryId, previous.cityId) : null,
      rankingPath(data.categoryId, data.cityId),
    ]);
    if (oldPath && newPath) await recordMove(oldPath, newPath);
    if (oldPath) revalidatePath(oldPath);
  }

  // Position is the row order in the editor, so reordering is a drag of the
  // list rather than a field anyone has to renumber by hand.
  const entryRows = rows(data.entries).filter((row) => row.businessId?.trim());
  await db.rankingEntry.deleteMany({ where: { rankingId: ranking.id } });
  for (const [index, row] of entryRows.entries()) {
    await db.rankingEntry.create({
      data: {
        rankingId: ranking.id,
        businessId: row.businessId,
        position: index + 1,
        designation: row.designation?.trim() || null,
        whyPicked: row.whyPicked?.trim() || null,
        likes: stringify(lines(row.likes)),
        concerns: stringify(lines(row.concerns)),
        sponsored: row.sponsored === "yes",
      },
    });
  }

  await db.criterion.deleteMany({ where: { rankingId: ranking.id } });
  for (const [index, row] of rows(data.criteria)
    .filter((row) => row.title?.trim())
    .entries()) {
    await db.criterion.create({
      data: {
        rankingId: ranking.id,
        scope: "RANKING",
        title: row.title.trim(),
        body: (row.body ?? "").trim(),
        importance: ["HIGH", "MODERATE", "SUPPORTING"].includes(row.importance)
          ? row.importance
          : "HIGH",
        iconKey: row.iconKey?.trim() || null,
        sortOrder: index,
      },
    });
  }

  await db.costRow.deleteMany({ where: { rankingId: ranking.id } });
  for (const [index, row] of rows(data.costs)
    .filter((row) => row.label?.trim())
    .entries()) {
    await db.costRow.create({
      data: {
        rankingId: ranking.id,
        cityId: data.cityId,
        label: row.label.trim(),
        lowPrice: int(row.low),
        highPrice: int(row.high),
        typical: int(row.typical),
        unit: ["project", "sq_ft", "hour", "visit"].includes(row.unit) ? row.unit : "project",
        note: row.note?.trim() || null,
        sortOrder: index,
      },
    });
  }

  await db.source.deleteMany({ where: { rankingId: ranking.id } });
  for (const [index, row] of rows(data.sources)
    .filter((row) => row.label?.trim())
    .entries()) {
    await db.source.create({
      data: {
        rankingId: ranking.id,
        label: row.label.trim(),
        publisher: row.publisher?.trim() || null,
        url: row.url?.trim() || null,
        tier: ["PRIMARY", "SECONDARY", "REPORTED", "EDITORIAL"].includes(row.tier)
          ? row.tier
          : "PRIMARY",
        accessedAt: new Date(),
        sortOrder: index,
      },
    });
  }

  await db.faq.deleteMany({ where: { rankingId: ranking.id } });
  for (const [index, row] of rows(data.faqs)
    .filter((row) => row.question?.trim())
    .entries()) {
    await db.faq.create({
      data: {
        rankingId: ranking.id,
        scope: "RANKING",
        question: row.question.trim(),
        answer: (row.answer ?? "").trim(),
        sortOrder: index,
      },
    });
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "ranking",
    entityId: ranking.id,
    summary: `${data.title} (${entryRows.length} positions, ${data.status.toLowerCase()})`,
  });

  const path = await rankingPath(data.categoryId, data.cityId);
  if (path) revalidatePath(path);
  revalidatePath("/rankings/");
  revalidatePath("/admin/rankings");
  return ok("Ranking saved.");
}

export async function deleteRanking(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const ranking = await db.ranking.findUnique({ where: { id } });
  if (!ranking) return;
  await db.ranking.delete({ where: { id } });
  await audit({
    userId: user.id,
    action: "delete",
    entityType: "ranking",
    entityId: id,
    summary: ranking.title,
  });
  revalidatePath("/rankings/");
  revalidatePath("/admin/rankings");
}

/* ----------------------------------------------- global FAQs and criteria */

const globalsSchema = z.object({
  faqs: z.string().optional(),
  criteria: z.string().optional(),
});

/**
 * The questions and the ranking criteria that are not tied to one page. They
 * publish on How we rank, on every service hub and in the site-wide FAQ block,
 * so they are edited in one place.
 */
export async function saveGlobals(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = globalsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Check the fields.");
  const data = parsed.data;

  await db.faq.deleteMany({ where: { scope: "GLOBAL" } });
  for (const [index, row] of rows(data.faqs)
    .filter((row) => row.question?.trim())
    .entries()) {
    await db.faq.create({
      data: {
        scope: "GLOBAL",
        question: row.question.trim(),
        answer: (row.answer ?? "").trim(),
        sortOrder: index,
      },
    });
  }

  await db.criterion.deleteMany({ where: { scope: "GLOBAL" } });
  for (const [index, row] of rows(data.criteria)
    .filter((row) => row.title?.trim())
    .entries()) {
    await db.criterion.create({
      data: {
        scope: "GLOBAL",
        title: row.title.trim(),
        body: (row.body ?? "").trim(),
        importance: ["HIGH", "MODERATE", "SUPPORTING"].includes(row.importance)
          ? row.importance
          : "HIGH",
        iconKey: row.iconKey?.trim() || null,
        sortOrder: index,
      },
    });
  }

  await audit({
    userId: user.id,
    action: "update",
    entityType: "globals",
    summary: "Site-wide questions and ranking criteria updated",
  });

  revalidatePath("/how-we-rank/");
  revalidatePath("/", "layout");
  revalidatePath("/admin/faqs");
  return ok("Saved.");
}

/* ----------------------------------------------------------------- posts */

const postSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Title is required").max(240),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),
  excerpt: z.string().max(600).optional(),
  heroImage: z.string().max(500).optional(),
  categoryId: z.string().optional(),
  authorId: z.string().optional(),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
  body: z.string().optional(),
});

export async function savePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  const clash = await db.post.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== data.id) return fail("Another post already uses that slug.");

  const previous = data.id ? await db.post.findUnique({ where: { id: data.id } }) : null;
  if (data.id && !previous) return fail("That post no longer exists.");

  const payload = {
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt || null,
    heroImage: data.heroImage || null,
    categoryId: data.categoryId || null,
    authorId: data.authorId || null,
    status: data.status,
    body: stringify(blocks(data.body)),
    publishedAt: data.status === "PUBLISHED" ? (previous?.publishedAt ?? new Date()) : null,
  };

  const post = data.id
    ? await db.post.update({ where: { id: data.id }, data: payload })
    : await db.post.create({ data: payload });

  if (previous && previous.slug !== data.slug) {
    await recordMove(routes.post(previous.slug), routes.post(data.slug));
    revalidatePath(routes.post(previous.slug));
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "post",
    entityId: post.id,
    summary: `${data.title} (${data.status.toLowerCase()})`,
  });

  revalidatePath(routes.post(data.slug));
  revalidatePath(routes.blogIndex());
  revalidatePath("/admin/guides");
  return ok("Post saved.");
}

export async function deletePost(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const post = await db.post.findUnique({ where: { id } });
  if (!post) return;
  await db.post.delete({ where: { id } });
  await audit({
    userId: user.id,
    action: "delete",
    entityType: "post",
    entityId: id,
    summary: post.title,
  });
  revalidatePath(routes.blogIndex());
  revalidatePath("/admin/guides");
}

/* -------------------------------------------------------- status changes */

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
});

export async function setGuideStatus(formData: FormData) {
  const user = await requireStaff();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const guide = await db.guide.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : undefined,
    },
  });
  await audit({
    userId: user.id,
    action: "publish",
    entityType: "guide",
    entityId: guide.id,
    summary: `${guide.title} → ${parsed.data.status.toLowerCase()}`,
  });
  revalidatePath(`/guides/${guide.slug}/`);
  revalidatePath("/admin/guides");
}

export async function setRankingStatus(formData: FormData) {
  const user = await requireStaff();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const ranking = await db.ranking.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : undefined,
    },
  });
  await audit({
    userId: user.id,
    action: "publish",
    entityType: "ranking",
    entityId: ranking.id,
    summary: `${ranking.title} → ${parsed.data.status.toLowerCase()}`,
  });
  revalidatePath("/admin/rankings");
  revalidatePath("/rankings/");
}

export async function markRankingReviewed(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const ranking = await db.ranking.update({
    where: { id },
    data: { lastReviewedAt: new Date() },
  });
  await audit({
    userId: user.id,
    action: "review",
    entityType: "ranking",
    entityId: id,
    summary: `${ranking.title} marked reviewed`,
  });
  revalidatePath("/admin/rankings");
}

/* ------------------------------------------------------------ businesses */

const businessSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),
  categoryId: z.string().min(1, "Pick a service"),
  cityId: z.string().optional(),
  status: z.enum(BUSINESS_STATUSES),
  tagline: z.string().max(240).optional(),
  overview: z.string().max(1600).optional(),
  description: z.string().max(8000).optional(),
  bestFor: z.string().max(200).optional(),
  editorialTake: z.string().max(4000).optional(),
  strengths: z.string().optional(),
  considerations: z.string().optional(),
  logoUrl: z.string().max(500).optional(),
  website: z.string().max(300).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().max(200).optional(),
  addressLine: z.string().max(300).optional(),
  postalCode: z.string().max(40).optional(),
  yearFounded: z.string().optional(),
  employeeCount: z.string().max(60).optional(),
  licenseNumber: z.string().max(80).optional(),
  warrantyTerms: z.string().max(200).optional(),
  emergency: z.string().optional(),
  financing: z.string().optional(),
  freeEstimates: z.string().optional(),
  verified: z.string().optional(),
  claimed: z.string().optional(),
  googleRating: z.string().optional(),
  googleReviewCount: z.string().optional(),
  hours: z.string().optional(),
  services: z.string().optional(),
  areas: z.string().optional(),
  credentials: z.string().optional(),
  photos: z.string().optional(),
});

export async function saveBusiness(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = businessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const data = parsed.data;

  const rating = data.googleRating?.trim() ? Number(data.googleRating) : null;
  if (rating !== null && (Number.isNaN(rating) || rating < 0 || rating > 5)) {
    return fail("Google rating must be between 0 and 5.");
  }

  const clash = await db.business.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== data.id) return fail("Another business already uses that slug.");

  const previous = data.id ? await db.business.findUnique({ where: { id: data.id } }) : null;
  if (data.id && !previous) return fail("That business no longer exists.");

  const hours = rows(data.hours)
    .filter((row) => row.day?.trim())
    .map((row) => ({
      day: row.day.trim(),
      opens: row.opens?.trim() ?? "",
      closes: row.closes?.trim() ?? "",
      closed: row.closed === "yes",
    }));

  const payload = {
    name: data.name,
    slug: data.slug,
    categoryId: data.categoryId,
    cityId: data.cityId || null,
    status: data.status,
    tagline: data.tagline || null,
    overview: data.overview || null,
    description: data.description || null,
    bestFor: data.bestFor || null,
    editorialTake: data.editorialTake || null,
    strengths: stringify(lines(data.strengths)),
    considerations: stringify(lines(data.considerations)),
    logoUrl: data.logoUrl || null,
    website: data.website || null,
    phone: data.phone || null,
    email: data.email || null,
    addressLine: data.addressLine || null,
    postalCode: data.postalCode || null,
    hours: stringify(hours),
    yearFounded: int(data.yearFounded),
    employeeCount: data.employeeCount || null,
    licenseNumber: data.licenseNumber || null,
    warrantyTerms: data.warrantyTerms || null,
    emergency: data.emergency === "on",
    financing: data.financing === "on",
    freeEstimates: data.freeEstimates === "on",
    verified: data.verified === "on",
    claimed: data.claimed === "on",
    googleRating: rating,
    googleReviewCount: int(data.googleReviewCount),
    // Republishing someone else's numbers means recording when we read them.
    googleDataUpdated:
      rating !== null && rating !== previous?.googleRating
        ? new Date()
        : (previous?.googleDataUpdated ?? null),
    publishedAt:
      data.status === "PUBLISHED" ? (previous?.publishedAt ?? new Date()) : previous?.publishedAt ?? null,
  };

  const business = data.id
    ? await db.business.update({ where: { id: data.id }, data: payload })
    : await db.business.create({ data: payload });

  if (previous && previous.slug !== data.slug) {
    await recordMove(routes.business(previous.slug), routes.business(data.slug));
    revalidatePath(routes.business(previous.slug));
  }

  // Services offered and areas served are join rows, so they are rebuilt from
  // what the form posted rather than patched.
  const serviceIds = lines(data.services);
  await db.businessService.deleteMany({ where: { businessId: business.id } });
  for (const subserviceId of serviceIds) {
    const exists = await db.subservice.findUnique({ where: { id: subserviceId } });
    if (exists) {
      await db.businessService.create({ data: { businessId: business.id, subserviceId } });
    }
  }

  const areaIds = lines(data.areas);
  await db.businessArea.deleteMany({ where: { businessId: business.id } });
  for (const [index, cityId] of areaIds.entries()) {
    const exists = await db.city.findUnique({ where: { id: cityId } });
    if (exists) {
      await db.businessArea.create({
        data: { businessId: business.id, cityId, primary: index === 0 },
      });
    }
  }

  await db.credential.deleteMany({ where: { businessId: business.id } });
  for (const [index, row] of rows(data.credentials)
    .filter((row) => row.label?.trim())
    .entries()) {
    await db.credential.create({
      data: {
        businessId: business.id,
        label: row.label.trim(),
        identifier: row.identifier?.trim() || null,
        authority: row.authority?.trim() || null,
        status: ["VERIFIED", "REPORTED", "EXPIRED"].includes(row.status) ? row.status : "REPORTED",
        checkedAt: row.status === "VERIFIED" ? new Date() : null,
        sourceUrl: row.sourceUrl?.trim() || null,
        sortOrder: index,
      },
    });
  }

  await db.businessPhoto.deleteMany({ where: { businessId: business.id } });
  for (const [index, row] of rows(data.photos)
    .filter((row) => row.url?.trim())
    .entries()) {
    await db.businessPhoto.create({
      data: {
        businessId: business.id,
        url: row.url.trim(),
        alt: row.alt?.trim() || null,
        sortOrder: index,
      },
    });
  }

  await audit({
    userId: user.id,
    action: data.id ? "update" : "create",
    entityType: "business",
    entityId: business.id,
    summary: `${business.name} (${data.status.toLowerCase()})`,
  });

  revalidatePath(routes.business(data.slug));
  revalidatePath("/admin/businesses");
  return ok("Business saved.");
}

export async function deleteBusiness(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const business = await db.business.findUnique({
    where: { id },
    include: { _count: { select: { entries: true, subscriptions: true } } },
  });
  if (!business) return;

  // A company on a published list, or one that has paid us, is archived rather
  // than erased: the list would break and the billing record has to survive.
  if (business._count.entries > 0 || business._count.subscriptions > 0) {
    await db.business.update({ where: { id }, data: { status: "ARCHIVED" } });
    await audit({
      userId: user.id,
      action: "update",
      entityType: "business",
      entityId: id,
      summary: `${business.name} archived rather than deleted: it has rankings or billing history`,
    });
  } else {
    await db.business.delete({ where: { id } });
    await audit({
      userId: user.id,
      action: "delete",
      entityType: "business",
      entityId: id,
      summary: business.name,
    });
  }
  revalidatePath("/admin/businesses");
  // The page this was submitted from no longer describes anything.
  redirect("/admin/businesses");
}

/**
 * Suspends, restores or otherwise moves a business between statuses without
 * opening the full editor. Suspension is the reversible one: the profile stops
 * being published but everything about it survives, so a dispute or an unpaid
 * invoice can be resolved and the listing put straight back.
 */
export async function setBusinessStatus(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const parsed = z.enum(BUSINESS_STATUSES).safeParse(String(formData.get("status")));
  if (!parsed.success) return;

  const business = await db.business.update({
    where: { id },
    data: {
      status: parsed.data,
      publishedAt: parsed.data === "PUBLISHED" ? new Date() : undefined,
    },
  });
  await audit({
    userId: user.id,
    action: "update",
    entityType: "business",
    entityId: id,
    summary: `${business.name} → ${parsed.data.toLowerCase()}`,
  });
  revalidatePath("/admin/businesses");
  revalidatePath(`/admin/businesses/${id}`);
  revalidatePath(routes.business(business.slug));
}

/**
 * Moves a company to a chosen place on one of its rankings. Everything between
 * the old and the new place shifts by one so the list stays 1..n with no gaps
 * and no two companies sharing a number.
 */
export async function setRankingPosition(formData: FormData) {
  const user = await requireStaff();
  const entryId = String(formData.get("entryId"));
  const wanted = Number(formData.get("position"));
  if (!Number.isInteger(wanted) || wanted < 1) return;

  const entry = await db.rankingEntry.findUnique({
    where: { id: entryId },
    include: {
      business: { select: { name: true, slug: true, id: true } },
      ranking: { include: { category: { select: { slug: true } }, city: { include: { region: { include: { country: true } } } } } },
    },
  });
  if (!entry) return;

  const siblings = await db.rankingEntry.findMany({
    where: { rankingId: entry.rankingId },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  const order = siblings.map((row) => row.id).filter((rowId) => rowId !== entryId);
  order.splice(Math.min(wanted, order.length + 1) - 1, 0, entryId);

  // Positions are unique per ranking, so the rewrite runs in two passes: park
  // everything on negative numbers first, then write the real ones.
  await db.$transaction([
    ...order.map((rowId, index) =>
      db.rankingEntry.update({ where: { id: rowId }, data: { position: -(index + 1) } }),
    ),
    ...order.map((rowId, index) =>
      db.rankingEntry.update({ where: { id: rowId }, data: { position: index + 1 } }),
    ),
  ]);

  await audit({
    userId: user.id,
    action: "update",
    entityType: "ranking",
    entityId: entry.rankingId,
    summary: `${entry.business.name} moved to #${order.indexOf(entryId) + 1} on ${entry.ranking.title}`,
  });
  revalidatePath(`/admin/businesses/${entry.businessId}`);
  revalidatePath(`/admin/rankings/${entry.rankingId}`);
  revalidatePath(rankingUrl(entry.ranking));
}

/** Adds a company to a ranking at the bottom, ready to be moved up. */
export async function addToRanking(formData: FormData) {
  const user = await requireStaff();
  const businessId = String(formData.get("businessId"));
  const rankingId = String(formData.get("rankingId"));
  if (!businessId || !rankingId) return;

  const existing = await db.rankingEntry.findUnique({
    where: { rankingId_businessId: { rankingId, businessId } },
  });
  if (existing) return;

  const last = await db.rankingEntry.findFirst({
    where: { rankingId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  await db.rankingEntry.create({
    data: { rankingId, businessId, position: (last?.position ?? 0) + 1 },
  });

  const business = await db.business.findUnique({ where: { id: businessId }, select: { name: true } });
  await audit({
    userId: user.id,
    action: "create",
    entityType: "ranking",
    entityId: rankingId,
    summary: `${business?.name ?? businessId} added to the list`,
  });
  revalidatePath(`/admin/businesses/${businessId}`);
  revalidatePath(`/admin/rankings/${rankingId}`);
}

/** Takes a company off a ranking and closes the gap it leaves behind. */
export async function removeFromRanking(formData: FormData) {
  const user = await requireStaff();
  const entryId = String(formData.get("entryId"));
  const entry = await db.rankingEntry.findUnique({
    where: { id: entryId },
    include: {
      business: { select: { name: true } },
      ranking: {
        include: {
          category: { select: { slug: true } },
          city: { include: { region: { include: { country: true } } } },
        },
      },
    },
  });
  if (!entry) return;

  await db.rankingEntry.delete({ where: { id: entryId } });
  const rest = await db.rankingEntry.findMany({
    where: { rankingId: entry.rankingId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  await db.$transaction([
    ...rest.map((row, index) =>
      db.rankingEntry.update({ where: { id: row.id }, data: { position: -(index + 1) } }),
    ),
    ...rest.map((row, index) =>
      db.rankingEntry.update({ where: { id: row.id }, data: { position: index + 1 } }),
    ),
  ]);

  await audit({
    userId: user.id,
    action: "delete",
    entityType: "ranking",
    entityId: entry.rankingId,
    summary: `${entry.business.name} removed from ${entry.ranking.title}`,
  });
  revalidatePath(`/admin/businesses/${entry.businessId}`);
  revalidatePath(`/admin/rankings/${entry.rankingId}`);
  revalidatePath(rankingUrl(entry.ranking));
}

/**
 * Queues a re-read of one company's Google reviews. The work happens in the
 * import worker rather than here, so the page comes back straight away and a
 * slow Apify run cannot time the request out.
 */
export async function refreshBusinessReviews(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const business = await db.business.findUnique({
    where: { id },
    select: { name: true, placeId: true },
  });
  if (!business) return;

  const queued = await queueRefresh({ businessIds: [id], userId: user.id });
  await audit({
    userId: user.id,
    action: "update",
    entityType: "business",
    entityId: id,
    summary: queued.requested
      ? `Review refresh queued for ${business.name}`
      : `Review refresh skipped for ${business.name}: no Google place id on file`,
  });
  revalidatePath(`/admin/businesses/${id}`);
  revalidatePath("/admin/reviews");
}

/**
 * Queues a refresh for a whole slice of the directory. The selection is by
 * status, category and city rather than by ticking boxes, because the useful
 * case is "everything published in Dallas", not a hand-picked twelve.
 */
export async function refreshReviewsBatch(formData: FormData) {
  const user = await requireStaff();
  const categoryId = String(formData.get("categoryId") ?? "");
  const cityId = String(formData.get("cityId") ?? "");
  const staleDays = Number(formData.get("staleDays") ?? 0);
  const limit = Math.min(200, Math.max(1, Number(formData.get("limit") ?? 50)));

  const stale =
    staleDays > 0
      ? new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000)
      : null;

  const businesses = await db.business.findMany({
    where: {
      placeId: { not: null },
      status: { in: ["PUBLISHED", "DRAFT", "PENDING"] },
      ...(categoryId ? { categoryId } : {}),
      ...(cityId ? { cityId } : {}),
      ...(stale
        ? { OR: [{ reviewsUpdatedAt: null }, { reviewsUpdatedAt: { lt: stale } }] }
        : {}),
    },
    orderBy: { reviewsUpdatedAt: { sort: "asc", nulls: "first" } },
    select: { id: true },
    take: limit,
  });

  if (businesses.length === 0) return;

  const queued = await queueRefresh({
    businessIds: businesses.map((row) => row.id),
    userId: user.id,
  });
  await audit({
    userId: user.id,
    action: "update",
    entityType: "business",
    entityId: queued.id,
    summary: `Review refresh queued for ${queued.requested} companies`,
  });
  revalidatePath("/admin/reviews");
}

/** Rebuilds a company's service areas from the radius around where it works. */
export async function refillServiceAreas(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const km = Number(formData.get("km") ?? DEFAULT_RADIUS_KM) || DEFAULT_RADIUS_KM;

  const result = await fillServiceAreas(id, km);
  const business = await db.business.findUnique({ where: { id }, select: { name: true, slug: true } });
  if (!business) return;

  await audit({
    userId: user.id,
    action: "update",
    entityType: "business",
    entityId: id,
    summary: `${business.name}: ${result.added} areas added within ${km} km, ${result.total} in total`,
  });
  revalidatePath(`/admin/businesses/${id}`);
  revalidatePath(routes.business(business.slug));
}

export async function setCredentialStatus(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const credential = await db.credential.update({
    where: { id },
    data: { status, checkedAt: status === "VERIFIED" ? new Date() : null },
  });
  await audit({
    userId: user.id,
    action: "verify",
    entityType: "credential",
    entityId: id,
    summary: `${credential.label} → ${status.toLowerCase()}`,
  });
  revalidatePath("/admin/businesses");
}

/* ---------------------------------------------------------------- claims */

export async function decideClaim(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  const status = decision === "approve" ? "APPROVED" : decision === "verify" ? "VERIFYING" : "REJECTED";

  const claim = await db.claimRequest.update({
    where: { id },
    data: { status, reviewedAt: status === "VERIFYING" ? null : new Date() },
  });

  // Approving a claim marks the listing claimed and activates the subscription
  // that was opened when the claim was submitted.
  if (status === "APPROVED" && claim.businessId) {
    await db.business.update({ where: { id: claim.businessId }, data: { claimed: true } });
    await db.subscription.updateMany({
      where: { businessId: claim.businessId, status: "PENDING" },
      data: { status: "ACTIVE", startedAt: new Date() },
    });
  }

  // A rejected claim refunds the charge rather than leaving it open. The refund
  // goes through Stripe when it is configured, and the local records are
  // updated either way.
  if (status === "REJECTED" && claim.businessId) {
    const open = await db.subscription.findFirst({
      where: { businessId: claim.businessId, status: { in: ["PENDING", "ACTIVE"] } },
    });
    if (open) {
      try {
        await refundAndCancel(open.id, "Ownership could not be verified");
      } catch (error) {
        await audit({
          userId: user.id,
          action: "error",
          entityType: "subscription",
          entityId: open.id,
          summary: `Refund failed: ${error instanceof Error ? error.message : "unknown"}`,
        });
      }
    }
  }

  await audit({
    userId: user.id,
    action: "decide",
    entityType: "claim",
    entityId: id,
    summary: `${claim.businessName} → ${status.toLowerCase()}`,
  });
  revalidatePath("/admin/claims");
}

/* ----------------------------------------------------------- submissions */

export async function setSubmissionStatus(formData: FormData) {
  const user = await requireStaff();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const submission = await db.submission.update({
    where: { id },
    data: { status, resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null },
  });
  await audit({
    userId: user.id,
    action: "update",
    entityType: "submission",
    entityId: id,
    summary: `${submission.subject} → ${status.toLowerCase()}`,
  });
  revalidatePath("/admin/submissions");
}
