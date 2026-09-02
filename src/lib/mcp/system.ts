import { db } from "../db";
import { analyzeSeo } from "../seo";
import { SEO_FIELDS, AI_BOTS } from "../seo-settings";
import { putSecret, SECRET_KEYS, secretStatus, type SecretKey } from "../secrets";
import { recordMove } from "../redirects";
import { fullDate } from "../format";
import { parseJson } from "../json";
import {
  arr,
  bool,
  int,
  limitOf,
  object,
  oneOf,
  optBool,
  optStr,
  recordWrite,
  reqStr,
  str,
  ToolError,
  type Tool,
} from "./kit";

// Settings, global SEO, redirects, media, users, the audit log and analytics.
// The rule throughout: a secret can be replaced but never read back.

const SEO_ENTITIES = [
  "page",
  "post",
  "ranking",
  "guide",
  "business",
  "category",
  "city",
  "region",
  "country",
  "person",
] as const;

export const SYSTEM_TOOLS: Tool[] = [
  {
    name: "get_settings",
    title: "Read the settings",
    description:
      "Platform configuration and the whole global SEO configuration, including the AI crawler rules. Secrets are reported as set or unset, never returned.",
    schema: object({ group: str("general, editorial, billing, analytics, or seo. All if omitted.") }),
    handler: async (args) => {
      const group = optStr(args, "group")?.toLowerCase();
      const wantSeo = !group || group === "seo";

      const rows = await db.setting.findMany({
        where: {
          ...(group && group !== "seo" ? { groupName: group } : {}),
          ...(group === "seo" ? { key: { startsWith: "seo." } } : {}),
        },
        orderBy: [{ groupName: "asc" }, { key: "asc" }],
      });

      const settings = Object.fromEntries(
        rows
          .filter((row) => (group === "seo" ? true : !row.key.startsWith("seo.")))
          .map((row) => [row.key, parseJson<unknown>(row.value, null)]),
      );

      const seo = wantSeo
        ? Object.fromEntries(
            SEO_FIELDS.map((field) => {
              const stored = rows.find((row) => row.key === field.key);
              return [field.key, stored ? parseJson<unknown>(stored.value, field.default) : field.default];
            }),
          )
        : undefined;

      return {
        settings,
        ...(seo ? { globalSeo: seo, aiCrawlers: AI_BOTS.map((bot) => bot.agent) } : {}),
        credentials: (await secretStatus()).map((row) => ({
          key: row.key,
          label: row.label,
          set: row.set,
          endsWith: row.last4,
          fromEnvironment: row.fromEnv,
        })),
      };
    },
  },

  {
    name: "update_settings",
    title: "Change settings",
    description:
      "Write any setting by key, including every global SEO key. Values keep their type: a number stays a number, a switch stays a boolean. Call get_settings first to see the keys.",
    write: true,
    admin: true,
    schema: object(
      {
        values: {
          type: "object",
          additionalProperties: true,
          description:
            "A map of setting key to value, for example { \"seo.searchEngineVisible\": false, \"seo.titleSeparator\": \"|\" }.",
        },
      },
      ["values"],
    ),
    handler: async (args, ctx) => {
      const values = args.values;
      if (!values || typeof values !== "object" || Array.isArray(values)) {
        throw new ToolError("values must be an object of key to value.");
      }

      const entries = Object.entries(values as Record<string, unknown>);
      if (entries.length === 0) throw new ToolError("Pass at least one setting.");

      const written: string[] = [];
      const rejected: string[] = [];

      for (const [key, value] of entries) {
        const seoField = SEO_FIELDS.find((field) => field.key === key);
        const existing = await db.setting.findUnique({ where: { key } });

        if (!seoField && !existing) {
          rejected.push(`${key} is not a known setting`);
          continue;
        }

        // The stored type is the contract. Coercing here means a model that
        // sends "true" for a switch does not quietly write a string.
        let stored: unknown = value;
        const shape: string = seoField?.type ?? typeof parseJson<unknown>(existing!.value, null);
        if (shape === "boolean") {
          stored = value === true || value === "true";
        } else if (shape === "number") {
          const parsed = Number(value);
          if (!Number.isFinite(parsed)) {
            rejected.push(`${key} needs a number`);
            continue;
          }
          stored = parsed;
        } else if (shape === "lines" || shape === "bots") {
          if (!Array.isArray(value)) {
            rejected.push(`${key} needs a list`);
            continue;
          }
          stored = value.map(String);
        }

        await db.setting.upsert({
          where: { key },
          create: {
            key,
            value: JSON.stringify(stored),
            groupName: seoField ? "seo" : "general",
            label: seoField?.label ?? key,
          },
          update: { value: JSON.stringify(stored) },
        });
        written.push(key);
      }

      if (written.length === 0) throw new ToolError(rejected.join("; ") || "Nothing was written.");

      await recordWrite(ctx, {
        action: "update",
        entityType: "settings",
        summary: `${written.length} settings: ${written.join(", ")}`,
      });
      return { written, ...(rejected.length > 0 ? { rejected } : {}) };
    },
  },

  {
    name: "set_credential",
    title: "Set an API key",
    description:
      "Replaces the Apify token or the Anthropic API key. Stored encrypted. There is no tool that reads a key back, by design. Pass an empty value to remove one.",
    write: true,
    admin: true,
    schema: object({ key: str("apify.token or anthropic.apiKey."), value: str("The key. Empty removes it.") }, [
      "key",
      "value",
    ]),
    handler: async (args, ctx) => {
      const key = reqStr(args, "key") as SecretKey;
      if (!Object.values(SECRET_KEYS).includes(key)) {
        throw new ToolError(`key must be one of ${Object.values(SECRET_KEYS).join(", ")}.`);
      }
      const value = String(args.value ?? "");
      await putSecret(key, value);
      await recordWrite(ctx, {
        action: "update",
        entityType: "secret",
        summary: value.trim() ? `${key} replaced` : `${key} removed`,
        paths: [],
      });
      return { key, set: Boolean(value.trim()) };
    },
  },

  {
    name: "update_seo",
    title: "Write an SEO record",
    description:
      "Per-page SEO. Sets the title, description, focus keyword, social fields and robots directives, then re-scores it and reports what still fails.",
    write: true,
    schema: object(
      {
        entityType: str(`One of ${SEO_ENTITIES.join(", ")}.`),
        entityId: str("The entity id."),
        title: str("30 to 60 characters, containing the focus keyword."),
        description: str("120 to 160 characters, containing the focus keyword."),
        focusKeyword: str("The phrase this page should rank for."),
        extraKeywords: arr("Secondary keywords."),
        canonical: str("Canonical URL, when it differs from the page's own."),
        ogImage: str("Social image URL."),
        index: bool("Whether search engines may index it."),
        follow: bool("Whether they may follow its links."),
        contentSample: str("The body text, so the content checks have something to score."),
      },
      ["entityType", "entityId"],
    ),
    handler: async (args, ctx) => {
      const entityType = oneOf(reqStr(args, "entityType"), SEO_ENTITIES.map((v) => v.toUpperCase()), "entityType").toLowerCase();
      const entityId = reqStr(args, "entityId");

      const existing = await db.seoMeta.findUnique({
        where: { entityType_entityId: { entityType, entityId } },
      });

      const title = optStr(args, "title") ?? existing?.title ?? undefined;
      const description = optStr(args, "description") ?? existing?.description ?? undefined;
      const focusKeyword = optStr(args, "focusKeyword") ?? existing?.focusKeyword ?? undefined;
      const ogImage = optStr(args, "ogImage") ?? existing?.ogImage ?? undefined;

      const analysis = analyzeSeo({
        title,
        description,
        focusKeyword,
        slug: entityId,
        content: optStr(args, "contentSample") ?? description,
        hasImage: Boolean(ogImage),
        internalLinks: 3,
      });

      const payload = {
        title: title ?? null,
        description: description ?? null,
        focusKeyword: focusKeyword ?? null,
        extraKeywords: Array.isArray(args.extraKeywords)
          ? JSON.stringify((args.extraKeywords as unknown[]).map(String))
          : (existing?.extraKeywords ?? null),
        canonical: optStr(args, "canonical") ?? existing?.canonical ?? null,
        ogImage: ogImage ?? null,
        robotsIndex: optBool(args, "index") ?? existing?.robotsIndex ?? true,
        robotsFollow: optBool(args, "follow") ?? existing?.robotsFollow ?? true,
        score: analysis.score,
        analysis: JSON.stringify(analysis.checks),
      };

      await db.seoMeta.upsert({
        where: { entityType_entityId: { entityType, entityId } },
        create: { entityType, entityId, ...payload },
        update: payload,
      });

      await recordWrite(ctx, {
        action: existing ? "update" : "create",
        entityType: "seo",
        entityId,
        summary: `${entityType} scored ${analysis.score}`,
      });

      return {
        score: analysis.score,
        failing: analysis.checks
          .filter((check) => check.status !== "good")
          .map((check) => ({ check: check.label, hint: check.hint })),
      };
    },
  },

  {
    name: "list_redirects",
    title: "List redirects",
    description: "The redirect table, busiest first.",
    schema: object({ limit: int("Default 50.") }),
    handler: async (args) => {
      const rows = await db.redirect.findMany({ orderBy: { hits: "desc" }, take: limitOf(args, 50) });
      return {
        redirects: rows.map((row) => ({
          id: row.id,
          from: row.source,
          to: row.target,
          code: row.code,
          hits: row.hits,
          enabled: row.enabled,
          created: fullDate(row.createdAt),
        })),
      };
    },
  },

  {
    name: "create_redirect",
    title: "Add a redirect",
    description:
      "Points an old path at a new one. A permanent redirect is served as 308 and a temporary one as 307, which is what Next.js emits.",
    write: true,
    schema: object({ from: str("The old path."), to: str("Where it should go."), permanent: bool("Default true.") }, [
      "from",
      "to",
    ]),
    handler: async (args, ctx) => {
      const from = reqStr(args, "from");
      const to = reqStr(args, "to");
      if (!from.startsWith("/") || !to.startsWith("/")) throw new ToolError("Both paths must start with a slash.");
      if (from === to) throw new ToolError("A redirect cannot point at itself.");

      await recordMove(from, to);
      if (optBool(args, "permanent") === false) {
        await db.redirect.update({ where: { source: from }, data: { code: 302 } });
      }
      await recordWrite(ctx, { action: "create", entityType: "redirect", summary: `${from} -> ${to}` });
      return { from, to, permanent: optBool(args, "permanent") !== false };
    },
  },

  {
    name: "delete_redirect",
    title: "Remove a redirect",
    write: true,
    destructive: true,
    description: "Deletes one redirect. Anything still linking to the old address will start returning 404.",
    schema: object({ from: str("The source path.") }, ["from"]),
    handler: async (args, ctx) => {
      const from = reqStr(args, "from");
      const row = await db.redirect.findUnique({ where: { source: from } });
      if (!row) throw new ToolError(`No redirect starts at ${from}.`);
      await db.redirect.delete({ where: { id: row.id } });
      await recordWrite(ctx, { action: "delete", entityType: "redirect", summary: `${row.source} -> ${row.target}` });
      return { deleted: from, hadHits: row.hits };
    },
  },

  {
    name: "list_users",
    title: "List staff accounts",
    description: "Who can sign in and what they can do. Passwords are never returned or settable through this server.",
    admin: true,
    schema: object({}),
    handler: async () => {
      const rows = await db.user.findMany({ orderBy: { createdAt: "asc" } });
      return {
        users: rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          active: row.active,
          lastLogin: row.lastLoginAt ? fullDate(row.lastLoginAt) : "never",
        })),
      };
    },
  },

  {
    name: "set_user_access",
    title: "Change a person's role or access",
    description:
      "Changes a role or deactivates an account. Creating accounts and setting passwords are deliberately left out: a password should not travel through a model's context.",
    write: true,
    admin: true,
    schema: object(
      { id: str("The user id."), role: str("ADMIN, EDITOR or BUSINESS_OWNER."), active: bool("Whether they can sign in.") },
      ["id"],
    ),
    handler: async (args, ctx) => {
      const id = reqStr(args, "id");
      const user = await db.user.findUnique({ where: { id } });
      if (!user) throw new ToolError("No account matches that id.");

      const role = args.role ? oneOf(String(args.role), ["ADMIN", "EDITOR", "BUSINESS_OWNER"], "role") : undefined;
      const active = optBool(args, "active");
      if (role === undefined && active === undefined) throw new ToolError("Pass a role or an active flag.");

      // The account that authorised this connection cannot use it to lock
      // itself out, which would leave the console with no way back in.
      if (id === ctx.user.id && (role !== undefined && role !== "ADMIN")) {
        throw new ToolError("You cannot remove your own admin access.");
      }
      if (id === ctx.user.id && active === false) {
        throw new ToolError("You cannot deactivate the account this connection is using.");
      }
      if (active === false || (role !== undefined && role !== "ADMIN")) {
        const admins = await db.user.count({ where: { role: "ADMIN", active: true, id: { not: id } } });
        if (admins === 0) throw new ToolError("That would leave the site with no active administrator.");
      }

      await db.user.update({ where: { id }, data: { ...(role ? { role } : {}), ...(active !== undefined ? { active } : {}) } });
      await recordWrite(ctx, {
        action: "update",
        entityType: "user",
        entityId: id,
        summary: `${user.email}: ${role ?? user.role}${active === false ? ", deactivated" : ""}`,
        paths: [],
      });
      return { id, role: role ?? user.role, active: active ?? user.active };
    },
  },

  {
    name: "read_audit_log",
    title: "Read the audit log",
    description: "Every change, who made it and through what. Connector writes carry the application name.",
    schema: object({
      entityType: str("Filter to one kind of record."),
      action: str("create, update, delete or revoke."),
      limit: int("Default 50."),
    }),
    handler: async (args) => {
      const rows = await db.auditLog.findMany({
        where: {
          ...(args.entityType ? { entityType: String(args.entityType) } : {}),
          ...(args.action ? { action: String(args.action) } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limitOf(args, 50),
        include: { user: true },
      });
      return {
        entries: rows.map((row) => ({
          when: fullDate(row.createdAt),
          who: row.user?.name ?? "system",
          action: row.action,
          entity: `${row.entityType}${row.entityId ? `:${row.entityId}` : ""}`,
          summary: row.summary,
        })),
      };
    },
  },

  {
    name: "analytics_summary",
    title: "Traffic summary",
    description: "Page views, ranking views, profile views and lead events over a window, with the busiest pages.",
    schema: object({ days: int("How far back to look. Default 30, max 400.") }),
    handler: async (args) => {
      const days = Math.min(Math.max(1, Number(args.days ?? 30)), 400);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [byType, topPaths, topBusinesses] = await Promise.all([
        db.analyticsEvent.groupBy({ by: ["type"], where: { createdAt: { gte: since } }, _count: true }),
        db.analyticsEvent.groupBy({
          by: ["path"],
          where: { createdAt: { gte: since }, type: "PAGE_VIEW" },
          _count: true,
          orderBy: { _count: { path: "desc" } },
          take: 15,
        }),
        db.businessDailyStat.groupBy({
          by: ["businessId"],
          where: { date: { gte: since } },
          _sum: { profileViews: true, quoteClicks: true, phoneClicks: true },
          orderBy: { _sum: { profileViews: "desc" } },
          take: 10,
        }),
      ]);

      const names = await db.business.findMany({
        where: { id: { in: topBusinesses.map((row) => row.businessId) } },
        select: { id: true, name: true },
      });

      return {
        window: `${days} days`,
        events: Object.fromEntries(byType.map((row) => [row.type, row._count])),
        topPages: topPaths.map((row) => ({ path: row.path, views: row._count })),
        topBusinesses: topBusinesses.map((row) => ({
          business: names.find((entry) => entry.id === row.businessId)?.name ?? row.businessId,
          profileViews: row._sum?.profileViews ?? 0,
          quoteClicks: row._sum?.quoteClicks ?? 0,
          phoneClicks: row._sum?.phoneClicks ?? 0,
        })),
      };
    },
  },

  {
    name: "upload_media",
    title: "Store an image on this site",
    description:
      "Fetches an image by URL and stores it here, returning a local path. Use it so a profile does not depend on someone else's CDN staying up.",
    write: true,
    schema: object({ url: str("A public https URL to an image."), alt: str("Description, for the record.") }, ["url"]),
    handler: async (args, ctx) => {
      const source = reqStr(args, "url");
      let url: URL;
      try {
        url = new URL(source);
      } catch {
        throw new ToolError("That is not a valid URL.");
      }
      if (url.protocol !== "https:") throw new ToolError("The URL must be https.");

      const { MEDIA_DIR, MEDIA_PUBLIC_PATH, MEDIA_TYPES } = await import("../media");
      const { randomBytes } = await import("node:crypto");
      const { mkdir, writeFile } = await import("node:fs/promises");
      const { join } = await import("node:path");

      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new ToolError(`Fetching that image returned ${response.status}.`);

      // The extension comes from the content type the server actually sent,
      // never from the URL, so a .jpg that is really something else is refused.
      const type = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
      const extension = MEDIA_TYPES[type];
      if (!extension) {
        throw new ToolError(
          `${type || "That file"} is not an image type this site accepts. Allowed: ${Object.keys(MEDIA_TYPES).join(", ")}.`,
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > 8 * 1024 * 1024) throw new ToolError("That image is larger than 8 MB.");

      const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}${extension}`;
      await mkdir(MEDIA_DIR, { recursive: true });
      await writeFile(join(MEDIA_DIR, name), buffer);

      const path = `${MEDIA_PUBLIC_PATH}/${name}`;
      await recordWrite(ctx, {
        action: "create",
        entityType: "media",
        summary: `${name} from ${url.hostname}`,
        paths: [],
      });
      return { url: path, bytes: buffer.byteLength, type };
    },
  },
];
