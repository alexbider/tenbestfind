import { describe, expect, it } from "vitest";
import { guestPostBrief, guestPostLinks, guestPostSchema } from "@/lib/guest-post";
import { SPONSORED_REL, sponsoredLinkProps } from "@/lib/sponsored-links";

const valid = {
  business: "Lone Star Roofing",
  name: "Dana Ortiz",
  email: "dana@lonestarroofing.com",
  topic: "How to plan a roof replacement before storm season",
  url1: "https://lonestarroofing.com/services/replacement",
  anchor1: "roof replacement in San Antonio",
  url2: "https://lonestarroofing.com/guides/storm-damage",
  anchor2: "storm damage guide",
  keyPoints: "Cover the signs of hail damage, what insurers look for, and when to replace instead of repair.",
  audience: "Homeowners in Texas planning a roof replacement",
  wordCount: "1200",
  sourceUrl: "",
  notes: "",
  understands: "on",
};

describe("guest post order", () => {
  it("accepts a complete order with two https links", () => {
    const parsed = guestPostSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects a link that is not https", () => {
    const parsed = guestPostSchema.safeParse({ ...valid, url1: "http://example.com/page" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a link that is not a URL at all", () => {
    const parsed = guestPostSchema.safeParse({ ...valid, url2: "not a link" });
    expect(parsed.success).toBe(false);
  });

  it("requires the sponsored terms to be confirmed", () => {
    const parsed = guestPostSchema.safeParse({ ...valid, understands: undefined });
    expect(parsed.success).toBe(false);
  });

  it("requires the points the post should cover", () => {
    const parsed = guestPostSchema.safeParse({ ...valid, keyPoints: "too short" });
    expect(parsed.success).toBe(false);
  });

  it("keeps the brief an editor needs to write the post", () => {
    const parsed = guestPostSchema.parse(valid);
    expect(guestPostBrief(parsed)).toEqual({
      keyPoints: valid.keyPoints,
      audience: valid.audience,
      wordCount: 1200,
      sourceUrl: null,
      notes: null,
    });
  });

  it("requires anchor text for both links", () => {
    const parsed = guestPostSchema.safeParse({ ...valid, anchor2: "" });
    expect(parsed.success).toBe(false);
  });

  it("returns the two links in the order the customer gave them", () => {
    const parsed = guestPostSchema.parse(valid);
    expect(guestPostLinks(parsed)).toEqual([
      { url: valid.url1, anchor: valid.anchor1 },
      { url: valid.url2, anchor: valid.anchor2 },
    ]);
  });
});

describe("paid links", () => {
  it("always carry rel=sponsored and never a plain followed link", () => {
    expect(sponsoredLinkProps()).toEqual({ rel: "sponsored" });
    expect(SPONSORED_REL).toBe("sponsored");
  });
});
