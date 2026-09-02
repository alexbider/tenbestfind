import { db } from "../db";
import { parseJson, parseList } from "../json";
import { fullDate, slugify } from "../format";
import { rankingUrl, routes } from "../urls";
import { canRun, int, limitOf, object, str, ToolError, type Tool, type ToolContext } from "./kit";
import { CONTENT_TOOLS } from "./content";
import { TAXONOMY_TOOLS } from "./taxonomy";
import { DIRECTORY_TOOLS } from "./directory";
import { COMMERCE_TOOLS } from "./commerce";
import { SYSTEM_TOOLS } from "./system";
import { IMPORT_TOOLS } from "./imports";
import type { UserRole } from "../enums";

export { ToolError } from "./kit";
export type { Tool, ToolContext } from "./kit";

// The whole surface, assembled. Orientation tools live here because they cut
// across every module; everything else belongs to the part of the site it edits.

const ORIENTATION: Tool[] = [
  {
    name: "site_overview",
    title: "Site overview",
    description:
      "Counts of everything published and in draft, the SEO health summary, and whether indexing is on. Call this first.",
    schema: object({}),
    handler: async () => {
      const [businesses, rankings, guides, pages, posts, cities, categories, people, seo, batches, visible] =
        await Promise.all([
          db.business.groupBy({ by: ["status"], _count: true }),
          db.ranking.groupBy({ by: ["status"], _count: true }),
          db.guide.groupBy({ by: ["status"], _count: true }),
          db.page.groupBy({ by: ["status"], _count: true }),
          db.post.count({ where: { status: "PUBLISHED" } }),
          db.city.count({ where: { published: true } }),
          db.category.count({ where: { published: true } }),
          db.person.count({ where: { published: true } }),
          db.seoMeta.findMany({ select: { score: true, robotsIndex: true } }),
          db.importBatch.groupBy({ by: ["status"], _count: true }),
          db.setting.findUnique({ where: { key: "seo.searchEngineVisible" } }),
        ]);

      const scored = seo.filter((row) => row.score > 0);
      const counts = (rows: { status: string; _count: number }[]) =>
        Object.fromEntries(rows.map((row) => [row.status, row._count]));

      return {
        indexingEnabled: parseJson<boolean>(visible?.value, true),
        businesses: counts(businesses),
        rankings: counts(rankings),
        guides: counts(guides),
        pages: counts(pages),
        publishedPosts: posts,
        cities,
        services: categories,
        editorialTeam: people,
        seo: {
          records: seo.length,
          averageScore: scored.length
            ? Math.round(scored.reduce((total, row) => total + row.score, 0) / scored.length)
            : 0,
          noindex: seo.filter((row) => !row.robotsIndex).length,
        },
        importBatches: counts(batches),
      };
    },
  },

  {
    name: "search_businesses",
    title: "Search businesses",
    description:
      "Find businesses by name, city, service or status. Returns summaries; get_business gives the full profile.",
    schema: object({
      query: str("Matches the business name."),
      city: str("City name."),
      category: str("Service name or slug."),
      status: str("DRAFT, PENDING, PUBLISHED, REJECTED or ARCHIVED."),
      missingEmail: { type: "boolean", description: "Only those with no email on file." },
      needsReview: { type: "boolean", description: "Only those imported but never edited by a person." },
      limit: int("Up to 200. Default 20."),
    }),
    handler: async (args) => {
      const rows = await db.business.findMany({
        where: {
          ...(args.query ? { name: { contains: String(args.query) } } : {}),
          ...(args.status ? { status: String(args.status).toUpperCase() } : {}),
          ...(args.missingEmail === true ? { email: null } : {}),
          ...(args.needsReview === true ? { importedAt: { not: null }, status: "DRAFT" } : {}),
          ...(args.city ? { city: { name: { contains: String(args.city) } } } : {}),
          ...(args.category
            ? {
                category: {
                  OR: [
                    { name: { contains: String(args.category) } },
                    { slug: { contains: slugify(String(args.category)) } },
                  ],
                },
              }
            : {}),
        },
        include: { city: { include: { region: true } }, category: true },
        orderBy: [{ gmbRank: "asc" }, { name: "asc" }],
        take: limitOf(args),
      });

      return {
        count: rows.length,
        businesses: rows.map((row) => ({
          id: row.id,
          name: row.name,
          url: routes.business(row.slug),
          status: row.status,
          service: row.category.name,
          city: row.city ? `${row.city.name}, ${row.city.region.code.toUpperCase()}` : null,
          rating: row.googleRating,
          reviews: row.googleReviewCount,
          email: row.email,
          imported: Boolean(row.importedAt),
        })),
      };
    },
  },

  {
    name: "get_business",
    title: "Get a business",
    description: "The full profile: copy, contact details, services, credentials, photos, FAQs and the SEO record.",
    schema: object({ idOrSlug: str("The business id or slug.") }, ["idOrSlug"]),
    handler: async (args) => {
      const key = String(args.idOrSlug ?? "").trim();
      if (!key) throw new ToolError("idOrSlug is required.");

      const business = await db.business.findFirst({
        where: { OR: [{ id: key }, { slug: key }] },
        include: {
          city: { include: { region: { include: { country: true } } } },
          category: true,
          services: { include: { subservice: true } },
          areas: { include: { city: true } },
          credentials: { orderBy: { sortOrder: "asc" } },
          faqs: { orderBy: { sortOrder: "asc" } },
          photos: { orderBy: { sortOrder: "asc" } },
          entries: { include: { ranking: true } },
        },
      });
      if (!business) throw new ToolError(`No business matches ${key}.`);

      const seo = await db.seoMeta.findUnique({
        where: { entityType_entityId: { entityType: "business", entityId: business.id } },
      });

      return {
        id: business.id,
        name: business.name,
        slug: business.slug,
        url: routes.business(business.slug),
        status: business.status,
        service: business.category.name,
        categoryId: business.categoryId,
        city: business.city
          ? `${business.city.name}, ${business.city.region.code.toUpperCase()}`
          : null,
        cityId: business.cityId,
        tagline: business.tagline,
        description: business.description,
        editorialTake: business.editorialTake,
        bestFor: business.bestFor,
        strengths: parseList(business.strengths),
        considerations: parseList(business.considerations),
        website: business.website,
        phone: business.phone,
        email: business.email,
        emailSource: business.emailSource,
        address: business.addressLine,
        postalCode: business.postalCode,
        hours: parseJson(business.hours, []),
        rating: business.googleRating,
        reviews: business.googleReviewCount,
        ratingReadOn: business.googleDataUpdated ? fullDate(business.googleDataUpdated) : null,
        googleMapsPosition: business.gmbRank,
        verified: business.verified,
        claimed: business.claimed,
        services: business.services.map((entry) => ({
          id: entry.subserviceId,
          name: entry.subservice.name,
        })),
        serviceAreas: business.areas.map((area) => ({ id: area.cityId, name: area.city.name })),
        credentials: business.credentials.map((row) => ({
          label: row.label,
          identifier: row.identifier,
          authority: row.authority,
          status: row.status,
          checkedAt: row.checkedAt ? fullDate(row.checkedAt) : null,
        })),
        faqs: business.faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer })),
        photos: business.photos.map((photo) => photo.url),
        inRankings: business.entries.map((entry) => ({
          rankingId: entry.rankingId,
          title: entry.ranking.title,
          position: entry.position,
        })),
        importedAt: business.importedAt ? fullDate(business.importedAt) : null,
        seo: seo
          ? {
              title: seo.title,
              description: seo.description,
              focusKeyword: seo.focusKeyword,
              score: seo.score,
              index: seo.robotsIndex,
              failing: parseJson<{ label: string; status: string }[]>(seo.analysis, [])
                .filter((check) => check.status !== "good")
                .map((check) => check.label),
            }
          : null,
      };
    },
  },

  {
    name: "list_taxonomy",
    title: "List services and locations",
    description:
      "The services, their subservices, and the location tree, with the ids every other tool needs. Call this before anything that takes a categoryId or a cityId.",
    schema: object({ kind: str("services or locations. Both if omitted."), query: str("Filter by name.") }),
    handler: async (args) => {
      const kind = String(args.kind ?? "").toLowerCase();
      const query = args.query ? String(args.query) : undefined;

      return {
        ...(kind !== "locations"
          ? {
              services: (
                await db.category.findMany({
                  where: query ? { name: { contains: query } } : {},
                  orderBy: { sortOrder: "asc" },
                  include: { subservices: { orderBy: { sortOrder: "asc" } } },
                })
              ).map((row) => ({
                id: row.id,
                name: row.name,
                slug: row.slug,
                serviceName: row.serviceName,
                published: row.published,
                subservices: row.subservices.map((sub) => ({ id: sub.id, name: sub.name, slug: sub.slug })),
              })),
            }
          : {}),
        ...(kind !== "services"
          ? {
              cities: (
                await db.city.findMany({
                  where: query ? { name: { contains: query } } : {},
                  orderBy: { name: "asc" },
                  include: { region: { include: { country: true } } },
                })
              ).map((row) => ({
                id: row.id,
                name: row.name,
                slug: row.slug,
                regionId: row.regionId,
                region: row.region.name,
                regionCode: row.region.code.toUpperCase(),
                countryId: row.region.countryId,
                country: row.region.country.code.toUpperCase(),
                published: row.published,
              })),
            }
          : {}),
      };
    },
  },

  {
    name: "seo_report",
    title: "SEO report",
    description:
      "The weakest content scores with the checks each one fails, everything set to noindex, and the busiest redirects. The place to start when asked to improve SEO.",
    schema: object({ limit: int("How many weak records. Default 20.") }),
    handler: async (args) => {
      const [records, redirects] = await Promise.all([
        db.seoMeta.findMany({ orderBy: { score: "asc" }, take: limitOf(args) }),
        db.redirect.findMany({ orderBy: { hits: "desc" }, take: 15 }),
      ]);

      return {
        weakest: records
          .filter((row) => row.score > 0)
          .map((row) => ({
            entityType: row.entityType,
            entityId: row.entityId,
            title: row.title,
            focusKeyword: row.focusKeyword,
            score: row.score,
            failing: parseJson<{ label: string; status: string; hint: string }[]>(row.analysis, [])
              .filter((check) => check.status !== "good")
              .map((check) => `${check.label}: ${check.hint}`),
          })),
        noindex: records.filter((row) => !row.robotsIndex).map((row) => `${row.entityType}:${row.entityId}`),
        redirects: redirects.map((row) => ({ from: row.source, to: row.target, hits: row.hits })),
      };
    },
  },

  {
    name: "list_rankings",
    title: "List rankings",
    description: "The top ten lists, with what they cover and when each was last reviewed.",
    schema: object({
      city: str("City name."),
      category: str("Service name."),
      status: str("DRAFT, REVIEW, PUBLISHED or ARCHIVED."),
      dueReview: { type: "boolean", description: "Only lists not reviewed in six months." },
      limit: int("Default 20."),
    }),
    handler: async (args) => {
      const sixMonths = new Date(Date.now() - 1000 * 60 * 60 * 24 * 182);
      const rows = await db.ranking.findMany({
        where: {
          ...(args.status ? { status: String(args.status).toUpperCase() } : {}),
          ...(args.city ? { city: { name: { contains: String(args.city) } } } : {}),
          ...(args.category ? { category: { name: { contains: String(args.category) } } } : {}),
          ...(args.dueReview === true
            ? { OR: [{ lastReviewedAt: null }, { lastReviewedAt: { lt: sixMonths } }] }
            : {}),
        },
        include: {
          category: true,
          city: { include: { region: { include: { country: true } } } },
          _count: { select: { entries: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limitOf(args),
      });

      return {
        rankings: rows.map((row) => ({
          id: row.id,
          title: row.title,
          url: rankingUrl(row),
          status: row.status,
          entries: row._count.entries,
          lastReviewed: row.lastReviewedAt ? fullDate(row.lastReviewedAt) : null,
        })),
      };
    },
  },
];

export const TOOLS: Tool[] = [
  ...ORIENTATION,
  ...CONTENT_TOOLS,
  ...TAXONOMY_TOOLS,
  ...DIRECTORY_TOOLS,
  ...COMMERCE_TOOLS,
  ...SYSTEM_TOOLS,
  ...IMPORT_TOOLS,
];

/** For the admin screen, so 50 tools read as a map rather than a wall. */
export const TOOL_GROUPS: { label: string; tools: Tool[] }[] = [
  { label: "Orientation", tools: ORIENTATION },
  { label: "Content", tools: CONTENT_TOOLS },
  { label: "Services and locations", tools: TAXONOMY_TOOLS },
  { label: "Directory and people", tools: DIRECTORY_TOOLS },
  { label: "Packages and sponsorship", tools: COMMERCE_TOOLS },
  { label: "Settings, SEO and system", tools: SYSTEM_TOOLS },
  { label: "Imports", tools: IMPORT_TOOLS },
];

const BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

// A duplicate name would silently shadow a tool, so it fails at import time
// rather than at the first call that hits the wrong one.
if (BY_NAME.size !== TOOLS.length) {
  const seen = new Set<string>();
  const clash = TOOLS.map((tool) => tool.name).find((name) => seen.has(name) || (seen.add(name), false));
  throw new Error(`Two MCP tools share the name ${clash}.`);
}

export function visibleTools(scope: string, role: UserRole): Tool[] {
  return TOOLS.filter((tool) => canRun(tool, scope, role));
}

export function describe(tool: Tool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.schema,
    annotations: {
      readOnlyHint: !tool.write,
      destructiveHint: Boolean(tool.destructive),
      idempotentHint: !tool.write,
      // These reach outside the database: one spends money, one fetches a URL.
      openWorldHint: tool.name === "queue_import_batch" || tool.name === "upload_media",
    },
  };
}

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext) {
  const tool = BY_NAME.get(name);
  if (!tool) throw new ToolError(`There is no tool named ${name}.`);

  if (!canRun(tool, ctx.scope, ctx.user.role)) {
    throw new ToolError(
      tool.admin && ctx.user.role !== "ADMIN"
        ? `${name} needs an administrator account. This connection is acting as ${ctx.user.role.toLowerCase()}.`
        : `${name} needs the mcp:write scope, which this connection was not granted.`,
    );
  }

  return tool.handler(args, ctx);
}
