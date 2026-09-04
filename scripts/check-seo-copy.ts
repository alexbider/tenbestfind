// What every page calls itself, checked against the rules rather than the code.
//
// The three that matter are the ones a page can lie about: a Top 10 that is
// not ten, a year nobody reviewed, and a description promising something the
// page does not show. Each is checked here in both directions.

import {
  cityCopy,
  companyCopy,
  countryCopy,
  homeCopy,
  rankingCopy,
  regionCopy,
  serviceCopy,
  subserviceCopy,
} from "../src/lib/seo-copy";
import { breadcrumbSchema, companyCrumbs, cityCrumbs, rankingCrumbs } from "../src/lib/breadcrumbs";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok   " : "WRONG"} ${label}`);
  if (!ok) console.log(`        got:      ${String(actual)}\n        expected: ${String(expected)}`);
}

const columbus = { name: "Columbus" };
const ohio = { code: "oh", name: "Ohio" };
const us = { code: "us", name: "United States" };
const plumbers = { name: "Plumbers", slug: "plumbers", serviceName: "Plumbing" };

console.log("titles and headings:");
check("home title", homeCopy().title, "10 Best Local Businesses Near You | TenBestFind");
check("home h1", homeCopy().h1, "Find the 10 Best Local Service Companies in Your City");
check(
  "service title",
  serviceCopy(plumbers, { publishedRankings: 3 }).title,
  "Best Plumbers Near You | TenBestFind",
);
check("service h1", serviceCopy(plumbers, { publishedRankings: 3 }).h1, "Best Plumbers Near You");
check(
  "country title",
  countryCopy(us, { publishedRankings: 3 }).title,
  "Best Home Service Companies in the U.S. | TenBestFind",
);
check(
  "country h1",
  countryCopy(us, { publishedRankings: 3 }).h1,
  "Best Home Service Companies in the United States",
);
check(
  "region title",
  regionCopy(ohio, { publishedRankings: 3 }).title,
  "Best Home Service Companies in Ohio | TenBestFind",
);
check(
  "city title",
  cityCopy(columbus, ohio, { publishedRankings: 2 }).title,
  "Best Home Service Companies in Columbus, OH | TenBestFind",
);
check(
  "subservice h1 uses the search term",
  subserviceCopy(
    { name: "Emergency Plumbing", searchTerm: "Emergency Plumbers" },
    plumbers,
    { businesses: 8, publishedRankings: 2 },
  ).h1,
  "Emergency Plumbers Near You",
);
check(
  "subservice h1 falls back to the name",
  subserviceCopy({ name: "Drain Cleaning" }, plumbers, { businesses: 8, publishedRankings: 2 }).h1,
  "Drain Cleaning Near You",
);

console.log("\nthe Top 10 rule:");
const reviewed = new Date("2026-03-04T00:00:00Z");
const full = rankingCopy(
  { status: "PUBLISHED", lastReviewedAt: reviewed },
  plumbers,
  columbus,
  ohio,
  { publishedEntries: 10 },
);
check("ten published says ten", full.title, "10 Best Plumbers in Columbus, OH (2026)");
check("the h1 carries no year", full.h1, "10 Best Plumbers in Columbus, OH");
check(
  "the description says ten",
  full.description.startsWith("Compare the 10 best plumbers in Columbus, OH"),
  true,
);

const short = rankingCopy(
  { status: "PUBLISHED", lastReviewedAt: reviewed },
  plumbers,
  columbus,
  ohio,
  { publishedEntries: 7 },
);
check("seven does not say ten", short.title, "Best Plumbers in Columbus, OH");
check("seven h1 does not say ten", short.h1, "Best Plumbers in Columbus, OH");
check("seven description does not say ten", short.description.includes("10 best"), false);
check("seven carries no year either", short.title.includes("("), false);

