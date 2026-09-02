import { db } from "./db";
import { audit } from "./auth";
import { analyzeSeo } from "./seo";
import { recordMove } from "./redirects";
import { fullDate, slugify } from "./format";
import { parseJson, parseList, stringify } from "./json";
import { rankingUrl, routes } from "./urls";
import type { UserRole } from "./enums";
import type { Bearer } from "./oauth";

// The tools this platform exposes over MCP. Each one declares what it needs,
// and the dispatcher enforces it: a read tool needs mcp:read, a write tool
// needs mcp:write and an editor account, and the destructive ones need an
// administrator. Every write is written to the audit log with the connector
// that made it, so a change made through Claude is as traceable as one made in
// the admin.

export type ToolContext = Bearer;

type Handler = (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;

export type Tool = {
  name: string;
  title: string;
  description: string;
  schema: Record<string, unknown>;
  write?: boolean;
  admin?: boolean;
  handler: Handler;
};

export class ToolError extends Error {}

const str = (description: string, extra: Record<string, unknown> = {}) => ({
  type: "string",
  description,
  ...extra,
});
const int = (description: string, extra: Record<string, unknown> = {}) => ({
  type: "integer",
  description,
  ...extra,
});

const object = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  additionalProperties: false,
  properties,
  ...(required.length > 0 ? { required } : {}),
});

const limitOf = (args: Record<string, unknown>, fallback = 20, cap = 100) => {
  const value = Number(args.limit ?? fallback);
  return Number.isFinite(value) ? Math.min(Math.max(1, Math.trunc(value)), cap) : fallback;
};

const text = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new ToolError(`${field} is required.`);
  return value.trim();
};

/* ------------------------------------------------------------------ shapes */

function businessSummary(business: {
  id: string;
  name: string;
  slug: string;
  status: string;
  googleRating: number | null;
  googleReviewCount: number | null;
  gmbRank: number | null;
  city?: { name: string; region: { code: string } } | null;
  category?: { name: string } | null;
}) {
  return {
    id: business.id,
    name: business.name,
    url: routes.business(business.slug),
    status: business.status,
    category: business.category?.name ?? null,
    city: business.city ? `${business.city.name}, ${business.city.region.code.toUpperCase()}` : null,
    rating: business.googleRating,
    reviews: business.googleReviewCount,
    googleMapsPosition: business.gmbRank,
  };
}

/* ------------------------------------------------------------------- tools */

