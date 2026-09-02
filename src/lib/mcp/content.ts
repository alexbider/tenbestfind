import { db } from "../db";
import { recordMove } from "../redirects";
import { fullDate, slugify } from "../format";
import { parseJson, parseList } from "../json";
import { routes, rankingUrl } from "../urls";
import {
  arr,
  bool,
  int,
  limitOf,
  object,
  oneOf,
  optBool,
  optInt,
  optRows,
  optStr,
  patch,
  recordWrite,
  reqStr,
  str,
  ToolError,
  type Tool,
} from "./kit";

// Pages, guides, blog posts, rankings, questions and criteria: everything the
// editorial side of the admin edits.

const CONTENT_STATUS = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;

/**
 * A slug change has to leave a redirect behind or every inbound link to the old
 * address breaks. The admin does this too; doing it here keeps the two paths
 * honest with each other.
 */
async function moveIfRenamed(oldPath: string, newPath: string) {
  if (oldPath !== newPath) await recordMove(oldPath, newPath);
}

const blocksSchema = arr(
  "The body, as an array of block objects. Each block needs a kind, for example { kind: 'paragraph', text: '...' }. Replaces the whole body.",
  { type: "object", additionalProperties: true },
);

export const CONTENT_TOOLS: Tool[] = [
  {
    name: "list_content",
    title: "List content",
    description:
      "Pages, guides, blog posts or rankings, with their status and URL. One place to see what exists before editing it.",
    schema: object(
      {
        kind: str("page, guide, post or ranking."),
        status: str("DRAFT, REVIEW, PUBLISHED or ARCHIVED."),
        query: str("Matches the title."),
        limit: int("Up to 200. Default 20."),
      },
      ["kind"],
    ),
    handler: async (args) => {
      const kind = reqStr(args, "kind").toLowerCase();
      const where = {
        ...(args.status ? { status: oneOf(String(args.status), CONTENT_STATUS, "status") } : {}),
        ...(args.query ? { title: { contains: String(args.query) } } : {}),
      };
      const take = limitOf(args);

      switch (kind) {
        case "page": {
          const rows = await db.page.findMany({ where, orderBy: { title: "asc" }, take });
          return {
            items: rows.map((row) => ({
              id: row.id,
              title: row.title,
              slug: row.slug,
              url: routes.page(row.slug),
              template: row.template,
              status: row.status,
              updated: fullDate(row.updatedAt),
            })),
          };
        }
        case "guide": {
          const rows = await db.guide.findMany({ where, orderBy: { updatedAt: "desc" }, take });
          return {
            items: rows.map((row) => ({
              id: row.id,
              title: row.title,
              slug: row.slug,
              url: routes.guide(row.slug),
              type: row.type,
              status: row.status,
              updated: fullDate(row.updatedAt),
            })),
          };
        }
        case "post": {
          const rows = await db.post.findMany({ where, orderBy: { updatedAt: "desc" }, take });
          return {
            items: rows.map((row) => ({
              id: row.id,
              title: row.title,
              slug: row.slug,
              url: routes.post(row.slug),
              status: row.status,
              updated: fullDate(row.updatedAt),
            })),
          };
        }
        case "ranking": {
          const rows = await db.ranking.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            take,
            include: {
              category: true,
              city: { include: { region: { include: { country: true } } } },
              _count: { select: { entries: true } },
            },
          });
          return {
            items: rows.map((row) => ({
              id: row.id,
              title: row.title,
              url: rankingUrl(row),
              status: row.status,
              entries: row._count.entries,
              lastReviewed: row.lastReviewedAt ? fullDate(row.lastReviewedAt) : null,
            })),
          };
        }
        default:
          throw new ToolError("kind must be page, guide, post or ranking.");
      }
    },
  },

  {
    name: "get_content",
    title: "Get one piece of content",
    description: "The full record including the body blocks, so you can edit it and write it back.",
    schema: object({ kind: str("page, guide, post or ranking."), id: str("The id or the slug.") }, [
      "kind",
      "id",
    ]),
    handler: async (args) => {
      const kind = reqStr(args, "kind").toLowerCase();
      const key = reqStr(args, "id");
      const by = { OR: [{ id: key }, { slug: key }] };

      if (kind === "page") {
        const row = await db.page.findFirst({ where: by, include: { faqs: { orderBy: { sortOrder: "asc" } } } });
        if (!row) throw new ToolError("No page matches that.");
        return {
          ...row,
          url: routes.page(row.slug),
          body: parseJson(row.body, []),
          faqs: row.faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer })),
        };
      }
      if (kind === "guide") {
        const row = await db.guide.findFirst({
          where: by,
          include: { faqs: { orderBy: { sortOrder: "asc" } } },
        });
        if (!row) throw new ToolError("No guide matches that.");
        return {
          ...row,
          url: routes.guide(row.slug),
          body: parseJson(row.body, []),
          keyTakeaways: parseList(row.keyTakeaways),
        };
      }
      if (kind === "post") {
        const row = await db.post.findFirst({ where: by });
        if (!row) throw new ToolError("No post matches that.");
        return { ...row, url: routes.post(row.slug), body: parseJson(row.body, []) };
      }
      if (kind === "ranking") {
        const row = await db.ranking.findFirst({
          where: { id: key },
          include: {
            category: true,
            city: { include: { region: { include: { country: true } } } },
            entries: { orderBy: { position: "asc" }, include: { business: true } },
            criteria: { orderBy: { sortOrder: "asc" } },
            faqs: { orderBy: { sortOrder: "asc" } },
            sources: { orderBy: { sortOrder: "asc" } },
          },
        });
        if (!row) throw new ToolError("No ranking matches that id.");
        return {
          id: row.id,
          title: row.title,
          url: rankingUrl(row),
          status: row.status,
          summary: row.summary,
          intro: row.intro,
          methodologyNote: row.methodologyNote,
          entries: row.entries.map((entry) => ({
            position: entry.position,
            businessId: entry.businessId,
            business: entry.business.name,
            designation: entry.designation,
            whyPicked: entry.whyPicked,
            likes: parseList(entry.likes),
            concerns: parseList(entry.concerns),
            sponsored: entry.sponsored,
          })),
          criteria: row.criteria.map((c) => ({ title: c.title, body: c.body, importance: c.importance })),
          faqs: row.faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
          sources: row.sources.map((s) => ({ label: s.label, tier: s.tier })),
        };
      }
      throw new ToolError("kind must be page, guide, post or ranking.");
    },
  },

  {
    name: "upsert_page",
    title: "Create or update a page",
    description:
      "Pass an id to edit, omit it to create. Renaming the slug leaves a redirect behind automatically.",
    write: true,
    schema: object(
      {
        id: str("Omit to create a new page."),
        title: str("The page title."),
        slug: str("URL slug. Derived from the title when creating and left alone otherwise."),
        template: str("document, contact, sitemap or landing."),
        excerpt: str("Short summary, used as the meta description default."),
        body: blocksSchema,
        noticeTitle: str("Optional notice heading shown above the body."),
        noticeBody: str("Optional notice text."),
        printable: bool("Whether the page offers a print view."),
        status: str("DRAFT, PUBLISHED or ARCHIVED."),
      },
      [],
    ),
    handler: async (args, ctx) => {
      const id = optStr(args, "id");
      const data = patch(args, {
        title: "string",
        template: "string",
        excerpt: "string",
        noticeTitle: "string",
        noticeBody: "string",
        printable: "bool",
        body: "json",
      });
      if (args.status !== undefined) data.status = oneOf(String(args.status), CONTENT_STATUS, "status");

      if (!id) {
        const title = reqStr(args, "title");
        const slug = slugify(optStr(args, "slug") ?? title);
        if (await db.page.findUnique({ where: { slug } })) {
          throw new ToolError(`A page already uses the slug ${slug}.`);
        }
        const page = await db.page.create({
          data: { title, slug, template: "document", ...data, status: (data.status as string) ?? "DRAFT" },
        });
        await recordWrite(ctx, {
          action: "create",
          entityType: "page",
          entityId: page.id,
          summary: `page ${page.title}`,
          paths: ["/", routes.page(page.slug)],
        });
        return { id: page.id, url: routes.page(page.slug), status: page.status };
      }

      const existing = await db.page.findFirst({ where: { OR: [{ id }, { slug: id }] } });
      if (!existing) throw new ToolError("No page matches that id.");

      const slug = args.slug !== undefined ? slugify(String(args.slug)) : existing.slug;
      if (slug !== existing.slug && (await db.page.findUnique({ where: { slug } }))) {
        throw new ToolError(`A page already uses the slug ${slug}.`);
      }

      const page = await db.page.update({ where: { id: existing.id }, data: { ...data, slug } });
      await moveIfRenamed(routes.page(existing.slug), routes.page(page.slug));
      await recordWrite(ctx, {
        action: "update",
        entityType: "page",
        entityId: page.id,
        summary: `page ${page.title}`,
        paths: ["/", routes.page(page.slug)],
      });
      return { id: page.id, url: routes.page(page.slug), status: page.status };
    },
  },

  {
    name: "upsert_guide",
    title: "Create or update a guide",
    description:
      "Editorial guides and cost guides. A cost guide uses the typical and unit price fields; an editorial one ignores them.",
    write: true,
    schema: object(
      {
        id: str("Omit to create."),
        title: str("The guide title."),
        slug: str("URL slug."),
        type: str("EDITORIAL or COST."),
        excerpt: str("Short summary."),
        shortAnswer: str("The answer-first paragraph at the top."),
        keyTakeaways: arr("Bullet points shown near the top."),
        body: blocksSchema,
        heroImage: str("Image URL."),
        categoryId: str("Service this belongs to."),
        authorId: str("Person id."),
        reviewerId: str("Person id."),
        typicalLow: int("Cost guides: the low end of a typical job."),
        typicalHigh: int("Cost guides: the high end."),
        unitLow: int("Cost guides: low unit price in cents."),
        unitHigh: int("Cost guides: high unit price in cents."),
        unitLabel: str("Cost guides: what the unit is, for example per square foot."),
        readingMinutes: int("Estimated reading time."),
        status: str("DRAFT, REVIEW, PUBLISHED or ARCHIVED."),
      },
      [],
    ),
    handler: async (args, ctx) => {
      const id = optStr(args, "id");
      const data = patch(args, {
        title: "string",
        excerpt: "string",
        shortAnswer: "string",
        heroImage: "string",
        categoryId: "string",
        authorId: "string",
        reviewerId: "string",
        typicalLow: "int",
        typicalHigh: "int",
        unitLow: "int",
        unitHigh: "int",
        unitLabel: "string",
        readingMinutes: "int",
        body: "json",
        keyTakeaways: "json",
      });
      if (args.type !== undefined) data.type = oneOf(String(args.type), ["EDITORIAL", "COST"], "type");
      if (args.status !== undefined) data.status = oneOf(String(args.status), CONTENT_STATUS, "status");

      if (!id) {
        const title = reqStr(args, "title");
        const slug = slugify(optStr(args, "slug") ?? title);
        if (await db.guide.findUnique({ where: { slug } })) throw new ToolError(`A guide already uses ${slug}.`);
        const guide = await db.guide.create({ data: { title, slug, ...data } });
        await recordWrite(ctx, {
          action: "create",
          entityType: "guide",
          entityId: guide.id,
          summary: `guide ${guide.title}`,
          paths: ["/", routes.guidesIndex(), routes.guide(guide.slug)],
        });
        return { id: guide.id, url: routes.guide(guide.slug), status: guide.status };
      }

      const existing = await db.guide.findFirst({ where: { OR: [{ id }, { slug: id }] } });
      if (!existing) throw new ToolError("No guide matches that id.");
      const slug = args.slug !== undefined ? slugify(String(args.slug)) : existing.slug;
      if (slug !== existing.slug && (await db.guide.findUnique({ where: { slug } }))) {
        throw new ToolError(`A guide already uses ${slug}.`);
      }

      const guide = await db.guide.update({ where: { id: existing.id }, data: { ...data, slug } });
      await moveIfRenamed(routes.guide(existing.slug), routes.guide(guide.slug));
      await recordWrite(ctx, {
        action: "update",
        entityType: "guide",
        entityId: guide.id,
        summary: `guide ${guide.title}`,
        paths: ["/", routes.guidesIndex(), routes.guide(guide.slug)],
      });
      return { id: guide.id, url: routes.guide(guide.slug), status: guide.status };
    },
  },

  {
    name: "upsert_post",
    title: "Create or update a blog post",
    write: true,
    description: "Blog posts. Same shape as a guide but without the cost fields.",
    schema: object(
      {
        id: str("Omit to create."),
        title: str("The post title."),
        slug: str("URL slug."),
        excerpt: str("Short summary."),
        body: blocksSchema,
        heroImage: str("Image URL."),
        categoryId: str("Service this belongs to."),
        authorId: str("Person id."),
        publishedAt: str("ISO date. Defaults to now when first published."),
        status: str("DRAFT, REVIEW, PUBLISHED or ARCHIVED."),
      },
      [],
    ),
    handler: async (args, ctx) => {
      const id = optStr(args, "id");
      const data = patch(args, {
        title: "string",
        excerpt: "string",
        heroImage: "string",
        categoryId: "string",
        authorId: "string",
        body: "json",
      });
      if (args.status !== undefined) data.status = oneOf(String(args.status), CONTENT_STATUS, "status");
      if (args.publishedAt !== undefined) {
        const when = new Date(String(args.publishedAt));
        if (Number.isNaN(when.getTime())) throw new ToolError("publishedAt is not a valid date.");
        data.publishedAt = when;
      }
      if (data.status === "PUBLISHED" && data.publishedAt === undefined) data.publishedAt = new Date();

      if (!id) {
        const title = reqStr(args, "title");
        const slug = slugify(optStr(args, "slug") ?? title);
        if (await db.post.findUnique({ where: { slug } })) throw new ToolError(`A post already uses ${slug}.`);
        const post = await db.post.create({ data: { title, slug, ...data } });
        await recordWrite(ctx, {
          action: "create",
          entityType: "post",
          entityId: post.id,
          summary: `post ${post.title}`,
          paths: ["/", routes.blogIndex(), routes.post(post.slug)],
        });
        return { id: post.id, url: routes.post(post.slug), status: post.status };
      }

      const existing = await db.post.findFirst({ where: { OR: [{ id }, { slug: id }] } });
      if (!existing) throw new ToolError("No post matches that id.");
      const slug = args.slug !== undefined ? slugify(String(args.slug)) : existing.slug;
      const post = await db.post.update({ where: { id: existing.id }, data: { ...data, slug } });
      await moveIfRenamed(routes.post(existing.slug), routes.post(post.slug));
      await recordWrite(ctx, {
        action: "update",
        entityType: "post",
        entityId: post.id,
        summary: `post ${post.title}`,
        paths: ["/", routes.blogIndex(), routes.post(post.slug)],
      });
      return { id: post.id, url: routes.post(post.slug), status: post.status };
    },
  },

  {
    name: "upsert_ranking",
    title: "Create or update a ranking",
    description:
      "The top ten list itself: title, summary, method note and status. Use set_ranking_entries for the companies in it.",
    write: true,
    schema: object(
      {
        id: str("Omit to create."),
        title: str("The list title."),
        categoryId: str("Service id. Required when creating."),
        cityId: str("City id. Required when creating."),
        summary: str("The answer-first paragraph at the top."),
        intro: str("Longer introduction."),
        methodologyNote: str("How this list was put together. Say plainly if it follows Google's order."),
        readingMinutes: int("Estimated reading time."),
        markReviewed: bool("Set the last-reviewed date to now."),
        status: str("DRAFT, REVIEW, PUBLISHED or ARCHIVED."),
      },
      [],
    ),
    handler: async (args, ctx) => {
      const id = optStr(args, "id");
      const data = patch(args, {
        title: "string",
        summary: "string",
        intro: "string",
        methodologyNote: "string",
        readingMinutes: "int",
      });
      if (args.status !== undefined) data.status = oneOf(String(args.status), CONTENT_STATUS, "status");
      if (optBool(args, "markReviewed")) data.lastReviewedAt = new Date();
      if (data.status === "PUBLISHED") data.publishedAt = new Date();

      if (!id) {
        const categoryId = reqStr(args, "categoryId");
        const cityId = reqStr(args, "cityId");
        const city = await db.city.findUnique({ where: { id: cityId }, include: { region: true } });
        const category = await db.category.findUnique({ where: { id: categoryId } });
        if (!city || !category) throw new ToolError("That service or city id does not exist.");

        const clash = await db.ranking.findUnique({ where: { categoryId_cityId: { categoryId, cityId } } });
        if (clash) throw new ToolError(`A ranking already exists for that service and city: ${clash.id}.`);

        const ranking = await db.ranking.create({
          data: {
            title: reqStr(args, "title"),
            slug: slugify(`${category.slug}-${city.slug}`),
            categoryId,
            cityId,
            regionId: city.regionId,
            countryId: city.region.countryId,
            ...data,
          },
        });
        await recordWrite(ctx, {
          action: "create",
          entityType: "ranking",
          entityId: ranking.id,
          summary: `ranking ${ranking.title}`,
        });
        return { id: ranking.id, status: ranking.status };
      }

      const existing = await db.ranking.findUnique({ where: { id } });
      if (!existing) throw new ToolError("No ranking matches that id.");
      const ranking = await db.ranking.update({ where: { id }, data });
      await recordWrite(ctx, {
        action: "update",
        entityType: "ranking",
        entityId: ranking.id,
        summary: `ranking ${ranking.title}`,
      });
      return { id: ranking.id, status: ranking.status };
    },
  },

  {
    name: "set_ranking_entries",
    title: "Set the companies in a ranking",
    description:
      "Replaces the whole list in the order you give. Position is the array order, so reordering is just sending the array again.",
    write: true,
    schema: object(
      {
        rankingId: str("The ranking id."),
        entries: arr("The companies, best first.", {
          type: "object",
          additionalProperties: false,
          required: ["businessId"],
          properties: {
            businessId: { type: "string" },
            designation: { type: "string", description: "For example 'Best for emergency call-outs'." },
            whyPicked: { type: "string" },
            likes: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } },
            sponsored: { type: "boolean", description: "Labelled as paid placement on the page." },
          },
        }),
      },
      ["rankingId", "entries"],
    ),
    handler: async (args, ctx) => {
      const rankingId = reqStr(args, "rankingId");
      const rows = optRows(args, "entries") ?? [];
      if (rows.length === 0) throw new ToolError("Pass at least one entry.");

      const ranking = await db.ranking.findUnique({ where: { id: rankingId } });
      if (!ranking) throw new ToolError("No ranking matches that id.");

      const ids = rows.map((row) => String(row.businessId ?? ""));
      if (ids.some((value) => !value)) throw new ToolError("Every entry needs a businessId.");
      if (new Set(ids).size !== ids.length) throw new ToolError("The same business appears twice.");

      const found = await db.business.findMany({ where: { id: { in: ids } }, select: { id: true } });
      const missing = ids.filter((value) => !found.some((row) => row.id === value));
      if (missing.length > 0) throw new ToolError(`These business ids do not exist: ${missing.join(", ")}.`);

      await db.rankingEntry.deleteMany({ where: { rankingId } });
      await db.rankingEntry.createMany({
        data: rows.map((row, index) => ({
          rankingId,
          businessId: String(row.businessId),
          position: index + 1,
          designation: row.designation ? String(row.designation) : null,
          whyPicked: row.whyPicked ? String(row.whyPicked) : null,
          likes: Array.isArray(row.likes) ? JSON.stringify(row.likes.map(String)) : null,
          concerns: Array.isArray(row.concerns) ? JSON.stringify(row.concerns.map(String)) : null,
          sponsored: row.sponsored === true,
        })),
      });
      await db.ranking.update({
        where: { id: rankingId },
        data: { companiesReviewed: rows.length, lastReviewedAt: new Date() },
      });

      await recordWrite(ctx, {
        action: "update",
        entityType: "ranking",
        entityId: rankingId,
        summary: `${rows.length} entries set on ${ranking.title}`,
      });
      return { rankingId, entries: rows.length };
    },
  },

  {
    name: "delete_content",
    title: "Delete content",
    description:
      "Removes a page, guide, post or ranking. Prefer setting the status to ARCHIVED, which keeps the record and the URL history.",
    write: true,
    admin: true,
    destructive: true,
    schema: object(
      {
        kind: str("page, guide, post or ranking."),
        id: str("The id."),
        confirm: bool("Must be true. A guard against a deletion nobody meant."),
      },
      ["kind", "id", "confirm"],
    ),
    handler: async (args, ctx) => {
      if (optBool(args, "confirm") !== true) throw new ToolError("Pass confirm: true to delete.");
      const kind = reqStr(args, "kind").toLowerCase();
      const id = reqStr(args, "id");

      const table = { page: db.page, guide: db.guide, post: db.post, ranking: db.ranking } as const;
      if (!(kind in table)) throw new ToolError("kind must be page, guide, post or ranking.");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the four
      // delegates share the shape this needs but not a common type.
      const model = table[kind as keyof typeof table] as any;
      const row = await model.findUnique({ where: { id } });
      if (!row) throw new ToolError(`No ${kind} matches that id.`);

      await model.delete({ where: { id } });
      await recordWrite(ctx, {
        action: "delete",
        entityType: kind,
        entityId: id,
        summary: `${kind} ${row.title}`,
      });
      return { deleted: kind, id, title: row.title };
    },
  },

  {
    name: "list_faqs",
    title: "List questions",
    description: "The FAQ entries, filtered by what they are attached to.",
    schema: object({
      scope: str("GLOBAL, RANKING, GUIDE, COUNTRY, PAGE or BUSINESS."),
      parentId: str("The id of the thing they hang off, when the scope is not GLOBAL."),
      limit: int("Default 50."),
    }),
    handler: async (args) => {
      const scope = args.scope
        ? oneOf(String(args.scope), ["GLOBAL", "RANKING", "GUIDE", "COUNTRY", "PAGE", "BUSINESS"], "scope")
        : undefined;
      const parentId = optStr(args, "parentId");

      const rows = await db.faq.findMany({
        where: {
          ...(scope ? { scope } : {}),
          ...(parentId
            ? {
                OR: [
                  { rankingId: parentId },
                  { guideId: parentId },
                  { countryId: parentId },
                  { pageId: parentId },
                  { businessId: parentId },
                ],
              }
            : {}),
        },
        orderBy: [{ scope: "asc" }, { sortOrder: "asc" }],
        take: limitOf(args, 50),
      });

      return {
        faqs: rows.map((row) => ({
          id: row.id,
          scope: row.scope,
          question: row.question,
          answer: row.answer,
          attachedTo: row.rankingId ?? row.guideId ?? row.countryId ?? row.pageId ?? row.businessId ?? null,
        })),
      };
    },
  },

  {
    name: "upsert_faq",
    title: "Create or update a question",
    description:
      "A GLOBAL question appears wherever a page has none of its own. Anything else attaches to one record.",
    write: true,
    schema: object(
      {
        id: str("Omit to create."),
        question: str("The question as a person would type it."),
        answer: str("Answer first, then the detail."),
        scope: str("GLOBAL, RANKING, GUIDE, COUNTRY, PAGE or BUSINESS."),
        parentId: str("The id it attaches to, required unless the scope is GLOBAL."),
        sortOrder: int("Where it sits in the list."),
      },
      [],
    ),
    handler: async (args, ctx) => {
      const id = optStr(args, "id");
      const scope = args.scope
        ? oneOf(String(args.scope), ["GLOBAL", "RANKING", "GUIDE", "COUNTRY", "PAGE", "BUSINESS"], "scope")
        : undefined;
      const parentId = optStr(args, "parentId");

      const link: Record<string, string | null> = {};
      if (scope) {
        if (scope !== "GLOBAL" && !parentId) throw new ToolError(`A ${scope} question needs a parentId.`);
        link.rankingId = scope === "RANKING" ? parentId! : null;
        link.guideId = scope === "GUIDE" ? parentId! : null;
        link.countryId = scope === "COUNTRY" ? parentId! : null;
        link.pageId = scope === "PAGE" ? parentId! : null;
        link.businessId = scope === "BUSINESS" ? parentId! : null;
      }

      const data = {
        ...patch(args, { question: "string", answer: "string", sortOrder: "int" }),
        ...(scope ? { scope, ...link } : {}),
      };

      if (!id) {
        const faq = await db.faq.create({
          data: {
            question: reqStr(args, "question"),
            answer: reqStr(args, "answer"),
            scope: scope ?? "GLOBAL",
            ...link,
            sortOrder: optInt(args, "sortOrder") ?? 0,
          },
        });
        await recordWrite(ctx, { action: "create", entityType: "faq", entityId: faq.id, summary: faq.question });
        return { id: faq.id, scope: faq.scope };
      }

      const faq = await db.faq.update({ where: { id }, data });
      await recordWrite(ctx, { action: "update", entityType: "faq", entityId: faq.id, summary: faq.question });
      return { id: faq.id, scope: faq.scope };
    },
  },

  {
    name: "delete_faq",
    title: "Delete a question",
    write: true,
    destructive: true,
    description: "Removes one FAQ entry.",
    schema: object({ id: str("The FAQ id.") }, ["id"]),
    handler: async (args, ctx) => {
      const id = reqStr(args, "id");
      const faq = await db.faq.findUnique({ where: { id } });
      if (!faq) throw new ToolError("No question matches that id.");
      await db.faq.delete({ where: { id } });
      await recordWrite(ctx, { action: "delete", entityType: "faq", entityId: id, summary: faq.question });
      return { deleted: id };
    },
  },

  {
    name: "set_criteria",
    title: "Set the ranking criteria",
    description:
      "The standing method. Replaces the global criteria list, which publishes on How we rank and every service hub.",
    write: true,
    schema: object(
      {
        criteria: arr("In the order they should appear.", {
          type: "object",
          additionalProperties: false,
          required: ["title", "body"],
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            importance: { type: "string", description: "HIGH, MODERATE or SUPPORTING." },
            iconKey: { type: "string" },
          },
        }),
      },
      ["criteria"],
    ),
    handler: async (args, ctx) => {
      const rows = optRows(args, "criteria") ?? [];
      if (rows.length === 0) throw new ToolError("Pass at least one criterion.");

      await db.criterion.deleteMany({ where: { scope: "GLOBAL" } });
      await db.criterion.createMany({
        data: rows.map((row, index) => ({
          title: String(row.title ?? ""),
          body: String(row.body ?? ""),
          importance: row.importance
            ? oneOf(String(row.importance), ["HIGH", "MODERATE", "SUPPORTING"], "importance")
            : "MODERATE",
          iconKey: row.iconKey ? String(row.iconKey) : null,
          scope: "GLOBAL",
          sortOrder: index,
        })),
      });

      await recordWrite(ctx, {
        action: "update",
        entityType: "criteria",
        summary: `${rows.length} global criteria set`,
      });
      return { criteria: rows.length };
    },
  },
];
