import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { recordNamedAreas } from "@/lib/geo";

/**
 * Enrichment reads the towns a company lists on its own site. It used to create
 * a city record for every name it did not recognise, which is how a province
 * and three regional municipalities ended up with hub URLs. It now links what
 * the directory already has and reports the rest.
 */

let regionId = "";
let knownCityId = "";
let businessId = "";
const madeCities: string[] = [];

beforeAll(async () => {
  const city = await db.city.findFirst({ select: { id: true, regionId: true } });
  if (!city) throw new Error("the seed has no city to attach to");
  regionId = city.regionId;
  knownCityId = city.id;

  const category = await db.category.findFirst({ select: { id: true } });
  if (!category) throw new Error("the seed has no service to attach to");

  const business = await db.business.create({
    data: {
      name: "Service Area Rules Ltd",
      slug: `service-area-rules-${Date.now()}`,
      categoryId: category.id,
      cityId: knownCityId,
      status: "DRAFT",
    },
    select: { id: true },
  });
  businessId = business.id;
});

afterAll(async () => {
  await db.businessArea.deleteMany({ where: { businessId } });
  await db.business.delete({ where: { id: businessId } }).catch(() => {});
  for (const id of madeCities) await db.city.delete({ where: { id } }).catch(() => {});
});

describe("the towns a website claims", () => {
  it("links the ones the directory has and invents nothing", async () => {
    const before = await db.city.count();
    const known = await db.city.findUnique({ where: { id: knownCityId }, select: { name: true } });

    const result = await recordNamedAreas(businessId, regionId, [
      known!.name,
      "Somewhere That Does Not Exist",
      "York",
      "Halton",
      "Peel",
    ]);

    expect(await db.city.count()).toBe(before);
    expect(result.added).toBe(1);
    expect(result.skipped).toContain("York");
    expect(result.skipped).toContain("Halton");
    expect(result.skipped).toContain("Peel");
    expect(result.skipped).toContain("Somewhere That Does Not Exist");

    const areas = await db.businessArea.findMany({ where: { businessId }, select: { cityId: true } });
    expect(areas.map((row) => row.cityId)).toEqual([knownCityId]);
  });

  it("stays inside the company's own region", async () => {
    const elsewhere = await db.city.findFirst({
      where: { regionId: { not: regionId } },
      select: { name: true },
    });
    if (!elsewhere) return;
    const result = await recordNamedAreas(businessId, regionId, [elsewhere.name]);
    expect(result.added).toBe(0);
    expect(result.skipped).toContain(elsewhere.name);
  });

  it("drops a county or a metro area rather than filing it as a town", async () => {
    const result = await recordNamedAreas(businessId, regionId, [
      "Dallas County",
      "Greater Metro Area",
      "Tri-Cities",
    ]);
    expect(result.added).toBe(0);
    expect(result.skipped).toHaveLength(3);
  });
});
