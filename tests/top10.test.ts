import { describe, expect, it } from "vitest";
import { top10Eligibility, top10Schema } from "@/lib/top10";

const business = { status: "PUBLISHED", claimed: true, cityId: "city-1", categoryId: "cat-1" };
const slot = { cityId: "city-1", categoryId: "cat-1" };

describe("Top 10 eligibility", () => {
  it("accepts a claimed, published business in the same city and trade", () => {
    expect(top10Eligibility(business, slot)).toBeNull();
  });

  it("refuses an unclaimed business", () => {
    expect(top10Eligibility({ ...business, claimed: false }, slot)).not.toBeNull();
  });

  it("refuses a business that is not published", () => {
    expect(top10Eligibility({ ...business, status: "DRAFT" }, slot)).not.toBeNull();
  });

  it("refuses a business in a different city", () => {
    expect(top10Eligibility({ ...business, cityId: "city-2" }, slot)).not.toBeNull();
  });

  it("refuses a business in a different trade", () => {
    expect(top10Eligibility({ ...business, categoryId: "cat-2" }, slot)).not.toBeNull();
  });
});

describe("Top 10 order", () => {
  it("requires a city, a trade, a business and a billing email", () => {
    const parsed = top10Schema.safeParse({
      businessSlug: "lone-star-roofing",
      cityId: "city-1",
      categoryId: "cat-1",
      name: "Dana Ortiz",
      email: "dana@lonestarroofing.com",
    });
    expect(parsed.success).toBe(true);
    expect(top10Schema.safeParse({ ...parsed.data!, cityId: "" }).success).toBe(false);
  });
});
