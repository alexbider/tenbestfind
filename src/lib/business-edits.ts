import "server-only";
import { db } from "./db";
import { parseRows, stringify } from "./json";

// The parts of a listing that both the admin editor and the owner portal
// write. Kept in one place so an owner's save stores exactly what an editor's
// save would: the same hours shape, the same join rows.

/** Opening hours as the repeatable editor posts them, in the stored shape. */
export function hoursFromForm(value: string | undefined): string | null {
  const hours = parseRows(value)
    .filter((row) => row.day?.trim())
    .map((row) => ({
      day: row.day.trim(),
      opens: row.opens?.trim() ?? "",
      closes: row.closes?.trim() ?? "",
      closed: row.closed === "yes",
    }));
  return stringify(hours);
}

/** One id per line, as the checkbox lists post them. */
export function idsFromForm(value: string | undefined): string[] {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Rebuilds the subservices a company offers. Ids that do not exist are
 * dropped; with `categoryId`, so is anything outside that trade.
 */
export async function replaceServices(businessId: string, ids: string[], categoryId?: string) {
  await db.businessService.deleteMany({ where: { businessId } });
  for (const subserviceId of new Set(ids)) {
    const exists = await db.subservice.findUnique({ where: { id: subserviceId } });
    if (exists && (!categoryId || exists.categoryId === categoryId)) {
      await db.businessService.create({ data: { businessId, subserviceId } });
    }
  }
}

/** Rebuilds the areas served. The first one is the primary area. */
export async function replaceAreas(businessId: string, ids: string[]) {
  await db.businessArea.deleteMany({ where: { businessId } });
  for (const [index, cityId] of [...new Set(ids)].entries()) {
    const exists = await db.city.findUnique({ where: { id: cityId } });
    if (exists) {
      await db.businessArea.create({ data: { businessId, cityId, primary: index === 0 } });
    }
  }
}
