import { describe, expect, it } from "vitest";
import { analyzeSeo, keywordInSlug, slugWords, withBrand } from "@/lib/seo";
import { TITLE_LIMIT } from "@/lib/seo-copy";
import { wordCount } from "@/lib/seo-content";

const checkOf = (result: ReturnType<typeof analyzeSeo>, id: string) =>
  result.checks.find((check) => check.id === id);

describe("focus keyword in the URL", () => {
  it("passes the case that was failing", () => {
    // Reported: focus keyword "superior hvac service", slug
    // superior-hvac-service-toronto-on, check said the keyword was absent.
    expect(keywordInSlug("superior hvac service", "superior-hvac-service-toronto-on")).toBe(true);
  });

  it("ignores punctuation on either side", () => {
    expect(keywordInSlug("Superior HVAC Service Inc.", "superior-hvac-service-toronto-on")).toBe(true);
    expect(keywordInSlug("A&B Plumbing", "a-b-plumbing-dallas-tx")).toBe(true);
    expect(keywordInSlug("O'Brien Roofing", "obrien-roofing-boston-ma")).toBe(false);
  });

  it("ignores the words a slug never carries anyway", () => {
    expect(slugWords("Smith and Sons Inc")).toEqual(["smith", "sons"]);
    expect(keywordInSlug("Smith and Sons", "smith-sons-ottawa-on")).toBe(true);
  });

  it("still wants the words together and in order", () => {
    expect(keywordInSlug("hvac repair", "repair-hvac-toronto-on")).toBe(false);
    expect(keywordInSlug("hvac service", "hvac-services-of-america")).toBe(false);
  });

  it("does not pass on an empty keyword", () => {
    expect(keywordInSlug("", "anything-at-all")).toBe(false);
  });

  it("reports the check as good through the scorer", () => {
    const result = analyzeSeo({
      title: "Superior HVAC Service in Toronto, ON | TenBestFind",
      description: "x".repeat(140),
      focusKeyword: "superior hvac service",
      slug: "superior-hvac-service-toronto-on",
    });
    expect(checkOf(result, "slug-keyword")?.status).toBe("good");
  });
});

describe("the content length check", () => {
  it("counts the words it is given", () => {
    expect(wordCount("one two three")).toBe(3);
    expect(wordCount("  padded   out  ")).toBe(2);
    expect(wordCount("")).toBe(0);
  });

  it("fails a meta description and passes real copy", () => {
    const snippet = analyzeSeo({ content: "word ".repeat(25), focusKeyword: "x", slug: "x" });
    expect(checkOf(snippet, "content-length")?.status).toBe("warn");

    const page = analyzeSeo({ content: "word ".repeat(700), focusKeyword: "x", slug: "x" });
    expect(checkOf(page, "content-length")?.status).toBe("good");
  });
});

describe("the brand on a title somebody typed", () => {
  it("appends it when there is room", () => {
    expect(withBrand("10 Best HVAC Companies in Toronto (2026)", "TenBestFind", "|")).toBe(
      "10 Best HVAC Companies in Toronto (2026) | TenBestFind",
    );
  });

  it("leaves a title alone once it would go past sixty characters", () => {
    const long = "10 Best Heating and Air Conditioning Companies in Toronto";
    expect(long.length + " | TenBestFind".length).toBeGreaterThan(TITLE_LIMIT);
    expect(withBrand(long, "TenBestFind", "|")).toBe(long);
  });

  it("never puts it on twice", () => {
    expect(withBrand("HVAC in Toronto | TenBestFind", "TenBestFind", "|")).toBe(
      "HVAC in Toronto | TenBestFind",
    );
  });
});
