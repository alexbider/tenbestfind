import { db } from "../db";
import { BUSINESS_STATUSES } from "../enums";
import { LEAD_STATUSES } from "../leads";
import { recordMove } from "../redirects";
import { fullDate, slugify } from "../format";
import { parseList } from "../json";
import { routes } from "../urls";
import {
  arr,
  bool,
  int,
  limitOf,
  object,
  oneOf,
  optBool,
  optRows,
  optStr,
  patch,
  recordWrite,
  reqStr,
  str,
  ToolError,
  type Tool,
} from "./kit";

// Businesses and the people who write about them, plus the two inboxes: claims
// from owners and corrections from readers.



async function findBusiness(key: string) {
  const business = await db.business.findFirst({ where: { OR: [{ id: key }, { slug: key }] } });
  if (!business) throw new ToolError(`No business matches ${key}.`);
  return business;
}

export const DIRECTORY_TOOLS: Tool[] = [
  {
    name: "create_business",
    title: "Create a business",
    description:
      "Adds a listing by hand. For bulk work use queue_import_batch, which scrapes and writes the copy for you.",
    write: true,
    schema: object(
      {
        name: str("The company name."),
        categoryId: str("Service id."),
        cityId: str("City id."),
        slug: str("URL slug. Derived from the name when omitted."),
        website: str("Their site."),
        phone: str("Contact number."),
        email: str("Main contact address."),
        addressLine: str("Street address."),
        postalCode: str("Postal or ZIP code."),
        tagline: str("One line."),
        overview: str("The Quick overview at the top of the profile, about 150 words."),
        description: str("The main profile copy, shown behind Read more."),
        editorialTake: str("The site's own assessment."),
        bestFor: str("Short phrase."),
        status: str("Defaults to DRAFT."),
      },
      ["name", "categoryId"],
    ),
    handler: async (args, ctx) => {
      const name = reqStr(args, "name");
      const categoryId = reqStr(args, "categoryId");
      if (!(await db.category.findUnique({ where: { id: categoryId } }))) {
        throw new ToolError("That service id does not exist.");
      }
      const cityId = optStr(args, "cityId");
      if (cityId && !(await db.city.findUnique({ where: { id: cityId } }))) {
        throw new ToolError("That city id does not exist.");
      }

      const slug = slugify(optStr(args, "slug") ?? name);
      if (await db.business.findUnique({ where: { slug } })) {
        throw new ToolError(`A business already uses the slug ${slug}. Pass a different slug.`);
      }

      const status = args.status ? oneOf(String(args.status), BUSINESS_STATUSES, "status") : "DRAFT";
      const business = await db.business.create({
        data: {
          name,
          slug,
          categoryId,
          cityId: cityId ?? null,
          status,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
          ...patch(args, {
            website: "string",
            phone: "string",
            email: "string",
            addressLine: "string",
            postalCode: "string",
            tagline: "string",
            description: "string",
            editorialTake: "string",
            bestFor: "string",
          }),
        },
      });

      await recordWrite(ctx, {
        action: "create",
        entityType: "business",
        entityId: business.id,
        summary: `business ${business.name}`,
        paths: ["/", routes.business(business.slug)],
      });
      return { id: business.id, url: routes.business(business.slug), status: business.status };
    },
  },

  {
    name: "update_business",
    title: "Update a business",
    description:
      "Changes any part of a profile. Only the fields you pass are touched. Renaming the slug leaves a redirect behind.",
    write: true,
    schema: object(
      {
        idOrSlug: str("The business id or slug."),
        name: str("The company name."),
        slug: str("URL slug."),
        categoryId: str("Move it to a different service."),
        cityId: str("Move it to a different city."),
        tagline: str("One line."),
        description: str("The main profile copy."),
        editorialTake: str("The site's own assessment."),
        bestFor: str("Short phrase."),
        strengths: arr("Replaces the list."),
        considerations: arr("Replaces the list."),
        website: str("Their site."),
        phone: str("Contact number."),
        email: str("Main contact address."),
        addressLine: str("Street address."),
        postalCode: str("Postal or ZIP code."),
        logoUrl: str("Logo image URL."),
        yearFounded: int("Year the company started."),
        employeeCount: str("For example 20 to 50."),
        licenseNumber: str("As published by the issuing authority."),
        warrantyTerms: str("What they warranty and for how long."),
        emergency: bool("Offers emergency call-outs."),
        financing: bool("Offers financing."),
        freeEstimates: bool("Gives free estimates."),
        verified: bool("Credentials checked by an editor."),
      },
      ["idOrSlug"],
    ),
    handler: async (args, ctx) => {
      const existing = await findBusiness(reqStr(args, "idOrSlug"));

      const data = patch(args, {
        name: "string",
        categoryId: "string",
        cityId: "string",
        tagline: "string",
        overview: "string",
        description: "string",
        editorialTake: "string",
        bestFor: "string",
        website: "string",
        phone: "string",
        email: "string",
        addressLine: "string",
        postalCode: "string",
        logoUrl: "string",
        yearFounded: "int",
        employeeCount: "string",
        licenseNumber: "string",
        warrantyTerms: "string",
        emergency: "bool",
        financing: "bool",
        freeEstimates: "bool",
        verified: "bool",
        strengths: "json",
        considerations: "json",
      });

      const slug = args.slug !== undefined ? slugify(String(args.slug)) : existing.slug;
      if (slug !== existing.slug && (await db.business.findUnique({ where: { slug } }))) {
        throw new ToolError(`A business already uses the slug ${slug}.`);
      }
      if (Object.keys(data).length === 0 && slug === existing.slug) {
        throw new ToolError("Pass at least one field to change.");
      }

      const business = await db.business.update({ where: { id: existing.id }, data: { ...data, slug } });
      if (slug !== existing.slug) {
        await recordMove(routes.business(existing.slug), routes.business(business.slug));
      }

      await recordWrite(ctx, {
        action: "update",
        entityType: "business",
        entityId: business.id,
        summary: `${business.name}: ${[...Object.keys(data), ...(slug !== existing.slug ? ["slug"] : [])].join(", ")}`,
        paths: ["/", routes.business(business.slug)],
      });
      return { id: business.id, url: routes.business(business.slug), updated: Object.keys(data) };
    },
  },

  {
    name: "set_business_status",
    title: "Publish or unpublish a business",
    write: true,
    description:
      "Moves a listing between DRAFT, PENDING, PUBLISHED, SUSPENDED, REJECTED and ARCHIVED. SUSPENDED means taken down for a reason that may end; ARCHIVED means retired for good.",
    schema: object({ idOrSlug: str("The business id or slug."), status: str("The new status.") }, [
      "idOrSlug",
      "status",
    ]),
    handler: async (args, ctx) => {
      const existing = await findBusiness(reqStr(args, "idOrSlug"));
      const status = oneOf(reqStr(args, "status"), BUSINESS_STATUSES, "status");

      const business = await db.business.update({
        where: { id: existing.id },
        data: {
          status,
          publishedAt: status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        },
      });
      await recordWrite(ctx, {
        action: "update",
        entityType: "business",
        entityId: business.id,
        summary: `${business.name} set to ${status}`,
        paths: ["/", routes.business(business.slug)],
      });
      return { id: business.id, status, url: routes.business(business.slug) };
    },
  },

  {
    name: "set_business_details",
    title: "Set a business's services, areas, hours, credentials and photos",
    description:
      "Each list you pass replaces that list wholesale. Omit one to leave it alone. Use list_taxonomy for the ids.",
    write: true,
    schema: object(
      {
        idOrSlug: str("The business id or slug."),
        subserviceIds: arr("Subservice ids this company offers."),
        serviceAreaCityIds: arr("City ids it covers."),
        hours: arr("Opening hours, one entry per day.", {
          type: "object",
          additionalProperties: false,
          required: ["day"],
          properties: {
            day: { type: "string", description: "Monday through Sunday." },
            opens: { type: "string", description: "24-hour, for example 08:00." },
            closes: { type: "string" },
            closed: { type: "boolean" },
          },
        }),
        credentials: arr("Licences, insurance and certifications.", {
          type: "object",
          additionalProperties: false,
          required: ["label"],
          properties: {
            label: { type: "string" },
            identifier: { type: "string", description: "Licence or policy number." },
            authority: { type: "string", description: "Who issued it." },
            status: { type: "string", description: "VERIFIED, REPORTED or EXPIRED." },
            sourceUrl: { type: "string" },
          },
        }),
        photos: arr("Image URLs, in order."),
      },
      ["idOrSlug"],
    ),
    handler: async (args, ctx) => {
      const business = await findBusiness(reqStr(args, "idOrSlug"));
      const touched: string[] = [];

      const subserviceIds = args.subserviceIds === undefined ? undefined : (args.subserviceIds as string[]);
      if (subserviceIds) {
        const valid = await db.subservice.findMany({
          where: { id: { in: subserviceIds.map(String) } },
          select: { id: true },
        });
        await db.businessService.deleteMany({ where: { businessId: business.id } });
        if (valid.length > 0) {
          await db.businessService.createMany({
            data: valid.map((row) => ({ businessId: business.id, subserviceId: row.id })),
          });
        }
        touched.push(`${valid.length} services`);
      }

      const areaIds = args.serviceAreaCityIds === undefined ? undefined : (args.serviceAreaCityIds as string[]);
      if (areaIds) {
        const valid = await db.city.findMany({ where: { id: { in: areaIds.map(String) } }, select: { id: true } });
        await db.businessArea.deleteMany({ where: { businessId: business.id } });
        if (valid.length > 0) {
          await db.businessArea.createMany({
            data: valid.map((row, index) => ({
              businessId: business.id,
              cityId: row.id,
              primary: index === 0,
            })),
          });
        }
        touched.push(`${valid.length} service areas`);
      }

      const hours = optRows(args, "hours");
      if (hours) {
        await db.business.update({
          where: { id: business.id },
          data: {
            hours: JSON.stringify(
              hours.map((row) => ({
                day: String(row.day ?? ""),
                opens: row.opens ? String(row.opens) : undefined,
                closes: row.closes ? String(row.closes) : undefined,
                closed: row.closed === true,
              })),
            ),
          },
        });
        touched.push("hours");
      }

      const credentials = optRows(args, "credentials");
      if (credentials) {
        await db.credential.deleteMany({ where: { businessId: business.id } });
        await db.credential.createMany({
          data: credentials.map((row, index) => ({
            businessId: business.id,
            label: String(row.label ?? ""),
            identifier: row.identifier ? String(row.identifier) : null,
            authority: row.authority ? String(row.authority) : null,
            status: row.status ? oneOf(String(row.status), ["VERIFIED", "REPORTED", "EXPIRED"], "status") : "REPORTED",
            sourceUrl: row.sourceUrl ? String(row.sourceUrl) : null,
            checkedAt: row.status && String(row.status).toUpperCase() === "VERIFIED" ? new Date() : null,
            sortOrder: index,
          })),
        });
        touched.push(`${credentials.length} credentials`);
      }

      const photos = args.photos === undefined ? undefined : (args.photos as string[]);
      if (photos) {
        await db.businessPhoto.deleteMany({ where: { businessId: business.id } });
        const usable = photos.map(String).filter((url) => url.startsWith("http"));
        if (usable.length > 0) {
          await db.businessPhoto.createMany({
            data: usable.map((url, index) => ({
              businessId: business.id,
              url,
              alt: business.name,
              sortOrder: index,
            })),
          });
        }
        touched.push(`${usable.length} photos`);
      }

      if (touched.length === 0) throw new ToolError("Pass at least one list to set.");

      await recordWrite(ctx, {
        action: "update",
        entityType: "business",
        entityId: business.id,
        summary: `${business.name}: ${touched.join(", ")}`,
        paths: ["/", routes.business(business.slug)],
      });
      return { id: business.id, set: touched };
    },
  },

  {
    name: "delete_business",
    title: "Delete a business",
    description:
      "Removes the listing and everything attached to it. Archiving keeps the record and the URL, and is almost always the better move.",
    write: true,
    admin: true,
    destructive: true,
    schema: object({ idOrSlug: str("The business id or slug."), confirm: bool("Must be true.") }, [
      "idOrSlug",
      "confirm",
    ]),
    handler: async (args, ctx) => {
      if (optBool(args, "confirm") !== true) throw new ToolError("Pass confirm: true to delete.");
      const business = await findBusiness(reqStr(args, "idOrSlug"));

      const entries = await db.rankingEntry.count({ where: { businessId: business.id } });
      await db.business.delete({ where: { id: business.id } });
      await recordWrite(ctx, {
        action: "delete",
        entityType: "business",
        entityId: business.id,
        summary: `${business.name}, removed from ${entries} rankings`,
      });
      return { deleted: business.name, removedFromRankings: entries };
    },
  },

  /* ------------------------------------------------- reviews and coverage */

  {
    name: "list_reviews",
    title: "Read a company's stored reviews",
    description:
      "The Google reviews held for one company, newest first. These are the ones quoted on its profile.",
    schema: object({ idOrSlug: str("The business id or slug."), limit: int("Default 10.") }, ["idOrSlug"]),
    handler: async (args) => {
      const business = await findBusiness(reqStr(args, "idOrSlug"));
      const rows = await db.review.findMany({
        where: { businessId: business.id },
        orderBy: { postedAt: "desc" },
        take: limitOf(args, 10),
      });
      return {
        business: business.name,
        rating: business.googleRating,
        reviewCount: business.googleReviewCount,
        lastRead: business.reviewsUpdatedAt ? fullDate(business.reviewsUpdatedAt) : null,
        reviews: rows.map((row) => ({
          author: row.author,
          rating: row.rating,
          body: row.body,
          postedAt: fullDate(row.postedAt),
          ownerReply: row.ownerReply,
          url: row.sourceUrl,
        })),
      };
    },
  },

  {
    name: "refresh_reviews",
    title: "Re-read reviews from Google",
    write: true,
    description:
      "Queues a re-read of Google reviews through Apify, for one company or for a slice of the directory. The work runs in the import worker, so this returns as soon as it is queued. Each company costs one Apify place lookup.",
    schema: object({
      idOrSlug: str("One company. Leave it out to refresh a selection instead."),
      categoryId: str("Limit the selection to one service."),
      cityId: str("Limit the selection to one city."),
      staleDays: int("Only companies whose reviews were last read this many days ago or longer."),
      limit: int("How many companies at most. Default 50, maximum 200."),
    }),
    handler: async (args, ctx) => {
      const { queueRefresh } = await import("../reviews");

      let ids: string[];
      let what: string;

      if (args.idOrSlug !== undefined) {
        const business = await findBusiness(reqStr(args, "idOrSlug"));
        ids = [business.id];
        what = business.name;
      } else {
        const staleDays = typeof args.staleDays === "number" ? args.staleDays : 0;
        const stale = staleDays > 0 ? new Date(Date.now() - staleDays * 86_400_000) : null;
        const rows = await db.business.findMany({
          where: {
            placeId: { not: null },
            status: { in: ["PUBLISHED", "DRAFT", "PENDING"] },
            ...(args.categoryId ? { categoryId: String(args.categoryId) } : {}),
            ...(args.cityId ? { cityId: String(args.cityId) } : {}),
            ...(stale ? { OR: [{ reviewsUpdatedAt: null }, { reviewsUpdatedAt: { lt: stale } }] } : {}),
          },
          orderBy: { reviewsUpdatedAt: { sort: "asc", nulls: "first" } },
          select: { id: true },
          take: Math.min(200, limitOf(args, 50)),
        });
        ids = rows.map((row) => row.id);
        what = `${rows.length} companies`;
      }

      if (ids.length === 0) throw new ToolError("Nothing matched, so nothing was queued.");

      const queued = await queueRefresh({ businessIds: ids, userId: ctx.user.id });
      if (queued.requested === 0) {
        throw new ToolError(
          "None of those companies has a Google place id on file, so there is nothing to look up.",
        );
      }

      await recordWrite(ctx, {
        action: "update",
        entityType: "business",
        entityId: queued.id,
        summary: `Review refresh queued for ${what}`,
        paths: [],
      });
      return { refreshId: queued.id, queued: queued.requested, skippedWithoutPlaceId: queued.skipped };
    },
  },

  {
    name: "fill_service_areas",
    title: "Fill a company's service areas from a radius",
    write: true,
    description:
      "Adds every town within the radius of where the company works to its coverage list, keeping anything already there. Needs coordinates on the company or on its city.",
    schema: object(
      {
        idOrSlug: str("The business id or slug."),
        km: int("The radius in kilometres. Default 20."),
      },
      ["idOrSlug"],
    ),
    handler: async (args, ctx) => {
      const { fillServiceAreas, DEFAULT_RADIUS_KM } = await import("../geo");
      const business = await findBusiness(reqStr(args, "idOrSlug"));
      const km = typeof args.km === "number" && args.km > 0 ? args.km : DEFAULT_RADIUS_KM;

      const result = await fillServiceAreas(business.id, km);
      await recordWrite(ctx, {
        action: "update",
        entityType: "business",
        entityId: business.id,
        summary: `${business.name}: ${result.added} areas added within ${km} km`,
        paths: [routes.business(business.slug)],
      });
      return { business: business.name, added: result.added, total: result.total, radiusKm: km };
    },
  },

  {
    name: "set_ranking_position",
    title: "Move a company on a ranking",
    write: true,
    description:
      "Puts a company at a chosen place on one of its rankings. Everything between the old and the new place shifts by one, so the list stays 1 upwards with no gaps and no ties.",
    schema: object(
      {
        idOrSlug: str("The business id or slug."),
        rankingId: str("The ranking to move it on."),
        position: int("Where it should sit, counting from 1."),
      },
      ["idOrSlug", "rankingId", "position"],
    ),
    handler: async (args, ctx) => {
      const business = await findBusiness(reqStr(args, "idOrSlug"));
      const rankingId = reqStr(args, "rankingId");
      const wanted = typeof args.position === "number" ? Math.floor(args.position) : 0;
      if (wanted < 1) throw new ToolError("The position must be 1 or higher.");

      const entry = await db.rankingEntry.findUnique({
        where: { rankingId_businessId: { rankingId, businessId: business.id } },
        include: { ranking: { select: { title: true } } },
      });
      if (!entry) throw new ToolError(`${business.name} is not on that ranking.`);

      const siblings = await db.rankingEntry.findMany({
        where: { rankingId },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      const order = siblings.map((row) => row.id).filter((id) => id !== entry.id);
      order.splice(Math.min(wanted, order.length + 1) - 1, 0, entry.id);

      // Positions are unique per ranking, so they are parked on negatives first.
      await db.$transaction([
        ...order.map((id, index) =>
          db.rankingEntry.update({ where: { id }, data: { position: -(index + 1) } }),
        ),
        ...order.map((id, index) =>
          db.rankingEntry.update({ where: { id }, data: { position: index + 1 } }),
        ),
      ]);

      const landed = order.indexOf(entry.id) + 1;
      await recordWrite(ctx, {
        action: "update",
        entityType: "ranking",
        entityId: rankingId,
        summary: `${business.name} moved to #${landed} on ${entry.ranking.title}`,
        paths: ["/"],
      });
      return { business: business.name, ranking: entry.ranking.title, position: landed };
    },
  },

  {
    name: "enrich_from_website",
    title: "Fill a listing from the company's own website",
    write: true,
    description:
      "Reads a company's website and fills in what its listing is missing: the logo, photos, the year it started, a licence number, social profiles, and with the model also the people it names, the warranty and the services it offers. It never overwrites a field that already holds something. Queues the work in the import worker and returns straight away. Pass a batchId instead to do the same for every company one import created.",
    schema: object({
      idOrSlug: str("One company. Leave it out and pass batchId, or a selection, instead."),
      batchId: str("Every company an import batch created."),
      categoryId: str("Limit a selection to one service."),
      cityId: str("Limit a selection to one city."),
      status: str("PUBLISHED, DRAFT or PENDING. Default is all three."),
      read: str("never, stale or any. Whether the site has been read before. Default any."),
      staleDays: int("With read=stale, how long counts as stale. Default 30."),
      maxScore: int("Only listings at or below this completeness score, 0 to 100."),
      missing: arr(
        "Gap keys a listing must all be missing: description, overview, photos, logo, services, credentials, phone, email, website, address, hours, areas, reviews, staff, faqs, social, yearFounded.",
      ),
      order: str("thinnest, oldest or newest. Default thinnest, least complete first."),
      useModel: bool("Also read the pages with the model for the team, warranty and services. Default true."),
      limit: int("How many companies at most. Default 25, maximum 300."),
    }),
    handler: async (args, ctx) => {
      const { queueEnrichment } = await import("../enrich-run");
      const useModel = args.useModel !== false;

      let ids: string[];
      let batchId: string | undefined;
      let what: string;

      if (args.idOrSlug !== undefined) {
        const business = await findBusiness(reqStr(args, "idOrSlug"));
        ids = [business.id];
        what = business.name;
      } else if (args.batchId !== undefined) {
        batchId = reqStr(args, "batchId");
        const batch = await db.importBatch.findUnique({
          where: { id: batchId },
          select: { name: true },
        });
        if (!batch) throw new ToolError(`No import batch matches ${batchId}.`);
        const items = await db.importItem.findMany({
          where: { batchId, businessId: { not: null } },
          select: { businessId: true },
        });
        ids = [...new Set(items.map((row) => row.businessId).filter((id): id is string => Boolean(id)))];
        what = `${ids.length} companies from ${batch.name}`;
      } else {
        // The same filter the admin screen uses, so a selection described here
        // and a selection ticked there mean exactly the same thing.
        const { parseFilter, whereFor, orderFor } = await import("../enrich-filter");
        const filter = parseFilter({
          categoryId: args.categoryId ? String(args.categoryId) : undefined,
          cityId: args.cityId ? String(args.cityId) : undefined,
          status: args.status ? String(args.status).toUpperCase() : undefined,
          read: args.read ? String(args.read) : "any",
          staleDays: args.staleDays !== undefined ? String(args.staleDays) : undefined,
          maxScore: args.maxScore !== undefined ? String(args.maxScore) : undefined,
          missing: Array.isArray(args.missing) ? args.missing.map(String) : [],
          order: args.order ? String(args.order) : "thinnest",
          limit: String(Math.min(300, limitOf(args, 25))),
        });

        const rows = await db.business.findMany({
          where: whereFor(filter),
          orderBy: orderFor(filter),
          select: { id: true },
          take: Math.min(300, limitOf(args, 25)),
        });
        ids = rows.map((row) => row.id);
        what = `${ids.length} companies`;
      }

      if (ids.length === 0) throw new ToolError("Nothing matched, so nothing was queued.");

      const queued = await queueEnrichment({ businessIds: ids, batchId, useModel, userId: ctx.user.id });
      if (queued.requested === 0) {
        throw new ToolError("None of those companies has a website on file, so there is nothing to read.");
      }

      await recordWrite(ctx, {
        action: "update",
        entityType: "business",
        entityId: queued.id,
        summary: `Website enrichment queued for ${what}`,
        paths: [],
      });
      return {
        runId: queued.id,
        queued: queued.requested,
        skippedWithoutWebsite: ids.length - queued.requested,
        readWithModel: useModel,
      };
    },
  },

  {
    name: "listing_gaps",
    title: "See what listings are missing",
    description:
      "How complete each listing is and exactly which parts are empty. Use it to decide what to enrich, or to check a single company before and after a pass.",
    schema: object({
      idOrSlug: str("One company. Leave it out for the thinnest listings across the directory."),
      categoryId: str("Limit to one service."),
      cityId: str("Limit to one city."),
      maxScore: int("Only listings at or below this score."),
      limit: int("Default 20."),
    }),
    handler: async (args) => {
      const { SCORE_SELECT, gapsFor, scoreOf, GAP_BY_KEY } = await import("../completeness");

      const describe = (row: { name: string; slug: string } & Record<string, unknown>) => {
        const gaps = gapsFor(row as never);
        return {
          name: row.name,
          slug: row.slug,
          completeness: scoreOf(row as never),
          missing: gaps.map((key) => GAP_BY_KEY.get(key)?.label ?? key),
          fillableFromWebsite: gaps
            .filter((key) => GAP_BY_KEY.get(key)?.fromWebsite)
            .map((key) => GAP_BY_KEY.get(key)?.label ?? key),
        };
      };

      if (args.idOrSlug !== undefined) {
        const business = await findBusiness(reqStr(args, "idOrSlug"));
        const row = await db.business.findUniqueOrThrow({
          where: { id: business.id },
          select: { name: true, slug: true, ...SCORE_SELECT },
        });
        return describe(row);
      }

      const rows = await db.business.findMany({
        where: {
          status: { in: ["PUBLISHED", "DRAFT", "PENDING"] },
          ...(args.categoryId ? { categoryId: String(args.categoryId) } : {}),
          ...(args.cityId ? { cityId: String(args.cityId) } : {}),
          ...(args.maxScore !== undefined ? { completeness: { lte: Number(args.maxScore) } } : {}),
        },
        orderBy: { completeness: "asc" },
        take: limitOf(args, 20),
        select: { name: true, slug: true, ...SCORE_SELECT },
      });
      return { listings: rows.map(describe) };
    },
  },

  {
    name: "enrichment_status",
    title: "Check a website enrichment pass",
    description:
      "Where a queued enrichment got to, and what it filled company by company.",
    schema: object({ runId: str("From enrich_from_website. Leave it out for the most recent pass.") }),
    handler: async (args) => {
      const run = args.runId
        ? await db.enrichRun.findUnique({ where: { id: reqStr(args, "runId") } })
        : await db.enrichRun.findFirst({ orderBy: { createdAt: "desc" } });
      if (!run) throw new ToolError("No enrichment pass has been run.");

      const report = run.report
        ? (JSON.parse(run.report) as { business: string; filled: string[]; staff: number; photos: number; note: string | null }[])
        : [];

      return {
        id: run.id,
        status: run.status,
        read: run.processed,
        of: run.requested,
        fieldsFilled: run.fieldsFilled,
        peopleFound: run.staffFound,
        photosAdded: run.photosAdded,
        error: run.error,
        companies: report.slice(-40),
      };
    },
  },

  {
    name: "set_staff",
    title: "Replace the team on a listing",
    write: true,
    description:
      "Sets the named people at a company. The profile shows a team section only when there is someone in it, so passing an empty list removes the section. This is what the company says about itself, not something we verified.",
    schema: object(
      {
        idOrSlug: str("The business id or slug."),
        staff: {
          type: "array",
          maxItems: 20,
          description: "Replaces the whole list. Pass an empty array to remove the section.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name"],
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              bio: { type: "string" },
              photoUrl: { type: "string" },
              yearsExperience: { type: "integer" },
              credentials: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      ["idOrSlug", "staff"],
    ),
    handler: async (args, ctx) => {
      const business = await findBusiness(reqStr(args, "idOrSlug"));
      const rows = Array.isArray(args.staff) ? (args.staff as Record<string, unknown>[]) : [];

      await db.staffMember.deleteMany({ where: { businessId: business.id } });
      const people = rows
        .filter((row) => typeof row.name === "string" && row.name.trim().length > 1)
        .slice(0, 20);

      if (people.length > 0) {
        await db.staffMember.createMany({
          data: people.map((row, index) => ({
            businessId: business.id,
            name: String(row.name).trim(),
            role: typeof row.role === "string" ? row.role.trim() || null : null,
            bio: typeof row.bio === "string" ? row.bio.trim() || null : null,
            photoUrl: typeof row.photoUrl === "string" ? row.photoUrl.trim() || null : null,
            yearsExperience: typeof row.yearsExperience === "number" ? Math.trunc(row.yearsExperience) : null,
            credentials: Array.isArray(row.credentials)
              ? JSON.stringify(row.credentials.map(String).slice(0, 6))
              : null,
            sortOrder: index,
            source: "MANUAL",
          })),
        });
      }

      await recordWrite(ctx, {
        action: "update",
        entityType: "business",
        entityId: business.id,
        summary: `${business.name}: team set to ${people.length} people`,
        paths: [routes.business(business.slug)],
      });
      return { business: business.name, staff: people.length };
    },
  },

  /* ------------------------------------------------------------------ leads */

  {
    name: "list_leads",
    title: "Read quote requests",
    description:
      "Enquiries sent through the site, newest first. Staff see them in full, including for companies whose own dashboard has the contact details masked.",
    schema: object({
      idOrSlug: str("Limit to one company."),
      status: str("NEW, VIEWED, CONTACTED, QUOTED, WON, LOST or SPAM."),
      sinceDays: int("Only enquiries from the last this many days."),
      limit: int("Default 25."),
    }),
    handler: async (args) => {
      const business = args.idOrSlug ? await findBusiness(reqStr(args, "idOrSlug")) : null;
      const sinceDays = typeof args.sinceDays === "number" ? args.sinceDays : 0;

      const rows = await db.lead.findMany({
        where: {
          ...(business ? { businessId: business.id } : {}),
          ...(args.status ? { status: oneOf(String(args.status), LEAD_STATUSES, "status") } : {}),
          ...(sinceDays > 0 ? { createdAt: { gte: new Date(Date.now() - sinceDays * 86_400_000) } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limitOf(args, 25),
        include: { business: { select: { name: true, slug: true } } },
      });

      return {
        leads: rows.map((row) => ({
          id: row.id,
          business: row.business.name,
          name: row.name,
          email: row.email,
          phone: row.phone,
          jobType: row.jobType,
          urgency: row.urgency,
          message: row.message,
          status: row.status,
          receivedAt: fullDate(row.createdAt),
          // Whether the company could read the contact details when it landed,
          // which is what the upgrade conversation turns on.
          detailsVisibleToOwner: row.unlocked,
          emailed: Boolean(row.emailedAt),
          emailError: row.emailError,
        })),
      };
    },
  },

  {
    name: "set_lead_status",
    title: "Move a lead along",
    write: true,
    description: "Sets where a quote request has got to.",
    schema: object(
      {
        id: str("The lead id, from list_leads."),
        status: str("NEW, VIEWED, CONTACTED, QUOTED, WON, LOST or SPAM."),
        notes: str("Replaces the note held against it."),
      },
      ["id", "status"],
    ),
    handler: async (args, ctx) => {
      const id = reqStr(args, "id");
      const status = oneOf(reqStr(args, "status"), LEAD_STATUSES, "status");

      const lead = await db.lead.update({
        where: { id },
        data: { status, ...(args.notes !== undefined ? { notes: String(args.notes) || null } : {}) },
        include: { business: { select: { name: true } } },
      });

      await recordWrite(ctx, {
        action: "update",
        entityType: "lead",
        entityId: id,
        summary: `${lead.name} (${lead.business.name}) → ${status.toLowerCase()}`,
        paths: [],
      });
      return { id, status, business: lead.business.name };
    },
  },

  {
    name: "resend_lead_email",
    title: "Send a lead notification again",
    write: true,
    description:
      "Emails a quote request to the company again. Used when the first send failed, usually because the sending domain was not verified yet.",
    schema: object({ id: str("The lead id, from list_leads.") }, ["id"]),
    handler: async (args, ctx) => {
      const { notifyBusiness } = await import("../leads");
      const id = reqStr(args, "id");

      const before = await db.lead.findUnique({ where: { id }, select: { id: true } });
      if (!before) throw new ToolError(`No lead matches ${id}.`);

      await notifyBusiness(id);
      const after = await db.lead.findUnique({
        where: { id },
        select: { emailedAt: true, emailError: true },
      });
      if (after?.emailError) throw new ToolError(after.emailError);

      await recordWrite(ctx, {
        action: "update",
        entityType: "lead",
        entityId: id,
        summary: "notification resent",
        paths: [],
      });
      return { id, sentAt: after?.emailedAt ? fullDate(after.emailedAt) : null };
    },
  },

  /* ------------------------------------------------------------- people */

  {
    name: "list_people",
    title: "List the editorial team",
    description: "Authors, reviewers and subject experts, with what each is allowed to sign.",
    schema: object({ limit: int("Default 50.") }),
    handler: async (args) => {
      const rows = await db.person.findMany({ orderBy: { name: "asc" }, take: limitOf(args, 50) });
      return {
        people: rows.map((row) => ({
          id: row.id,
          name: row.name,
          role: row.role,
          url: routes.expert(row.slug),
          isAuthor: row.isAuthor,
          isReviewer: row.isReviewer,
          isExpert: row.isExpert,
          published: row.published,
          specializations: parseList(row.specializations),
        })),
      };
    },
  },

  {
    name: "upsert_person",
    title: "Create or update a person",
    description: "An author, reviewer or expert. The limits field is the explicit statement of what they do not cover.",
    write: true,
    schema: object(
      {
        id: str("Omit to create."),
        name: str("Their name."),
        slug: str("URL slug."),
        role: str("For example Senior editor, home services."),
        bio: str("Biography."),
        limits: str("What this person does not cover. Published as written."),
        portrait: str("Image URL."),
        email: str("Contact address."),
        yearsExperience: int("Years in the field."),
        specializations: arr("Areas they cover."),
        markets: arr("Cities or regions they know."),
        links: arr("Profile links.", {
          type: "object",
          additionalProperties: false,
          required: ["label", "url"],
          properties: { label: { type: "string" }, url: { type: "string" } },
        }),
        isAuthor: bool("May be credited as an author."),
        isReviewer: bool("May be credited as a reviewer."),
        isExpert: bool("Shown as a subject expert."),
        published: bool("Visible on the site."),
      },
      [],
    ),
    handler: async (args, ctx) => {
      const id = optStr(args, "id");
      const data = patch(args, {
        name: "string",
        role: "string",
        bio: "string",
        limits: "string",
        portrait: "string",
        email: "string",
        yearsExperience: "int",
        specializations: "json",
        markets: "json",
        links: "json",
        isAuthor: "bool",
        isReviewer: "bool",
        isExpert: "bool",
        published: "bool",
      });

      if (!id) {
        const name = reqStr(args, "name");
        const person = await db.person.create({
          data: {
            name,
            slug: slugify(optStr(args, "slug") ?? name),
            role: optStr(args, "role") ?? "Contributor",
            ...data,
          },
        });
        await recordWrite(ctx, {
          action: "create",
          entityType: "person",
          entityId: person.id,
          summary: person.name,
          paths: ["/", routes.expertsIndex(), routes.expert(person.slug)],
        });
        return { id: person.id, url: routes.expert(person.slug) };
      }

      const existing = await db.person.findFirst({ where: { OR: [{ id }, { slug: id }] } });
      if (!existing) throw new ToolError("No person matches that id.");
      const slug = args.slug !== undefined ? slugify(String(args.slug)) : existing.slug;
      const person = await db.person.update({ where: { id: existing.id }, data: { ...data, slug } });
      if (slug !== existing.slug) await recordMove(routes.expert(existing.slug), routes.expert(person.slug));

      await recordWrite(ctx, {
        action: "update",
        entityType: "person",
        entityId: person.id,
        summary: person.name,
        paths: ["/", routes.expertsIndex(), routes.expert(person.slug)],
      });
      return { id: person.id, url: routes.expert(person.slug) };
    },
  },

  /* ------------------------------------------------------------ inboxes */

  {
    name: "list_inbox",
    title: "List claims and corrections",
    description:
      "Business owners claiming a listing, and readers reporting something wrong. Both need a human decision.",
    schema: object({
      kind: str("claims or submissions. Both if omitted."),
      status: str("Filter by status."),
      limit: int("Default 25."),
    }),
    handler: async (args) => {
      const kind = String(args.kind ?? "").toLowerCase();
      const take = limitOf(args, 25);
      const status = optStr(args, "status");

      return {
        ...(kind !== "submissions"
          ? {
              claims: (
                await db.claimRequest.findMany({
                  where: status ? { status: status.toUpperCase() } : {},
                  orderBy: { submittedAt: "desc" },
                  take,
                  include: { business: true },
                })
              ).map((row) => ({
                id: row.id,
                business: row.business?.name ?? row.businessName,
                businessId: row.businessId,
                owner: row.ownerName,
                email: row.ownerEmail,
                method: row.verificationMethod,
                status: row.status,
                submitted: fullDate(row.submittedAt),
              })),
            }
          : {}),
        ...(kind !== "claims"
          ? {
              submissions: (
                await db.submission.findMany({
                  where: status ? { status: status.toUpperCase() } : {},
                  orderBy: { createdAt: "desc" },
                  take,
                })
              ).map((row) => ({
                id: row.id,
                kind: row.kind,
                subject: row.subject,
                email: row.email,
                status: row.status,
                received: fullDate(row.createdAt),
              })),
            }
          : {}),
      };
    },
  },

  {
    name: "resolve_inbox_item",
    title: "Decide a claim or a correction",
    description:
      "Approving a claim marks the business claimed. A correction is moved through IN_REVIEW to RESOLVED or CLOSED.",
    write: true,
    schema: object(
      {
        kind: str("claim or submission."),
        id: str("The id."),
        status: str("Claims: SUBMITTED, VERIFYING, APPROVED or REJECTED. Submissions: NEW, IN_REVIEW, RESOLVED or CLOSED."),
        note: str("Internal note recorded with the decision."),
      },
      ["kind", "id", "status"],
    ),
    handler: async (args, ctx) => {
      const kind = reqStr(args, "kind").toLowerCase();
      const id = reqStr(args, "id");
      const note = optStr(args, "note");

      if (kind === "claim") {
        const status = oneOf(reqStr(args, "status"), ["SUBMITTED", "VERIFYING", "APPROVED", "REJECTED"], "status");
        const claim = await db.claimRequest.findUnique({ where: { id } });
        if (!claim) throw new ToolError("No claim matches that id.");

        await db.claimRequest.update({
          where: { id },
          data: { status, ...(note ? { notes: note } : {}), reviewedAt: new Date() },
        });
        if (status === "APPROVED" && claim.businessId) {
          await db.business.update({ where: { id: claim.businessId }, data: { claimed: true } });
        }
        await recordWrite(ctx, {
          action: "update",
          entityType: "claim",
          entityId: id,
          summary: `${claim.businessName} claim ${status.toLowerCase()}`,
        });
        return { id, status };
      }

      if (kind === "submission") {
        const status = oneOf(reqStr(args, "status"), ["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"], "status");
        const submission = await db.submission.findUnique({ where: { id } });
        if (!submission) throw new ToolError("No submission matches that id.");

        await db.submission.update({
          where: { id },
          data: {
            status,
            ...(note ? { message: `${submission.message ?? ""}\n\nEditor note: ${note}`.trim() } : {}),
            resolvedAt: status === "RESOLVED" ? new Date() : null,
          },
        });
        await recordWrite(ctx, {
          action: "update",
          entityType: "submission",
          entityId: id,
          summary: `${submission.subject} ${status.toLowerCase()}`,
        });
        return { id, status };
      }

      throw new ToolError("kind must be claim or submission.");
    },
  },
];
