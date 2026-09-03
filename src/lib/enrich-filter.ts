import type { Prisma } from "@prisma/client";
import { whereMissing } from "./completeness";

// One definition of "which companies", used by both the screen that previews a
// selection and the action that queues it.
//
// Keeping it in one place is the whole point: a preview that counted something
// different from what the run then processed would be worse than no preview.

export type EnrichFilter = {
  categoryId?: string;
  cityId?: string;
  batchId?: string;
  /** PUBLISHED, DRAFT, PENDING, or empty for the three together. */
  status?: string;
  /** never | stale | any. Whether the site has been read before. */
  read?: string;
  /** Days, for `read: "stale"`. */
  staleDays?: number;
  /** Only listings at or below this completeness score. */
  maxScore?: number;
  /** Gap keys that must all be missing. */
  missing?: string[];
  /** requireWebsite off includes companies with nothing to read, which is only
   *  useful for counting how many that is. */
  requireWebsite?: boolean;
  limit?: number;
  /** thinnest | oldest | newest */
  order?: string;
};

export function parseFilter(params: Record<string, string | string[] | undefined>): EnrichFilter {
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const many = (key: string) => {
    const value = params[key];
    if (Array.isArray(value)) return value;
    return value ? value.split(",").filter(Boolean) : [];
  };
  const num = (key: string) => {
    const value = Number(one(key));
    return Number.isFinite(value) ? value : undefined;
  };

  return {
    categoryId: one("categoryId") || undefined,
    cityId: one("cityId") || undefined,
    batchId: one("batchId") || undefined,
    status: one("status") || undefined,
    read: one("read") || "any",
    staleDays: num("staleDays"),
    maxScore: num("maxScore"),
    missing: many("missing"),
    requireWebsite: one("requireWebsite") !== "no",
    limit: num("limit") ?? 25,
    order: one("order") || "thinnest",
  };
}

/** The filter as a query string, so a form's state survives a reload. */
export function filterToQuery(filter: EnrichFilter): string {
  const params = new URLSearchParams();
  if (filter.categoryId) params.set("categoryId", filter.categoryId);
  if (filter.cityId) params.set("cityId", filter.cityId);
  if (filter.batchId) params.set("batchId", filter.batchId);
  if (filter.status) params.set("status", filter.status);
  if (filter.read && filter.read !== "any") params.set("read", filter.read);
  if (filter.staleDays) params.set("staleDays", String(filter.staleDays));
  if (filter.maxScore !== undefined) params.set("maxScore", String(filter.maxScore));
  if (filter.missing?.length) params.set("missing", filter.missing.join(","));
  if (filter.requireWebsite === false) params.set("requireWebsite", "no");
  if (filter.limit) params.set("limit", String(filter.limit));
  if (filter.order) params.set("order", filter.order);
  return params.toString();
}

export function whereFor(filter: EnrichFilter): Prisma.BusinessWhereInput {
  const and: Prisma.BusinessWhereInput[] = [];

  // Every named gap has to be missing, not just one of them, so "no logo and no
  // photos" narrows the selection rather than widening it.
  for (const key of filter.missing ?? []) {
    const clause = whereMissing(key);
    if (clause) and.push(clause as Prisma.BusinessWhereInput);
  }

  if (filter.read === "never") {
    and.push({ siteCrawledAt: null });
  } else if (filter.read === "stale") {
    const days = filter.staleDays && filter.staleDays > 0 ? filter.staleDays : 30;
    and.push({
      OR: [{ siteCrawledAt: null }, { siteCrawledAt: { lt: new Date(Date.now() - days * 86_400_000) } }],
    });
  }

  if (filter.batchId) {
    and.push({ importItems: { some: { batchId: filter.batchId } } });
  }

  return {
    ...(filter.requireWebsite === false ? {} : { website: { not: null } }),
    ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    ...(filter.cityId ? { cityId: filter.cityId } : {}),
    status: filter.status ? filter.status : { in: ["PUBLISHED", "DRAFT", "PENDING"] },
    ...(filter.maxScore !== undefined ? { completeness: { lte: filter.maxScore } } : {}),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

export function orderFor(filter: EnrichFilter): Prisma.BusinessOrderByWithRelationInput[] {
  switch (filter.order) {
    case "oldest":
      return [{ siteCrawledAt: { sort: "asc", nulls: "first" } }, { name: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    default:
      // Thinnest first is the useful default: it spends the run on the listings
      // that gain the most from being filled.
      return [{ completeness: "asc" }, { name: "asc" }];
  }
}
