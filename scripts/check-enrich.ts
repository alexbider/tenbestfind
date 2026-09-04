/**
 * Exercises the website-reading half of enrichment against a page you control.
 *
 * The crawler and the YouTube reader are the two pieces with no unit test of
 * their own and the two most likely to be broken by a change to a regular
 * expression, so this walks both: it crawls a URL and prints what came back,
 * then parses a captured channel page and feed without going near the network.
 *
 *   npx tsx scripts/check-enrich.ts http://127.0.0.1:3300/index.html
 */
import { collectEmails, decodeCloudflareEmail, rankEmails } from "../src/lib/emails";
import { isOwnWebsite } from "../src/lib/enrich";
import { classify } from "../src/lib/import-pipeline";
import { crawlSite } from "../src/lib/site-crawl";
import { extractionJsonSchema, extractionSchema } from "../src/lib/site-extract";
import { channelIdFor, latestChannelVideos } from "../src/lib/youtube";

const CHANNEL_PAGE = `<!doctype html><html><head>
<link rel="canonical" href="https://www.youtube.com/channel/UCabcdefghijklmnopqrstu">
<meta itemprop="channelId" content="UCabcdefghijklmnopqrstu">
</head><body><script>{"externalId":"UCabcdefghijklmnopqrstu"}</script></body></html>`;

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
 <entry><yt:videoId>aaaaaaaaaaa</yt:videoId><title>Full tear-off in Plano &amp; Frisco</title><published>2026-06-14T09:00:00+00:00</published></entry>
 <entry><yt:videoId>eeeeeeeeeee</yt:videoId><title>Standing seam metal install</title><published>2026-05-02T09:00:00+00:00</published></entry>
 <entry><yt:videoId>fffffffffff</yt:videoId><title>Insurance claim walkthrough</title><published>2026-04-11T09:00:00+00:00</published></entry>
 <entry><yt:videoId>ggggggggggg</yt:videoId><title>One too many</title><published>2026-03-01T09:00:00+00:00</published></entry>
