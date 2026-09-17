import { describe, expect, it } from "vitest";
import { businessEntity, rankingListEntity } from "@/lib/schema";
import { auditSchema, assertSchemaClean } from "@/lib/schema-audit";
import { businessSchemaInput } from "@/lib/schema-entities";
import { businessTypeFor } from "@/lib/schema-types";

const full = {
  slug: "acme-hvac-toronto-on",
  name: "Acme HVAC",
  categorySlug: "hvac",
  website: "https://acmehvac.ca",
  phone: "+1 416-555-0100",
  email: "info@acmehvac.ca",
  image: "/uploads/acme-1.jpg",
  logo: "/uploads/acme-logo.png",
  addressLine: "12 King Street West",
  postalCode: "M5H 1A1",
  cityName: "Toronto",
  regionCode: "on",
  countryCode: "ca",
  latitude: 43.6489,
  longitude: -79.3817,
  hours: JSON.stringify([
    { day: "Monday", opens: "08:00", closes: "17:00", closed: false },
    { day: "Sunday", opens: "", closes: "", closed: true },
  ]),
  areaServed: ["Toronto", "Markham"],
  socialLinks: JSON.stringify({ facebook: "https://facebook.com/acmehvac" }),
  yearFounded: 1998,
  credentials: [{ label: "TSSA registered", authority: "TSSA", identifier: "44821" }],
  rating: 4.8,
  reviewCount: 312,
};

describe("the schema type for a trade", () => {
  it("uses the specific type where schema.org has one", () => {
    expect(businessTypeFor("hvac")).toBe("HVACBusiness");
    expect(businessTypeFor("plumbers")).toBe("Plumber");
    expect(businessTypeFor("roofing")).toBe("RoofingContractor");
    expect(businessTypeFor("electricians")).toBe("Electrician");
    expect(businessTypeFor("locksmiths")).toBe("Locksmith");
    expect(businessTypeFor("moving-companies")).toBe("MovingCompany");
    expect(businessTypeFor("garage-doors")).toBe("HomeAndConstructionBusiness");
    expect(businessTypeFor("general-contractors")).toBe("GeneralContractor");
  });

  it("falls back rather than inventing a type", () => {
    expect(businessTypeFor("something-new")).toBe("LocalBusiness");
    expect(businessTypeFor(null)).toBe("LocalBusiness");
  });
});

