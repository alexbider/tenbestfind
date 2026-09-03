import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/site/SiteChrome";
import { TrackClick, TrackView } from "@/components/site/Track";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { BusinessLogo } from "@/components/site/BusinessLogo";
import { QuoteDialog } from "@/components/site/QuoteDialog";
import { TeamSection } from "@/components/site/TeamSection";
import {
  Arrow,
  BTN_GHOST,
  BTN_PRIMARY,
  CHIP,
  Chevron,
  Crumbs,
  FaqItem,
  FinalSearchBand,
  GRID_BACKDROP,
  H2,
  LABEL,
  LEAD,
  PILL,
  InfoPopover,
  RowLink,
  SHELL,
  TenOutline,
} from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd, Media } from "@/components/ui/primitives";
import { fullDate, monthYear } from "@/lib/format";
import { parseJson, parseList, type HoursRow } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { seoFor } from "@/lib/seo";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

async function loadBusiness(slug: string) {
  return db.business.findUnique({
    where: { slug },
    include: {
      category: true,
      city: { include: { region: { include: { country: true } } } },
      credentials: { orderBy: { sortOrder: "asc" } },
      staff: { orderBy: { sortOrder: "asc" } },
      photos: { orderBy: { sortOrder: "asc" } },
      reviews: { orderBy: { postedAt: "desc" }, take: 10 },
      services: { include: { subservice: true } },
      areas: { include: { city: { include: { region: true } } } },
      entries: {
        orderBy: { position: "asc" },
        include: {
          ranking: {
            include: { category: true, city: { include: { region: { include: { country: true } } } } },
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
  const strengths = parseList(business.strengths);
  const considerations = parseList(business.considerations);
  const hours = parseJson<HoursRow[]>(business.hours, []);
  const distribution = parseJson<Record<string, number>>(business.googleDistribution, {});
  const topEntry = business.entries[0];

  // Profiles the company links to from its own site. Ordered so the ones people
  // actually check come first.
  const socialOrder = ["facebook", "instagram", "youtube", "linkedin", "x", "tiktok", "yelp", "bbb"];
  const socials = Object.entries(parseJson<Record<string, string>>(business.socialLinks, {}))
    .filter(([, url]) => typeof url === "string" && url.startsWith("http"))
    .sort((a, b) => socialOrder.indexOf(a[0]) - socialOrder.indexOf(b[0]));

  // Five reviews with something written in them. A bare star tells a reader
  // nothing, and the count beside the rating already covers those.
  const shownReviews = business.reviews
    .filter((review) => review.body.trim().length > 40)
    .slice(0, 5);

  // The long description, split into paragraphs, sits behind Read more. The
  // overview above it is written to stand alone, and older listings that have
  // none fall back to the description's first paragraph.
  const descriptionParts = (business.description ?? "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const overview = business.overview?.trim() || descriptionParts[0] || "";
  const rest = business.overview?.trim() ? descriptionParts : descriptionParts.slice(1);
  const isSponsored = business.placements.length > 0;
  const yearsInBusiness = business.yearFounded ? new Date().getFullYear() - business.yearFounded : null;

  const similar = city
    ? await db.business.findMany({
        where: {
          status: "PUBLISHED",
          cityId: city.id,
          categoryId: business.categoryId,
          NOT: { id: business.id },
        },
        orderBy: { googleRating: "desc" },
        take: 5,
        include: { entries: { select: { position: true }, take: 1, orderBy: { position: "asc" } } },
      })
    : [];

  const guides = await db.guide.findMany({
    where: { status: "PUBLISHED", categoryId: business.categoryId },
    orderBy: { publishedAt: "desc" },
    take: 4,
  });

  const totalReviews = Object.values(distribution).reduce((sum, value) => sum + value, 0);

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
      answer: business.areas.length
        ? `${business.areas.map((area) => area.city.name).join(", ")}. Coverage is as the business describes it, cross-checked against where its recent documented work is. Confirm your address before scheduling, particularly at the edge of a service area.`
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

  const placeLabel = city ? `${city.name}, ${region!.code.toUpperCase()}` : "";
  const otherAreas = business.areas
    .filter((area) => area.cityId !== business.cityId)
    .map((area) => area.city.name);

  /** The twelve facts the design puts under the hero, minus any we lack. */
  const glance: { label: string; value: string; icon: IconName }[] = [
    business.bestFor ? { label: "Best for", value: business.bestFor, icon: "badge" } : null,
    { label: "Primary service", value: business.category.serviceName, icon: "house" },
    city ? { label: "Location", value: placeLabel, icon: "pin" } : null,
    business.areas.length > 0
      ? { label: "Service area", value: `${business.areas.length} ${business.areas.length === 1 ? "area" : "areas"}`, icon: "globe" }
      : null,
    yearsInBusiness ? { label: "Years in business", value: `${yearsInBusiness} years`, icon: "clock" } : null,
    business.googleRating ? { label: "Google rating", value: `${business.googleRating.toFixed(1)} / 5`, icon: "star" } : null,
    business.googleReviewCount
      ? { label: "Google reviews", value: `${business.googleReviewCount} reviews`, icon: "chat" }
      : null,
    { label: "Emergency service", value: business.emergency ? "Yes" : "Not listed", icon: "alert" },
    { label: "Free estimates", value: business.freeEstimates ? "Yes" : "Not listed", icon: "doc" },
    { label: "Financing", value: business.financing ? "Available" : "Not listed", icon: "card" },
    business.warrantyTerms ? { label: "Warranty", value: business.warrantyTerms, icon: "shield" } : null,
    business.employeeCount ? { label: "Team size", value: `${business.employeeCount} people`, icon: "users" } : null,
  ].filter(Boolean) as { label: string; value: string; icon: IconName }[];

  const badges = [
    { label: "TenBestFind Reviewed", tone: "blue" as const, icon: "search" as IconName, on: business.entries.length > 0 },
    { label: "Verified Business", tone: "green" as const, icon: "shield" as IconName, on: business.verified },
    { label: "Top 10 Winner", tone: "gold" as const, icon: "award" as IconName, on: Boolean(topEntry) },
    { label: "Featured Partner", tone: "gold" as const, icon: "star" as IconName, on: isSponsored },
  ].filter((badge) => badge.on);

  const BADGE_TONES = {
    blue: { background: "var(--blue-50)", border: "1px solid var(--blue-100)", color: "var(--blue-800)" },
    green: { background: "var(--green-50)", border: "1px solid var(--green-100)", color: "#178054" },
    gold: { background: "var(--amber-50)", border: "1px solid #EBCE95", color: "#8A5F0B" },
  };

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

      {/* ------------------------------------------------------------- hero */}
      <section style={GRID_BACKDROP}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 56px" }}>
          <Crumbs
            items={[
              { label: "Home", href: "/" },
              ...(city
                ? [
                    { label: country!.name, href: routes.country(country!.code) },
                    { label: city.name, href: routes.city(country!.code, region!.slug, city.slug) },
                  ]
                : []),
              { label: business.name },
            ]}
          />

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
              <div style={{ display: "flex", alignItems: "flex-start", gap: "22px", flexWrap: "wrap" }}>
                <BusinessLogo name={business.name} url={business.logoUrl} size={76} radius={18} />
                <div style={{ flex: "1", minWidth: "300px" }}>
                  <h1
                    data-hero-in="2"
                    style={{ fontSize: "clamp(32px, 4vw, 46px)", lineHeight: "1.08", letterSpacing: "-0.04em", fontWeight: "800" }}
                  >
                    {business.name}
                  </h1>
                  <p data-hero-in="3" style={{ marginTop: "8px", fontSize: "17px", color: "var(--text-secondary)" }}>
                    <Link href={routes.category(business.category.slug)} style={{ fontWeight: "600" }}>
                      {business.category.singular}
                    </Link>
                    {city ? (
                      <>
                        {" serving "}
                        <Link
                          href={routes.city(country!.code, region!.slug, city.slug)}
                          style={{ fontWeight: "600" }}
                        >
                          {city.name}
                        </Link>
                        {otherAreas.length > 0 ? `, ${otherAreas.slice(0, 3).join(", ")} and surrounding areas` : ""}
                      </>
                    ) : null}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px 18px", margin: "18px 0 20px" }}>
                    {business.googleRating ? (
                      <>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="#D99A1C" stroke="none" aria-hidden="true">
                            <path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z" />
                          </svg>
                          <span style={{ fontSize: "19px", fontWeight: "700", color: "var(--blue-900)", fontVariantNumeric: "tabular-nums" }}>
                            {business.googleRating.toFixed(1)}
                          </span>
                          <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
                            on Google · {business.googleReviewCount} reviews
                          </span>
                        </span>
                        {yearsInBusiness ? (
                          <span aria-hidden="true" style={{ width: "1px", height: "16px", background: "var(--border-strong)" }} />
                        ) : null}
                      </>
                    ) : null}
                    {yearsInBusiness ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "15px", color: "var(--text-secondary)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        {yearsInBusiness} years in business
                      </span>
                    ) : null}
                  </div>

                  {badges.length > 0 ? (
                    <>
                      <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
                        {badges.map((badge) => (
                          <li
                            key={badge.label}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "7px",
                              padding: "8px 14px",
                              borderRadius: "999px",
                              fontSize: "13px",
                              fontWeight: "600",
                              ...BADGE_TONES[badge.tone],
                            }}
                          >
                            <Icon name={badge.icon} size={15} strokeWidth={2} />
                            {badge.label}
                          </li>
                        ))}
                      </ul>
                      <details data-pop="" style={{ position: "relative", display: "inline-block" }}>
                        <summary
                          aria-label="What these badges mean"
                          style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}
                        >
                          <span
                            style={{
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
                            }}
                          >
                            i
                          </span>
                          What do these badges mean?
                        </summary>
                        <div
                          role="note"
                          style={{
                            position: "absolute",
                            top: "calc(100% + 10px)",
                            left: "0",
                            zIndex: "180",
                            width: "min(460px, 82vw)",
                            background: "var(--blue-900)",
                            color: "var(--text-on-ink)",
                            borderRadius: "16px",
                            boxShadow: "var(--shadow-xl)",
                            padding: "20px 22px",
                          }}
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
                                A paid commercial relationship with TenBestFind. It never earns or influences a ranking
                                position.{isSponsored ? "" : " This company holds no such relationship."}
                              </dd>
                            </div>
                          </dl>
                          <p style={{ marginTop: "14px" }}>
                            <Link href={routes.advertisingDisclosure()} style={{ fontSize: "13px", fontWeight: "600", color: "#E8B551" }}>
                              Advertising &amp; Sponsorship Disclosure →
                            </Link>
                          </p>
                        </div>
                      </details>
                    </>
                  ) : null}
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
                      <Icon name="bulb" size={16} color="#2D74D7" strokeWidth={1.9} />
                      Quick overview
                    </h2>
                    <details data-pop="" style={{ position: "relative" }}>
                      <summary
                        aria-label="How this overview is produced"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "17px",
                            height: "17px",
                            borderRadius: "50%",
                            border: "1.5px solid var(--border-strong)",
                            fontSize: "10px",
                            fontWeight: "700",
                            color: "var(--color-primary)",
                          }}
                        >
                          i
                        </span>
                        How this is made
                      </summary>
                      <div
                        role="note"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 10px)",
                          right: "0",
                          zIndex: "180",
                          width: "min(420px, 80vw)",
                          background: "var(--blue-900)",
                          color: "var(--text-on-ink)",
                          borderRadius: "16px",
                          boxShadow: "var(--shadow-xl)",
                          padding: "18px 20px",
                        }}
                      >
                        <p style={{ fontSize: "13px", lineHeight: "1.65", color: "rgba(232,237,245,0.88)" }}>
                          This summary is written from the verified data on this profile: services, service area,
                          credentials, warranty terms and the company&apos;s Google review record. It is reviewed by an
                          editor before publishing and refreshed whenever the underlying data changes. Nothing here is
                          asserted that is not stated elsewhere on this page.
                        </p>
                        <p style={{ marginTop: "12px" }}>
                          <Link href="/editorial-standards/" style={{ fontSize: "13px", fontWeight: "600", color: "#E8B551" }}>
                            Editorial Standards →
                          </Link>
                        </p>
                      </div>
                    </details>
                  </div>
                  <div style={{ padding: "22px 24px 24px" }}>
                    <p style={{ fontSize: "16px", lineHeight: "1.75", color: "var(--text-primary)" }}>{overview}</p>
                    {strengths.length > 0 || considerations.length > 0 ? (
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
                        {strengths.slice(0, 2).map((item) => (
                          <li key={item} style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "14px", color: "var(--text-secondary)" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            {item}
                          </li>
                        ))}
                        {considerations.slice(0, 1).map((item) => (
                          <li key={item} style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "14px", color: "var(--text-secondary)" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A5F0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 8v5" />
                              <path d="M12 16h.01" />
                            </svg>
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
                  <TrackClick type="WEBSITE_CLICK" businessId={business.id}>
                    <a
                      href={business.website}
                      rel="nofollow noopener"
                      target="_blank"
                      style={{ ...BTN_PRIMARY, gap: "8px", height: "52px", fontSize: "16px", boxShadow: "var(--shadow-primary)" }}
                    >
                      <Icon name="globe" size={18} strokeWidth={1.9} />
                      Visit website
                    </a>
                  </TrackClick>
                ) : null}
                <QuoteDialog
                  businessId={business.id}
                  businessName={business.name}
                  services={business.services.map((link) => link.subservice.name)}
                />
                {business.phone ? (
                  <TrackClick type="PHONE_CLICK" businessId={business.id}>
                    <a href={`tel:${business.phone}`} style={{ ...BTN_GHOST, gap: "8px", height: "52px", fontSize: "16px" }}>
                      <Icon name="phone" size={18} strokeWidth={1.9} />
                      {business.phone}
                    </a>
                  </TrackClick>
                ) : null}
              </div>

              <dl style={{ display: "grid", gap: "14px", margin: "0", paddingTop: "18px", borderTop: "1px solid var(--border-subtle)" }}>
                {business.addressLine ? (
                  <div>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Address</dt>
                    <dd style={{ margin: "0", fontSize: "15px", color: "var(--blue-900)" }}>
                      {business.addressLine}
                      {/* Scraped addresses usually already carry the town, so it
                          is only added when it is genuinely missing. */}
                      {placeLabel && !business.addressLine.includes(city!.name) ? `, ${placeLabel}` : ""}
                      {business.postalCode && !business.addressLine.includes(business.postalCode)
                        ? ` ${business.postalCode}`
                        : ""}
                    </dd>
                  </div>
                ) : null}
                {hours.length > 0 ? (
                  <div>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Hours</dt>
                    <dd style={{ margin: "0", fontSize: "15px", color: "var(--blue-900)" }}>
                      {hours.slice(0, 2).map((row) => `${row.day} ${row.opens}–${row.closes}`).join(" · ")}
                    </dd>
                  </div>
                ) : null}
                {business.emergency ? (
                  <div>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Emergency service</dt>
                    <dd style={{ margin: "0", fontSize: "15px", color: "var(--blue-900)" }}>Available</dd>
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

      {/* ---------------------------------------------------------- glance */}
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
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "26px" }}>
            <div>
              <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
                <span data-eyebrow-rule="" aria-hidden="true" />
                Company facts
              </p>
              <h2 id="glance-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700" }}>
                {business.name} at a glance
              </h2>
            </div>
          </div>
          <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(232px, 1fr))", gap: "14px", margin: "0" }}>
            {glance.map((fact) => (
              <div
                key={fact.label}
                data-card=""
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "16px",
                  boxShadow: "var(--shadow-xs)",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: "0 0 40px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "40px",
                    height: "40px",
                    borderRadius: "11px",
                    background: "var(--blue-50)",
                    color: "var(--color-primary)",
                  }}
                >
                  <Icon name={fact.icon} size={19} strokeWidth={1.75} />
                </span>
                <span style={{ display: "block", minWidth: 0 }}>
                  <dt style={{ ...LABEL, marginBottom: "4px" }}>{fact.label}</dt>
                  <dd style={{ margin: "0", fontSize: "16px", fontWeight: "600", lineHeight: "1.35", color: "var(--blue-900)" }}>
                    {fact.value}
                  </dd>
                </span>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------- our take */}
      {business.editorialTake || strengths.length > 0 || considerations.length > 0 ? (
        <section id="take" aria-labelledby="take-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            data-split=""
            style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "48px", alignItems: "start" }}
          >
            <div>
              <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "14px" }}>
                <span data-eyebrow-rule="" aria-hidden="true" />
                Editorial review
              </p>
              <h2 id="take-h2" style={{ ...H2, marginBottom: "18px" }}>
                Our take on {business.name}
              </h2>
              {business.editorialTake ? (
                <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-primary)", marginBottom: "16px" }}>
                  {business.editorialTake}
                </p>
              ) : null}
              {rest.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-secondary)", marginBottom: "16px" }}>
                  {paragraph}
                </p>
              ))}
              {business.bestFor ? (
                <p style={{ marginTop: "20px", padding: "14px 16px", borderRadius: "12px", background: "var(--blue-50)", fontSize: "15px", color: "var(--blue-900)" }}>
                  <strong style={{ fontWeight: "700" }}>Best for:</strong> {business.bestFor}
                </p>
              ) : null}
            </div>
            <div style={{ display: "grid", gap: "16px" }}>
              {strengths.length > 0 ? (
                <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
                  <h3 style={{ ...LABEL, color: "var(--color-success)", marginBottom: "12px" }}>What we like</h3>
                  <ul style={{ display: "grid", gap: "9px" }}>
                    {strengths.map((item) => (
                      <li key={item} style={{ display: "flex", gap: "9px", fontSize: "15px", lineHeight: "1.55", color: "var(--text-secondary)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {considerations.length > 0 ? (
                <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
                  <h3 style={{ ...LABEL, color: "#8A5F0B", marginBottom: "12px" }}>Things to consider</h3>
                  <ul style={{ display: "grid", gap: "9px" }}>
                    {considerations.map((item) => (
                      <li key={item} style={{ display: "flex", gap: "9px", fontSize: "15px", lineHeight: "1.55", color: "var(--text-secondary)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A5F0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
                          <path d="M12 8v5" />
                          <path d="M12 16h.01" />
                        </svg>
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

      {/* --------------------------------------------------------- reviews */}
      {business.googleRating ? (
        <section id="reviews" aria-labelledby="rev-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "72px 24px" }}>
            <h2 id="rev-h2" style={{ ...H2, marginBottom: "8px" }}>
              Google reviews for {business.name}
            </h2>
            <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginBottom: "28px" }}>
              Customer ratings shown here come from Google. They are separate from our editorial review above.
            </p>

            <div data-split="" style={{ display: "grid", gridTemplateColumns: "0.75fr 1.25fr", gap: "24px", alignItems: "start", marginBottom: "24px" }}>
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
                <p style={{ ...LABEL, marginBottom: "10px" }}>Google rating</p>
                <p style={{ fontSize: "52px", lineHeight: "1", fontWeight: "700", color: "var(--blue-900)", letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>
                  {business.googleRating.toFixed(1)}
                </p>
                <p aria-hidden="true" style={{ marginTop: "10px", display: "flex", justifyContent: "center", gap: "3px" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={star <= Math.round(business.googleRating!) ? "#D99A1C" : "none"}
                      stroke={star <= Math.round(business.googleRating!) ? "none" : "#D99A1C"}
                      strokeWidth="1.8"
                    >
                      <path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z" />
                    </svg>
                  ))}
                </p>
                <p style={{ marginTop: "12px", fontSize: "15px", color: "var(--text-secondary)" }}>
                  Based on <strong style={{ color: "var(--blue-900)" }}>{business.googleReviewCount} Google reviews</strong>
                </p>
                {business.googleDataUpdated ? (
                  <p style={{ marginTop: "10px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    Review data updated {fullDate(business.googleDataUpdated)}
                  </p>
                ) : null}
              </div>

              {totalReviews > 0 ? (
                <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "26px", boxShadow: "var(--shadow-sm)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
                    <h3 style={LABEL}>Rating distribution</h3>
                    <InfoPopover label="About this distribution" align="right">
                      The split comes from the company&apos;s Google Business Profile as we read it on the date shown
                      above. Google does not publish the individual scores behind it, so the percentages are rounded and
                      may not total exactly one hundred.
                    </InfoPopover>
                  </div>
                  <ul style={{ display: "grid", gap: "12px" }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = distribution[String(star)] ?? 0;
                      const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                      return (
                        <li key={star} style={{ display: "grid", gridTemplateColumns: "62px 1fr 52px", alignItems: "center", gap: "14px" }}>
                          <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{star} star</span>
                          <span aria-hidden="true" style={{ display: "block", height: "10px", borderRadius: "999px", background: "var(--surface-sunken)", overflow: "hidden" }}>
                            <span style={{ display: "block", height: "100%", borderRadius: "999px", background: "#D99A1C", width: `${pct}%` }} />
                          </span>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--blue-900)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {pct}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            {shownReviews.length > 0 ? (
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
                {shownReviews.map((review) => (
                  <li
                    key={review.id}
                    data-card=""
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "18px",
                      padding: "22px 24px",
                      boxShadow: "var(--shadow-xs)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: "var(--blue-50)",
                          color: "var(--blue-800)",
                          fontSize: "13px",
                          fontWeight: "700",
                        }}
                      >
                        {review.author.slice(0, 2).toUpperCase()}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>{review.author}</span>
                        <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>
                          {review.rating} of 5{review.postedAt ? ` · ${monthYear(review.postedAt)}` : ""}
                        </span>
                      </span>
                    </div>
                    <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{review.body}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- rankings */}
      {business.entries.length > 0 ? (
        <section id="rankings" aria-labelledby="rank-h2" style={{ background: "var(--blue-900)", color: "var(--text-on-ink)" }}>
          <div
            data-split=""
            style={{ ...SHELL, padding: "64px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "start" }}
          >
            <div>
              <h2 id="rank-h2" style={{ ...H2, color: "#fff", marginBottom: "14px" }}>
                Why {business.name} made our rankings
              </h2>
              <p style={{ fontSize: "17px", lineHeight: "1.75", color: "rgba(232,237,245,0.78)" }}>
                {topEntry?.whyPicked ??
                  "This company appears in the rankings listed here. Each ranking page sets out the criteria used and the date an editor last checked it."}
              </p>
              <p style={{ marginTop: "20px" }}>
                <Link href={routes.howWeRank()} style={{ fontSize: "15px", fontWeight: "600", color: "#E8B551" }}>
                  How we rank →
                </Link>
              </p>
            </div>
            <ul style={{ display: "grid", gap: "12px" }}>
              {business.entries.map((entry) => (
                <li key={entry.id}>
                  <Link
                    href={rankingUrl(entry.ranking)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "18px 20px",
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "#fff",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        flex: "0 0 auto",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.1)",
                        color: "#E8B551",
                        fontSize: "18px",
                        fontWeight: "700",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      #{entry.position}
                    </span>
                    <span style={{ flex: "1", minWidth: 0, fontSize: "16px", fontWeight: "600" }}>{entry.ranking.title}</span>
                    <Chevron />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------ services and areas */}
      {business.services.length > 0 || business.areas.length > 0 ? (
        <section id="services" aria-labelledby="svc-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            data-split=""
            style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "start" }}
          >
            <div>
              <h2 id="svc-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700", marginBottom: "16px" }}>
                Services offered
              </h2>
              {business.services.length > 0 ? (
                <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                  {business.services.map((link) => (
                    <RowLink
                      key={link.subserviceId}
                      href={routes.subservice(business.category.slug, link.subservice.slug)}
                      outline
                    >
                      {link.subservice.name}
                    </RowLink>
                  ))}
                </ul>
              ) : (
                <p style={LEAD}>No service list on file for this company yet.</p>
              )}
            </div>
            <div>
              <h2 style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700", marginBottom: "16px" }}>Areas served</h2>
              {business.areas.length > 0 ? (
                <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {business.areas.map((area) => (
                    <li key={area.cityId}>
                      <Link
                        href={routes.city(country?.code ?? "us", area.city.region.slug, area.city.slug)}
                        style={{ ...PILL, display: "inline-block" }}
                      >
                        {area.city.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={LEAD}>Service area is not confirmed on file.</p>
              )}
              <div style={{ marginTop: "18px" }}>
                <InfoPopover label="About service coverage" link={{ href: routes.howWeRank(), label: "How we research" }}>
                  Coverage is as the business describes it, cross-checked against where its recent documented work is.
                  Travel charges at the edge of an area are common, so confirm your address before scheduling.
                </InfoPopover>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------- about and credentials */}
      <section id="about" aria-labelledby="about-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "48px", alignItems: "start" }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
              <h2 id="about-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700" }}>
                About {business.name}
              </h2>
              <InfoPopover label="Where this information comes from" align="right" link={{ href: "/editorial-standards/", label: "Editorial Standards" }}>
                Written from the company&apos;s own website and Google profile, then checked by an editor. Where the
                company is the only source for a claim, the page says so rather than presenting it as confirmed.
              </InfoPopover>
            </div>
            {descriptionParts.length > 0 ? (
              descriptionParts.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} style={{ fontSize: "16px", lineHeight: "1.75", color: "var(--text-secondary)", marginBottom: "14px" }}>
                  {paragraph}
                </p>
              ))
            ) : (
              <p style={LEAD}>No description on file for this company yet.</p>
            )}
            {socials.length > 0 ? (
              <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "18px" }}>
                {socials.map(([name, url]) => (
                  <li key={name}>
                    <a href={url} rel="nofollow noopener" target="_blank" style={{ ...PILL, display: "inline-block", textTransform: "capitalize" }}>
                      {name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div>
            <h2 style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700", marginBottom: "16px" }}>
              Credentials &amp; qualifications
            </h2>
            {business.credentials.length > 0 ? (
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
                        gap: "14px",
                        background: "var(--surface-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "16px",
                        padding: "18px 20px",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          flex: "0 0 38px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "38px",
                          height: "38px",
                          borderRadius: "11px",
                          background: verified ? "var(--green-50)" : expired ? "#FDECEA" : "var(--surface-sunken)",
                          border: `1px solid ${verified ? "var(--green-100)" : expired ? "#F5C6C2" : "var(--border-subtle)"}`,
                          color: verified ? "#178054" : expired ? "#C32620" : "var(--text-secondary)",
                        }}
                      >
                        <Icon name={verified ? "shield" : "doc"} size={18} strokeWidth={1.9} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                          {credential.label}
                        </span>
                        <span style={{ display: "block", fontSize: "13.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {[credential.authority, credential.identifier].filter(Boolean).join(" · ")}
                          {credential.checkedAt ? ` · checked ${monthYear(credential.checkedAt)}` : ""}
                        </span>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "8px",
                            padding: "3px 9px",
                            borderRadius: "999px",
                            fontSize: "11.5px",
                            fontWeight: "700",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            background: verified ? "var(--green-50)" : expired ? "#FDECEA" : "var(--surface-sunken)",
                            color: verified ? "#178054" : expired ? "#C32620" : "var(--text-secondary)",
                          }}
                        >
                          {verified ? "Verified" : expired ? "Expired" : "Reported"}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p style={LEAD}>No credential records on file yet. Ask for the certificate directly from the insurer.</p>
            )}
            <div style={{ marginTop: "16px" }}>
              <InfoPopover label="How credentials are checked" link={{ href: routes.howWeRank(), label: "Our methodology" }}>
                Verified items were checked against the authority that issues them, on the date shown. Reported items
                are what the business told us and we could not independently confirm. A licence that has lapsed since we
                checked will show as verified until the next review, which is why the date matters.
              </InfoPopover>
            </div>
          </div>
        </div>
      </section>

      {business.staff.length > 0 ? (
        <section aria-labelledby="team-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "64px 24px" }}>
            <h2 id="team-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700", marginBottom: "20px" }}>
              The team
            </h2>
            <TeamSection members={business.staff} />
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- photos */}
      {business.photos.length > 0 ? (
        <section id="photos" aria-labelledby="photos-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "64px 24px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "20px" }}>
              <h2 id="photos-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700" }}>
                Project photos
              </h2>
              <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                Supplied by the business or taken from its Google profile.
              </p>
            </div>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {business.photos.slice(0, 6).map((photo) => (
                <li
                  key={photo.id}
                  data-card=""
                  style={{
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    overflow: "hidden",
                    background: "var(--surface-card)",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  <div data-thumb="" style={{ height: "220px", background: "var(--surface-sunken)", overflow: "hidden" }}>
                    <Media src={photo.url} alt={photo.alt ?? ""} />
                  </div>
                  {photo.alt ? (
                    <p style={{ padding: "14px 18px", fontSize: "13.5px", color: "var(--text-secondary)" }}>{photo.alt}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- similar */}
      {similar.length > 0 ? (
        <section id="similar" aria-labelledby="sim-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "64px 24px" }}>
            <h2 id="sim-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700", marginBottom: "24px" }}>
              Similar {business.category.serviceName.toLowerCase()} companies{city ? ` in ${city.name}` : ""}
            </h2>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {similar.map((other) => (
                <li
                  key={other.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    padding: "22px 24px",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
                    <BusinessLogo name={other.name} url={other.logoUrl} size={44} radius={12} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "16px", fontWeight: "700", color: "var(--blue-900)" }}>
                        <Link href={routes.business(other.slug)} style={{ color: "var(--blue-900)" }}>
                          {other.name}
                        </Link>
                      </span>
                      {other.googleRating ? (
                        <span style={{ display: "block", fontSize: "13.5px", color: "var(--text-secondary)" }}>
                          {other.googleRating.toFixed(1)} · {other.googleReviewCount} reviews
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {other.bestFor ? (
                    <p style={{ fontSize: "14.5px", lineHeight: "1.55", color: "var(--text-secondary)" }}>{other.bestFor}</p>
                  ) : null}
                  {other.entries[0] ? (
                    <p style={{ marginTop: "12px" }}>
                      <span style={{ ...CHIP, display: "inline-block" }}>Ranked #{other.entries[0].position}</span>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- related */}
      {guides.length > 0 ? (
        <section id="related" aria-labelledby="rel-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "64px 24px" }}>
            <h2 id="rel-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700", marginBottom: "20px" }}>
              Helpful {business.category.serviceName.toLowerCase()} guides
            </h2>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "16px" }}>
              {guides.map((guide) => (
                <li
                  key={guide.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "16px",
                    padding: "22px 24px",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <p style={{ ...LABEL, fontSize: "11px", marginBottom: "8px" }}>{business.category.name}</p>
                  <h3 style={{ fontSize: "17px", lineHeight: "1.35", fontWeight: "700", marginBottom: "10px" }}>
                    <Link href={routes.guide(guide.slug)} style={{ color: "var(--blue-900)" }}>
                      {guide.title}
                    </Link>
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{guide.readingMinutes} min read</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ faqs */}
      <section id="faqs" aria-labelledby="faq-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "48px", alignItems: "start" }}
        >
          <h2 id="faq-h2" style={{ fontSize: "clamp(24px, 2.8vw, 34px)", lineHeight: "1.2", fontWeight: "700" }}>
            {business.name} FAQs
          </h2>
          <ul style={{ display: "grid", gap: "12px" }}>
            {faqs.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------- accuracy */}
      <section id="accuracy" aria-labelledby="acc-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "64px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "stretch" }}
        >
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "26px" }}>
            <h2 id="acc-h2" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "10px" }}>
              Is something incorrect?
            </h2>
            <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "18px" }}>
              Tell us what is out of date and we will check it against the source. Corrections are noted on the page
              with the date they were made.
            </p>
            <Link href={routes.corrections()} style={BTN_GHOST}>
              Report a correction
            </Link>
          </div>
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "26px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "10px" }}>Own {business.name}?</h2>
            <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "18px" }}>
              Claim the profile to keep your licence, hours, service area and photos current. Claiming never changes a
              ranking position.
            </p>
            <Link href={routes.claim()} style={BTN_PRIMARY}>
              Claim this profile
            </Link>
            <div style={{ marginTop: "14px" }}>
              <InfoPopover label="What claiming does and does not do" above link={{ href: routes.advertisingDisclosure(), label: "Advertising Disclosure" }}>
                Claiming lets the owner correct and maintain the details on this page. It does not create, move or
                protect a ranking position, and editors do not see who has claimed a profile while they research.
              </InfoPopover>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- profile meta */}
      <section id="profile-meta" aria-labelledby="meta-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "56px 24px" }}>
          <div
            data-split=""
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: "40px",
              alignItems: "start",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "30px",
            }}
          >
            <div>
              <h2 id="meta-h2" style={{ fontSize: "22px", fontWeight: "700", marginBottom: "18px" }}>
                About this business profile
              </h2>
              <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px 32px", margin: "0" }}>
                {business.publishedAt ? (
                  <div>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>First published</dt>
                    <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                      {monthYear(business.publishedAt)}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Last updated</dt>
                  <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                    {monthYear(business.updatedAt)}
                  </dd>
                </div>
                {business.googleDataUpdated ? (
                  <div>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Google data read</dt>
                    <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                      {monthYear(business.googleDataUpdated)}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Profile status</dt>
                  <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                    {business.claimed ? "Claimed by the owner" : "Unclaimed"}
                  </dd>
                </div>
                <div>
                  <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Methodology</dt>
                  <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600" }}>
                    <Link href={routes.howWeRank()}>How we research</Link>
                  </dd>
                </div>
              </dl>
            </div>
            <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--text-secondary)" }}>
              Credentials come from the authorities that issue them, ratings from the company&apos;s Google Business
              Profile with the date we read them, and the editorial take from our own review. Anything the business told
              us is labelled as reported.
            </p>
          </div>
        </div>
      </section>

      <FinalSearchBand
        heading={`Comparing ${business.category.serviceName.toLowerCase()} companies${city ? ` in ${city.name}` : ""}?`}
        service={business.category.serviceName}
        after={
          topEntry ? (
            <Link href={rankingUrl(topEntry.ranking)} style={{ fontSize: "15px", fontWeight: "600", color: "#E8B551" }}>
              See the full ranking this company appears in
            </Link>
          ) : undefined
        }
      />
    </SiteChrome>
  );
}
