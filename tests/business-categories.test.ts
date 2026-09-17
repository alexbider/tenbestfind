import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { runTool, type ToolContext } from "@/lib/mcp";
import { inCategory } from "@/lib/categories";

/**
 * A plumber who also does HVAC. The company keeps one address and one
 * breadcrumb, and turns up in both trades.
 */

const ctx: ToolContext = {
  user: { id: "", email: "tests@tenbestfind.com", name: "Test suite", role: "ADMIN" },
  scope: "mcp:read mcp:write",
  tokenId: "test",
  clientName: "the test suite",
};

let primaryId = "";
let secondId = "";
let cityId = "";
let businessId = "";

beforeAll(async () => {
  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admin) throw new Error("the seed has no administrator to act as");
  ctx.user.id = admin.id;

  const categories = await db.category.findMany({ take: 2, select: { id: true } });
  if (categories.length < 2) throw new Error("the seed needs two services");
  primaryId = categories[0]!.id;
  secondId = categories[1]!.id;

  const city = await db.city.findFirst({ select: { id: true } });
  cityId = city!.id;
});

afterAll(async () => {
  if (businessId) await db.business.delete({ where: { id: businessId } }).catch(() => {});
});

describe("a company that works in two trades", () => {
  it("keeps the extra service it was created with", async () => {
    const created = (await runTool(
      "create_business",
      {
        name: "Two Trades Ltd",
        slug: `two-trades-${Date.now()}`,
        categoryId: primaryId,
        cityId,
        additionalCategoryIds: [secondId],
      },
      ctx,
    )) as { id: string; url: string };
    businessId = created.id;

    const full = (await runTool("get_business", { idOrSlug: created.id }, ctx)) as {
      url: string;
      categoryId: string;
      allServices: { id: string; primary: boolean }[];
      additionalCategoryIds: string[];
    };

    expect(full.categoryId).toBe(primaryId);
    expect(full.allServices[0]).toMatchObject({ id: primaryId, primary: true });
    expect(full.additionalCategoryIds).toEqual([secondId]);
    expect(full.url).toBe(created.url);
  });

  it("turns up when the extra trade is the one being looked for", async () => {
    const found = await db.business.findMany({
      where: { id: businessId, ...inCategory(secondId) },
      select: { id: true },
    });
    expect(found).toHaveLength(1);

    const alsoPrimary = await db.business.findMany({
      where: { id: businessId, ...inCategory(primaryId) },
      select: { id: true },
    });
    expect(alsoPrimary).toHaveLength(1);
  });

  it("replaces the list on update and clears it on an empty one", async () => {
    const before = await db.business.findUnique({ where: { id: businessId }, select: { slug: true } });

    await runTool("update_business", { idOrSlug: businessId, additionalCategoryIds: [] }, ctx);
    expect(await db.businessCategory.count({ where: { businessId } })).toBe(0);

    await runTool("update_business", { idOrSlug: businessId, additionalCategoryIds: [secondId] }, ctx);
    expect(await db.businessCategory.count({ where: { businessId } })).toBe(1);

    const after = await db.business.findUnique({ where: { id: businessId }, select: { slug: true } });
    expect(after?.slug).toBe(before?.slug);
  });

  it("ignores the primary rather than storing it twice", async () => {
    await runTool(
      "update_business",
      { idOrSlug: businessId, additionalCategoryIds: [primaryId, secondId] },
      ctx,
    );
    const rows = await db.businessCategory.findMany({ where: { businessId }, select: { categoryId: true } });
    expect(rows.map((row) => row.categoryId)).toEqual([secondId]);
  });

  it("refuses a service id that does not exist", async () => {
    await expect(
      runTool("update_business", { idOrSlug: businessId, additionalCategoryIds: ["nope"] }, ctx),
    ).rejects.toThrow(/does not exist/);
  });
});
