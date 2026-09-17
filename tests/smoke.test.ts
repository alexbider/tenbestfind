import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/format";

describe("the suite itself", () => {
  it("resolves the @ alias and runs", () => {
    expect(slugify("Green Heating & Air")).toBe("green-heating-air");
  });
});
