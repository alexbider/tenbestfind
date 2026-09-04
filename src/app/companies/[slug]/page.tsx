import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/site/SiteChrome";
import { TrackView } from "@/components/site/Track";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { QuoteDialog } from "@/components/site/QuoteDialog";
import { AboutBody } from "@/components/site/AboutBody";
import { AreasMap, type MapArea } from "@/components/site/AreasMap";
import { ProjectVideos } from "@/components/site/ProjectVideos";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd, Media } from "@/components/ui/primitives";
import { fullDate, monthYear, priceRange } from "@/lib/format";
import { parseJson, parseList, parseRows, type HoursRow } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { seoFor } from "@/lib/seo";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

/* -------------------------------------------------------------- the shapes
   Named rather than inlined because most of them are used twice: once to
   decide whether a section has anything to say, and once to render it. */

const SHELL = { maxWidth: "1240px", margin: "0 auto" } as const;
const SECTION_H2 = { fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700" } as const;
const CARD = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "18px",
  padding: "22px 24px",
  boxShadow: "var(--shadow-sm)",
} as const;
const POP_NOTE = {
  position: "absolute",
  top: "calc(100% + 10px)",
  left: "0",
  zIndex: "180",
  background: "var(--blue-900)",
  color: "var(--text-on-ink)",
  borderRadius: "16px",
  boxShadow: "var(--shadow-xl)",
  padding: "18px 20px",
} as const;
const POP_SUMMARY = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  fontSize: "13px",
  fontWeight: "600",
  color: "var(--text-secondary)",
} as const;
const POP_MARK = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "18px",
  height: "18px",
  borderRadius: "50%",
  border: "1.5px solid var(--border-strong)",
  fontSize: "11px",
  fontWeight: "700",
  color: "var(--color-primary)",
} as const;

/** The gold star the rating lines are built from. */
function Star({ size = 20, filled = true }: { size?: number; filled?: boolean }) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#D99A1C" stroke="none" aria-hidden="true">
      <path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D99A1C" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z" />
    </svg>
  );
}

/** The tick used on every "we checked this" list. */
function Tick({ colour, size = 16 }: { colour: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colour}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: "0", marginTop: "3px" }}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** The caution mark, for the things worth checking before signing. */
function Caution({ colour, size = 16 }: { colour: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colour}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: "0", marginTop: "3px" }}
    >
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

/** The chevron that ends every row link. */
function RowChevron({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: "0" }}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/**
 * The "i" popovers. Every claim on this page that is not self-evident carries
 * one saying where it came from, which is the point of the design.
 */
function Pop({
  label,
  children,
  width = "min(420px, 78vw)",
  align = "left",
  above = false,
  compact = false,
  style,
}: {
  label: string;
  children: React.ReactNode;
  width?: string;
  align?: "left" | "right";
  above?: boolean;
  /** Sits inline in the badge row, where the design tightens the hit area. */
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <details data-pop="" style={{ position: "relative", ...style }}>
      <summary
        aria-label={label}
        style={compact ? { ...POP_SUMMARY, padding: "0 6px", minHeight: "34px" } : POP_SUMMARY}
      >
        <span style={POP_MARK}>i</span>
        {label}
      </summary>
      <div
        role="note"
        style={{
          ...POP_NOTE,
          width,
          ...(align === "right" ? { left: "auto", right: "0" } : null),
          ...(above ? { top: "auto", bottom: "calc(100% + 10px)" } : null),
        }}
      >
        {children}
      </div>
    </details>
  );
}

function PopText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "13px", lineHeight: "1.65", color: "rgba(232,237,245,0.88)" }}>{children}</p>
  );
}

function PopLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <p style={{ marginTop: "12px" }}>
      <Link href={href} style={{ fontSize: "13px", fontWeight: "600", color: "#E8B551" }}>
        {children}
      </Link>
    </p>
  );
}

/**
 * The plural noun for a trade. Most categories already hold one ("Plumbers"),
 * but where the category is named for the work rather than the people
 * ("Roofing") that reads wrong in a sentence, so "companies" is added.
 */
function tradePlural(name: string, serviceName: string): string {
  return name === serviceName ? `${name} companies` : name;
}

