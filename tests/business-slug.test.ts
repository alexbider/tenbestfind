import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { runTool } from "@/lib/mcp";
import type { ToolContext } from "@/lib/mcp";
import { companySlug } from "@/lib/company-slug";
import { routes } from "@/lib/urls";

/**
 * A slug is an address somebody may already have written down, so it moves
 * only when somebody says to move it, and never without leaving a redirect.
 * These lock both halves of that, because the bug they follow was a script
 * rebuilding slugs from the name with no redirect behind it.
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
  if (!admin) throw new Error("the seed has no administrator to act as");
  ctx.user.id = admin.id;

  const category = await db.category.findFirst({ select: { id: true } });
  const city = await db.city.findFirst({ select: { id: true } });
  if (!category || !city) throw new Error("the seed has no service or city to attach to");
  categoryId = category.id;
  cityId = city.id;
});

afterAll(async () => {
  for (const id of made) await db.business.delete({ where: { id } }).catch(() => {});
  await db.redirect.deleteMany({ where: { source: { contains: "slug-rules-" } } });
});

async function create(name: string, slug: string) {
  const made_ = (await runTool("create_business", { name, slug, categoryId, cityId }, ctx)) as {
    id: string;
  };
  made.push(made_.id);
  return made_;
}

describe("a company slug", () => {
  it("stays put when only the name changes", async () => {
    const { id } = await create("Slug Rules One", "slug-rules-one");

    await runTool("update_business", { idOrSlug: id, name: "Slug Rules One Inc" }, ctx);

    const after = await db.business.findUnique({ where: { id }, select: { slug: true, name: true } });
    expect(after?.name).toBe("Slug Rules One Inc");
    expect(after?.slug).toBe("slug-rules-one");
  });

  it("moves when a slug is passed, and leaves a 301 behind", async () => {
    const { id } = await create("Slug Rules Two", "slug-rules-two");

    await runTool("update_business", { idOrSlug: id, slug: "slug-rules-two-moved" }, ctx);

    const after = await db.business.findUnique({ where: { id }, select: { slug: true } });
    expect(after?.slug).toBe("slug-rules-two-moved");

    const redirect = await db.redirect.findUnique({ where: { source: routes.business("slug-rules-two") } });
    expect(redirect?.target).toBe(routes.business("slug-rules-two-moved"));
    expect(redirect?.code).toBe(301);
    expect(redirect?.enabled).toBe(true);
  });

  it("builds the same address from a name whether or not it carries a suffix", () => {
    // The five reported 404s were all this: a name gained "Inc" and the slug
    // that had been built from it no longer matched.
    const city = { slug: "toronto" };
    const region = { code: "ON" };
    expect(companySlug("Green Heating and Air", city, region)).toBe("green-heating-and-air-toronto-on");
    expect(companySlug("Green Heating and Air Inc", city, region)).toBe(
      "green-heating-and-air-inc-toronto-on",
    );
  });
});
