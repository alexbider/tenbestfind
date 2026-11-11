import { describe, expect, it } from "vitest";

const { nameCoverage } = await import("@/lib/listing-verify");

describe("website name check", () => {
  it("finds every word of the name on the site", () => {
    expect(nameCoverage("Renaissance Solutions Painting & Carpentry", "Renaissance Solutions — painting and carpentry in Vancouver", "renaissancepainting.ca")).toBe(1);
  });

  it("counts a word found in the domain", () => {
    expect(nameCoverage("Acme Plumbing", "We fix pipes fast.", "acmeplumbing.com")).toBe(1);
  });

  it("scores a different company low", () => {
    expect(nameCoverage("Northern Roofing Experts", "Sunshine Bakery fresh bread daily", "sunshinebakery.com")).toBeLessThan(0.75);
  });

  it("ignores legal suffixes like LLC and Inc", () => {
    expect(nameCoverage("Bright Electric LLC", "Bright Electric serves Austin", "brightelectric.com")).toBe(1);
  });
});