/** Initials for the avatar squares, from whatever name we hold. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

async function loadBusiness(slug: string) {
  return db.business.findUnique({
    where: { slug },
    include: {
      category: true,
      city: { include: { region: { include: { country: true } } } },
      credentials: { orderBy: { sortOrder: "asc" } },
      photos: { orderBy: { sortOrder: "asc" } },
      videos: { orderBy: { sortOrder: "asc" } },
      reviews: { orderBy: { postedAt: "desc" }, take: 10 },
      services: { include: { subservice: true } },
      areas: { include: { city: { include: { region: true } } } },
      entries: {
        orderBy: { position: "asc" },
        include: {
          ranking: {
            include: {
              category: true,
              author: true,
              city: { include: { region: { include: { country: true } } } },
              // How long the list actually is, so the profile says "of 10"
              // only when there really are ten on it.
              _count: { select: { entries: true } },
            },
          },
        },
      },
      placements: { where: { status: "ACTIVE" } },
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await loadBusiness(slug);
  if (!business) return {};
  const place = business.city ? `${business.city.name}, ${business.city.region.code.toUpperCase()}` : "";
  return seoFor("business", business.id, {
    title: `${business.name} — ${business.category.serviceName}${place ? ` in ${place}` : ""}`,
    description:
      business.overview ??
      business.description ??
      `Profile for ${business.name}: services, credentials, coverage area, contact details and our editorial take.`,
    path: routes.business(business.slug),
    image: business.logoUrl,
  });
}

export default async function BusinessProfilePage({ params }: Props) {
  const { slug } = await params;
  const business = await loadBusiness(slug);
  if (!business || business.status !== "PUBLISHED") {
    await redirectIfKnown(routes.business(slug));
    notFound();
  }

  const city = business.city;
  const region = city?.region;
  const country = region?.country;
  const placeLabel = city ? `${city.name}, ${region!.code.toUpperCase()}` : "";
  const strengths = parseList(business.strengths);
  const considerations = parseList(business.considerations);
  const specialties = parseList(business.specialties);
  const hours = parseJson<HoursRow[]>(business.hours, []);
  const isSponsored = business.placements.length > 0;
  const yearsInBusiness = business.yearFounded ? new Date().getFullYear() - business.yearFounded : null;
  const initials = initialsOf(business.name);

  // The top position this company holds. The rank mark is built from it, so a
  // company on no list simply has no rank section.
  const topEntry = business.entries[0] ?? null;
  const topRanking = topEntry?.ranking ?? null;

  // What recurs across the reviews, as an editor summarised it. Kept apart
  // from strengths and considerations, which are our own assessment.
  const themes = parseRows(business.reviewThemes);
  const praised = themes.filter((row) => row.kind !== "concern").map((row) => row.text);
  const concerns = themes.filter((row) => row.kind === "concern").map((row) => row.text);

  // Google's star distribution, as percentages of the reviews it covers. Only
  // the bands Google actually returned are drawn; we never fill a gap with an
  // estimate.
  const rawDistribution = parseJson<Record<string, number>>(business.googleDistribution, {});
  const distributionTotal = Object.values(rawDistribution).reduce((sum, value) => sum + value, 0);
  const distribution = [5, 4, 3, 2, 1]
    .filter((stars) => rawDistribution[String(stars)] !== undefined)
    .map((stars) => {
      const count = rawDistribution[String(stars)] ?? 0;
      const pct = distributionTotal > 0 ? Math.round((count / distributionTotal) * 100) : 0;
      return { label: `${stars} star${stars === 1 ? "" : "s"}`, pct: `${pct}%`, count };
    });

  // Reviews with something written in them. A bare star tells a reader nothing
  // that the count beside the rating has not already said.
  const shownReviews = business.reviews.filter((review) => review.body.trim().length > 40).slice(0, 6);

  // The About body, split on blank lines. The overview at the top is written
  // to stand alone, so when there is one the description is not repeated.
  const descriptionParts = (business.description ?? "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const overview = business.overview?.trim() || descriptionParts[0] || "";
  const aboutParas = business.overview?.trim() ? descriptionParts : descriptionParts.slice(1);

  // Our editorial take, in its own paragraphs.
  const takeParas = (business.editorialTake ?? "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  // The at-a-glance facts, gathered under their group in the order the rows
  // were written. A group alone on the final row of a two-column grid spans
  // both, which is what stops the panel ending ragged.
  const factRows = parseRows(business.factGroups);
  const factGroups: { title: string; iconKey: string; items: { label: string; value: string }[] }[] = [];
  for (const row of factRows) {
    const title = row.group?.trim() || "Details";
    let group = factGroups.find((entry) => entry.title === title);
    if (!group) {
      group = { title, iconKey: row.iconKey?.trim() || "", items: [] };
      factGroups.push(group);
    }
    if (!group.iconKey && row.iconKey?.trim()) group.iconKey = row.iconKey.trim();
    group.items.push({ label: row.label, value: row.value });
  }

  // The three numbers on the dark card. Each is dropped rather than shown as a
  // dash when we do not hold it.
  const factStats = [
    business.googleRating
      ? { label: "Google rating", value: business.googleRating.toFixed(1), unit: "out of 5" }
      : null,
    business.googleReviewCount
      ? { label: "Customer reviews", value: String(business.googleReviewCount), unit: "on Google" }
      : null,
    yearsInBusiness ? { label: "In business", value: String(yearsInBusiness), unit: "years" } : null,
  ].filter(Boolean) as { label: string; value: string; unit: string }[];

  // The checks behind the position, written against the ranking entry.
  const rankCriteria = parseRows(topEntry?.criteria).filter((row) => row.title?.trim());

  // Areas served, as chips and as pins. A city without coordinates still gets
  // a chip so the coverage list stays complete.
  const areaCities = business.areas.map((area) => area.city);
  const mapAreas: MapArea[] = business.areas.map((area) => ({
    id: area.cityId,
    name: `${area.city.name}, ${area.city.region.code.toUpperCase()}`,
    href: routes.city(country?.code ?? area.city.region.countryId, area.city.region.slug, area.city.slug),
    latitude: area.city.latitude ?? Number.NaN,
    longitude: area.city.longitude ?? Number.NaN,
    primary: area.primary || area.cityId === business.cityId,
  }));

  const similar = city
    ? await db.business.findMany({
        where: {
          status: "PUBLISHED",
          cityId: city.id,
          categoryId: business.categoryId,
          NOT: { id: business.id },
        },
        orderBy: { googleRating: "desc" },
        take: 6,
        include: {
          city: true,
          entries: { select: { position: true }, take: 1, orderBy: { position: "asc" } },
        },
      })
    : [];

  const guides = await db.guide.findMany({
    where: { status: "PUBLISHED", categoryId: business.categoryId },
    orderBy: { publishedAt: "desc" },
    take: 3,
    include: { category: true },
  });

  // The other trades covered in this city, for the related row.
  const relatedServices = city
    ? await db.category.findMany({
        where: { published: true, NOT: { id: business.categoryId } },
        orderBy: { sortOrder: "asc" },
        take: 6,
      })
    : [];

  // What this company publishes about its own pricing. Rows it has said
  // nothing about are left out rather than shown as unknown.
  const pricingRows = [
    { label: "Free estimates", value: business.freeEstimates ? "Yes" : null },
    { label: "Inspection fee", value: business.inspectionFee },
    { label: "Financing", value: business.financing ? "Available" : null },
    { label: "Emergency callout", value: business.emergency ? "Available 24/7" : null },
    { label: "Workmanship warranty", value: business.warrantyTerms },
    { label: "Manufacturer warranty", value: business.manufacturerWarranty },
  ].filter((row) => row.value) as { label: string; value: string }[];

  // What the market pays, from the cost guide for this trade and city. It is
  // about the market, not this company, which is why it sits on its own card.
  const costRows = city
    ? await db.costRow.findMany({
        where: { guide: { categoryId: business.categoryId, status: "PUBLISHED" } },
        orderBy: { sortOrder: "asc" },
        take: 4,
        include: { guide: true },
      })
    : [];

  // Questions written for this company come first; the standing ones about how
  // the profile was built always follow, so the provenance is never dropped.
  const faqs = [
    ...business.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
    {
      question: `Is ${business.name} licensed and insured?`,
      answer: business.credentials.length
        ? `We checked ${business.credentials.filter((c) => c.status === "VERIFIED").length} of ${business.credentials.length} credentials against the issuing authority. Verified items carry the date we checked; reported items are what the business told us and we could not independently confirm.`
        : "We have no credential records on file for this company yet. Ask for the certificate directly from the insurer before booking work.",
    },
    {
      question: `What areas does ${business.name} serve?`,
      answer: areaCities.length
        ? `${areaCities.map((entry) => entry.name).join(", ")}. Coverage is as the business describes it, cross-checked against where its recent documented work is. Confirm your address before scheduling, particularly at the edge of a service area.`
        : "Service area is not confirmed on file. Ask the company directly whether it covers your address.",
    },
    {
      question: `Does ${business.name} offer emergency service?`,
      answer: business.emergency
        ? "Yes, the company lists emergency availability. Response time depends on demand, and after a storm every company in the market is stretched."
        : "Emergency availability is not listed for this company. If you need an urgent call-out, check the ranking for companies that do list it.",
    },
    {
      question: "What warranty do they offer?",
      answer: business.warrantyTerms
        ? `${business.warrantyTerms}. There are usually two warranties on a job: the manufacturer covers materials, the contractor covers workmanship. Get both in writing and check whether the workmanship coverage transfers if you sell.`
        : "Warranty terms are not on file. Ask for them in writing before work starts.",
    },
    {
      question: "How was this profile built?",
      answer:
        "Credentials come from issuing authorities, ratings from the company's Google Business Profile with the date we read them, and the editorial take from our own review of estimates, warranty documents and public feedback. Anything the business told us is labelled as reported.",
    },
    {
      question: "Can a business pay to improve its profile?",
      answer:
        "A business can subscribe to manage its own listing details, and it can buy a labelled sponsored placement. Neither changes a ranking position or the editorial assessment on this page.",
    },
  ];

  const reviewer = topRanking?.author ?? null;

  return (
    <SiteChrome active="none">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: business.name,
          url: absoluteUrl(routes.business(business.slug)),
          image: business.photos[0]?.url ?? business.logoUrl ?? undefined,
          logo: business.logoUrl ?? undefined,
          telephone: business.phone ?? undefined,
          address: city
            ? {
                "@type": "PostalAddress",
                streetAddress: business.addressLine ?? undefined,
                addressLocality: city.name,
                addressRegion: region!.code.toUpperCase(),
                postalCode: business.postalCode ?? undefined,
                addressCountry: country!.code.toUpperCase(),
              }
            : undefined,
          aggregateRating: business.googleRating
            ? {
                "@type": "AggregateRating",
                ratingValue: business.googleRating,
                reviewCount: business.googleReviewCount ?? undefined,
              }
            : undefined,
        }}
      />
      <FaqJsonLd faqs={faqs.map((faq, index) => ({ id: String(index), ...faq }))} />
      <TrackView type="PROFILE_VIEW" businessId={business.id} />

      <div className="biz-2026">
        {/* ----------------------------------------------------------- hero */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            background: "var(--paper)",
            backgroundImage:
              "linear-gradient(rgba(16,31,61,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(16,31,61,0.045) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        >
          <svg
            data-ten-outline=""
            aria-hidden="true"
            viewBox="0 0 240 170"
            width="300"
            height="213"
            style={{ position: "absolute", right: "-30px", top: "-40px", overflow: "visible", pointerEvents: "none" }}
          >
            <path
              pathLength="1"
              d="M18 40 L52 16 L52 158"
              fill="none"
              stroke="rgba(16,31,61,0.16)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              pathLength="1"
              d="M150 16 C 196 16, 226 46, 226 87 C 226 128, 196 158, 150 158 C 104 158, 74 128, 74 87 C 74 46, 104 16, 150 16 Z"
              fill="none"
              stroke="rgba(16,31,61,0.16)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="226" cy="30" r="5" fill="var(--gold-ink)" />
          </svg>

          <div style={{ ...SHELL, padding: "20px 24px 56px" }}>
            <nav aria-label="Breadcrumb" style={{ marginBottom: "26px" }}>
              <ol
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                }}
              >
                <li>
                  <Link href="/" style={{ color: "var(--text-secondary)" }}>
                    Home
                  </Link>
                </li>
                <li aria-hidden="true" style={{ color: "var(--text-secondary)" }}>
                  ›
                </li>
                {city ? (
                  <>
                    <li>
                      <Link
                        href={routes.city(country!.code, region!.slug, city.slug)}
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {city.name}
                      </Link>
                    </li>
                    <li aria-hidden="true" style={{ color: "var(--text-secondary)" }}>
                      ›
                    </li>
                  </>
                ) : null}
                <li aria-current="page" style={{ color: "var(--blue-900)", fontWeight: "600" }}>
                  {business.name}
                </li>
              </ol>
            </nav>

            <div
              data-split=""
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.32fr) minmax(300px, 0.68fr)",
                gap: "44px",
                alignItems: "start",
              }}
            >
              <div>
                <div
                  data-identity=""
                  style={{
                    display: "grid",
                    gridTemplateColumns: "76px minmax(0, 1fr)",
                    gap: "0 22px",
                    alignItems: "start",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      gridRow: "1 / span 2",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "76px",
                      height: "76px",
                      borderRadius: "18px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--surface-card)",
                      boxShadow: "var(--shadow-sm)",
                      fontSize: "24px",
                      fontWeight: "700",
                      color: "var(--blue-900)",
                      overflow: "hidden",
                    }}
                  >
                    {business.logoUrl ? (
                      <Media src={business.logoUrl} alt="" />
                    ) : (
                      initials
                    )}
                  </span>

                  <div
                    style={{
                      minHeight: "76px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <h1
                      data-hero-in="2"
                      style={{
                        fontSize: "clamp(32px, 4vw, 46px)",
                        lineHeight: "1.04",
                        letterSpacing: "-0.04em",
                        fontWeight: "800",
                      }}
                    >
                      {business.name}
                    </h1>
                    <p data-hero-in="3" style={{ fontSize: "17px", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                      <Link href={routes.category(business.category.slug)} style={{ fontWeight: "600" }}>
                        {business.category.serviceName}
                      </Link>
                      {city ? (
                        <>
                          {" "}
                          serving{" "}
                          <Link
                            href={routes.city(country!.code, region!.slug, city.slug)}
                            style={{ fontWeight: "600" }}
                          >
                            {city.name}
                          </Link>
                          {areaCities.length > 1
                            ? `, ${areaCities
                                .filter((entry) => entry.id !== city.id)
                                .slice(0, 2)
                                .map((entry) => entry.name)
                                .join(", ")} and surrounding areas`
                            : " and surrounding areas"}
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div
                    data-identity-body=""
                    style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "18px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 16px" }}>
                      {business.googleRating ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", lineHeight: "1" }}>
                          <Star size={19} />
                          <span
                            style={{
                              fontSize: "19px",
                              fontWeight: "700",
                              color: "var(--blue-900)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {business.googleRating.toFixed(1)}
                          </span>
                          <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
                            on Google
                            {business.googleReviewCount ? ` · ${business.googleReviewCount} reviews` : ""}
                          </span>
                        </span>
                      ) : null}

                      {business.googleRating && yearsInBusiness ? (
                        <span
                          aria-hidden="true"
                          style={{ width: "1px", height: "16px", background: "var(--border-strong)" }}
                        />
                      ) : null}

                      {yearsInBusiness ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            fontSize: "15px",
                            lineHeight: "1",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.9"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                          {yearsInBusiness} years in business
                        </span>
                      ) : null}
                    </div>

                    <ul style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                      {business.entries.length > 0 ? (
                        <li
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            padding: "8px 14px",
                            borderRadius: "999px",
                            background: "var(--blue-50)",
                            border: "1px solid var(--blue-100)",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "var(--blue-800)",
                          }}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M11 3a8 8 0 1 0 0 16 8 8 0 1 0 0-16" />
                            <path d="m21 21-4.3-4.3" />
                          </svg>
                          TenBestFind Reviewed
                        </li>
                      ) : null}

                      {business.verified ? (
                        <li
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            padding: "8px 14px",
                            borderRadius: "999px",
                            background: "var(--green-50)",
                            border: "1px solid var(--green-100)",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#178054",
                          }}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
                            <path d="m9 12 2 2 4-4" />
                          </svg>
                          Verified Business
                        </li>
                      ) : null}

                      {topEntry ? (
                        <li
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            padding: "8px 14px",
                            borderRadius: "999px",
                            background: "var(--amber-50)",
                            border: "1px solid #EBCE95",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#8A5F0B",
                          }}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
                            <path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1" />
                          </svg>
                          Top 10 Winner
                        </li>
                      ) : null}

                      {isSponsored ? (
                        <li
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "7px",
                            padding: "8px 14px",
                            borderRadius: "999px",
                            background: "var(--amber-50)",
                            border: "1px solid #EBCE95",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#8A5F0B",
                          }}
                        >
                          <Star size={15} />
                          Featured Partner
                        </li>
                      ) : null}

                      <li>
                        <Pop
                          label="What do these badges mean?"
                          width="min(460px, 82vw)"
                          compact
                          style={{ display: "inline-block" }}
                        >
                          <dl style={{ display: "grid", gap: "12px", margin: "0", fontSize: "13px", lineHeight: "1.6" }}>
                            <div>
                              <dt style={{ fontWeight: "700", color: "#fff" }}>TenBestFind Reviewed</dt>
                              <dd style={{ margin: "0", color: "rgba(232,237,245,0.82)" }}>
                                Our editorial team has researched and reviewed this business.
                              </dd>
                            </div>
                            <div>
                              <dt style={{ fontWeight: "700", color: "#fff" }}>Verified Business</dt>
                              <dd style={{ margin: "0", color: "rgba(232,237,245,0.82)" }}>
                                Key business information or ownership has been verified against a primary source.
                              </dd>
                            </div>
                            <div>
                              <dt style={{ fontWeight: "700", color: "#fff" }}>Top 10 Winner</dt>
                              <dd style={{ margin: "0", color: "rgba(232,237,245,0.82)" }}>
                                The company currently appears in at least one active TenBestFind Top 10 ranking.
                              </dd>
                            </div>
                            <div>
                              <dt style={{ fontWeight: "700", color: "#fff" }}>Featured Partner</dt>
                              <dd style={{ margin: "0", color: "rgba(232,237,245,0.82)" }}>
                                A paid commercial relationship with TenBestFind. It never earns or influences a
                                ranking position.{" "}
                                {isSponsored
                                  ? "This company holds such a relationship."
                                  : "This company holds no such relationship."}
                              </dd>
                            </div>
                          </dl>
                          <PopLink href="/advertising-disclosure/">Advertising &amp; Sponsorship Disclosure →</PopLink>
                        </Pop>
                      </li>
                    </ul>
                  </div>
                </div>

                {overview ? (
                  <div
                    style={{
                      marginTop: "28px",
                      border: "1px solid var(--blue-100)",
                      borderRadius: "20px",
                      overflow: "hidden",
                      background: "var(--surface-card)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "13px 22px",
                        background: "var(--blue-50)",
                        borderBottom: "1px solid var(--blue-100)",
                      }}
                    >
                      <h2
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "9px",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "var(--ls-wider)",
                          textTransform: "uppercase",
                          color: "var(--blue-900)",
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#2D74D7"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M9 3a4 4 0 0 1 6 0 4 4 0 0 1 3 5 4 4 0 0 1-1 6 4 4 0 0 1-5 3 4 4 0 0 1-6-3 4 4 0 0 1-1-6 4 4 0 0 1 3-5z" />
                          <path d="M12 8v8" />
                          <path d="M9 11h6" />
                        </svg>
                        Quick Overview
                      </h2>
                      <Pop label="How this is made" align="right">
                        <PopText>
                          This summary is generated from the verified data on this profile: services, service area,
                          credentials, warranty terms and the company&apos;s Google review record. It is reviewed by
                          an editor before publishing and refreshed whenever the underlying data changes. Nothing
                          here is asserted that is not stated elsewhere on this page.
                        </PopText>
                        <PopLink href="/how-we-rank/">Editorial Standards →</PopLink>
                      </Pop>
                    </div>
                    <div style={{ padding: "22px 24px 24px" }}>
                      <p style={{ fontSize: "16px", lineHeight: "1.75", color: "var(--text-primary)" }}>{overview}</p>
                      {business.bestFor || strengths.length > 0 || considerations.length > 0 ? (
                        <ul
                          style={{
                            marginTop: "18px",
                            paddingTop: "16px",
                            borderTop: "1px solid var(--border-subtle)",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "10px 22px",
                          }}
                        >
                          {business.bestFor ? (
                            <li
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "7px",
                                fontSize: "14px",
                                color: "var(--text-secondary)",
                              }}
                            >
                              <Tick colour="#1F9D6B" />
                              Best for {business.bestFor.toLowerCase()}
                            </li>
                          ) : null}
                          {strengths.slice(0, 1).map((item) => (
                            <li
                              key={item}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "7px",
                                fontSize: "14px",
                                color: "var(--text-secondary)",
                              }}
                            >
                              <Tick colour="#1F9D6B" />
                              {item}
                            </li>
                          ))}
                          {considerations.slice(0, 1).map((item) => (
                            <li
                              key={item}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "7px",
                                fontSize: "14px",
                                color: "var(--text-secondary)",
                              }}
                            >
                              <Caution colour="#8A5F0B" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <aside
                aria-label="Contact this business"
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "20px",
                  boxShadow: "var(--shadow-lg)",
                  padding: "24px 26px",
                }}
              >
                <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
                  {business.website ? (
                    <a
                      href={business.website}
                      rel="nofollow noopener"
                      target="_blank"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        height: "52px",
                        borderRadius: "14px",
                        background: "var(--color-primary)",
                        color: "#fff",
                        fontSize: "16px",
                        fontWeight: "600",
                        boxShadow: "var(--shadow-primary)",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20" />
                        <path d="M2 12h20" />
                        <path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" />
                      </svg>
                      Visit Website
                    </a>
                  ) : null}

                  <QuoteDialog
                    businessId={business.id}
                    businessName={business.name}
                    services={business.services.map((row) => row.subservice.name)}
                    label="Request a Quote"
                    className="biz-quote-btn"
                  />

                  {business.phone ? (
                    <a
                      href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        height: "50px",
                        borderRadius: "14px",
                        border: "1.5px solid var(--border-strong)",
                        background: "var(--surface-card)",
                        color: "var(--blue-900)",
                        fontSize: "15px",
                        fontWeight: "600",
                      }}
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
                      </svg>
                      {business.phone}
                    </a>
                  ) : null}
                </div>

                <dl
                  style={{
                    display: "grid",
                    gap: "12px",
                    margin: "0",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--border-subtle)",
                    fontSize: "14px",
                  }}
                >
                  {business.addressLine || city ? (
                    <div>
                      <dt style={{ color: "var(--text-secondary)", marginBottom: "2px" }}>Address</dt>
                      <dd style={{ margin: "0", color: "var(--text-primary)" }}>
                        {[business.addressLine, placeLabel, business.postalCode].filter(Boolean).join(", ")}
                      </dd>
                    </div>
                  ) : null}

                  {hours.length > 0 ? (
                    <div>
                      <dt style={{ color: "var(--text-secondary)", marginBottom: "2px" }}>Hours</dt>
                      <dd style={{ margin: "0", color: "var(--text-primary)" }}>
                        {hours
                          .filter((row) => !row.closed && row.opens && row.closes)
                          .slice(0, 2)
                          .map((row) => `${row.day}, ${row.opens} to ${row.closes}`)
                          .join(" · ")}
                      </dd>
                    </div>
                  ) : null}

                  {business.emergency ? (
                    <div>
                      <dt style={{ color: "var(--text-secondary)", marginBottom: "2px" }}>Emergency service</dt>
                      <dd style={{ margin: "0", color: "var(--text-primary)" }}>Available 24/7</dd>
                    </div>
                  ) : null}
                </dl>

                {business.freeEstimates || business.financing ? (
                  <p style={{ marginTop: "14px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    {[business.freeEstimates ? "Free estimates" : null, business.financing ? "Financing available" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </aside>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- at a glance */}
        {factStats.length > 0 || factGroups.length > 0 ? (
          <section
            id="glance"
            aria-labelledby="glance-h2"
            style={{
              borderTop: "1px solid var(--border-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--surface-page)",
            }}
          >
            <div style={{ ...SHELL, padding: "56px 24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: "24px",
                  flexWrap: "wrap",
                  marginBottom: "26px",
                }}
              >
                <div>
                  <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
                    <span data-eyebrow-rule="" aria-hidden="true" />
                    Company Facts
                  </p>
                  <h2 id="glance-h2" style={SECTION_H2}>
                    {business.name} at a Glance
                  </h2>
                </div>
              </div>

              <div
                data-facts=""
                style={{
                  display: "grid",
                  gridTemplateColumns: factGroups.length > 0 ? "340px minmax(0, 1fr)" : "minmax(0, 1fr)",
                  gap: "20px",
                  alignItems: "stretch",
                }}
              >
                {factStats.length > 0 ? (
                  <div
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      background: "var(--blue-900)",
                      color: "#fff",
                      borderRadius: "22px",
                      padding: "28px 26px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      boxShadow: "0 30px 60px -30px rgba(16,31,61,0.55)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        right: "-28px",
                        bottom: "-48px",
                        fontSize: "220px",
                        lineHeight: "0.8",
                        fontWeight: "800",
                        letterSpacing: "-0.08em",
                        color: "transparent",
                        WebkitTextStroke: "1px rgba(255,255,255,0.1)",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    >
                      10
                    </span>
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "0",
                        background: "radial-gradient(420px 260px at 0% 100%, rgba(45,116,215,0.4), transparent 70%)",
                        pointerEvents: "none",
                      }}
                    />
                    <p
                      style={{
                        position: "relative",
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--gold-ink)",
                        marginBottom: "14px",
                      }}
                    >
                      By the numbers
                    </p>
                    <dl style={{ position: "relative", margin: "0", display: "grid", gap: "0" }}>
                      {factStats.map((stat) => (
                        <div
                          key={stat.label}
                          data-fstat=""
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "space-between",
                            gap: "16px",
                            padding: "16px 0",
                            borderTop: "1px solid rgba(255,255,255,0.12)",
                          }}
                        >
                          <dt style={{ fontSize: "14px", color: "rgba(232,237,245,0.72)" }}>{stat.label}</dt>
                          <dd style={{ margin: "0", display: "inline-flex", alignItems: "baseline", gap: "6px" }}>
                            <span
                              data-fnum=""
                              style={{
                                fontSize: "38px",
                                lineHeight: "1",
                                fontWeight: "800",
                                letterSpacing: "-0.04em",
                                color: "#fff",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {stat.value}
                            </span>
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--gold-ink)" }}>
                              {stat.unit}
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p
                      style={{
                        position: "relative",
                        marginTop: "auto",
                        paddingTop: "14px",
                        fontSize: "12.5px",
                        lineHeight: "1.55",
                        color: "rgba(232,237,245,0.62)",
                      }}
                    >
                      {business.googleDataUpdated
                        ? `Rating and review count pulled from Google on ${fullDate(business.googleDataUpdated)}.`
                        : "Rating and review count come from the company's Google Business Profile."}
                      {business.yearFounded ? ` Years counted from ${business.yearFounded}.` : ""}
                    </p>
                  </div>
                ) : null}

                {factGroups.length > 0 ? (
                  <div
                    data-fact-cols=""
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "22px",
                      padding: "26px 28px",
                      boxShadow: "var(--shadow-sm)",
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "0 40px",
                    }}
                  >
                    {factGroups.map((group, index) => (
                      <div
                        key={group.title}
                        // A group left alone on the last row takes both columns,
                        // which is what keeps the panel from ending ragged.
                        style={{
                          gridColumn:
                            index === factGroups.length - 1 && factGroups.length % 2 === 1 ? "span 2" : "span 1",
                        }}
                      >
                        <p
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "9px",
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--text-muted)",
                            margin: "6px 0 4px",
                          }}
                        >
                          {group.iconKey ? (
                            <span aria-hidden="true" style={{ display: "inline-flex", color: "var(--color-primary)" }}>
                              <Icon name={group.iconKey as IconName} size={14} />
                            </span>
                          ) : null}
                          {group.title}
                        </p>
                        <dl style={{ margin: "0 0 18px" }}>
                          {group.items.map((item) => (
                            <div
                              key={`${group.title}-${item.label}`}
                              data-frow=""
                              style={{
                                display: "flex",
                                alignItems: "baseline",
                                gap: "10px",
                                padding: "11px 0",
                                borderBottom: "1px solid var(--border-subtle)",
                              }}
                            >
                              <dt style={{ fontSize: "14.5px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                                {item.label}
                              </dt>
                              <span
                                aria-hidden="true"
                                style={{
                                  flex: "1",
                                  minWidth: "16px",
                                  borderBottom: "1px dotted var(--border-strong)",
                                  transform: "translateY(-4px)",
                                }}
                              />
                              <dd
                                style={{
                                  margin: "0",
                                  fontSize: "15px",
                                  fontWeight: "600",
                                  color: "var(--blue-900)",
                                  textAlign: "right",
                                }}
                              >
                                {item.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- our take */}
        {takeParas.length > 0 || strengths.length > 0 || considerations.length > 0 ? (
          <section id="take" aria-labelledby="take-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div
              data-split=""
              style={{
                ...SHELL,
                padding: "72px 24px",
                display: "grid",
                gridTemplateColumns: "1.15fr 0.85fr",
                gap: "48px",
                alignItems: "start",
              }}
            >
              <div>
                <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "14px" }}>
                  <span data-eyebrow-rule="" aria-hidden="true" />
                  Editorial Review
                </p>
                <h2
                  id="take-h2"
                  style={{ fontSize: "clamp(26px, 3vw, 36px)", lineHeight: "1.2", fontWeight: "700", marginBottom: "18px" }}
                >
                  Our Take on {business.name}
                </h2>
                {takeParas.map((text, index) => (
                  <p
                    key={index}
                    style={{
                      fontSize: "17px",
                      lineHeight: "1.75",
                      color: index === 0 ? "var(--text-primary)" : "var(--text-secondary)",
                      marginBottom: index === takeParas.length - 1 ? "0" : "16px",
                    }}
                  >
                    {text}
                  </p>
                ))}
                {business.bestFor ? (
                  <p
                    style={{
                      marginTop: "20px",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "var(--blue-50)",
                      fontSize: "15px",
                      color: "var(--blue-900)",
                    }}
                  >
                    <strong style={{ fontWeight: "700" }}>Best for:</strong> {business.bestFor}
                  </p>
                ) : null}
              </div>

              <div style={{ display: "grid", gap: "16px" }}>
                {strengths.length > 0 ? (
                  <div style={CARD}>
                    <h3
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--color-success)",
                        marginBottom: "12px",
                      }}
                    >
                      What We Like
                    </h3>
                    <ul style={{ display: "grid", gap: "9px" }}>
                      {strengths.map((item) => (
                        <li
                          key={item}
                          style={{
                            display: "flex",
                            gap: "9px",
                            fontSize: "15px",
                            lineHeight: "1.55",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <Tick colour="#1F9D6B" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {considerations.length > 0 ? (
                  <div style={CARD}>
                    <h3
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "#8A5F0B",
                        marginBottom: "12px",
                      }}
                    >
                      Things to Consider
                    </h3>
                    <ul style={{ display: "grid", gap: "9px" }}>
                      {considerations.map((item) => (
                        <li
                          key={item}
                          style={{
                            display: "flex",
                            gap: "9px",
                            fontSize: "15px",
                            lineHeight: "1.55",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <Caution colour="#8A5F0B" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- reviews */}
        {business.googleRating ? (
          <section
            id="reviews"
            aria-labelledby="rev-h2"
            style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div style={{ ...SHELL, padding: "72px 24px" }}>
              <h2
                id="rev-h2"
                style={{ fontSize: "clamp(26px, 3vw, 36px)", fontWeight: "700", marginBottom: "8px" }}
              >
                Google Reviews for {business.name}
              </h2>
              <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginBottom: "28px" }}>
                Customer ratings shown here come from Google. They are separate from our editorial review above.
              </p>

              <div
                data-split=""
                style={{
                  display: "grid",
                  gridTemplateColumns: distribution.length > 0 ? "0.75fr 1.25fr" : "minmax(0, 1fr)",
                  gap: "24px",
                  alignItems: "start",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "20px",
                    padding: "26px",
                    boxShadow: "var(--shadow-sm)",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      letterSpacing: "var(--ls-wide)",
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                      marginBottom: "10px",
                    }}
                  >
                    Google rating
                  </p>
                  <p
                    style={{
                      fontSize: "52px",
                      lineHeight: "1",
                      fontWeight: "700",
                      color: "var(--blue-900)",
                      letterSpacing: "-0.04em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {business.googleRating.toFixed(1)}
                  </p>
                  <p aria-hidden="true" style={{ marginTop: "10px", display: "flex", justifyContent: "center", gap: "3px" }}>
                    {[1, 2, 3, 4, 5].map((step) => (
                      <Star key={step} filled={business.googleRating! >= step - 0.25} />
                    ))}
                  </p>
                  {business.googleReviewCount ? (
                    <p style={{ marginTop: "12px", fontSize: "15px", color: "var(--text-secondary)" }}>
                      Based on{" "}
                      <strong style={{ color: "var(--blue-900)" }}>
                        {business.googleReviewCount} Google reviews
                      </strong>
                    </p>
                  ) : null}
                  {business.googleDataUpdated ? (
                    <p style={{ marginTop: "10px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      Review data updated {fullDate(business.googleDataUpdated)}
                    </p>
                  ) : null}
                </div>

                {distribution.length > 0 ? (
                  <div
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "20px",
                      padding: "26px",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--text-secondary)",
                        marginBottom: "16px",
                      }}
                    >
                      Rating Distribution
                    </h3>
                    <ul style={{ display: "grid", gap: "12px" }}>
                      {distribution.map((row) => (
                        <li
                          key={row.label}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "62px 1fr 52px",
                            alignItems: "center",
                            gap: "14px",
                          }}
                        >
                          <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{row.label}</span>
                          <span
                            aria-hidden="true"
                            style={{
                              display: "block",
                              height: "10px",
                              borderRadius: "999px",
                              background: "var(--surface-sunken)",
                              overflow: "hidden",
                            }}
                          >
                            <span
                              style={{
                                display: "block",
                                height: "100%",
                                borderRadius: "999px",
                                background: "#D99A1C",
                                width: row.pct,
                              }}
                            />
                          </span>
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "var(--blue-900)",
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {row.pct}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Pop
                      label="About this distribution"
                      style={{ display: "inline-block", marginTop: "14px" }}
                    >
                      <PopText>
                        The distribution reflects the{" "}
                        {business.googleReviewCount ?? distributionTotal} Google reviews available when this
                        profile&apos;s review data was last refreshed
                        {business.googleDataUpdated ? ` on ${fullDate(business.googleDataUpdated)}` : ""}. Ratings and
                        counts change continuously on Google, so figures here may lag the live profile slightly. We
                        publish only the values returned by the source, never estimates for missing bands.
                      </PopText>
                      <PopLink href="/how-we-rank/">Editorial Standards →</PopLink>
                    </Pop>
                  </div>
                ) : null}
              </div>

              {shownReviews.length > 0 ? (
                <>
                  <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Recent Google Reviews</h3>
                  <ul
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {shownReviews.map((review) => (
                      <li
                        key={review.id}
                        data-card=""
                        style={{ ...CARD, display: "flex", flexDirection: "column", gap: "10px" }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                            <span
                              aria-hidden="true"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                background: "var(--blue-50)",
                                fontSize: "13px",
                                fontWeight: "700",
                                color: "var(--blue-900)",
                              }}
                            >
                              {initialsOf(review.author)}
                            </span>
                            <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                              {review.author}
                            </span>
                          </span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "var(--blue-900)",
                            }}
                          >
                            <Star size={15} />
                            {review.rating}
                          </span>
                        </span>
                        <span style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>
                          {review.body}
                        </span>
                        <span
                          style={{
                            marginTop: "auto",
                            paddingTop: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            fontSize: "13px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {review.postedAt ? monthYear(review.postedAt) : ""}
                          <span
                            style={{
                              padding: "3px 9px",
                              borderRadius: "6px",
                              background: "var(--surface-page)",
                              border: "1px solid var(--border-subtle)",
                              fontSize: "11px",
                              fontWeight: "700",
                              letterSpacing: "var(--ls-wide)",
                              textTransform: "uppercase",
                            }}
                          >
                            Google
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ----------------------------------------------------- review themes */}
        {praised.length > 0 || concerns.length > 0 ? (
          <section id="themes" aria-labelledby="themes-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ ...SHELL, padding: "64px 24px" }}>
              <h2 id="themes-h2" style={{ ...SECTION_H2, marginBottom: "8px" }}>
                What Customers Commonly Mention
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  color: "var(--text-secondary)",
                  marginBottom: "12px",
                  maxWidth: "720px",
                }}
              >
                Themes our editors identified across this company&apos;s Google reviews. This is our summary of
                customer feedback, not a quotation of it.
              </p>
              <Pop
                label="How these themes are produced"
                width="min(460px, 82vw)"
                style={{ display: "inline-block", marginBottom: "28px" }}
              >
                <PopText>
                  Themes are drawn only from patterns that recur across this company&apos;s published Google reviews.
                  Original reviews remain the source of record, and we do not rewrite customer wording and present it
                  as a quotation. A theme appears only when several independent reviews raise it.
                </PopText>
                <PopLink href="/how-we-rank/">Editorial Standards →</PopLink>
              </Pop>

              <div
                data-split=""
                style={{
                  display: "grid",
                  gridTemplateColumns: praised.length > 0 && concerns.length > 0 ? "1fr 1fr" : "minmax(0, 1fr)",
                  gap: "20px",
                }}
              >
                {praised.length > 0 ? (
                  <div
                    style={{
                      background: "var(--green-50)",
                      border: "1px solid var(--green-100)",
                      borderRadius: "18px",
                      padding: "24px 26px",
                    }}
                  >
                    <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "14px" }}>Frequently Praised</h3>
                    <ul style={{ display: "grid", gap: "10px" }}>
                      {praised.map((text) => (
                        <li
                          key={text}
                          style={{
                            display: "flex",
                            gap: "9px",
                            fontSize: "15px",
                            lineHeight: "1.55",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Tick colour="#178054" />
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {concerns.length > 0 ? (
                  <div
                    style={{
                      background: "var(--amber-50)",
                      border: "1px solid #EBCE95",
                      borderRadius: "18px",
                      padding: "24px 26px",
                    }}
                  >
                    <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "14px" }}>Concerns Mentioned</h3>
                    <ul style={{ display: "grid", gap: "10px" }}>
                      {concerns.map((text) => (
                        <li
                          key={text}
                          style={{
                            display: "flex",
                            gap: "9px",
                            fontSize: "15px",
                            lineHeight: "1.55",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Caution colour="#8A5F0B" />
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* --------------------------------------------------- why it ranks */}
        {topEntry && topRanking ? (
          <section
            id="rankings"
            aria-labelledby="rank-h2"
            style={{
              position: "relative",
              overflow: "hidden",
              background: "var(--blue-900)",
              color: "var(--text-on-ink)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: "-40px",
                top: "-80px",
                fontSize: "420px",
                lineHeight: "0.8",
                fontWeight: "800",
                letterSpacing: "-0.08em",
                color: "transparent",
                WebkitTextStroke: "1px rgba(255,255,255,0.07)",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              10
            </span>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "0",
                background: "radial-gradient(900px 500px at 10% 100%, rgba(45,116,215,0.32), transparent 65%)",
                pointerEvents: "none",
              }}
            />
            <div
              data-rankgrid=""
              style={{
                position: "relative",
                ...SHELL,
                padding: "84px 24px",
                display: "grid",
                gridTemplateColumns: "340px minmax(0, 1fr)",
                gap: "56px",
                alignItems: "center",
              }}
            >
              <div
                data-rankmark=""
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "6px",
                }}
              >
                <span
                  data-rk-eyebrow=""
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--gold-ink)",
                  }}
                >
                  Ranked
                </span>
                <span
                  data-rk-num=""
                  aria-label={`Number ${topEntry.position}`}
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "flex-start",
                    lineHeight: "0.82",
                    fontWeight: "800",
                    letterSpacing: "-0.09em",
                    color: "#fff",
                  }}
                >
                  <span
                    data-rk-hash=""
                    style={{ fontSize: "92px", marginTop: "18px", marginRight: "4px", color: "var(--gold-ink)" }}
                  >
                    #
                  </span>
                  <span data-rk-one="" style={{ position: "relative", fontSize: "220px", display: "inline-block" }}>
                    {/* The stroke is drawn then handed to the solid glyph, and it
                        is only ever a 1, so a different position skips it. */}
                    {topEntry.position === 1 ? (
                      <svg
                        data-rk-stroke=""
                        aria-hidden="true"
                        viewBox="0 0 120 180"
                        width="0.55em"
                        height="0.82em"
                        style={{ position: "absolute", inset: "0", overflow: "visible" }}
                      >
                        <path
                          pathLength="1"
                          d="M18 48 L64 14 L64 168"
                          fill="none"
                          stroke="var(--gold-ink)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                    <span data-rk-fill="" style={{ display: "inline-block" }}>
                      {topEntry.position}
                    </span>
                  </span>
                </span>
                <span
                  data-rk-rule=""
                  aria-hidden="true"
                  style={{
                    display: "block",
                    height: "3px",
                    width: "120px",
                    background: "var(--gold-ink)",
                    borderRadius: "2px",
                    margin: "8px 0 6px",
                    transformOrigin: "left",
                  }}
                />
                <span data-rk-sub="" style={{ fontSize: "15px", fontWeight: "600", color: "#fff" }}>
                  of {topRanking._count.entries}{" "}
                  {tradePlural(topRanking.category.name, topRanking.category.serviceName).toLowerCase()}
                  {topRanking.city ? ` in ${topRanking.city.name}, ${topRanking.city.region.code.toUpperCase()}` : ""}
                </span>
                {topEntry.heldSince || topRanking.lastReviewedAt ? (
                  <span data-rk-sub="" style={{ fontSize: "12.5px", color: "rgba(232,237,245,0.6)" }}>
                    {topEntry.heldSince ? `Held since ${monthYear(topEntry.heldSince)}` : ""}
                    {topEntry.heldSince && topRanking.lastReviewedAt ? " · " : ""}
                    {topRanking.lastReviewedAt ? `re-checked ${monthYear(topRanking.lastReviewedAt)}` : ""}
                  </span>
                ) : null}
              </div>

              <div style={{ minWidth: "0" }}>
                <p
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--gold-ink)",
                    marginBottom: "14px",
                  }}
                >
                  <span aria-hidden="true" style={{ display: "inline-block", width: "28px", height: "2px", background: "var(--gold-ink)" }} />
                  Editorial Ranking
                </p>
                <h2
                  id="rank-h2"
                  style={{
                    fontSize: "clamp(28px, 3.2vw, 42px)",
                    lineHeight: "1.06",
                    fontWeight: "800",
                    letterSpacing: "-0.035em",
                    color: "#fff",
                    marginBottom: "18px",
                    textWrap: "balance",
                  }}
                >
                  Why {business.name} Made Our Top {topRanking._count.entries}
                </h2>
                <p
                  style={{
                    fontSize: "17px",
                    lineHeight: "1.7",
                    color: "rgba(232,237,245,0.8)",
                    marginBottom: "26px",
                    maxWidth: "640px",
                    textWrap: "pretty",
                  }}
                >
                  {topEntry.whyPicked ? (
                    topEntry.whyPicked
                  ) : (
                    <>
                      {topEntry.position === 1 ? "It took first place in " : `It holds position ${topEntry.position} in `}
                      <Link
                        href={rankingUrl(topRanking)}
                        style={{
                          color: "#fff",
                          fontWeight: "600",
                          textDecoration: "underline",
                          textDecorationColor: "rgba(231,184,99,0.6)",
                          textUnderlineOffset: "3px",
                        }}
                      >
                        {topRanking.title}
                      </Link>
                      {rankCriteria.length > 0
                        ? ` on ${rankCriteria.length} things we could verify, not on what the company said about itself.`
                        : "."}
                    </>
                  )}
                </p>

                {rankCriteria.length > 0 ? (
                  <ol
                    data-crit=""
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "12px 28px",
                      marginBottom: "30px",
                      maxWidth: "700px",
                    }}
                  >
                    {rankCriteria.map((row) => (
                      <li
                        key={row.title}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          padding: "14px 0",
                          borderTop: "1px solid rgba(255,255,255,0.14)",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            flexShrink: "0",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            background: "rgba(231,184,99,0.16)",
                            border: "1px solid rgba(231,184,99,0.45)",
                            color: "var(--gold-ink)",
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </span>
                        <span style={{ minWidth: "0" }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: "15.5px",
                              fontWeight: "700",
                              color: "#fff",
                              lineHeight: "1.3",
                            }}
                          >
                            {row.title}
                          </span>
                          {row.text ? (
                            <span
                              style={{
                                display: "block",
                                marginTop: "3px",
                                fontSize: "13.5px",
                                lineHeight: "1.5",
                                color: "rgba(232,237,245,0.62)",
                              }}
                            >
                              {row.text}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : null}

                <div style={{ display: "flex", alignItems: "center", gap: "14px 22px", flexWrap: "wrap" }}>
                  <Link
                    data-btn-primary=""
                    href={rankingUrl(topRanking)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "9px",
                      height: "50px",
                      padding: "0 22px",
                      borderRadius: "12px",
                      background: "#fff",
                      color: "var(--blue-900)",
                      fontSize: "15px",
                      fontWeight: "600",
                    }}
                  >
                    See the Full {topRanking.city ? topRanking.city.name : ""} Ranking
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      fontSize: "13.5px",
                      color: "rgba(232,237,245,0.65)",
                    }}
                  >
                    {reviewer ? (
                      <>
                        <span
                          aria-hidden="true"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.12)",
                            color: "#fff",
                            fontSize: "10.5px",
                            fontWeight: "700",
                          }}
                        >
                          {initialsOf(reviewer.name)}
                        </span>
                        Researched by{" "}
                        <Link href={routes.expert(reviewer.slug)} style={{ color: "#fff", fontWeight: "600" }}>
                          {reviewer.name}
                        </Link>{" "}
                        · positions cannot be bought
                      </>
                    ) : (
                      "Positions cannot be bought"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------ services and areas */}
        {business.services.length > 0 || business.areas.length > 0 ? (
          <section id="services" aria-labelledby="svc-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div
              data-split=""
              style={{
                ...SHELL,
                padding: "72px 24px",
                display: "grid",
                gridTemplateColumns:
                  business.services.length > 0 && business.areas.length > 0 ? "1fr 1fr" : "minmax(0, 1fr)",
                gap: "48px",
                alignItems: "start",
              }}
            >
              {business.services.length > 0 ? (
                <div>
                  <h2 id="svc-h2" style={{ ...SECTION_H2, marginBottom: "20px" }}>
                    Services Offered
                  </h2>
                  <ul
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "8px",
                    }}
                  >
                    {business.services.map((row) => (
                      <li key={row.subserviceId}>
                        <Link
                          data-row=""
                          href={routes.subservice(business.category.slug, row.subservice.slug)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            padding: "12px 14px",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "12px",
                            fontSize: "15px",
                            fontWeight: "600",
                            color: "var(--blue-900)",
                            textDecoration: "none",
                          }}
                        >
                          {row.subservice.name}
                          <RowChevron />
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {specialties.length > 0 ? (
                    <>
                      <h3 style={{ fontSize: "17px", fontWeight: "700", margin: "28px 0 12px" }}>Specialties</h3>
                      <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {specialties.map((item) => (
                          <li
                            key={item}
                            style={{
                              padding: "7px 13px",
                              borderRadius: "999px",
                              background: "var(--blue-50)",
                              color: "var(--blue-800)",
                              fontSize: "13px",
                              fontWeight: "600",
                            }}
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}

              {business.areas.length > 0 ? (
                <div>
                  <h2 style={{ ...SECTION_H2, marginBottom: "8px" }}>Areas Served</h2>
                  <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "18px" }}>
                    {city ? (
                      <>
                        Based in <strong style={{ color: "var(--blue-900)" }}>{placeLabel}</strong>
                      </>
                    ) : (
                      "Coverage as the company describes it"
                    )}
                    {business.serviceRadiusKm ? `, working roughly ${business.serviceRadiusKm} km out.` : "."}
                  </p>

                  <AreasMap
                    areas={mapAreas}
                    radiusKm={business.serviceRadiusKm}
                    label={`Map of areas served by ${business.name}`}
                  />

                  <Pop
                    label="About service coverage"
                    style={{ display: "inline-block", marginTop: "14px" }}
                  >
                    <PopText>
                      Coverage is as the business describes it, cross-checked against where its recent documented work
                      is. A company will often travel beyond the areas listed here for a large job and decline a small
                      one at the same distance, so confirm your address before scheduling.
                    </PopText>
                    <PopLink href="/how-we-rank/">Editorial Standards →</PopLink>
                  </Pop>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------------ about */}
        {aboutParas.length > 0 || business.credentials.length > 0 ? (
          <section
            id="about"
            aria-labelledby="about-h2"
            style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div
              data-split=""
              style={{
                ...SHELL,
                padding: "72px 24px",
                display: "grid",
                gridTemplateColumns:
                  aboutParas.length > 0 && business.credentials.length > 0 ? "1.1fr 0.9fr" : "minmax(0, 1fr)",
                gap: "48px",
                alignItems: "start",
              }}
            >
              {aboutParas.length > 0 ? (
                <div>
                  <h2 id="about-h2" style={{ ...SECTION_H2, marginBottom: "18px" }}>
                    About {business.name}
                  </h2>
                  <AboutBody paragraphs={aboutParas} />
                  <Pop
                    label="Where this information comes from"
                    style={{ display: "block", marginTop: "10px" }}
                  >
                    <PopText>
                      Company history, ownership and capability details on this page are provided by the business and
                      reviewed by our editors for plausibility and consistency. They are not the same as the
                      credentials block, where each item carries its own verification status and source.
                    </PopText>
                    <PopLink href="/how-we-rank/">Editorial Standards →</PopLink>
                  </Pop>
                </div>
              ) : null}

              {business.credentials.length > 0 ? (
                <div>
                  <h2
                    id={aboutParas.length > 0 ? undefined : "about-h2"}
                    style={{ fontSize: "21px", fontWeight: "700", marginBottom: "14px" }}
                  >
                    Credentials
                  </h2>
                  <ul style={{ display: "grid", gap: "10px" }}>
                    {business.credentials.map((credential) => {
                      const verified = credential.status === "VERIFIED";
                      const expired = credential.status === "EXPIRED";
                      return (
                        <li
                          key={credential.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: "14px",
                            padding: "16px 18px",
                            background: "var(--surface-card)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "14px",
                          }}
                        >
                          <span style={{ minWidth: "0" }}>
                            <span
                              style={{
                                display: "block",
                                fontSize: "15px",
                                fontWeight: "600",
                                color: "var(--blue-900)",
                              }}
                            >
                              {credential.label}
                            </span>
                            <span style={{ display: "block", fontSize: "13.5px", color: "var(--text-secondary)" }}>
                              {[credential.authority, credential.identifier].filter(Boolean).join(" · ")}
                              {verified && credential.checkedAt ? ` · checked ${fullDate(credential.checkedAt)}` : ""}
                            </span>
                          </span>
                          <span
                            style={{
                              flexShrink: "0",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "5px 10px",
                              borderRadius: "999px",
                              background: verified ? "var(--green-50)" : expired ? "var(--amber-50)" : "var(--surface-page)",
                              border: `1px solid ${verified ? "var(--green-100)" : expired ? "#EBCE95" : "var(--border-subtle)"}`,
                              fontSize: "12px",
                              fontWeight: "700",
                              color: verified ? "#178054" : expired ? "#8A5F0B" : "var(--text-secondary)",
                            }}
                          >
                            {verified ? "Verified" : expired ? "Expired" : "Reported"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <Pop label="What verified means here" style={{ display: "block", marginTop: "12px" }}>
                    <PopText>
                      Verified means we checked the credential against the authority that issues it and recorded the
                      date. Reported means the business told us and we could not independently confirm it. We publish
                      both, labelled, rather than dropping what we could not check.
                    </PopText>
                    <PopLink href="/how-we-rank/">Editorial Standards →</PopLink>
                  </Pop>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------ reputation by source */}
        {business.googleRating || business.bbbRating || topEntry ? (
          <section
            id="reputation"
            aria-labelledby="rep-h2"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div style={{ ...SHELL, padding: "64px 24px" }}>
              <h2 id="rep-h2" style={{ ...SECTION_H2, marginBottom: "8px" }}>
                Reputation by Source
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  color: "var(--text-secondary)",
                  marginBottom: "28px",
                  maxWidth: "720px",
                }}
              >
                We show each source separately rather than blending them into a single score, because they measure
                different things.
              </p>
              <ul
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "16px",
                }}
              >
                {business.googleRating ? (
                  <li style={{ ...CARD, padding: "24px 26px" }}>
                    <h3
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--text-secondary)",
                        marginBottom: "10px",
                      }}
                    >
                      Google
                    </h3>
                    <p style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <Star />
                      <span
                        style={{
                          fontSize: "26px",
                          fontWeight: "700",
                          color: "var(--blue-900)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {business.googleRating.toFixed(1)}
                      </span>
                      <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>/ 5</span>
                    </p>
                    {business.googleReviewCount ? (
                      <p style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
                        {business.googleReviewCount} customer reviews
                      </p>
                    ) : null}
                  </li>
                ) : null}

                {business.bbbRating ? (
                  <li style={{ ...CARD, padding: "24px 26px" }}>
                    <h3
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--text-secondary)",
                        marginBottom: "10px",
                      }}
                    >
                      Better Business Bureau
                    </h3>
                    <p style={{ fontSize: "26px", fontWeight: "700", color: "var(--blue-900)", marginBottom: "6px" }}>
                      {business.bbbRating}
                    </p>
                    {business.bbbAccreditedSince ? (
                      <p style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
                        Accredited since {business.bbbAccreditedSince}
                      </p>
                    ) : null}
                  </li>
                ) : null}

                {topEntry && topRanking ? (
                  <li style={{ ...CARD, padding: "24px 26px" }}>
                    <h3
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--text-secondary)",
                        marginBottom: "10px",
                      }}
                    >
                      TenBestFind
                    </h3>
                    <p
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                        fontSize: "17px",
                        fontWeight: "700",
                        color: "var(--blue-900)",
                        marginBottom: "6px",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2D74D7"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M11 3a8 8 0 1 0 0 16 8 8 0 1 0 0-16" />
                        <path d="m21 21-4.3-4.3" />
                      </svg>
                      Editorially reviewed
                    </p>
                    <p style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
                      Ranked #{topEntry.position} in {topRanking.city ? `${topRanking.city.name} ` : ""}
                      {topRanking.category.name.toLowerCase()}
                      {topRanking.lastReviewedAt ? `, ${monthYear(topRanking.lastReviewedAt)}` : ""}
                    </p>
                  </li>
                ) : null}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- pricing */}
        {pricingRows.length > 0 || costRows.length > 0 ? (
          <section
            id="pricing"
            aria-labelledby="price-h2"
            style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div
              data-split=""
              style={{
                ...SHELL,
                padding: "64px 24px",
                display: "grid",
                gridTemplateColumns: pricingRows.length > 0 && costRows.length > 0 ? "1fr 1fr" : "minmax(0, 1fr)",
                gap: "24px",
                alignItems: "start",
              }}
            >
              {pricingRows.length > 0 ? (
                <div
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "20px",
                    padding: "26px",
                  }}
                >
                  <h2 id="price-h2" style={{ fontSize: "22px", fontWeight: "700", marginBottom: "6px" }}>
                    Company Pricing &amp; Estimates
                  </h2>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "18px" }}>
                    What this company publishes about its own pricing.
                  </p>
                  <dl style={{ display: "grid", gap: "12px", margin: "0" }}>
                    {pricingRows.map((row) => (
                      <div
                        key={row.label}
                        style={{ display: "flex", justifyContent: "space-between", gap: "16px", fontSize: "15px" }}
                      >
                        <dt style={{ color: "var(--text-secondary)" }}>{row.label}</dt>
                        <dd style={{ margin: "0", fontWeight: "600", color: "var(--blue-900)" }}>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {costRows.length > 0 ? (
                <div
                  style={{
                    background: "var(--blue-50)",
                    border: "1px solid var(--blue-100)",
                    borderRadius: "20px",
                    padding: "26px",
                  }}
                >
                  <h2
                    id={pricingRows.length > 0 ? undefined : "price-h2"}
                    style={{ fontSize: "22px", fontWeight: "700", marginBottom: "6px" }}
                  >
                    Local Market Pricing
                  </h2>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "18px" }}>
                    What {city ? `${city.name} ` : ""}homeowners generally pay, independent of this company.
                  </p>
                  <dl style={{ display: "grid", gap: "12px", margin: "0" }}>
                    {costRows.map((row) => (
                      <div
                        key={row.id}
                        style={{ display: "flex", justifyContent: "space-between", gap: "16px", fontSize: "15px" }}
                      >
                        <dt style={{ color: "var(--text-secondary)" }}>{row.label}</dt>
                        <dd
                          style={{
                            margin: "0",
                            fontWeight: "600",
                            color: "var(--blue-900)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {priceRange(row.lowPrice, row.highPrice, row.currency)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {costRows[0]?.guide ? (
                    <p style={{ marginTop: "18px" }}>
                      <Link href={routes.guide(costRows[0].guide.slug)} style={{ fontSize: "15px", fontWeight: "600" }}>
                        {costRows[0].guide.title} →
                      </Link>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ----------------------------------------------------------- photos */}
        {business.photos.length > 0 ? (
          <section id="photos" aria-labelledby="photos-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ ...SHELL, padding: "64px 24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: "24px",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                }}
              >
                <h2 id="photos-h2" style={SECTION_H2}>
                  Project Photos
                </h2>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                  Business-submitted, reviewed by our editors
                </p>
              </div>
              <ul
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "16px",
                }}
              >
                {business.photos.map((photo) => (
                  <li
                    key={photo.id}
                    style={{
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "18px",
                      overflow: "hidden",
                      background: "var(--surface-card)",
                    }}
                  >
                    <span style={{ display: "block", height: "220px", background: "var(--surface-sunken)" }}>
                      <Media src={photo.url} alt={photo.alt ?? ""} />
                    </span>
                    {photo.alt ? (
                      <span style={{ display: "block", padding: "16px 18px" }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: "15px",
                            fontWeight: "600",
                            color: "var(--blue-900)",
                          }}
                        >
                          {photo.alt}
                        </span>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ----------------------------------------------------------- videos */}
        {business.videos.length > 0 ? (
          <section
            id="videos"
            aria-labelledby="videos-h2"
            style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-page)" }}
          >
            <div style={{ ...SHELL, padding: "64px 24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: "24px",
                  flexWrap: "wrap",
                  marginBottom: "24px",
                }}
              >
                <div>
                  <h2 id="videos-h2" style={{ ...SECTION_H2, marginBottom: "6px" }}>
                    Project Videos
                  </h2>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                    From the company&apos;s YouTube channel. Loads only when you press play.
                  </p>
                </div>
                {business.youtubeChannel ? (
                  <a
                    className="arrow-link"
                    href={business.youtubeChannel}
                    rel="noopener nofollow"
                    target="_blank"
                    style={{ fontSize: "14px" }}
                  >
                    View channel on YouTube
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M7 17 17 7" />
                      <path d="M8 7h9v9" />
                    </svg>
                  </a>
                ) : null}
              </div>
              <ProjectVideos
                videos={business.videos.map((video) => ({
                  id: video.id,
                  videoId: video.videoId,
                  title: video.title,
                  meta: video.meta,
                  duration: video.duration,
                }))}
              />
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- similar */}
        {similar.length > 0 ? (
          <section
            id="similar"
            aria-labelledby="sim-h2"
            style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div style={{ ...SHELL, padding: "64px 24px" }}>
              <h2 id="sim-h2" style={{ ...SECTION_H2, marginBottom: "24px" }}>
                Similar {tradePlural(business.category.name, business.category.serviceName)} in{" "}
                {city ? city.name : "your area"}
              </h2>
              <ul
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "16px",
                }}
              >
                {similar.map((company) => (
                  <li
                    key={company.id}
                    data-card=""
                    style={{ ...CARD, display: "flex", flexDirection: "column", gap: "10px" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        aria-hidden="true"
                        style={{
                          flex: "0 0 44px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "44px",
                          height: "44px",
                          borderRadius: "12px",
                          border: "1px solid var(--border-subtle)",
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "var(--blue-900)",
                        }}
                      >
                        {initialsOf(company.name)}
                      </span>
                      <h3 style={{ fontSize: "17px", lineHeight: "1.3", fontWeight: "700" }}>
                        <Link href={routes.business(company.slug)} style={{ color: "var(--blue-900)" }}>
                          {company.name}
                        </Link>
                      </h3>
                    </span>
                    {company.googleRating ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "14px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <Star size={15} />
                        <strong style={{ fontWeight: "700", color: "var(--blue-900)" }}>
                          {company.googleRating.toFixed(1)}
                        </strong>
                        {company.googleReviewCount ? `(${company.googleReviewCount} Google reviews)` : null}
                      </span>
                    ) : null}
                    {company.bestFor || company.city ? (
                      <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                        {[company.bestFor, company.city?.name].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                    {company.entries[0] ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: "var(--amber-50)",
                            border: "1px solid #EBCE95",
                            fontSize: "12px",
                            fontWeight: "700",
                            color: "#8A5F0B",
                          }}
                        >
                          Ranked #{company.entries[0].position}
                        </span>
                      </span>
                    ) : null}
                    <Link
                      href={routes.business(company.slug)}
                      style={{ marginTop: "auto", paddingTop: "8px", fontSize: "14px", fontWeight: "600" }}
                    >
                      View profile →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- related */}
        {relatedServices.length > 0 || guides.length > 0 ? (
          <section id="related" aria-labelledby="rel-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ ...SHELL, padding: "64px 24px" }}>
              {relatedServices.length > 0 ? (
                <>
                  <h2 id="rel-h2" style={{ ...SECTION_H2, marginBottom: "20px" }}>
                    Related Home Services{city ? ` in ${city.name}` : ""}
                  </h2>
                  <ul
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                      gap: "12px",
                      marginBottom: guides.length > 0 ? "44px" : "0",
                    }}
                  >
                    {relatedServices.map((entry) => (
                      <li key={entry.id}>
                        <Link
                          data-row=""
                          href={routes.category(entry.slug)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            padding: "15px 18px",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "14px",
                            fontSize: "15px",
                            fontWeight: "600",
                            color: "var(--blue-900)",
                            textDecoration: "none",
                          }}
                        >
                          {entry.serviceName}
                          <RowChevron size={16} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {guides.length > 0 ? (
                <>
                  <h2
                    id={relatedServices.length > 0 ? undefined : "rel-h2"}
                    style={{ fontSize: "clamp(22px, 2.4vw, 30px)", fontWeight: "700", marginBottom: "20px" }}
                  >
                    Helpful {business.category.serviceName} Guides
                  </h2>
                  <ul
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {guides.map((guide) => (
                      <li
                        key={guide.id}
                        data-card=""
                        style={{ ...CARD, borderRadius: "16px" }}
                      >
                        <p
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "var(--ls-wide)",
                            textTransform: "uppercase",
                            color: "var(--text-secondary)",
                            marginBottom: "8px",
                          }}
                        >
                          {guide.category?.name ?? "Guide"}
                        </p>
                        <h3
                          style={{
                            fontSize: "17px",
                            lineHeight: "1.35",
                            fontWeight: "700",
                            marginBottom: "10px",
                          }}
                        >
                          <Link href={routes.guide(guide.slug)} style={{ color: "var(--blue-900)" }}>
                            {guide.title}
                          </Link>
                        </h3>
                        {guide.publishedAt ? (
                          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                            Updated {monthYear(guide.updatedAt ?? guide.publishedAt)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* -------------------------------------------------------------- faqs */}
        <section
          id="faqs"
          aria-labelledby="faq-h2"
          style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            data-split=""
            style={{
              ...SHELL,
              padding: "72px 24px",
              display: "grid",
              gridTemplateColumns: "0.7fr 1.3fr",
              gap: "48px",
              alignItems: "start",
            }}
          >
            <h2
              id="faq-h2"
              style={{ fontSize: "clamp(24px, 2.8vw, 34px)", lineHeight: "1.2", fontWeight: "700" }}
            >
              {business.name} FAQs
            </h2>
            <ul style={{ display: "grid", gap: "12px" }}>
              {faqs.map((faq) => (
                <li key={faq.question}>
                  <details
                    data-faq=""
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "16px",
                      padding: "4px 22px",
                    }}
                  >
                    <summary
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                        padding: "18px 0",
                        fontSize: "17px",
                        fontWeight: "700",
                        color: "var(--blue-900)",
                      }}
                    >
                      {faq.question}
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2D74D7"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </summary>
                    <p
                      style={{
                        padding: "0 0 20px",
                        fontSize: "16px",
                        lineHeight: "1.7",
                        color: "var(--text-secondary)",
                        maxWidth: "680px",
                      }}
                    >
                      {faq.answer}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------------------- accuracy */}
        <section id="accuracy" aria-labelledby="acc-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            data-split=""
            style={{
              ...SHELL,
              padding: "64px 24px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "20px",
                padding: "26px",
              }}
            >
              <h2 id="acc-h2" style={{ fontSize: "21px", fontWeight: "700", marginBottom: "10px" }}>
                Is Something Incorrect?
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  lineHeight: "1.65",
                  color: "var(--text-secondary)",
                  marginBottom: "20px",
                }}
              >
                Business information changes. Tell us about an address, phone, website, service area, credential or
                ownership change, or let us know if this company has closed.
              </p>
              <Link
                href="/contact/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "48px",
                  padding: "0 20px",
                  borderRadius: "14px",
                  border: "1.5px solid var(--border-strong)",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "var(--blue-900)",
                }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M11 4h2" />
                  <path d="m14.5 5.5 4 4" />
                  <path d="M4 20l1-4 11-11a2 2 0 0 1 3 3L8 19z" />
                </svg>
                Suggest an Update
              </Link>
            </div>

            <div
              style={{
                background: "var(--blue-50)",
                border: "1px solid var(--blue-100)",
                borderRadius: "20px",
                padding: "26px",
              }}
            >
              <h2 style={{ fontSize: "21px", fontWeight: "700", marginBottom: "10px" }}>Own {business.name}?</h2>
              <p
                style={{
                  fontSize: "15px",
                  lineHeight: "1.65",
                  color: "var(--text-secondary)",
                  marginBottom: "20px",
                }}
              >
                {business.claimed
                  ? "This profile has been claimed. Sign in to keep your business information, services and service area up to date."
                  : "Claim your profile to verify and maintain your business information, services and service area."}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <Link
                  href={business.claimed ? "/portal/" : `/claim/?business=${business.slug}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: "48px",
                    padding: "0 22px",
                    borderRadius: "14px",
                    background: "var(--color-primary)",
                    color: "#fff",
                    fontSize: "15px",
                    fontWeight: "600",
                    boxShadow: "var(--shadow-primary)",
                  }}
                >
                  {business.claimed ? "Owner Sign In" : "Claim This Business"}
                </Link>
                <Pop label="What claiming does" above width="min(420px, 80vw)">
                  <PopText>
                    Claiming lets you correct and maintain the factual information on this profile. Claiming or
                    upgrading a profile does not guarantee inclusion in a TenBestFind ranking and never affects
                    ranking position, which is decided editorially.
                  </PopText>
                  <PopLink href="/how-we-rank/">How We Rank →</PopLink>
                </Pop>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- profile meta */}
        <section
          id="profile-meta"
          aria-labelledby="meta-h2"
          style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div style={{ ...SHELL, padding: "56px 24px" }}>
            <div
              data-split=""
              style={{
                display: "grid",
                gridTemplateColumns: reviewer ? "1.2fr 0.8fr" : "minmax(0, 1fr)",
                gap: "40px",
                alignItems: "start",
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "20px",
                padding: "30px",
              }}
            >
              <div>
                <h2 id="meta-h2" style={{ fontSize: "21px", fontWeight: "700", marginBottom: "18px" }}>
                  About This Business Profile
                </h2>
                <dl
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: "16px 32px",
                    margin: "0",
                  }}
                >
                  {topRanking?.lastReviewedAt ? (
                    <div>
                      <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>
                        Last reviewed
                      </dt>
                      <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                        {monthYear(topRanking.lastReviewedAt)}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>
                      Profile last updated
                    </dt>
                    <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                      {fullDate(business.updatedAt)}
                    </dd>
                  </div>
                  {business.googleDataUpdated ? (
                    <div>
                      <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>
                        Google review data updated
                      </dt>
                      <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                        {fullDate(business.googleDataUpdated)}
                      </dd>
                    </div>
                  ) : null}
                  {reviewer ? (
                    <div>
                      <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>
                        Reviewed by
                      </dt>
                      <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600" }}>
                        <Link href={routes.expert(reviewer.slug)}>{reviewer.name}</Link>
                        {reviewer.role ? `, ${reviewer.role}` : ""}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>
                      Sources checked
                    </dt>
                    <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                      {[
                        business.credentials.length > 0 ? "Issuing authorities" : null,
                        business.googleRating ? "Google Business Profile" : null,
                        business.bbbRating ? "BBB" : null,
                        business.website ? "Company website" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Company website"}
                    </dd>
                  </div>
                  <div>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>
                      Sponsorship status
                    </dt>
                    <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                      {isSponsored ? "Paid placement, labelled" : "No commercial relationship"}
                    </dd>
                  </div>
                </dl>
              </div>

              {reviewer ? (
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "0 0 60px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: "var(--blue-50)",
                      border: "1px solid var(--blue-100)",
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "var(--blue-900)",
                    }}
                  >
                    {initialsOf(reviewer.name)}
                  </span>
                  <div>
                    {reviewer.bio ? (
                      <p
                        style={{
                          fontSize: "15px",
                          lineHeight: "1.65",
                          color: "var(--text-secondary)",
                          marginBottom: "12px",
                        }}
                      >
                        {reviewer.bio.split(/\n{2,}/)[0]}
                      </p>
                    ) : null}
                    <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", fontSize: "14px" }}>
                      <li>
                        <Link href="/how-we-rank/" style={{ fontWeight: "600" }}>
                          How We Rank
                        </Link>
                      </li>
                      <li>
                        <Link href="/advertise/" style={{ fontWeight: "600" }}>
                          Advertising Disclosure
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </SiteChrome>
  );
}
