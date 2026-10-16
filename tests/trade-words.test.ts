import { describe, expect, it } from "vitest";
import { article, licenceWord, taglineAsList, tradeWords } from "@/lib/trade-words";
import { subserviceCopy, subserviceTerm } from "@/lib/seo-copy";
import { legacyTarget } from "@/lib/legacy-urls";

describe("tradeWords", () => {
  it("never lowercases an acronym and picks the article by sound", () => {
    const hvac = tradeWords({ name: "HVAC", singular: "HVAC company", serviceName: "HVAC" });
    expect(hvac.pros).toBe("HVAC companies");
    expect(hvac.aPro).toBe("an HVAC company");
    expect(hvac.trade).toBe("HVAC");
  });

  it("turns a trade label into a plural noun for people", () => {
    const roofing = tradeWords({ name: "Roofing", singular: "Roofing company", serviceName: "Roofing" });
    expect(`Do ${roofing.pros} need a license?`).toBe("Do roofing companies need a license?");
    expect(roofing.aPro).toBe("a roofing company");
  });

  it("uses the stem of a plural service name as a modifier", () => {
    const gutters = tradeWords({ name: "Gutters", singular: "Gutter company", serviceName: "Gutters" });
    expect(`Popular ${gutters.trade} services`).toBe("Popular gutter services");
  });

  it("reads an article by sound", () => {
    expect(article("electrician")).toBe("an");
    expect(article("EV charger installer")).toBe("an");
    expect(article("plumber")).toBe("a");
  });
});

describe("taglineAsList", () => {
  it("turns a card tagline into prose", () => {
    expect(taglineAsList("Panels · Batteries · Energy systems")).toBe("panels, batteries and energy systems");
    expect(taglineAsList(null)).toBeNull();
  });
});

describe("licenceWord", () => {
  it("spells the noun for the reader's country", () => {
    expect(licenceWord("CA")).toBe("licence");
    expect(licenceWord("us")).toBe("license");
    expect(licenceWord(undefined)).toBe("license");
  });
});

describe("subserviceCopy", () => {
  it("names the trade when the filed name leaves it out", () => {
    expect(subserviceTerm({ name: "Opener installation", slug: "opener-installation" }, { slug: "garage-doors" })).toBe(
      "Garage door opener installation",
    );
  });

  it("writes a meta description long enough to earn the click", () => {
    const copy = subserviceCopy(
      { name: "Door installation", slug: "door-installation", description: "Full door and panel replacement." },
      { name: "Garage Doors", singular: "Garage door company", serviceName: "Garage doors", slug: "garage-doors" },
      { businesses: 10, publishedRankings: 2 },
    );
    expect(copy.description.length).toBeGreaterThan(100);
    expect(copy.description.length).toBeLessThanOrEqual(160);
    expect(copy.title.toLowerCase()).toContain("garage door installation");
  });
});

describe("legacyTarget", () => {
  it("leaves current addresses alone", async () => {
    expect(await legacyTarget(["us", "tx", "dallas"])).toBeNull();
  });

  it("sends an unknown trade to the services index", async () => {
    expect(await legacyTarget(["home-services", "no-such-trade"])).toBe("/home-services/");
  });

  it("sends an uncovered old state page to the locations index", async () => {
    expect(await legacyTarget(["locations", "atlantis"])).toBe("/locations/");
  });
});
