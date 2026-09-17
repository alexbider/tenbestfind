import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { flushIndexNowQueue, queueForIndexNow } from "@/lib/indexnow";
import { touchBusiness, touchFaqOwner } from "@/lib/lastmod";

/**
 * Two things the sitemap and the engines depend on: a submission that survives
 * the request it was made in, and a lastmod that moves when the page does.
 */

const KEYS = ["seo.searchEngineVisible", "seo.indexnow"];
const before = new Map<string, string | null>();

async function setFlag(key: string, value: boolean): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value), groupName: "seo", label: key },
    update: { value: JSON.stringify(value) },
  });
}

beforeAll(async () => {
  for (const key of KEYS) {
    const row = await db.setting.findUnique({ where: { key } });
    before.set(key, row?.value ?? null);
    await setFlag(key, true);
  }
  await db.indexRequest.deleteMany({ where: { url: { contains: "/queue-test-" } } });
});

afterAll(async () => {
  for (const key of KEYS) {
    const value = before.get(key);
    if (value === null) await db.setting.delete({ where: { key } }).catch(() => {});
    else await db.setting.update({ where: { key }, data: { value: value! } }).catch(() => {});
  }
  await db.indexRequest.deleteMany({ where: { url: { contains: "/queue-test-" } } });
});

describe("the IndexNow queue", () => {
  it("keeps a submission rather than losing it with the request", async () => {
    const queued = await queueForIndexNow(["/queue-test-one/", "/queue-test-two/"]);
    expect(queued).toBe(2);

    const rows = await db.indexRequest.findMany({
      where: { url: { contains: "/queue-test-" }, target: "INDEXNOW" },
    });
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === "QUEUED")).toBe(true);
  });

  it("does not queue the same page twice while it is still waiting", async () => {
    expect(await queueForIndexNow(["/queue-test-one/"])).toBe(0);
  });

  it("queues nothing at all while indexing is switched off", async () => {
    await setFlag("seo.searchEngineVisible", false);
    expect(await queueForIndexNow(["/queue-test-three/"])).toBe(0);
    await setFlag("seo.searchEngineVisible", true);
  });

  it("clears the queue rather than retrying what can never be sent", async () => {
    // There is no public site URL under test, so the submission is skipped.
    // A skip is not a failure to retry, and rows must not pile up forever.
    const result = await flushIndexNowQueue();
    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(0);

    const rows = await db.indexRequest.findMany({ where: { url: { contains: "/queue-test-" } } });
    expect(rows.every((row) => row.status === "SKIPPED")).toBe(true);
  });
});

describe("lastmod", () => {
  it("moves when something the page is made of changes", async () => {
    const business = await db.business.findFirst({ select: { id: true, updatedAt: true } });
    if (!business) return;

    await new Promise((resolve) => setTimeout(resolve, 5));
    await touchBusiness(business.id);

    const after = await db.business.findUnique({
      where: { id: business.id },
      select: { updatedAt: true },
    });
    expect(after!.updatedAt.getTime()).toBeGreaterThan(business.updatedAt.getTime());
  });

  it("follows a question back to the page it is on", async () => {
    const faq = await db.faq.findFirst({ where: { businessId: { not: null } }, select: { id: true, businessId: true } });
    if (!faq) return;

    const business = await db.business.findUnique({
      where: { id: faq.businessId! },
      select: { updatedAt: true },
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await touchFaqOwner(faq.id);

    const after = await db.business.findUnique({
      where: { id: faq.businessId! },
      select: { updatedAt: true },
    });
    expect(after!.updatedAt.getTime()).toBeGreaterThan(business!.updatedAt.getTime());
  });
});