console.log("\nthe year rule:");
const neverReviewed = rankingCopy(
  { status: "PUBLISHED", lastReviewedAt: null },
  plumbers,
  columbus,
  ohio,
  { publishedEntries: 10 },
);
check("no review date, no year", neverReviewed.title, "10 Best Plumbers in Columbus, OH");
const lastYear = rankingCopy(
  { status: "PUBLISHED", lastReviewedAt: new Date("2025-11-02T00:00:00Z") },
  plumbers,
  columbus,
  ohio,
  { publishedEntries: 10 },
);
check("the year is the review year, not this one", lastYear.title, "10 Best Plumbers in Columbus, OH (2025)");

console.log("\nindexability:");
check("a draft ranking stays out", rankingCopy({ status: "DRAFT" }, plumbers, columbus, ohio, { publishedEntries: 10 }).indexable, false);
check("an empty city stays out", cityCopy(columbus, ohio, { publishedRankings: 0 }).indexable, false);
check("a city with a ranking goes in", cityCopy(columbus, ohio, { publishedRankings: 1 }).indexable, true);
check(
  "a subservice with two companies stays out",
  subserviceCopy({ name: "Drain Cleaning" }, plumbers, { businesses: 2, publishedRankings: 4 }).indexable,
  false,
);
check(
  "a subservice with five goes in",
  subserviceCopy({ name: "Drain Cleaning" }, plumbers, { businesses: 5, publishedRankings: 4 }).indexable,
  true,
);

console.log("\ncompany profiles:");
const tom = { name: "1-Tom-Plumber" };
const withReviews = companyCopy(tom, columbus, ohio, plumbers, { hasReviews: true, thin: false });
check("title", withReviews.title, "1-Tom-Plumber in Columbus, OH | Reviews & Services");
check("h1 is the company and nothing else", withReviews.h1, "1-Tom-Plumber");
check("the line under it", withReviews.support, "Plumbing Company in Columbus, Ohio");
check(
  "description",
  withReviews.description,
  "Research 1-Tom-Plumber in Columbus, OH. See plumbing services, review data, service areas, company details and its TenBestFind profile.",
);

const noReviews = companyCopy(tom, columbus, ohio, plumbers, { hasReviews: false, thin: false });
check("no review data, no promise of reviews", noReviews.title, "1-Tom-Plumber in Columbus, OH | Services & Information");
check("nor in the description", noReviews.description.toLowerCase().includes("review"), false);

const thin = companyCopy(tom, columbus, ohio, plumbers, { hasReviews: false, thin: true });
check(
  "a thin profile says so",
  thin.description,
  "View available information for 1-Tom-Plumber in Columbus, OH, including services, location, contact details and TenBestFind research status.",
);

console.log("\nbreadcrumbs:");
const abs = (path: string) => `https://tenbestfind.com${path}`;
const companyTrail = companyCrumbs(us, { slug: "oh", name: "Ohio" }, { slug: "columbus", name: "Columbus" }, plumbers, tom);
check(
  "company trail",
  companyTrail.map((crumb) => crumb.label).join(" > "),
  "Home > United States > Ohio > Columbus > Plumbers > 1-Tom-Plumber",
);
check(
  "city trail goes through Locations",
  cityCrumbs(us, { slug: "oh", name: "Ohio" }, columbus).map((crumb) => crumb.label).join(" > "),
  "Home > Locations > United States > Ohio > Columbus",
);
check(
  "ranking trail does not",
  rankingCrumbs(us, { slug: "oh", name: "Ohio" }, { slug: "columbus", name: "Columbus" }, plumbers)
    .map((crumb) => crumb.label)
    .join(" > "),
  "Home > United States > Ohio > Columbus > Plumbers",
);

const schema = breadcrumbSchema(companyTrail, abs) as {
  itemListElement: { position: number; name: string; item?: string }[];
};
check("the schema walks the same trail", schema.itemListElement.length, companyTrail.length);
check("positions start at one", schema.itemListElement[0]!.position, 1);
check("the last crumb is not a link", schema.itemListElement.at(-1)!.item, undefined);
check(
  "the trade crumb points at the ranking",
  schema.itemListElement[4]!.item,
  "https://tenbestfind.com/us/oh/columbus/plumbers/",
);

console.log(failures === 0 ? "\nall good" : `\n${failures} wrong`);
process.exit(failures === 0 ? 0 : 1);