</feed>`;

/**
 * Counts the fields in the tool schema whose type is a union. The API refuses a
 * schema carrying more than a couple of dozen of them, and it refuses at call
 * time rather than at build time, so nothing but a check like this catches a
 * nullable field being added back.
 */
function unionFields(node: unknown, path = "", found: string[] = []): string[] {
  if (!node || typeof node !== "object") return found;
  const record = node as Record<string, unknown>;
  if (Array.isArray(record.type) || Array.isArray(record.anyOf) || Array.isArray(record.oneOf)) {
    found.push(path || "(root)");
  }
  for (const [key, value] of Object.entries(record)) {
    if (key === "description" || key === "enum" || key === "required") continue;
    if (Array.isArray(value)) value.forEach((item, i) => unionFields(item, `${path}.${key}[${i}]`, found));
    else unionFields(value, path ? `${path}.${key}` : key, found);
  }
  return found;
}

/** The shape a model actually sends back, sentinels and all. */
const SAMPLE = {
  staff: [{ name: "Ray Alvarez", role: "Owner", bio: "", yearsExperience: 0, credentials: [] }],
  yearFounded: 2008,
  employeeCount: "",
  licenseNumbers: ["TX-0801442"],
  certifications: [],
  paymentMethods: [],
  awards: [],
  brands: [],
  insured: "yes",
  warrantyTerms: "10-year workmanship",
  services: ["Roof repair"],
  specialties: [],
  areasServed: ["Plano"],
  serviceRadiusKm: 0,
  hours: [{ day: "Monday", opens: "07:00", closes: "18:00", closed: false }],
  bbbRating: "A+",
  bbbAccreditedSince: 0,
  inspectionFee: "",
  manufacturerWarranty: "",
  bestFor: "residential roof replacement",
  tagline: "",
  postalCode: "75201",
  emergency: "unknown",
  financing: "no",
  freeEstimates: "yes",
  phone: "(214) 555-0142",
  addressLine: "2118 Commerce St",
  summary: "",
};

/**
 * One page carrying an address in every shape a site hides one in, plus three
 * that must not be taken for the company's own.
 */
const EMAIL_PAGE = `
<a class="__cf_email__" data-cfemail="2a454c4c43494f6a48465f4f484544444f5e4f525e4f584345585904494547">[email protected]</a>
<a href="mailto:estimates@bluebonnetexteriors.com?subject=Quote">write to us</a>
Accounts: billing&#64;bluebonnetexteriors&#46;com
Storm team: storm (at) bluebonnetexteriors (dot) com
Old crew: bluebonnetroofs at gmail dot com
Site by <a href="mailto:webmaster@themeshop.io">the theme shop</a>.
Do not reply to noreply@bluebonnetexteriors.com.
<img src="/img/logo@2x.png" alt="logo">
`;

const EMAIL_EXPECTED = [
  "office@bluebonnetexteriors.com",
  "estimates@bluebonnetexteriors.com",
  "billing@bluebonnetexteriors.com",
];

function checkEmails(): void {
  console.log(
    "cloudflare decode:",
    decodeCloudflareEmail("2a454c4c43494f6a48465f4f484544444f5e4f525e4f584345585904494547"),
  );
  const finds = collectEmails(EMAIL_PAGE, "bluebonnetexteriors.com", "/contact");
  const all = finds.sort((a, b) => b.score - a.score).map((f) => `${f.score} ${f.email}`);
  console.log("found:", all);

  const ranked = rankEmails(finds);
  const ok = JSON.stringify(ranked) === JSON.stringify(EMAIL_EXPECTED);
  console.log(ok ? "ranking OK" : `ranking WRONG, got ${JSON.stringify(ranked)}`);

  for (const rejected of ["webmaster@themeshop.io", "noreply@bluebonnetexteriors.com", "logo@2x.png"]) {
    const kept = finds.some((f) => f.email === rejected);
    console.log(`  ${kept ? "STILL PRESENT" : "rejected"}: ${rejected}`);
  }
}

/** The website check, which is the one that decides what gets paid for. */
async function checkGate(): Promise<void> {
  const own: [string | null, boolean][] = [
    ["https://lonestarroofing.com", true],
    ["lonestarroofing.co.uk", true],
    ["https://sites.google.com/view/lonestar", true],
    ["https://www.facebook.com/lonestarroofing", false],
    ["https://m.facebook.com/lonestarroofing", false],
    ["https://www.yelp.com/biz/lone-star-roofing", false],
    ["https://linktr.ee/lonestar", false],
    ["", false],
    [null, false],
  ];
  for (const [value, expected] of own) {
    const got = isOwnWebsite(value);
    console.log(`  ${got === expected ? "ok  " : "WRONG"} isOwnWebsite(${JSON.stringify(value)}) = ${got}`);
  }

  const place = {
    placeId: null,
    title: "Nowhere Roofing",
    website: null,
    phone: null,
    address: null,
    rating: 4.9,
    reviewCount: 100,
    permanentlyClosed: false,
    temporarilyClosed: false,
  };
  const city = (await import("../src/lib/db")).db.city.findFirst({ select: { id: true } });
  const cityId = (await city)?.id;
  if (!cityId) return console.log("  no city in the database, skipping the classify checks");

  const gated = { minRating: null, minReviews: null, requireWebsite: true };
  const ungated = { minRating: null, minReviews: null, requireWebsite: false };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = (p: Record<string, unknown>, b: typeof gated) => classify(p as any, cityId, b);

  console.log("  no website, gate on: ", (await run(place, gated)).reason);
  console.log("  no website, gate off:", (await run(place, ungated)).status);
  console.log(
    "  facebook only, gate on:",
    (await run({ ...place, website: "https://facebook.com/nowhere" }, gated)).reason,
  );
  console.log(
    "  real website, gate on: ",
    (await run({ ...place, website: "https://nowhereroofing.example.org" }, gated)).status,
  );
}

async function main(): Promise<void> {
  checkEmails();
  console.log("\nimport gate:");
  await checkGate();
  console.log();

  const unions = unionFields(extractionJsonSchema);
  console.log("union-typed fields in the tool schema:", unions.length, unions.slice(0, 6));

  const parsed = extractionSchema.parse(SAMPLE);
  console.log("sentinels become null:", {
    employeeCount: parsed.employeeCount,
    serviceRadiusKm: parsed.serviceRadiusKm,
    bbbAccreditedSince: parsed.bbbAccreditedSince,
    summary: parsed.summary,
    staffBio: parsed.staff[0]?.bio,
    staffYears: parsed.staff[0]?.yearsExperience,
  });
  console.log("claims become booleans:", {
    emergency: parsed.emergency,
    financing: parsed.financing,
    freeEstimates: parsed.freeEstimates,
    insured: parsed.insured,
  });

  // A model that ignores the instruction and sends nulls and real booleans.
  const loose = extractionSchema.parse({
    ...SAMPLE,
    employeeCount: null,
    yearFounded: null,
    emergency: true,
    financing: false,
    bbbRating: null,
  });
  console.log("null and boolean tolerated:", {
    employeeCount: loose.employeeCount,
    yearFounded: loose.yearFounded,
    emergency: loose.emergency,
    financing: loose.financing,
    bbbRating: loose.bbbRating,
  });

  const url = process.argv[2];
  if (url) {
    const site = await crawlSite(url);
    console.log("pages read:", site.pagesRead);
    console.log("summary:", site.summary?.slice(0, 80));
    console.log("year founded:", site.yearFounded);
    console.log("phones:", site.phones, "emails:", site.emails);
    console.log("licences:", site.licenseNumbers);
    console.log("social:", site.social);
    console.log("videos:", site.videos);
  }

  // The two YouTube steps, against captured responses rather than the network.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const target = String(input);
    const body = target.includes("feeds/videos.xml") ? FEED : CHANNEL_PAGE;
    return new Response(body, { status: 200 });
  }) as typeof fetch;

  try {
    const fromHandle = await channelIdFor("https://www.youtube.com/@bluebonnetexteriors");
    const fromChannelUrl = await channelIdFor(
      "https://www.youtube.com/channel/UCabcdefghijklmnopqrstu",
    );
    console.log("channel id from a handle:", fromHandle);
    console.log("channel id from a channel url:", fromChannelUrl);
    console.log("not youtube:", await channelIdFor("https://example.com/"));
    console.log("latest three:", await latestChannelVideos("UCabcdefghijklmnopqrstu", 3));
  } finally {
    globalThis.fetch = realFetch;
  }
}

main();
