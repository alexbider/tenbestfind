import { db } from "../db";
import { recordMove } from "../redirects";
import { slugify } from "../format";
import { routes } from "../urls";
import {
  arr,
  bool,
  int,
  object,
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

// Services and their subservices, and the country, region and city tree the
// whole URL model hangs off. Renaming anything here moves published URLs, so
// every rename leaves a redirect behind.

export const TAXONOMY_TOOLS: Tool[] = [
  {
    name: "upsert_category",
    title: "Create or update a service",
    description:
      "A service and its subservices. Subservices are matched on slug, so an existing one keeps its id and the businesses attached to it.",
    write: true,
    schema: object(
      {
        id: str("Omit to create."),
        name: str("Plural, as it appears in navigation. For example Plumbers."),
        singular: str("For example Plumber."),
        serviceName: str("The trade, used in searches and titles. For example Plumbing."),
        slug: str("URL slug."),
        description: str("What this service covers."),
        iconKey: str("Icon name from the design system."),
        navOrder: int("Order in the navigation."),
        sortOrder: int("Order in listings."),
        featured: bool("Featured on the services index."),
        trending: bool("Marked as trending."),
        wide: bool("Takes a wide card in the grid."),
        published: bool("Visible on the site."),
        subservices: arr("Replaces the list. Existing entries are matched on slug.", {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            trending: { type: "boolean" },
          },
        }),
      },
      [],
    ),
    handler: async (args, ctx) => {
      const id = optStr(args, "id");
      const data = patch(args, {
        name: "string",
        singular: "string",
        serviceName: "string",
        description: "string",
        iconKey: "string",
        navOrder: "int",
        sortOrder: "int",
        featured: "bool",
        trending: "bool",
        wide: "bool",
        published: "bool",
      });

      let category;
      if (!id) {
        const name = reqStr(args, "name");
        const slug = slugify(optStr(args, "slug") ?? name);
        if (await db.category.findUnique({ where: { slug } })) {
          throw new ToolError(`A service already uses the slug ${slug}.`);
        }
        category = await db.category.create({
          data: {
            name,
            slug,
            singular: optStr(args, "singular") ?? name.replace(/s$/, ""),
            serviceName: optStr(args, "serviceName") ?? name,
            ...data,
          },
        });
      } else {
        const existing = await db.category.findFirst({ where: { OR: [{ id }, { slug: id }] } });
        if (!existing) throw new ToolError("No service matches that id.");
        const slug = args.slug !== undefined ? slugify(String(args.slug)) : existing.slug;
        if (slug !== existing.slug && (await db.category.findUnique({ where: { slug } }))) {
          throw new ToolError(`A service already uses the slug ${slug}.`);
        }
        category = await db.category.update({ where: { id: existing.id }, data: { ...data, slug } });
        await recordMove(routes.category(existing.slug), routes.category(category.slug));
      }

      const rows = optRows(args, "subservices");
      if (rows) {
        const existing = await db.subservice.findMany({ where: { categoryId: category.id } });
        const keep: string[] = [];

        for (const [index, row] of rows.entries()) {
          const name = String(row.name ?? "").trim();
          if (!name) throw new ToolError("Every subservice needs a name.");
          const slug = slugify(row.slug ? String(row.slug) : name);
          const match = existing.find((entry) => entry.slug === slug);

          const payload = {
            name,
            slug,
            description: row.description ? String(row.description) : null,
            trending: row.trending === true,
            sortOrder: index,
            categoryId: category.id,
          };

          if (match) {
            await db.subservice.update({ where: { id: match.id }, data: payload });
            keep.push(match.id);
          } else {
            const created = await db.subservice.create({ data: payload });
            keep.push(created.id);
          }
        }

        await db.subservice.deleteMany({
          where: { categoryId: category.id, id: { notIn: keep.length > 0 ? keep : ["none"] } },
        });
      }

      await recordWrite(ctx, {
        action: id ? "update" : "create",
        entityType: "category",
        entityId: category.id,
        summary: `service ${category.name}`,
        paths: ["/", routes.servicesIndex(), routes.category(category.slug)],
      });
      return { id: category.id, slug: category.slug, url: routes.category(category.slug) };
    },
  },

  {
    name: "upsert_location",
    title: "Create or update a country, region or city",
    description:
      "The location tree. A city needs a regionId, a region needs a countryId. Renaming a slug moves the hub and everything under it, and leaves redirects.",
    write: true,
    schema: object(
      {
        kind: str("country, region or city."),
        id: str("Omit to create."),
        name: str("The display name."),
        slug: str("URL slug."),
        code: str("Country: the two-letter code such as us. Region: the state or province code such as tx."),
        parentId: str("Region: the country id. City: the region id."),
        blurb: str("Short description shown on the hub."),
        heroImage: str("Image URL."),
        currency: str("Country only, for example USD."),
        regionLabel: str("Country only, what a region is called there. For example State or Province."),
        topMetro: bool("City only. Featured as a major metro."),
        sortOrder: int("Order in listings."),
        published: bool("Visible on the site."),
      },
      ["kind"],
    ),
    handler: async (args, ctx) => {
      const kind = reqStr(args, "kind").toLowerCase();
      const id = optStr(args, "id");

      if (kind === "country") {
        const data = patch(args, {
          name: "string",
          blurb: "string",
          heroImage: "string",
          currency: "string",
          regionLabel: "string",
          sortOrder: "int",
          published: "bool",
        });
        if (args.code !== undefined) data.code = String(args.code).toLowerCase();

        if (!id) {
          const name = reqStr(args, "name");
          const code = String(args.code ?? "").toLowerCase();
          if (!code) throw new ToolError("A country needs a code, for example us.");
          const row = await db.country.create({
            data: { name, code, slug: slugify(optStr(args, "slug") ?? name), ...data },
          });
          await recordWrite(ctx, { action: "create", entityType: "country", entityId: row.id, summary: row.name });
          return { id: row.id, url: routes.country(row.code) };
        }
        const existing = await db.country.findUnique({ where: { id } });
        if (!existing) throw new ToolError("No country matches that id.");
        const row = await db.country.update({ where: { id }, data });
        await recordMove(routes.country(existing.code), routes.country(row.code));
        await recordWrite(ctx, { action: "update", entityType: "country", entityId: row.id, summary: row.name });
        return { id: row.id, url: routes.country(row.code) };
      }

      if (kind === "region") {
        const data = patch(args, {
          name: "string",
          blurb: "string",
          heroImage: "string",
          sortOrder: "int",
          published: "bool",
        });
        if (args.code !== undefined) data.code = String(args.code).toLowerCase();

        if (!id) {
          const countryId = reqStr(args, "parentId");
          const country = await db.country.findUnique({ where: { id: countryId } });
          if (!country) throw new ToolError("That country id does not exist.");
          const name = reqStr(args, "name");
          const row = await db.region.create({
            data: {
              name,
              code: String(args.code ?? slugify(name)).toLowerCase(),
              slug: slugify(optStr(args, "slug") ?? name),
              countryId,
              ...data,
            },
          });
          await recordWrite(ctx, { action: "create", entityType: "region", entityId: row.id, summary: row.name });
          return { id: row.id, url: routes.region(country.code, row.slug) };
        }

        const existing = await db.region.findUnique({ where: { id }, include: { country: true } });
        if (!existing) throw new ToolError("No region matches that id.");
        const slug = args.slug !== undefined ? slugify(String(args.slug)) : existing.slug;
        const row = await db.region.update({ where: { id }, data: { ...data, slug } });
        await recordMove(
          routes.region(existing.country.code, existing.slug),
          routes.region(existing.country.code, row.slug),
        );
        await recordWrite(ctx, { action: "update", entityType: "region", entityId: row.id, summary: row.name });
        return { id: row.id, url: routes.region(existing.country.code, row.slug) };
      }

      if (kind === "city") {
        const data = patch(args, {
          name: "string",
          blurb: "string",
          heroImage: "string",
          topMetro: "bool",
          sortOrder: "int",
          published: "bool",
        });

        if (!id) {
          const regionId = reqStr(args, "parentId");
          const region = await db.region.findUnique({ where: { id: regionId }, include: { country: true } });
          if (!region) throw new ToolError("That region id does not exist.");
          const name = reqStr(args, "name");
          const row = await db.city.create({
            data: { name, slug: slugify(optStr(args, "slug") ?? name), regionId, ...data },
          });
          await recordWrite(ctx, { action: "create", entityType: "city", entityId: row.id, summary: row.name });
          return { id: row.id, url: routes.city(region.country.code, region.slug, row.slug) };
        }

        const existing = await db.city.findUnique({
          where: { id },
          include: { region: { include: { country: true } } },
        });
        if (!existing) throw new ToolError("No city matches that id.");
        const slug = args.slug !== undefined ? slugify(String(args.slug)) : existing.slug;
        const row = await db.city.update({ where: { id }, data: { ...data, slug } });
        const code = existing.region.country.code;
        await recordMove(
          routes.city(code, existing.region.slug, existing.slug),
          routes.city(code, existing.region.slug, row.slug),
        );
        await recordWrite(ctx, { action: "update", entityType: "city", entityId: row.id, summary: row.name });
        return { id: row.id, url: routes.city(code, existing.region.slug, row.slug) };
      }

      throw new ToolError("kind must be country, region or city.");
    },
  },

  {
    name: "delete_taxonomy",
    title: "Delete a service or location",
    description:
      "Refuses while published content still hangs off it, and tells you what. Unpublishing is usually the better move.",
    write: true,
    admin: true,
    destructive: true,
    schema: object(
      {
        kind: str("category, country, region or city."),
        id: str("The id."),
        confirm: bool("Must be true."),
      },
      ["kind", "id", "confirm"],
    ),
    handler: async (args, ctx) => {
      if (optBool(args, "confirm") !== true) throw new ToolError("Pass confirm: true to delete.");
      const kind = reqStr(args, "kind").toLowerCase();
      const id = reqStr(args, "id");

      if (kind === "category") {
        const [businesses, rankings] = await Promise.all([
          db.business.count({ where: { categoryId: id } }),
          db.ranking.count({ where: { categoryId: id } }),
        ]);
        if (businesses + rankings > 0) {
          throw new ToolError(
            `That service still has ${businesses} businesses and ${rankings} rankings. Unpublish it instead, or move them first.`,
          );
        }
        const row = await db.category.findUnique({ where: { id } });
        if (!row) throw new ToolError("No service matches that id.");
        await db.category.delete({ where: { id } });
        await recordWrite(ctx, { action: "delete", entityType: "category", entityId: id, summary: row.name });
        return { deleted: "category", name: row.name };
      }

      if (kind === "city") {
        const [businesses, rankings] = await Promise.all([
          db.business.count({ where: { cityId: id } }),
          db.ranking.count({ where: { cityId: id } }),
        ]);
        if (businesses + rankings > 0) {
          throw new ToolError(
            `That city still has ${businesses} businesses and ${rankings} rankings. Unpublish it instead.`,
          );
        }
        const row = await db.city.findUnique({ where: { id } });
        if (!row) throw new ToolError("No city matches that id.");
        await db.city.delete({ where: { id } });
        await recordWrite(ctx, { action: "delete", entityType: "city", entityId: id, summary: row.name });
        return { deleted: "city", name: row.name };
      }

      if (kind === "region") {
        const cities = await db.city.count({ where: { regionId: id } });
        if (cities > 0) throw new ToolError(`That region still holds ${cities} cities.`);
        const row = await db.region.findUnique({ where: { id } });
        if (!row) throw new ToolError("No region matches that id.");
        await db.region.delete({ where: { id } });
        await recordWrite(ctx, { action: "delete", entityType: "region", entityId: id, summary: row.name });
        return { deleted: "region", name: row.name };
      }

      if (kind === "country") {
        const regions = await db.region.count({ where: { countryId: id } });
        if (regions > 0) throw new ToolError(`That country still holds ${regions} regions.`);
        const row = await db.country.findUnique({ where: { id } });
        if (!row) throw new ToolError("No country matches that id.");
        await db.country.delete({ where: { id } });
        await recordWrite(ctx, { action: "delete", entityType: "country", entityId: id, summary: row.name });
        return { deleted: "country", name: row.name };
      }

      throw new ToolError("kind must be category, country, region or city.");
    },
  },
];
