import { db } from "../db";
import { stripeConfigured } from "../stripe";
import { fullDate } from "../format";
import { parseList } from "../json";
import {
  arr,
  bool,
  int,
  limitOf,
  object,
  oneOf,
  optInt,
  optStr,
  patch,
  recordWrite,
  reqStr,
  str,
  ToolError,
  type Tool,
} from "./kit";

// Packages, subscriptions and sponsored inventory. Prices are set here; taking
// money still happens through Stripe, so a plan without Stripe configured is
// recorded but cannot be checked out.

export const COMMERCE_TOOLS: Tool[] = [
  {
    name: "list_commerce",
    title: "List packages, subscriptions and sponsorships",
    description: "What is for sale, who is paying, and which sponsored slots are filled.",
    schema: object({ kind: str("plans, subscriptions or placements. All if omitted."), limit: int("Default 25.") }),
    handler: async (args) => {
      const kind = String(args.kind ?? "").toLowerCase();
      const take = limitOf(args, 25);

      return {
        stripeConfigured: stripeConfigured(),
        ...(!kind || kind === "plans"
          ? {
              plans: (await db.plan.findMany({ orderBy: { sortOrder: "asc" } })).map((row) => ({
                id: row.id,
                key: row.key,
                name: row.name,
                price: row.interval === "quote" ? "on application" : `${(row.priceCents / 100).toFixed(2)} ${row.currency}`,
                interval: row.interval,
                active: row.active,
                editorial: row.editorial,
                features: parseList(row.features),
              })),
            }
          : {}),
        ...(!kind || kind === "subscriptions"
          ? {
              subscriptions: (
                await db.subscription.findMany({
                  orderBy: { createdAt: "desc" },
                  take,
                  include: { business: true, plan: true },
                })
              ).map((row) => ({
                id: row.id,
                business: row.business.name,
                plan: row.plan.name,
                status: row.status,
                quantity: row.quantity,
                endsAtPeriodEnd: row.cancelAtPeriodEnd,
                started: fullDate(row.createdAt),
              })),
            }
          : {}),
        ...(!kind || kind === "placements"
          ? {
              placements: (
                await db.sponsoredPlacement.findMany({
                  orderBy: { startsAt: "desc" },
                  take,
                  include: { business: true, city: true, category: true },
                })
              ).map((row) => ({
                id: row.id,
                business: row.business.name,
                kind: row.kind,
                label: row.label,
                where: [row.city?.name, row.category?.name].filter(Boolean).join(" / ") || "site-wide",
                status: row.status,
                starts: fullDate(row.startsAt),
                impressions: row.impressions,
                clicks: row.clicks,
              })),
            }
          : {}),
      };
    },
  },

  {
    name: "upsert_plan",
    title: "Create or update a package",
    description:
      "A package someone can buy. Changing a price creates a new Stripe price when Stripe is configured; existing subscribers keep the price they signed up at.",
    write: true,
    admin: true,
    schema: object(
      {
        id: str("Omit to create."),
        key: str("claim, listing, top10 or advertising."),
        name: str("What it is called on the pricing page."),
        blurb: str("One line."),
        priceCents: int("Price in cents. Ignored when the interval is quote."),
        currency: str("Three-letter code, for example USD."),
        interval: str("month, year, once or quote."),
        unitLabel: str("What one unit is, for example per city."),
        features: arr("Bullet points on the pricing card."),
        editorial: bool("Whether buying it touches editorial. Almost always false."),
        active: bool("Offered for sale."),
        sortOrder: int("Order on the pricing page."),
      },
      [],
    ),
    handler: async (args, ctx) => {
      const id = optStr(args, "id");
      const data = patch(args, {
        name: "string",
        blurb: "string",
        priceCents: "int",
        currency: "string",
        unitLabel: "string",
        editorial: "bool",
        active: "bool",
        sortOrder: "int",
        features: "json",
      });
      if (args.interval !== undefined) {
        data.interval = oneOf(String(args.interval), ["MONTH", "YEAR", "ONCE", "QUOTE"], "interval").toLowerCase();
      }

      if (!id) {
        const key = oneOf(reqStr(args, "key"), ["CLAIM", "LISTING", "TOP10", "ADVERTISING"], "key").toLowerCase();
        if (await db.plan.findUnique({ where: { key } })) {
          throw new ToolError(`A package already uses the key ${key}. Pass its id to edit it.`);
        }
        const plan = await db.plan.create({
          data: {
            key,
            name: reqStr(args, "name"),
            priceCents: optInt(args, "priceCents") ?? 0,
            interval: (data.interval as string) ?? "month",
            ...data,
          },
        });
        await recordWrite(ctx, {
          action: "create",
          entityType: "plan",
          entityId: plan.id,
          summary: `package ${plan.name}`,
          paths: ["/", "/advertise/"],
        });
        return { id: plan.id, name: plan.name, stripeConfigured: stripeConfigured() };
      }

      const plan = await db.plan.update({ where: { id }, data });
      await recordWrite(ctx, {
        action: "update",
        entityType: "plan",
        entityId: plan.id,
        summary: `package ${plan.name}`,
        paths: ["/", "/advertise/"],
      });
      return { id: plan.id, name: plan.name, stripeConfigured: stripeConfigured() };
    },
  },

  {
    name: "upsert_placement",
    title: "Create or update a sponsored placement",
    description:
      "Paid, labelled inventory. A featured partner slot for one city and service can only be sold once at a time, and this refuses to double-sell it.",
    write: true,
    admin: true,
    schema: object(
      {
        id: str("Omit to create."),
        businessId: str("Who bought it."),
        kind: str("FEATURED_PARTNER, CATEGORY_SPONSOR or CITY_SPONSOR."),
        label: str("The label shown to readers, for example Sponsored."),
        cityId: str("Limit it to one city."),
        categoryId: str("Limit it to one service."),
        startsAt: str("ISO date."),
        endsAt: str("ISO date."),
        status: str("PENDING, ACTIVE, PAUSED or ENDED."),
      },
      [],
    ),
    handler: async (args, ctx) => {
      const id = optStr(args, "id");
      const data = patch(args, { businessId: "string", label: "string", cityId: "string", categoryId: "string" });
      if (args.kind !== undefined) {
        data.kind = oneOf(String(args.kind), ["FEATURED_PARTNER", "CATEGORY_SPONSOR", "CITY_SPONSOR"], "kind");
      }
      if (args.status !== undefined) {
        data.status = oneOf(String(args.status), ["PENDING", "ACTIVE", "PAUSED", "ENDED"], "status");
      }
      for (const field of ["startsAt", "endsAt"] as const) {
        if (args[field] === undefined) continue;
        const when = new Date(String(args[field]));
        if (Number.isNaN(when.getTime())) throw new ToolError(`${field} is not a valid date.`);
        data[field] = when;
      }

      const kind = (data.kind as string) ?? "FEATURED_PARTNER";
      const status = (data.status as string) ?? "PENDING";
      const cityId = (data.cityId as string) ?? null;
      const categoryId = (data.categoryId as string) ?? null;

      // One slot, one buyer. Selling the same featured position twice is the
      // failure that would quietly undermine the disclosure the site makes.
      if (kind === "FEATURED_PARTNER" && status === "ACTIVE") {
        const clash = await db.sponsoredPlacement.findFirst({
          where: {
            kind: "FEATURED_PARTNER",
            status: "ACTIVE",
            cityId,
            categoryId,
            ...(id ? { id: { not: id } } : {}),
          },
          include: { business: true },
        });
        if (clash) {
          throw new ToolError(
            `That featured slot is already sold to ${clash.business.name}. Pause theirs before selling it again.`,
          );
        }
      }

      if (!id) {
        const businessId = reqStr(args, "businessId");
        if (!(await db.business.findUnique({ where: { id: businessId } }))) {
          throw new ToolError("That business id does not exist.");
        }
        const placement = await db.sponsoredPlacement.create({
          data: {
            businessId,
            kind,
            status,
            label: optStr(args, "label") ?? "Sponsored",
            startsAt: (data.startsAt as Date) ?? new Date(),
            cityId,
            categoryId,
            ...(data.endsAt ? { endsAt: data.endsAt as Date } : {}),
          },
        });
        await recordWrite(ctx, {
          action: "create",
          entityType: "placement",
          entityId: placement.id,
          summary: `${kind} ${status.toLowerCase()}`,
        });
        return { id: placement.id, kind, status };
      }

      const placement = await db.sponsoredPlacement.update({ where: { id }, data });
      await recordWrite(ctx, {
        action: "update",
        entityType: "placement",
        entityId: placement.id,
        summary: `${placement.kind} ${placement.status.toLowerCase()}`,
      });
      return { id: placement.id, kind: placement.kind, status: placement.status };
    },
  },
];
