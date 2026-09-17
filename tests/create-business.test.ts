import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { runTool } from "@/lib/mcp";
import type { ToolContext } from "@/lib/mcp";

/**
 * create_business used to take a smaller set of fields than update_business,
 * so a listing built in one call came out missing whatever create had not been
 * told about. The call still succeeded, which is why nobody noticed. These
 * check that everything sent is everything stored, and that anything not
 * recognised says so instead of disappearing.
 */

const ctx: ToolContext = {
  user: { id: "", email: "tests@tenbestfind.com", name: "Test suite", role: "ADMIN" },
  scope: "mcp:read mcp:write",
  tokenId: "test",
  clientName: "the test suite",
};

let categoryId = "";
let cityId = "";
const made: string[] = [];

beforeAll(async () => {
  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  const category = await db.category.findFirst({ select: { id: true } });
  const city = await db.city.findFirst({ select: { id: true } });
  if (!admin || !category || !city) throw new Error("the seed is missing an admin, a service or a city");
  ctx.user.id = admin.id;
  categoryId = category.id;
  cityId = city.id;
});

afterAll(async () => {
  for (const id of made) await db.business.delete({ where: { id } }).catch(() => {});
});

async function create(extra: Record<string, unknown>) {
  const result = (await runTool(
    "create_business",
    { name: "Fields Test Co", slug: `fields-test-${made.length}-${Date.now()}`, categoryId, cityId, ...extra },
    ctx,
  )) as { id: string };
  made.push(result.id);
  return db.business.findUniqueOrThrow({ where: { id: result.id } });
}

describe("create_business", () => {
  it("keeps the overview it was sent", async () => {
    const row = await create({ overview: "Twenty years of boiler work across the east end." });
    expect(row.overview).toBe("Twenty years of boiler work across the east end.");
  });

  it("keeps the fields that update_business already took", async () => {
    const row = await create({
      yearFounded: 1998,
      licenseNumber: "TSSA-44821",
      emergency: true,
      financing: true,
      freeEstimates: true,
      warrantyTerms: "10 year workmanship",
      employeeCount: "20 to 50",
    });

    expect(row.yearFounded).toBe(1998);
    expect(row.licenseNumber).toBe("TSSA-44821");
    expect(row.emergency).toBe(true);
    expect(row.financing).toBe(true);
    expect(row.freeEstimates).toBe(true);
    expect(row.warrantyTerms).toBe("10 year workmanship");
    expect(row.employeeCount).toBe("20 to 50");
  });

  it("keeps the rating, the review count and the place id behind them", async () => {
    const row = await create({
      googlePlaceId: `ChIJ-fields-test-${Date.now()}`,
      rating: 4.8,
      reviewCount: 312,
      ratingReadOn: "2026-09-16",
      googleMapsPosition: 3,
    });

    expect(row.placeId).toMatch(/^ChIJ-fields-test-/);
    expect(row.googleRating).toBe(4.8);
    expect(row.googleReviewCount).toBe(312);
    expect(row.googleDataUpdated?.toISOString().slice(0, 10)).toBe("2026-09-16");
    expect(row.gmbRank).toBe(3);
  });

  it("refuses a rating that is not a rating", async () => {
    await expect(create({ rating: 9 })).rejects.toThrow(/between 0 and 5/);
  });

  it("names the arguments it does not take instead of dropping them", async () => {
    await expect(
      runTool("create_business", { name: "Unknown Field Co", categoryId, favouriteColour: "blue" }, ctx),
    ).rejects.toThrow(/does not take favouriteColour/);
  });
});

describe("update_business", () => {
  it("round-trips the overview", async () => {
    const row = await create({});
    await runTool("update_business", { idOrSlug: row.id, overview: "Rewritten." }, ctx);
    const after = await db.business.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.overview).toBe("Rewritten.");
  });

  it("rejects an argument it was never told about", async () => {
    const row = await create({});
    await expect(runTool("update_business", { idOrSlug: row.id, nonsense: 1 }, ctx)).rejects.toThrow(
      /does not take nonsense/,
    );
  });
});