describe("a business entity", () => {
  const entity = businessEntity(full) as Record<string, any>;

  it("carries the fields a profile is supposed to publish", () => {
    expect(entity["@type"]).toBe("HVACBusiness");
    expect(entity["@id"]).toMatch(/\/companies\/acme-hvac-toronto-on\/#business$/);
    expect(entity.name).toBe("Acme HVAC");
    expect(entity.telephone).toBe("+1 416-555-0100");
    expect(entity.email).toBe("info@acmehvac.ca");
    expect(entity.logo).toMatch(/acme-logo\.png$/);
    expect(entity.address).toMatchObject({
      "@type": "PostalAddress",
      streetAddress: "12 King Street West",
      addressLocality: "Toronto",
      addressRegion: "ON",
      postalCode: "M5H 1A1",
      addressCountry: "CA",
    });
    expect(entity.geo).toMatchObject({ "@type": "GeoCoordinates", latitude: 43.6489 });
    expect(entity.foundingDate).toBe("1998");
    expect(entity.hasCredential[0]).toMatchObject({ name: "TSSA registered", identifier: "44821" });
    expect(entity.areaServed).toHaveLength(2);
  });

  it("publishes only the days that are open", () => {
    expect(entity.openingHoursSpecification).toHaveLength(1);
    expect(entity.openingHoursSpecification[0].dayOfWeek).toBe("https://schema.org/Monday");
  });

  it("puts the site and its real social profiles in sameAs", () => {
    expect(entity.sameAs).toContain("https://acmehvac.ca");
    expect(entity.sameAs).toContain("https://facebook.com/acmehvac");
  });

  it("publishes a rating only when there are reviews behind it", () => {
    expect(entity.aggregateRating).toMatchObject({ ratingValue: 4.8, reviewCount: 312, bestRating: 5 });

    const unrated = businessEntity({ ...full, rating: 4.8, reviewCount: 0 }) as Record<string, unknown>;
    expect(unrated.aggregateRating).toBeUndefined();

    const noRating = businessEntity({ ...full, rating: null, reviewCount: 40 }) as Record<string, unknown>;
    expect(noRating.aggregateRating).toBeUndefined();
  });

  it("leaves a property out rather than publishing it empty", () => {
    const bare = businessEntity({ slug: "bare-co-dallas-tx", name: "Bare Co" }) as Record<string, unknown>;
    expect(bare.telephone).toBeUndefined();
    expect(bare.address).toBeUndefined();
    expect(bare.sameAs).toBeUndefined();
    expect(bare.hasCredential).toBeUndefined();
    expect(bare.priceRange).toBeUndefined();
    expect(Object.values(bare).every((value) => value !== null)).toBe(true);
  });

  it("keeps a placeholder out of sameAs", () => {
    const fake = businessEntity({
      ...full,
      website: "https://example.com",
      socialLinks: JSON.stringify({ facebook: "http://localhost/x" }),
    }) as Record<string, unknown>;
    expect(fake.sameAs).toBeUndefined();
  });

  it("passes its own audit", () => {
    assertSchemaClean(entity, "a full business");
  });
});

describe("the audit", () => {
  it("catches what must never ship", () => {
    const problems = auditSchema({
      "@type": "LocalBusiness",
      name: "Lorem Ipsum Plumbing",
      url: "https://example.com/x",
      description: "null",
      sameAs: [],
      aggregateRating: { "@type": "AggregateRating", ratingValue: 5, reviewCount: 0 },
    });

    const text = problems.map((row) => row.problem).join(" | ");
    expect(text).toMatch(/placeholder text/);
    expect(text).toMatch(/reserved domain/);
    expect(text).toMatch(/the string "null"/);
    expect(text).toMatch(/empty array/);
    expect(text).toMatch(/no reviews behind it/);
  });

  it("passes a clean graph", () => {
    expect(auditSchema({ "@type": "WebPage", name: "Fine", url: "https://tenbestfind.com/x/" })).toEqual([]);
  });
});

describe("a ranking list", () => {
  it("numbers its items from one and points at the business ids", () => {
    const list = rankingListEntity({
      path: "/ca/on/toronto/hvac/",
      name: "10 Best HVAC Companies in Toronto, ON",
      businesses: [
        { slug: "acme-hvac-toronto-on", name: "Acme HVAC", categorySlug: "hvac", cityName: "Toronto" },
        { slug: "beta-hvac-toronto-on", name: "Beta HVAC", categorySlug: "hvac", cityName: "Toronto" },
      ],
    }) as Record<string, any>;

    expect(list["@type"]).toBe("ItemList");
    expect(list.itemListOrder).toMatch(/Ascending/);
    expect(list.numberOfItems).toBe(2);
    expect(list.itemListElement[0].position).toBe(1);
    expect(list.itemListElement[0].item["@id"]).toMatch(/acme-hvac-toronto-on\/#business$/);
    expect(list.itemListElement[0].item["@type"]).toBe("HVACBusiness");
    expect(list.itemListElement[0].url).toMatch(/\/companies\/acme-hvac-toronto-on\/$/);
    assertSchemaClean(list, "a ranking list");
  });
});

describe("the row a template turns into an entity", () => {
  const row = {
    slug: "acme-hvac-toronto-on",
    name: "Acme HVAC",
    website: "https://acmehvac.ca",
    phone: "+1 416-555-0100",
    email: "are@risk.if",
    logoUrl: "/uploads/acme-logo.png",
    addressLine: "12 King Street West",
    postalCode: "M5H 1A1",
    latitude: 43.6489,
    longitude: -79.3817,
    hours: null,
    socialLinks: null,
    yearFounded: 1998,
    googleRating: 4.8,
    googleReviewCount: 312,
    category: { slug: "hvac" },
    credentials: [{ label: "TSSA registered", authority: "TSSA", identifier: "44821" }],
  };

  it("keeps an address that was never an address off the page", () => {
    const input = businessSchemaInput(row, { cityName: "Toronto", regionCode: "on", countryCode: "ca" });
    expect(input.email).toBeNull();
    expect(businessEntity(input).email).toBeUndefined();
  });

  it("gives a ranked company the same type and detail as its own profile", () => {
    const place = { cityName: "Toronto", regionCode: "on", countryCode: "ca" };
    const profile = businessEntity(businessSchemaInput(row, place)) as Record<string, any>;
    const list = rankingListEntity({
      path: "/ca/on/toronto/hvac/",
      name: "10 Best HVAC Companies in Toronto, ON",
      businesses: [businessSchemaInput(row, { ...place, categorySlug: "hvac" })],
    }) as Record<string, any>;

    const listed = list.itemListElement[0].item;
    expect(listed["@type"]).toBe(profile["@type"]);
    expect(listed.geo).toEqual(profile.geo);
    expect(listed.hasCredential).toEqual(profile.hasCredential);
    assertSchemaClean(list, "a ranking list");
    assertSchemaClean(profile, "a profile");
  });

  it("falls back to the page's trade when the row has no category", () => {
    const input = businessSchemaInput({ ...row, category: null }, { categorySlug: "plumbers" });
    expect(businessEntity(input)["@type"]).toBe("Plumber");
  });
});
