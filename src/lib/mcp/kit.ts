import { revalidatePath } from "next/cache";
import { audit } from "../auth";
import type { UserRole } from "../enums";
import type { Bearer } from "../oauth";

// Shared plumbing for the tool modules: argument coercion that fails with a
// sentence rather than a stack trace, and the write epilogue every mutating
// tool owes the site.

export type ToolContext = Bearer;

export type Tool = {
  name: string;
  title: string;
  description: string;
  schema: Record<string, unknown>;
  /** Needs the mcp:write scope and an editor account. */
  write?: boolean;
  /** Needs an administrator, on top of write. */
  admin?: boolean;
  /** Removes something. Reported to the client so it can warn. */
  destructive?: boolean;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
};

export class ToolError extends Error {}

/* ------------------------------------------------------------------ schema */

export const str = (description: string, extra: Record<string, unknown> = {}) => ({
  type: "string",
  description,
  ...extra,
});
export const int = (description: string, extra: Record<string, unknown> = {}) => ({
  type: "integer",
  description,
  ...extra,
});
export const num = (description: string) => ({ type: "number", description });
export const bool = (description: string) => ({ type: "boolean", description });
export const arr = (description: string, items: Record<string, unknown> = { type: "string" }) => ({
  type: "array",
  description,
  items,
});

export const object = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  additionalProperties: false,
  properties,
  ...(required.length > 0 ? { required } : {}),
});

/* -------------------------------------------------------------- coercion */

export function reqStr(args: Record<string, unknown>, field: string): string {
  const value = args[field];
  if (typeof value !== "string" || !value.trim()) throw new ToolError(`${field} is required.`);
  return value.trim();
}

export function optStr(args: Record<string, unknown>, field: string): string | undefined {
  const value = args[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new ToolError(`${field} must be text.`);
  return value;
}

export function optInt(args: Record<string, unknown>, field: string): number | undefined {
  const value = args[field];
  if (value === undefined || value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new ToolError(`${field} must be a number.`);
  return Math.trunc(parsed);
}

export function optNum(args: Record<string, unknown>, field: string): number | undefined {
  const value = args[field];
  if (value === undefined || value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new ToolError(`${field} must be a number.`);
  return parsed;
}

export function optBool(args: Record<string, unknown>, field: string): boolean | undefined {
  const value = args[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new ToolError(`${field} must be true or false.`);
  return value;
}

export function optList(args: Record<string, unknown>, field: string): string[] | undefined {
  const value = args[field];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new ToolError(`${field} must be a list.`);
  return value.map(String);
}

export function optRows(args: Record<string, unknown>, field: string): Record<string, unknown>[] | undefined {
  const value = args[field];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new ToolError(`${field} must be a list of objects.`);
  return value.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new ToolError(`Every entry in ${field} must be an object.`);
    }
    return row as Record<string, unknown>;
  });
}

export function oneOf(value: string, allowed: readonly string[], field: string): string {
  const upper = value.trim().toUpperCase();
  if (!allowed.includes(upper)) throw new ToolError(`${field} must be one of ${allowed.join(", ")}.`);
  return upper;
}

export function limitOf(args: Record<string, unknown>, fallback = 20, cap = 200): number {
  const value = Number(args.limit ?? fallback);
  return Number.isFinite(value) ? Math.min(Math.max(1, Math.trunc(value)), cap) : fallback;
}

/** Builds a Prisma data object from only the arguments that were supplied. */
export function patch(
  args: Record<string, unknown>,
  spec: Record<string, "string" | "int" | "num" | "bool" | "json" | "lines">,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [field, kind] of Object.entries(spec)) {
    if (args[field] === undefined) continue;
    switch (kind) {
      case "string":
        data[field] = args[field] === null ? null : String(args[field]);
        break;
      case "int":
        data[field] = args[field] === null ? null : optInt(args, field);
        break;
      case "num":
        data[field] = args[field] === null ? null : optNum(args, field);
        break;
      case "bool":
        data[field] = optBool(args, field);
        break;
      case "lines":
      case "json": {
        const value = args[field];
        data[field] = value === null ? null : JSON.stringify(value);
        break;
      }
    }
  }
  return data;
}

/* ------------------------------------------------------------------ writes */

/**
 * What every write owes: an audit entry naming the connector, and a cache purge
 * so the change is visible on the public site rather than waiting out the ISR
 * window. Called after the database write, never before.
 */
export async function recordWrite(
  ctx: ToolContext,
  input: {
    action: "create" | "update" | "delete" | "revoke";
    entityType: string;
    entityId?: string;
    summary: string;
    /** Paths to purge. "/" with layout scope covers the whole public site. */
    paths?: string[];
  },
): Promise<void> {
  await audit({
    userId: ctx.user.id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: `${input.summary} (via ${ctx.clientName})`,
  });

  for (const path of input.paths ?? ["/"]) {
    try {
      revalidatePath(path, path === "/" ? "layout" : "page");
    } catch {
      // Revalidation is best effort. A cache that stays warm a little longer is
      // not a reason to fail a write that already succeeded.
    }
  }
}

export function canRun(tool: Tool, scope: string, role: UserRole): boolean {
  const scopes = new Set(scope.split(/\s+/).filter(Boolean));
  if (!scopes.has("mcp:read") && !scopes.has("mcp:write")) return false;
  if (tool.write && !scopes.has("mcp:write")) return false;
  if (tool.write && role !== "ADMIN" && role !== "EDITOR") return false;
  if (tool.admin && role !== "ADMIN") return false;
  return true;
}
