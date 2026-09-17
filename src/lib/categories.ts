/**
 * A company that works in more than one trade.
 *
 * Business.categoryId is the primary service and stays that way: it owns the
 * URL, the breadcrumb and the ranking the company can be placed in. The extra
 * trades live in BusinessCategory, so a plumber who also does HVAC turns up in
 * an HVAC search without its address changing.
 *
 * The primary is not repeated in the join table, which is why nothing needed
 * backfilling. Anything asking "does this company do X" has to look in both
 * places, and `inCategory` is that question written once.
 */

import { db } from "./db";

/** A `where` fragment matching a company whose primary or extra trade is this. */
export function inCategory(categoryId: string) {
  return {
    OR: [{ categoryId }, { extraServices: { some: { categoryId } } }],
  };
}

/**
 * Replaces a company's extra trades.
 *
 * The primary is dropped from the list rather than rejected: an agent that
 * sends every service a company offers, primary included, means the same thing
 * as one that sends only the extras, and refusing the first would be pedantry.
 */
export async function setExtraCategories(
  businessId: string,
  primaryCategoryId: string,
  categoryIds: string[],
): Promise<string[]> {
  const wanted = [...new Set(categoryIds.map((id) => id.trim()).filter(Boolean))].filter(
    (id) => id !== primaryCategoryId,
  );

  if (wanted.length > 0) {
    const found = await db.category.count({ where: { id: { in: wanted } } });
    if (found !== wanted.length) {
      throw new Error("One of those service ids does not exist. Call list_taxonomy first.");
    }
  }

  const have = new Set(
    (await db.businessCategory.findMany({ where: { businessId }, select: { categoryId: true } })).map(
      (row) => row.categoryId,
    ),
  );

  const gone = [...have].filter((id) => !wanted.includes(id));
  if (gone.length > 0) {
    await db.businessCategory.deleteMany({ where: { businessId, categoryId: { in: gone } } });
  }

  const missing = wanted.filter((id) => !have.has(id));
  if (missing.length > 0) {
    await db.businessCategory.createMany({
      data: missing.map((categoryId) => ({ businessId, categoryId })),
    });
  }
  return wanted;
}

/**
 * Every trade a company works in, primary first, as the profile lists them.
 */
export async function categoriesOf(businessId: string): Promise<
  { id: string; name: string; slug: string; serviceName: string; iconKey: string; primary: boolean }[]
> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      category: { select: { id: true, name: true, slug: true, serviceName: true, iconKey: true } },
      extraServices: {
        select: {
          category: { select: { id: true, name: true, slug: true, serviceName: true, iconKey: true } },
        },
      },
    },
  });
  if (!business) return [];

  return [
    { ...business.category, primary: true },
    ...business.extraServices
      .map((row) => ({ ...row.category, primary: false }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];
}
