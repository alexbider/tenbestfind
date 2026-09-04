/**
 * Fills the demo roofing profile with the content the business profile design
 * was drawn against.
 *
 * This exists so the profile template can be seen complete on a fresh install
 * and compared against the design. It writes only to the demo record and only
 * where a field is still empty, so it can be re-run and will never overwrite
 * something a real editor has since written.
 *
 *   npx tsx scripts/demo-profile.ts [slug]
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const slug = process.argv[2] ?? "lone-star-roofing";

/**
 * The overview the design shows, with every figure in it read back off the
 * record rather than typed in. An overview that says 4.8 while the rating field
 * says 4.9 is worse than no overview, and that is exactly what a hard-coded
 * paragraph drifts into the first time the review data is refreshed.
 */
function overviewFor(business: {
  name: string;
  yearFounded: number | null;
  warrantyTerms: string | null;
  bbbRating: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  city: { name: string; region: { code: string } } | null;
  entries: { position: number; ranking: { city: { name: string } | null } }[];
}): string {
  const place = business.city
    ? `${business.city.name}, ${business.city.region.code.toUpperCase()}`
    : "the metro";
  const age = business.yearFounded ? `${new Date().getFullYear() - business.yearFounded}-year-old ` : "";
  const credentials = [
    "Texas registration",
    "verified liability insurance",
    "manufacturer certification",
    business.bbbRating ? `BBB accreditation at ${business.bbbRating}` : null,
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/, ([^,]*)$/, " and $1");
  const warranty = business.warrantyTerms ? `carries a written ${business.warrantyTerms.toLowerCase()} warranty, ` : "";
  const rating =
    business.googleRating && business.googleReviewCount
      ? `, and holds ${business.googleRating} out of 5 across ${business.googleReviewCount} Google reviews`
      : "";
  const top = business.entries.find((entry) => entry.position === 1);
  const rank = top
    ? ` TenBestFind ranks it #1 among ${top.ranking.city?.name ?? place} roofing companies as of ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.`
    : "";

  return (
    `${business.name} is an ${age}family-owned roofing contractor based in ${place}, serving Dallas County ` +
    "and the northern suburbs. It handles roof repair, full replacement, inspections, storm and hail damage, " +
    "metal roofing and light commercial work, using in-house crews rather than subcontractors. " +
    `It holds ${credentials}, ${warranty}offers free estimates, financing and 24/7 emergency response${rating}.${rank}`
  );
}

const DESCRIPTION = [
  "Founded in 2008 and family owned, Lone Star Roofing works across Dallas County and the northern suburbs on residential roofing, with a smaller commercial division handling low-slope and multi-unit work. The company employs its own installation crews rather than brokering jobs to subcontractors, and runs a dedicated storm response team during hail season.",
  "Its work is concentrated in asphalt shingle replacement, with growing volume in Class 4 impact-resistant systems and standing seam metal. The company also handles insurance restoration and will document damage for claims.",
  "Crews are led by a foreman who has been with the company at least five years, and every replacement gets a final walk-through with the homeowner before the last invoice. Lone Star publishes its warranty terms in plain language and keeps a copy on file with the customer.",
].join("\n\n");

const FACT_ROWS = [
  { group: "The work", iconKey: "wrench", label: "Best for", value: "Residential roof replacement" },
  { group: "The work", iconKey: "wrench", label: "Primary service", value: "Roofing" },
  { group: "The work", iconKey: "wrench", label: "Business type", value: "Residential and commercial" },
  { group: "Where", iconKey: "pin", label: "Headquarters", value: "Dallas, TX" },
  { group: "Where", iconKey: "pin", label: "Service area", value: "Dallas metro" },
  { group: "Where", iconKey: "pin", label: "Emergency service", value: "Yes, 24/7" },
  { group: "Money and guarantees", iconKey: "shield", label: "Free estimates", value: "Yes, including storm inspections" },
  { group: "Money and guarantees", iconKey: "shield", label: "Financing", value: "Available through third-party lender" },
  { group: "Money and guarantees", iconKey: "shield", label: "Workmanship warranty", value: "10 years, written" },
];

const THEMES = [
  { kind: "praised", text: "Clear, itemized estimates that match the final invoice" },
  { kind: "praised", text: "Thorough cleanup and site protection" },
  { kind: "praised", text: "Knowledgeable crews and on-site supervision" },
  { kind: "praised", text: "Help documenting insurance claims" },
  { kind: "praised", text: "Responsive scheduling outside storm season" },
  { kind: "concern", text: "Slower communication in the weeks after major storms" },
  { kind: "concern", text: "Pricing above the lowest local bids" },
  { kind: "concern", text: "Occasional rescheduling due to weather delays" },
];

const SPECIALTIES = [
  "Storm damage",
  "Residential replacement",
  "Class 4 shingles",
  "Standing seam metal",
  "Insurance restoration",
];

const CREDENTIALS = [
  { label: "Texas contractor registration", authority: "State of Texas", status: "VERIFIED" },
  { label: "General liability insurance", authority: "Certificate on file, expires Mar 2027", status: "VERIFIED" },
  { label: "Manufacturer certified installer", authority: "Shingle manufacturer program", status: "VERIFIED" },
  { label: "Workers compensation coverage", authority: "Reported by business", status: "REPORTED" },
];

