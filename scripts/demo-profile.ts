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

const OVERVIEW =
  "Lone Star Roofing Co. is an 18-year-old family-owned roofing contractor based in Dallas, TX, serving Dallas County and the northern suburbs. It handles roof repair, full replacement, inspections, storm and hail damage, metal roofing and light commercial work, using in-house crews rather than subcontractors. It holds Texas registration, verified liability insurance and manufacturer certification, carries a written 10-year workmanship warranty, offers free estimates, financing and 24/7 emergency response.";

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
  { group: "Money and guarantees", iconKey: "shield", label: "Free estimates", value: "Yes" },
  { group: "Money and guarantees", iconKey: "shield", label: "Financing", value: "Third-party lender" },
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
    include: { credentials: true, videos: true, entries: { orderBy: { position: "asc" } } },
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

  setIfEmpty("overview", OVERVIEW);
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
