import { db } from "../db";
import { abortRun } from "../apify";
import { resumeStage } from "../import-pipeline";
import { fullDate } from "../format";
import { parseList } from "../json";
import { secretStatus } from "../secrets";
import {
  arr,
  bool,
  int,
  limitOf,
  num,
  object,
  optBool,
  optInt,
  optNum,
  recordWrite,
  reqStr,
  str,
  ToolError,
  type Tool,
} from "./kit";

// Driving the scrape-and-write pipeline. A batch costs money on two external
// services, so the tools that start one say what the ceiling is and the ones
// that stop one also stop the Apify meter.

export const IMPORT_TOOLS: Tool[] = [
  {
    name: "list_import_batches",
    title: "List import batches",
    description: "Every scrape-and-write run, its stage and its counts.",
    schema: object({ status: str("Filter by stage."), limit: int("Default 20.") }),
    handler: async (args) => {
      const rows = await db.importBatch.findMany({
        where: args.status ? { status: String(args.status).toUpperCase() } : {},
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
          perCity: batch.perCity,
          found: batch.found,
          duplicates: batch.duplicates,
          written: batch.written,
          published: batch.published,
          failed: batch.failed,
          error: batch.error,
          started: batch.startedAt ? fullDate(batch.startedAt) : null,
        })),
      };
    },
  },

  {
    name: "get_import_batch",
    title: "Get one import batch",
    description: "The batch and every place it found, with what happened to each and why.",
    schema: object({ id: str("The batch id."), limit: int("How many items to return. Default 50.") }, ["id"]),
    handler: async (args) => {
      const batch = await db.importBatch.findUnique({
        where: { id: reqStr(args, "id") },
        include: {
          category: true,
          items: {
            orderBy: [{ status: "asc" }, { gmbRank: "asc" }],
            take: limitOf(args, 50),
            include: { city: true, business: true },
          },
        },
      });
      if (!batch) throw new ToolError("No batch matches that id.");

      return {
        id: batch.id,
        name: batch.name,
        service: batch.category.name,
        status: batch.status,
        error: batch.error,
        settings: {
          perCity: batch.perCity,
          minRating: batch.minRating,
          minReviews: batch.minReviews,
          autoPublishScore: batch.autoPublishScore,
          buildRanking: batch.buildRanking,
          rankingSize: batch.rankingSize,
        },
        counts: {
          found: batch.found,
          duplicates: batch.duplicates,
          written: batch.written,
          published: batch.published,
          failed: batch.failed,
        },
        items: batch.items.map((item) => ({
          id: item.id,
          name: item.name,
          city: item.city?.name ?? null,
          googleMapsPosition: item.gmbRank,
          rating: item.rating,
          reviews: item.reviewCount,
          email: item.email,
          emailSource: item.emailSource,
          seoScore: item.seoScore,
          status: item.status,
          reason: item.reason,
          businessId: item.businessId,
          published: item.business?.status ?? null,
        })),
      };
    },
  },

  {
    name: "queue_import_batch",
    title: "Queue an import batch",
    description:
      "Scrapes a service across cities, writes a full profile for each company and scores it. This spends money on Apify and Anthropic. It reports the ceiling before the worker starts. Use list_taxonomy for the ids.",
    write: true,
    admin: true,
    schema: object(
      {
        name: str("A label for the run."),
        categoryId: str("Service id."),
        cityIds: arr("City ids, up to 40."),
        perCity: int("Places per city, 1 to 120. Default 20."),
        minRating: num("Skip anything rated below this."),
        minReviews: int("Skip anything with fewer reviews."),
        autoPublishScore: int("Publish at or above this score, draft below. Default 90."),
        buildRanking: bool("Rebuild the city ranking from Google's order. Default true."),
        rankingSize: int("How many companies in that ranking. Default 10."),
      },
      ["name", "categoryId", "cityIds"],
    ),
    handler: async (args, ctx) => {
      const secrets = await secretStatus();
      const missing = secrets.filter((row) => !row.set);
      if (missing.length > 0) {
        throw new ToolError(
          `${missing.map((row) => row.label).join(" and ")} not set, so a batch would fail immediately. Set them with set_credential or in Admin, Integrations.`,
        );
      }

      const cityIds = Array.isArray(args.cityIds) ? (args.cityIds as unknown[]).map(String).filter(Boolean) : [];
      if (cityIds.length === 0) throw new ToolError("Pass at least one city id.");
      if (cityIds.length > 40) throw new ToolError("Keep a batch to 40 cities or fewer.");

      const categoryId = reqStr(args, "categoryId");
      const category = await db.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new ToolError("That service id does not exist. Call list_taxonomy first.");

      const found = await db.city.count({ where: { id: { in: cityIds } } });
      if (found !== cityIds.length) throw new ToolError("One of those city ids does not exist.");

      const perCity = Math.min(Math.max(1, optInt(args, "perCity") ?? 20), 120);

      const batch = await db.importBatch.create({
        data: {
          name: reqStr(args, "name"),
          categoryId,
          cityIds: JSON.stringify(cityIds),
          perCity,
          minRating: optNum(args, "minRating") ?? null,
          minReviews: optInt(args, "minReviews") ?? null,
          autoPublishScore: optInt(args, "autoPublishScore") ?? 90,
          buildRanking: optBool(args, "buildRanking") !== false,
          rankingSize: optInt(args, "rankingSize") ?? 10,
          createdById: ctx.user.id,
          note: `Queued through ${ctx.clientName}`,
        },
      });

      await recordWrite(ctx, {
        action: "create",
        entityType: "importBatch",
        entityId: batch.id,
        summary: `${batch.name}: ${category.name} across ${cityIds.length} cities`,
        paths: [],
      });

      return {
        id: batch.id,
        willScrapeUpTo: cityIds.length * perCity,
        adminUrl: `/admin/imports/${batch.id}`,
        note: "The worker picks it up within seconds. Follow it with get_import_batch.",
      };
    },
  },

  {
    name: "control_import_batch",
    title: "Pause, resume or finish a batch",
    description:
      "Pausing also aborts the Apify run, which stops the meter. Resuming queues everything that failed to write and restarts at the stage the items imply, so nothing already scraped is scraped again.",
    write: true,
    admin: true,
    schema: object({ id: str("The batch id."), action: str("pause, resume or publish_drafts.") }, ["id", "action"]),
    handler: async (args, ctx) => {
      const id = reqStr(args, "id");
      const action = reqStr(args, "action").toLowerCase();
      const batch = await db.importBatch.findUnique({ where: { id } });
      if (!batch) throw new ToolError("No batch matches that id.");

      if (action === "pause") {
        if (batch.status === "SCRAPING" && batch.apifyRunId) await abortRun(batch.apifyRunId);
        await db.importBatch.update({ where: { id }, data: { status: "PAUSED" } });
        await recordWrite(ctx, {
          action: "update",
          entityType: "importBatch",
          entityId: id,
          summary: `${batch.name} paused`,
          paths: [],
        });
        return { id, status: "PAUSED" };
      }

      if (action === "resume") {
        const status = await resumeStage(id);
        await recordWrite(ctx, {
          action: "update",
          entityType: "importBatch",
          entityId: id,
          summary: `${batch.name} resumed at ${status.toLowerCase()}`,
          paths: [],
        });
        return { id, status };
      }

      if (action === "publish_drafts") {
        const items = await db.importItem.findMany({
          where: { batchId: id, status: "IMPORTED", businessId: { not: null } },
          select: { businessId: true },
        });
        const ids = items.map((item) => item.businessId!).filter(Boolean);
        if (ids.length === 0) throw new ToolError("This batch has no listings waiting as drafts.");

        const result = await db.business.updateMany({
          where: { id: { in: ids }, status: "DRAFT" },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
        await db.importBatch.update({ where: { id }, data: { published: { increment: result.count } } });

        await recordWrite(ctx, {
          action: "update",
          entityType: "importBatch",
          entityId: id,
          summary: `${result.count} drafts published from ${batch.name}`,
        });
        return { id, published: result.count };
      }

      throw new ToolError("action must be pause, resume or publish_drafts.");
    },
  },

  {
    name: "rewrite_import_item",
    title: "Rewrite one imported listing",
    description:
      "Sends a listing back to be written again, for one that came out weak. Costs one more model call.",
    write: true,
    schema: object({ itemId: str("The import item id, from get_import_batch.") }, ["itemId"]),
    handler: async (args, ctx) => {
      const itemId = reqStr(args, "itemId");
      const item = await db.importItem.findUnique({ where: { id: itemId } });
      if (!item) throw new ToolError("No import item matches that id.");
      if (item.status === "IMPORTED") {
        throw new ToolError(
          "That one is already a business. Edit it with update_business, or delete it and re-run the batch.",
        );
      }

      await db.importItem.update({
        where: { id: itemId },
        data: { status: "ENRICHED", attempts: 0, reason: null, draft: null },
      });
      await db.importBatch.update({
        where: { id: item.batchId },
        data: { status: "WRITING", finishedAt: null },
      });

      await recordWrite(ctx, {
        action: "update",
        entityType: "importItem",
        entityId: itemId,
        summary: `${item.name} queued for a rewrite`,
        paths: [],
      });
      return { itemId, queued: true };
    },
  },
];