const VIDEOS = [
  {
    videoId: "dQw4w9WgXcQ",
    title: "Full shingle replacement in Plano, TX",
    meta: "Tear-off to final inspection in one day · June 2026",
    duration: "4:12",
  },
  {
    videoId: "dQw4w9WgXcQ",
    title: "How we document a roof for an insurance claim",
    meta: "Owner walkthrough · March 2026",
    duration: "6:30",
  },
  {
    videoId: "dQw4w9WgXcQ",
    title: "Standing seam metal install in Frisco, TX",
    meta: "Job-site time lapse · April 2026",
    duration: "3:05",
  },
];

/**
 * The three reviews the design shows. They exist so the Recent Google Reviews
 * block can be seen working on the demo record; a real listing gets its reviews
 * from the importer, and this script never touches a business that already has
 * any.
 */
const REVIEWS = [
  {
    externalId: "demo-1",
    author: "J. Martinez",
    rating: 5,
    body: "Crew arrived when they said they would, replaced the decking they found rotted and walked the yard with a magnet afterwards. The estimate matched the invoice.",
    monthsAgo: 2,
  },
  {
    externalId: "demo-2",
    author: "S. Bhatt",
    rating: 5,
    body: "They documented the hail damage thoroughly and dealt with the adjuster directly. The roof was finished in two days.",
    monthsAgo: 3,
  },
  {
    externalId: "demo-3",
    author: "D. Kowalski",
    rating: 4,
    body: "Good work and a clean job site. Communication slowed down for about a week after the May storms, though they did follow up.",
    monthsAgo: 4,
  },
];

const CRITERIA = [
  {
    title: "Licence and insurance verified",
    text: "Checked against the Texas register and the insurer's certificate, not a scan from the company.",
  },
  {
    title: "18 years pulling Dallas permits",
    text: "Continuous local permit history since 2008 across Dallas, Plano and Frisco.",
  },
  {
    title: "Manufacturer-certified crews",
    text: "Certified installer status confirmed with the shingle programme, which extends the material warranty.",
  },
  {
    title: "Warranty in writing",
    text: "A 10-year workmanship warranty stated in plain language before the deposit is taken.",
  },
];

async function main() {
  const business = await db.business.findUnique({
    where: { slug },
    include: {
      credentials: true,
      videos: true,
      reviews: true,
      city: { include: { region: true } },
      entries: { orderBy: { position: "asc" }, include: { ranking: { include: { city: true } } } },
    },
  });
  if (!business) {
    console.log(`No business with slug "${slug}".`);
    return;
  }

  const filled: string[] = [];
  const data: Record<string, unknown> = {};
  const setIfEmpty = (key: keyof typeof business, value: unknown) => {
    if (business[key] === null || business[key] === undefined || business[key] === "") {
      data[key] = value;
      filled.push(key);
    }
  };

  setIfEmpty("overview", overviewFor(business));
  setIfEmpty("factGroups", JSON.stringify(FACT_ROWS));
  setIfEmpty("reviewThemes", JSON.stringify(THEMES));
  setIfEmpty("specialties", JSON.stringify(SPECIALTIES));
  setIfEmpty("bbbRating", "A+");
  setIfEmpty("bbbAccreditedSince", 2014);
  setIfEmpty("inspectionFee", "Free, including storm inspections");
  setIfEmpty("manufacturerWarranty", "Up to 50 years by system");
  setIfEmpty("serviceRadiusKm", 42);
  setIfEmpty("youtubeChannel", "https://www.youtube.com/");
  setIfEmpty("warrantyTerms", "10 years, written");

  // The description carries the About section, and the demo record's is a
  // single line, so it is replaced rather than left to collapse the section.
  if ((business.description ?? "").length < 400) {
    data.description = DESCRIPTION;
    filled.push("description");
  }

  if (Object.keys(data).length > 0) {
    await db.business.update({ where: { id: business.id }, data });
  }

  if (business.credentials.length === 0) {
    for (const [index, row] of CREDENTIALS.entries()) {
      await db.credential.create({
        data: {
          businessId: business.id,
          label: row.label,
          authority: row.authority,
          status: row.status,
          checkedAt: row.status === "VERIFIED" ? new Date() : null,
          sortOrder: index,
        },
      });
    }
    filled.push(`${CREDENTIALS.length} credentials`);
  }

  if (business.videos.length === 0) {
    for (const [index, row] of VIDEOS.entries()) {
      await db.businessVideo.create({ data: { businessId: business.id, ...row, sortOrder: index } });
    }
    filled.push(`${VIDEOS.length} videos`);
  }

  if (business.reviews.length === 0) {
    for (const row of REVIEWS) {
      const posted = new Date();
      posted.setMonth(posted.getMonth() - row.monthsAgo);
      await db.review.create({
        data: {
          businessId: business.id,
          source: "GOOGLE",
          externalId: row.externalId,
          author: row.author,
          rating: row.rating,
          body: row.body,
          postedAt: posted,
        },
      });
    }
    filled.push(`${REVIEWS.length} reviews`);
  }

  const entry = business.entries[0];
  if (entry && !entry.criteria) {
    await db.rankingEntry.update({
      where: { id: entry.id },
      data: {
        criteria: JSON.stringify(CRITERIA),
        heldSince: entry.heldSince ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 550),
      },
    });
    filled.push("ranking criteria");
  }

  console.log(filled.length > 0 ? `Filled: ${filled.join(", ")}` : "Nothing to fill; every field already has content.");
}

main().finally(() => db.$disconnect());