export const TOOLS: Tool[] = [
  {
    name: "site_overview",
    title: "Site overview",
    description:
      "Counts of everything published and in draft, plus the SEO health summary. Start here to see the shape of the site.",
    schema: object({}),
    handler: async () => {
      const [businesses, rankings, guides, pages, posts, cities, categories, seo, batches] =
        await Promise.all([
          db.business.groupBy({ by: ["status"], _count: true }),
          db.ranking.groupBy({ by: ["status"], _count: true }),
          db.guide.count({ where: { status: "PUBLISHED" } }),
          db.page.count({ where: { status: "PUBLISHED" } }),
          db.post.count({ where: { status: "PUBLISHED" } }),
          db.city.count({ where: { published: true } }),
          db.category.count({ where: { published: true } }),
          db.seoMeta.findMany({ select: { score: true, robotsIndex: true } }),
          db.importBatch.count(),
        ]);

      const scored = seo.filter((row) => row.score > 0);
      return {
        businesses: Object.fromEntries(businesses.map((row) => [row.status, row._count])),
        rankings: Object.fromEntries(rankings.map((row) => [row.status, row._count])),
        publishedGuides: guides,
        publishedPages: pages,
        publishedPosts: posts,
        cities,
        categories,
        seo: {
          records: seo.length,
          averageScore: scored.length
            ? Math.round(scored.reduce((total, row) => total + row.score, 0) / scored.length)
            : 0,
          noindex: seo.filter((row) => !row.robotsIndex).length,
        },
        importBatches: batches,
      };
    },
  },

  {
    name: "search_businesses",
    title: "Search businesses",
    description:
      "Find businesses by name, city, service or status. Returns summaries; use get_business for the full profile.",
    schema: object({
      query: str("Matches the business name. Leave empty to list by the other filters."),
      city: str("City name, for example Dallas."),
      category: str("Service name or slug, for example roofing."),
      status: str("DRAFT, PENDING, PUBLISHED, REJECTED or ARCHIVED."),
      missingEmail: { type: "boolean", description: "Only businesses with no email on file." },
      limit: int("Up to 100. Default 20."),
    }),
    handler: async (args) => {
      const rows = await db.business.findMany({
        where: {
          ...(args.query ? { name: { contains: String(args.query) } } : {}),
          ...(args.status ? { status: String(args.status).toUpperCase() } : {}),
          ...(args.missingEmail === true ? { email: null } : {}),
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
      return { count: rows.length, businesses: rows.map(businessSummary) };
    },
  },

  {
    name: "get_business",
    title: "Get a business",
    description: "The full profile: copy, contact details, services, credentials, FAQs and the SEO record.",
    schema: object({ idOrSlug: str("The business id or its URL slug.") }, ["idOrSlug"]),
    handler: async (args) => {
      const key = text(args.idOrSlug, "idOrSlug");
      const business = await db.business.findFirst({
        where: { OR: [{ id: key }, { slug: key }] },
        include: {
          city: { include: { region: { include: { country: true } } } },
          category: true,
          services: { include: { subservice: true } },
          credentials: true,
          faqs: { orderBy: { sortOrder: "asc" } },
          photos: { orderBy: { sortOrder: "asc" } },
        },
      });
      if (!business) throw new ToolError(`No business matches ${key}.`);

      const seo = await db.seoMeta.findUnique({
        where: { entityType_entityId: { entityType: "business", entityId: business.id } },
      });

      return {
        ...businessSummary(business),
        slug: business.slug,
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
        hours: parseJson(business.hours, []),
        services: business.services.map((entry) => entry.subservice.name),
        credentials: business.credentials.map((row) => ({
          label: row.label,
          identifier: row.identifier,
          authority: row.authority,
          status: row.status,
          checkedAt: row.checkedAt ? fullDate(row.checkedAt) : null,
        })),
        faqs: business.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
        photos: business.photos.map((photo) => photo.url),
        importedAt: business.importedAt ? fullDate(business.importedAt) : null,
        seo: seo
          ? {
              title: seo.title,
              description: seo.description,
              focusKeyword: seo.focusKeyword,
              score: seo.score,
              index: seo.robotsIndex,
            }
          : null,
      };
    },
  },

  {
    name: "list_rankings",
    title: "List rankings",
    description: "The top ten lists, with their city, service, status and when each was last reviewed.",
    schema: object({
      city: str("City name."),
      category: str("Service name or slug."),
      status: str("DRAFT, REVIEW, PUBLISHED or ARCHIVED."),
      dueReview: { type: "boolean", description: "Only lists not reviewed in the past six months." },
      limit: int("Up to 100. Default 20."),
    }),
    handler: async (args) => {
      const sixMonthsAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 182);
      const rows = await db.ranking.findMany({
        where: {
          ...(args.status ? { status: String(args.status).toUpperCase() } : {}),
          ...(args.city ? { city: { name: { contains: String(args.city) } } } : {}),
          ...(args.category ? { category: { name: { contains: String(args.category) } } } : {}),
          ...(args.dueReview === true
            ? { OR: [{ lastReviewedAt: null }, { lastReviewedAt: { lt: sixMonthsAgo } }] }
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
        count: rows.length,
        rankings: rows.map((ranking) => ({
          id: ranking.id,
          title: ranking.title,
          url: rankingUrl(ranking),
          status: ranking.status,
          entries: ranking._count.entries,
          lastReviewed: ranking.lastReviewedAt ? fullDate(ranking.lastReviewedAt) : null,
        })),
      };
    },
  },

  {
    name: "get_ranking",
    title: "Get a ranking",
    description: "One top ten list in full: the summary, the method note and every entry in order.",
    schema: object({ id: str("The ranking id.") }, ["id"]),
    handler: async (args) => {
      const ranking = await db.ranking.findUnique({
        where: { id: text(args.id, "id") },
        include: {
          category: true,
          city: { include: { region: { include: { country: true } } } },
          entries: { orderBy: { position: "asc" }, include: { business: true } },
          faqs: { orderBy: { sortOrder: "asc" } },
        },
      });
      if (!ranking) throw new ToolError("No ranking matches that id.");

      return {
        id: ranking.id,
        title: ranking.title,
        url: rankingUrl(ranking),
        status: ranking.status,
        summary: ranking.summary,
        methodologyNote: ranking.methodologyNote,
        lastReviewed: ranking.lastReviewedAt ? fullDate(ranking.lastReviewedAt) : null,
        entries: ranking.entries.map((entry) => ({
          position: entry.position,
          business: entry.business.name,
          businessId: entry.businessId,
          designation: entry.designation,
          whyPicked: entry.whyPicked,
          sponsored: entry.sponsored,
        })),
        faqs: ranking.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
      };
    },
  },

  {
    name: "list_taxonomy",
    title: "List services and locations",
    description: "The services and the cities the site covers, with ids you can pass to the other tools.",
    schema: object({ kind: str("services or locations. Both if omitted.") }),
    handler: async (args) => {
      const kind = String(args.kind ?? "").toLowerCase();
      const wantServices = kind !== "locations";
      const wantLocations = kind !== "services";

      return {
        ...(wantServices
          ? {
              services: (
                await db.category.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } })
              ).map((row) => ({ id: row.id, name: row.name, slug: row.slug, serviceName: row.serviceName })),
            }
          : {}),
        ...(wantLocations
          ? {
              cities: (
                await db.city.findMany({
                  where: { published: true },
                  orderBy: { name: "asc" },
                  include: { region: { include: { country: true } } },
                })
              ).map((row) => ({
                id: row.id,
                name: row.name,
                region: row.region.name,
                regionCode: row.region.code.toUpperCase(),
                country: row.region.country.code.toUpperCase(),
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
      "The weakest content scores, everything set to noindex, and the redirect table. Use it to find what to fix.",
    schema: object({ limit: int("How many weak records to return. Default 20.") }),
    handler: async (args) => {
      const [records, redirects] = await Promise.all([
        db.seoMeta.findMany({ orderBy: { score: "asc" }, take: limitOf(args) }),
        db.redirect.findMany({ orderBy: { hits: "desc" }, take: 20 }),
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
            failing: parseJson<{ label: string; status: string }[]>(row.analysis, [])
              .filter((check) => check.status !== "good")
              .map((check) => check.label),
          })),
        noindex: records.filter((row) => !row.robotsIndex).map((row) => `${row.entityType}:${row.entityId}`),
        redirects: redirects.map((row) => ({ from: row.source, to: row.target, code: row.code, hits: row.hits })),
      };
    },
  },

  {
    name: "list_import_batches",
    title: "List import batches",
    description: "Scrape and write batches, their stage and their counts.",
    schema: object({ limit: int("Default 20.") }),
    handler: async (args) => {
      const rows = await db.importBatch.findMany({
        orderBy: { createdAt: "desc" },
        include: { category: true },
        take: limitOf(args),
      });
      return {
        batches: rows.map((batch) => ({
          id: batch.id,
          name: batch.name,
          service: batch.category.name,
          status: batch.status,
          cities: parseList(batch.cityIds).length,
          found: batch.found,
          duplicates: batch.duplicates,
          written: batch.written,
          published: batch.published,
          failed: batch.failed,
          error: batch.error,
        })),
      };
    },
  },

  /* ------------------------------------------------------------- writes */

  {
    name: "update_business",
    title: "Update a business",
    description:
      "Change the written parts of a profile. Only the fields you pass are touched. Contact details and ratings are not editable here: they come from the source and the importer.",
    write: true,
    schema: object(
      {
        idOrSlug: str("The business id or slug."),
        tagline: str("One line, under 110 characters."),
        description: str("The main profile copy."),
        editorialTake: str("The site's own assessment, two to four sentences."),
        bestFor: str("Short phrase."),
        strengths: { type: "array", items: { type: "string" }, description: "Replaces the list." },
        considerations: { type: "array", items: { type: "string" }, description: "Replaces the list." },
      },
      ["idOrSlug"],
    ),
    handler: async (args, ctx) => {
      const key = text(args.idOrSlug, "idOrSlug");
      const business = await db.business.findFirst({ where: { OR: [{ id: key }, { slug: key }] } });
      if (!business) throw new ToolError(`No business matches ${key}.`);

      const data: Record<string, unknown> = {};
      for (const field of ["tagline", "description", "editorialTake", "bestFor"] as const) {
        if (typeof args[field] === "string") data[field] = String(args[field]);
      }
      for (const field of ["strengths", "considerations"] as const) {
        if (Array.isArray(args[field])) data[field] = stringify((args[field] as unknown[]).map(String));
      }
      if (Object.keys(data).length === 0) throw new ToolError("Pass at least one field to change.");

      await db.business.update({ where: { id: business.id }, data });
      await audit({
        userId: ctx.user.id,
        action: "update",
        entityType: "business",
        entityId: business.id,
        summary: `${business.name}: ${Object.keys(data).join(", ")} (via ${ctx.clientName})`,
      });

      return { updated: Object.keys(data), business: business.name, url: routes.business(business.slug) };
    },
  },

  {
    name: "set_business_status",
    title: "Publish or unpublish a business",
    description: "Moves a listing between DRAFT, PENDING, PUBLISHED, REJECTED and ARCHIVED.",
    write: true,
    schema: object(
      {
        idOrSlug: str("The business id or slug."),
        status: str("DRAFT, PENDING, PUBLISHED, REJECTED or ARCHIVED."),
      },
      ["idOrSlug", "status"],
    ),
    handler: async (args, ctx) => {
      const key = text(args.idOrSlug, "idOrSlug");
      const status = text(args.status, "status").toUpperCase();
      const allowed = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"];
      if (!allowed.includes(status)) throw new ToolError(`status must be one of ${allowed.join(", ")}.`);

      const business = await db.business.findFirst({ where: { OR: [{ id: key }, { slug: key }] } });
      if (!business) throw new ToolError(`No business matches ${key}.`);

      await db.business.update({
        where: { id: business.id },
        data: {
          status,
          publishedAt: status === "PUBLISHED" ? (business.publishedAt ?? new Date()) : business.publishedAt,
        },
      });
      await audit({
        userId: ctx.user.id,
        action: "update",
        entityType: "business",
        entityId: business.id,
        summary: `${business.name} set to ${status} (via ${ctx.clientName})`,
      });

      return { business: business.name, status, url: routes.business(business.slug) };
    },
  },

  {
    name: "update_seo",
    title: "Write an SEO record",
    description:
      "Set the title, description and focus keyword for any entity, then re-score it. Returns the score and the checks that still fail.",
    write: true,
    schema: object(
      {
        entityType: str("business, ranking, guide, page, post, category, city, region, country or person."),
        entityId: str("The entity id."),
        title: str("Under 60 characters, containing the focus keyword."),
        description: str("120 to 160 characters, containing the focus keyword."),
        focusKeyword: str("The phrase this page should rank for."),
        index: { type: "boolean", description: "Whether search engines may index it." },
      },
      ["entityType", "entityId"],
    ),
    handler: async (args, ctx) => {
      const entityType = text(args.entityType, "entityType").toLowerCase();
      const entityId = text(args.entityId, "entityId");

      const existing = await db.seoMeta.findUnique({
        where: { entityType_entityId: { entityType, entityId } },
      });

      const title = typeof args.title === "string" ? args.title : existing?.title;
      const description = typeof args.description === "string" ? args.description : existing?.description;
      const focusKeyword =
        typeof args.focusKeyword === "string" ? args.focusKeyword : existing?.focusKeyword;

      const analysis = analyzeSeo({
        title,
        description,
        focusKeyword,
        slug: entityId,
        content: description,
        hasImage: Boolean(existing?.ogImage),
        internalLinks: 3,
      });

      const payload = {
        title: title ?? null,
        description: description ?? null,
        focusKeyword: focusKeyword ?? null,
        robotsIndex: typeof args.index === "boolean" ? args.index : (existing?.robotsIndex ?? true),
        score: analysis.score,
        analysis: JSON.stringify(analysis.checks),
      };

      await db.seoMeta.upsert({
        where: { entityType_entityId: { entityType, entityId } },
        create: { entityType, entityId, ...payload },
        update: payload,
      });

      await audit({
        userId: ctx.user.id,
        action: existing ? "update" : "create",
        entityType: "seo",
        entityId,
        summary: `${entityType} scored ${analysis.score} (via ${ctx.clientName})`,
      });

      return {
        score: analysis.score,
        failing: analysis.checks.filter((check) => check.status !== "good").map((check) => ({
          check: check.label,
          hint: check.hint,
        })),
      };
    },
  },

  {
    name: "create_redirect",
    title: "Add a redirect",
    description: "Points an old path at a new one. Both must start with a slash.",
    write: true,
    schema: object(
      {
        from: str("The old path, for example /us/tx/dallas-tx/."),
        to: str("Where it should go."),
        permanent: { type: "boolean", description: "Permanent by default. A permanent redirect is served as 308." },
      },
      ["from", "to"],
    ),
    handler: async (args, ctx) => {
      const from = text(args.from, "from");
      const to = text(args.to, "to");
      if (!from.startsWith("/") || !to.startsWith("/")) throw new ToolError("Both paths must start with a slash.");
      if (from === to) throw new ToolError("A redirect cannot point at itself.");

      await recordMove(from, to);
      if (args.permanent === false) {
        await db.redirect.update({ where: { source: from }, data: { code: 302 } });
      }

      await audit({
        userId: ctx.user.id,
        action: "create",
        entityType: "redirect",
        summary: `${from} -> ${to} (via ${ctx.clientName})`,
      });
      return { from, to, code: args.permanent === false ? 302 : 301 };
    },
  },

  {
    name: "queue_import_batch",
    title: "Queue an import batch",
    description:
      "Starts a scrape and write run for one service across cities. It costs money on Apify and Anthropic, so it reports the ceiling it will scrape. Use list_taxonomy for the ids.",
    write: true,
    admin: true,
    schema: object(
      {
        name: str("A label for the run."),
        categoryId: str("Service id from list_taxonomy."),
        cityIds: { type: "array", items: { type: "string" }, description: "City ids, up to 40." },
        perCity: int("Places per city, 1 to 120. Default 20."),
        minRating: { type: "number", description: "Skip anything rated below this." },
        minReviews: int("Skip anything with fewer reviews than this."),
        autoPublishScore: int("Publish at or above this SEO score, draft below. Default 90."),
        buildRanking: { type: "boolean", description: "Rebuild the city ranking from the Google order." },
      },
      ["name", "categoryId", "cityIds"],
    ),
    handler: async (args, ctx) => {
      const name = text(args.name, "name");
      const categoryId = text(args.categoryId, "categoryId");
      const cityIds = Array.isArray(args.cityIds) ? args.cityIds.map(String).filter(Boolean) : [];

      if (cityIds.length === 0) throw new ToolError("Pass at least one city id.");
      if (cityIds.length > 40) throw new ToolError("Keep a batch to 40 cities or fewer.");

      const category = await db.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new ToolError("That service id does not exist. Call list_taxonomy first.");

      const cities = await db.city.count({ where: { id: { in: cityIds } } });
      if (cities !== cityIds.length) throw new ToolError("One of those city ids does not exist.");

      const perCity = Math.min(Math.max(1, Number(args.perCity ?? 20)), 120);

      const batch = await db.importBatch.create({
        data: {
          name,
          categoryId,
          cityIds: JSON.stringify(cityIds),
          perCity,
          minRating: typeof args.minRating === "number" ? args.minRating : null,
          minReviews: typeof args.minReviews === "number" ? Math.trunc(args.minReviews) : null,
          autoPublishScore:
            typeof args.autoPublishScore === "number" ? Math.trunc(args.autoPublishScore) : 90,
          buildRanking: args.buildRanking !== false,
          createdById: ctx.user.id,
          note: `Queued through ${ctx.clientName}`,
        },
      });

      await audit({
        userId: ctx.user.id,
        action: "create",
        entityType: "importBatch",
        entityId: batch.id,
        summary: `${name}: ${category.name} across ${cityIds.length} cities (via ${ctx.clientName})`,
      });

      return {
        id: batch.id,
        queued: true,
        willScrapeUpTo: cityIds.length * perCity,
        adminUrl: `/admin/imports/${batch.id}`,
        note: "The worker picks it up within a few seconds. Watch it with list_import_batches.",
      };
    },
  },
];

export const TOOL_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

/** What a given token is allowed to see, so tools/list matches what will run. */
export function visibleTools(scope: string, role: UserRole): Tool[] {
  const scopes = new Set(scope.split(/\s+/).filter(Boolean));
  return TOOLS.filter((tool) => {
    if (tool.write && !scopes.has("mcp:write")) return false;
    if (tool.admin && role !== "ADMIN") return false;
    if (tool.write && role !== "ADMIN" && role !== "EDITOR") return false;
    return scopes.has("mcp:read") || scopes.has("mcp:write");
  });
}

export function describe(tool: Tool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.schema,
    annotations: {
      readOnlyHint: !tool.write,
      destructiveHint: false,
      idempotentHint: !tool.write,
      openWorldHint: tool.name === "queue_import_batch",
    },
  };
}

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext) {
  const tool = TOOL_BY_NAME.get(name);
  if (!tool) throw new ToolError(`There is no tool named ${name}.`);

  const allowed = visibleTools(ctx.scope, ctx.user.role).some((entry) => entry.name === name);
  if (!allowed) {
    throw new ToolError(
      tool.admin
        ? `${name} needs an administrator account.`
        : `${name} needs the mcp:write scope, which this connection was not granted.`,
    );
  }

  return tool.handler(args, ctx);
}
