import { describe, expect, it } from "vitest";
import { checkEmail, isPublishableEmail } from "@/lib/email-quality";
import { checkPhoto } from "@/lib/photo-quality";
import { plausibleEmail } from "@/lib/emails";

/**
 * The addresses and the images enrichment used to keep. Every value in the
 * first list came off a real profile.
 */

const NEVER = [
  "press@google.com",
  "are@risk.if",
  "user@domain.com",
  "email@domain.com",
  "help@home.we",
  "find@times.fortunately",
  "fixtures@once.this",
  "soundly@night.we",
  "are@mr.rooter",
  "admin@seocompanysantamonica.com",
  "waterworks@614-490-2149.available",
];

describe("an address enrichment found", () => {
  it("refuses every one of the known bad values", () => {
    for (const email of NEVER) {
      expect(isPublishableEmail(email), email).toBe(false);
    }
  });

  it("keeps a real one", () => {
    expect(isPublishableEmail("info@acmehvac.ca")).toBe(true);
    expect(isPublishableEmail("dave@lab6.com")).toBe(true);
    expect(isPublishableEmail("johnsmith@gmail.com")).toBe(true);
  });

  it("allows a word local part on the company's own domain", () => {
    expect(isPublishableEmail("find@findpros.com", "findpros.com")).toBe(true);
    expect(isPublishableEmail("find@findpros.com", "www.findpros.com")).toBe(true);
  });

  it("says why, so a cleanup report reads", () => {
    const verdict = checkEmail("press@google.com");
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/google\.com/);
  });

  it("reports an agency domain rather than deciding on a name alone", () => {
    const verdict = checkEmail("admin@seocompanysantamonica.com");
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.review).toBe(true);
  });

  it("is applied by the crawler's own gate", () => {
    expect(plausibleEmail("fixtures@once.this")).toBe(false);
    expect(plausibleEmail("info@acmehvac.ca")).toBe(true);
  });
});

describe("an image on a contractor's website", () => {
  it("drops promotions, marks and furniture", () => {
    const rejected = [
      "/img/50-off-offer.jpg",
      "/uploads/promo-spring.png",
      "/img/coupon-2026.jpg",
      "/assets/financing-banner.jpg",
      "/img/rebate.png",
      "/img/bbb-badge.png",
      "/img/google-review-button.png",
      "/img/homestars-award.png",
      "/img/company-logo.png",
      "/img/popup-bg.jpg",
    ];
    for (const url of rejected) expect(checkPhoto({ url }).ok, url).toBe(false);
  });

  it("drops one by its alt text as well as its name", () => {
    expect(checkPhoto({ url: "/img/a1b2c3.jpg", alt: "Review us on Google" }).ok).toBe(false);
    expect(checkPhoto({ url: "/img/a1b2c3.jpg", alt: "BBB accredited business" }).ok).toBe(false);
  });

  it("drops anything too small or the wrong shape", () => {
    expect(checkPhoto({ url: "/img/roof.jpg", width: 320 }).ok).toBe(false);
    expect(checkPhoto({ url: "/img/roof.jpg", width: 1600, height: 200 }).ok).toBe(false);
    expect(checkPhoto({ url: "/img/roof.jpg", width: 400, height: 1400 }).ok).toBe(false);
  });

  it("keeps a photograph, including one whose size the page never gave", () => {
    expect(checkPhoto({ url: "/uploads/new-roof-toronto.jpg" }).ok).toBe(true);
    expect(checkPhoto({ url: "/uploads/kitchen.jpg", width: 1200, height: 800 }).ok).toBe(true);
  });
});
