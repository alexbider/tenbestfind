import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { TrackView } from "@/components/site/Track";
import { BusinessLogo } from "@/components/site/BusinessLogo";
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
  PageToc,
  RowLink,
  SHELL,
  TD,
  TH,
  TenOutline,
  initials,
} from "@/components/site/page-parts";
import { JsonLd, Media } from "@/components/ui/primitives";
import { money, monthYear } from "@/lib/format";
import { parseList, parseNotes } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { rankingCopy } from "@/lib/seo-copy";
import { breadcrumbSchema, rankingCrumbs } from "@/lib/breadcrumbs";

const HIRING_STEPS = [
  {
    title: "Verify insurance and credentials",
    body: "Ask for a current certificate of insurance and confirm registration or licensing with the authority that issues it, not with the company.",
  },
  {
    title: "Ask for a written estimate",
    body: "Scope, materials, removal, disposal and who pulls the permit should all be named on the page rather than agreed on the doorstep.",
  },
  {
    title: "Compare multiple quotes",
    body: "Two or three bids on the same scope. A number far below the others usually means something has been left out of it.",
  },
  {
    title: "Understand the warranty",
    body: "Separate the manufacturer's warranty on materials from the company's own warranty on the work, and get both in writing.",
  },
  {
    title: "Ask who performs the work",
    body: "Find out whether the crew are employees or subcontractors, and who supervises them on the day.",
  },
  {
    title: "Check recent local projects",
    body: "Ask for addresses or photographs of comparable jobs finished nearby in the last year or two.",
  },
  {
    title: "Avoid high-pressure sales",
    body: "A discount that expires today, or a knock on the door after a storm, is a reason to slow down rather than sign.",
  },
  {
    title: "Get everything in writing",
    body: "Change orders, timeline and payment schedule included, before the first payment changes hands.",
  },
];

/** Generic enough to be true of any trade; the city is filled in at render. */
const QUESTIONS = [
  "Are you insured, and can you send the certificate?",
  "How long have you worked in this area?",
  "Will you provide a written estimate with materials listed?",
  "What warranty do you offer on the work itself?",
  "Do you use subcontractors for this job?",
  "Who handles permits and inspection?",
  "What would you recommend here, and why?",
  "How are unexpected costs handled once work starts?",
  "What is the estimated timeline from start to finish?",
  "Can you provide recent local references?",
];

const RED_FLAGS = [
  "No verifiable local business address or registration",
  "Pressure to sign on the first visit",
  "A demand for full payment up front",
  "An offer to cover or waive your insurance deductible",
  "Refusal to put warranty terms in writing",
  "A quote that will not itemize scope",
];

export async function RankingPage({
  countryCode,
  regionSlug,
  citySlug,
  categorySlug,
}: {
  countryCode: string;
  regionSlug: string;
  citySlug: string;
  categorySlug: string;
}) {
  // A list whose city or service was renamed keeps its inbound links: the
  // redirect table is consulted before any of these paths is allowed to 404.
  const path = routes.ranking(countryCode, regionSlug, citySlug, categorySlug);

  const country = await db.country.findUnique({ where: { code: countryCode } });
  if (!country) {
    await redirectIfKnown(path);
    notFound();
  }
  const region = await db.region.findUnique({
    where: { countryId_slug: { countryId: country.id, slug: regionSlug } },
  });
  if (!region) {
    await redirectIfKnown(path);
    notFound();
  }
  const city = await db.city.findUnique({
    where: { regionId_slug: { regionId: region.id, slug: citySlug } },
  });
  if (!city) {
    await redirectIfKnown(path);
    notFound();
  }
  const category = await db.category.findUnique({ where: { slug: categorySlug } });
  if (!category) {
    await redirectIfKnown(path);
    notFound();
  }

  const ranking = await db.ranking.findUnique({
    where: { categoryId_cityId: { categoryId: category.id, cityId: city.id } },
    include: {
      category: true,
      city: { include: { region: { include: { country: true } } } },
      author: true,
      reviewer: true,
      criteria: { orderBy: { sortOrder: "asc" } },
      costs: { orderBy: { sortOrder: "asc" } },
      sources: { orderBy: { sortOrder: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
      entries: {
        // A suspended or archived company drops off the list while it is out.
        // The numbers on screen come from the surviving order, so the list still
        // reads 01, 02, 03 with nothing missing in between.
        where: { business: { status: "PUBLISHED" } },
        orderBy: { position: "asc" },
        include: {
          business: {
            include: {
              credentials: { orderBy: { sortOrder: "asc" } },
              category: true,
              services: { include: { subservice: true } },
              areas: { include: { city: true }, orderBy: { primary: "desc" } },
            },
          },
        },
      },
    },
  });
  if (!ranking || ranking.status !== "PUBLISHED") {
    await redirectIfKnown(path);
    notFound();
  }

  // The entries are already filtered to published companies, so this count is
  // exactly what the page shows, which is the only thing the heading is allowed
  // to claim.
  const copy = rankingCopy(ranking, category, city, region, {
    publishedEntries: ranking.entries.length,
  });
  const crumbs = rankingCrumbs(country, region, city, category);

  const [placement, relatedRankings, guides, nearbyRankings] = await Promise.all([
    db.sponsoredPlacement.findFirst({
      where: { status: "ACTIVE", cityId: city.id, categoryId: category.id },
      include: { business: { include: { category: true } } },
    }),
    db.ranking.findMany({
      where: { status: "PUBLISHED", cityId: city.id, NOT: { id: ranking.id } },
      include: { category: true },
      take: 6,
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED", categoryId: category.id },
      orderBy: { publishedAt: "desc" },
      take: 4,
      include: { author: { select: { name: true } } },
    }),
    db.ranking.findMany({
      where: {
        status: "PUBLISHED",
        categoryId: category.id,
        city: { regionId: region.id },
        NOT: { id: ranking.id },
      },
      include: { city: true },
      take: 6,
    }),
  ]);

  const faqs = ranking.faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }));
  const cityLabel = `${city.name}, ${region.code.toUpperCase()}`;
  const path4 = routes.ranking(country.code, region.slug, city.slug, category.slug);

  /** Every distinct area the ranked companies say they cover. */
  const areas = [
    ...new Map(
      ranking.entries
        .flatMap((entry) => entry.business.areas.map((area) => area.city))
        .map((area) => [area.id, area]),
    ).values(),
  ].slice(0, 12);

  const localNotes = parseNotes(ranking.localNotes);

  const toc = [
    { href: "#rankings", label: `All ${ranking.entries.length}` },
    { href: "#compare", label: "Compare" },
    ...(areas.length > 0 || nearbyRankings.length > 0 ? [{ href: "#coverage", label: "Coverage" }] : []),
    { href: "#method", label: "How we chose" },
    ...(ranking.costs.length > 0 ? [{ href: "#cost", label: "Costs" }] : []),
    ...(localNotes.length > 0 ? [{ href: "#local", label: `${city.name} notes` }] : []),
    { href: "#hiring", label: "Hiring" },
    ...(faqs.length > 0 ? [{ href: "#faqs", label: "FAQs" }] : []),
  ];

  return (
    <SiteChrome active="rankings">
      <div className="rank-2026">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: copy.h1,
          description: copy.description,
          url: absoluteUrl(path4),
          numberOfItems: ranking.entries.length,
          itemListElement: ranking.entries.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: entry.business.name,
            url: absoluteUrl(routes.business(entry.business.slug)),
          })),
        }}
      />
      <JsonLd data={breadcrumbSchema(crumbs, absoluteUrl)} />
      <FaqJsonLd faqs={faqs} />
      <TrackView type="RANKING_VIEW" rankingId={ranking.id} />

      {/* ------------------------------------------------------------- hero */}
      <section style={GRID_BACKDROP}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 48px" }}>
          <Crumbs
            items={crumbs}
          />

          <div
            data-split=""
            style={{
              display: "grid",
              gridTemplateColumns: placement ? "1.25fr 0.75fr" : "1fr",
              gap: "48px",
              alignItems: "start",
            }}
          >
            <div>
              <h1
                data-hero-in="2"
                style={{
                  fontSize: "clamp(32px, 4.2vw, 50px)",
                  lineHeight: "1.08",
                  letterSpacing: "-0.04em",
                  fontWeight: "800",
                  textWrap: "balance",
                }}
              >
                {copy.h1}
              </h1>
              <p
                data-hero-in="3"
                style={{ ...LEAD, marginTop: "20px", fontSize: "18px", maxWidth: "680px", textWrap: "pretty" }}
              >
                {ranking.summary}
              </p>
              <div style={{ marginTop: "22px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <a href="#rankings" style={{ ...BTN_PRIMARY, boxShadow: "var(--shadow-primary)" }}>
                  See the top {ranking.entries.length}
                </a>
                <a href="#compare" style={BTN_GHOST}>
                  Compare all {ranking.entries.length}
                </a>
              </div>
              <ul
                style={{
                  marginTop: "22px",
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px 20px",
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                }}
              >
                <li style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Last reviewed {monthYear(ranking.lastReviewedAt ?? ranking.publishedAt)}
                </li>
                {ranking.reviewer ? (
                  <li style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <path d="M9 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8" />
                    </svg>
                    Reviewed by the{" "}
                    <Link href={routes.expert(ranking.reviewer.slug)} style={{ fontWeight: "600" }}>
                      {ranking.reviewer.name}
                    </Link>
                  </li>
                ) : null}
                <li style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z" />
                    <path d="M10 7h4" />
                    <path d="M10 11h4" />
                  </svg>
                  {ranking.companiesReviewed} companies reviewed ·{" "}
                  <Link href={routes.howWeRank()} style={{ fontWeight: "600" }}>
                    How We Rank
                  </Link>
                </li>
              </ul>
            </div>

            {placement ? (
              <aside
                aria-labelledby="partner-h2"
                style={{
                  borderRadius: "22px",
                  overflow: "hidden",
                  border: "1.5px solid #EBCE95",
                  background: "var(--surface-card)",
                  boxShadow: "var(--shadow-xl)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{ height: "4px", background: "linear-gradient(90deg, #E8B551 0%, #D99A1C 60%, var(--blue-900) 100%)" }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "13px 22px",
                    background:
                      "linear-gradient(120deg, var(--amber-50) 0%, rgba(254,246,231,0.5) 70%, var(--surface-card) 100%)",
                    borderBottom: "1px solid #F0DDB4",
                  }}
                >
                  <h2
                    id="partner-h2"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      letterSpacing: "var(--ls-wider)",
                      textTransform: "uppercase",
                      color: "#8A5F0B",
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
                      <path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1" />
                    </svg>
                    Featured Partner
                  </h2>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      letterSpacing: "var(--ls-wide)",
                      textTransform: "uppercase",
                      color: "#8A5F0B",
                    }}
                  >
                    Sponsored
                  </span>
                </div>
                <div style={{ padding: "24px 26px 26px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        flex: "0 0 56px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "56px",
                        height: "56px",
                        borderRadius: "14px",
                        border: "1px solid #EBCE95",
                        background: "var(--amber-50)",
                        boxShadow: "var(--shadow-xs)",
                        fontSize: "18px",
                        fontWeight: "700",
                        color: "#8A5F0B",
                      }}
                    >
                      {initials(placement.business.name)}
                    </span>
                    <div>
                      <h3 style={{ fontSize: "19px", fontWeight: "700", lineHeight: "1.25", marginBottom: "4px" }}>
                        {placement.business.name}
                      </h3>
                      {placement.business.verified ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "var(--color-success)",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
                            <path d="m9 12 2 2 4-4" />
                          </svg>
                          Business details verified
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "16px" }}>
                    {placement.business.description}
                  </p>
                  <ul style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "18px" }}>
                    {parseList(placement.business.strengths)
                      .slice(0, 3)
                      .map((item) => (
                        <li key={item} style={{ ...CHIP, padding: "5px 11px", fontSize: "12px" }}>
                          {item}
                        </li>
                      ))}
                  </ul>
                  <details data-pop="" style={{ position: "relative", marginBottom: "16px" }}>
                    <summary
                      aria-label="About sponsored placements"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--text-secondary)",
                      }}
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
                      Why am I seeing this?
                    </summary>
                    <div
                      role="note"
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 10px)",
                        left: "0",
                        right: "0",
                        zIndex: "180",
                        background: "var(--blue-900)",
                        color: "var(--text-on-ink)",
                        borderRadius: "14px",
                        boxShadow: "var(--shadow-xl)",
                        padding: "16px 18px",
                      }}
                    >
                      <p style={{ fontSize: "13px", lineHeight: "1.6", color: "rgba(232,237,245,0.88)" }}>
                        This is a sponsored placement. Sponsorship does not determine TenBestFind editorial rankings,
                        and paid partners hold no position in the Top {ranking.entries.length} unless they earned it
                        independently.
                      </p>
                      <p style={{ marginTop: "10px" }}>
                        <Link href={routes.advertisingDisclosure()} style={{ fontSize: "13px", fontWeight: "600", color: "#E8B551" }}>
                          Advertising &amp; Sponsorship Disclosure →
                        </Link>
                      </p>
                    </div>
                  </details>
                  <Link
                    href={routes.business(placement.business.slug)}
                    style={{ ...BTN_PRIMARY, width: "100%", height: "52px", fontSize: "16px", boxShadow: "var(--shadow-primary)" }}
                  >
                    Visit Partner
                  </Link>
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </section>

      <PageToc items={toc} />

      {/* -------------------------------------------------------- the ten */}
      <section id="rankings" aria-labelledby="rank-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "24px 24px 72px" }}>
          <h2 id="rank-h2" style={{ ...H2, marginBottom: "8px" }}>
            Our top {ranking.entries.length} {category.serviceName.toLowerCase()} companies in {city.name}
          </h2>
          <p style={{ ...LEAD, marginBottom: "32px", maxWidth: "720px" }}>
            {ranking.intro ??
              "Each entry explains why the company was selected, what it does well and what to weigh before hiring."}
          </p>

          <ol style={{ display: "grid", gap: "20px" }}>
            {ranking.entries.map((entry, index) => {
              const business = entry.business;
              const likes = parseList(entry.likes);
              const concerns = parseList(entry.concerns);
              const services = business.services.map((link) => link.subservice.name);
              const area = business.areas.find((a) => a.primary)?.city.name ?? city.name;
              const credential = business.credentials[0];
              return (
                <li key={entry.id}>
                  <article
                    data-card=""
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "22px",
                      boxShadow: "var(--shadow-sm)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        height: "4px",
                        background: "linear-gradient(90deg, var(--blue-900) 0%, var(--color-primary) 55%, #E8B551 100%)",
                      }}
                    />
                    {/* The review opens rather than being open.

                        On a desktop there is a column wide enough to read a
                        review in, so the CSS holds every one of these open and
                        the summary is only the card's header. On a phone ten
                        open reviews are ten screens of scrolling before the
                        tenth company is even a name, which is the opposite of
                        what a list of ten is for: there the header is the whole
                        card and the review is a tap away. Every word is in the
                        page either way, so nothing is kept from a reader who
                        searched for it.

                        The header is built from spans because a summary takes
                        phrasing content and headings, not divs. */}
                    <details data-entry="">
                      <summary
                        data-entry-head=""
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "20px",
                          padding: "26px",
                          borderBottom: "1px solid var(--border-subtle)",
                          background:
                            "linear-gradient(120deg, var(--blue-50) 0%, rgba(234,244,255,0.35) 45%, var(--surface-card) 100%)",
                          flexWrap: "wrap",
                        }}
                      >
                        <span data-entry-plate="" aria-hidden="true">
                          <span data-entry-plate-n="">{String(index + 1).padStart(2, "0")}</span>
                          <span data-entry-plate-l="">Rank</span>
                        </span>
                        <BusinessLogo name={business.name} url={business.logoUrl} size={64} radius={16} />
                        <span data-entry-name="" style={{ display: "block", flex: "1", minWidth: "240px" }}>
                          <h3
                            style={{
                              fontSize: "25px",
                              lineHeight: "1.2",
                              fontWeight: "700",
                              letterSpacing: "var(--ls-tighter)",
                              marginBottom: "5px",
                              color: "var(--blue-900)",
                            }}
                          >
                            {business.name}
                          </h3>
                          {entry.designation ? (
                            <span
                              data-entry-designation=""
                              style={{
                                display: "block",
                                fontSize: "15px",
                                fontWeight: "600",
                                color: "var(--color-primary)",
                                marginBottom: "10px",
                              }}
                            >
                              {entry.designation}
                            </span>
                          ) : null}
                          <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px 16px" }}>
                            {business.googleRating ? (
                              <>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#D99A1C" stroke="none" aria-hidden="true">
                                    <path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z" />
                                  </svg>
                                  <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--blue-900)", fontVariantNumeric: "tabular-nums" }}>
                                    {business.googleRating.toFixed(1)}
                                  </span>
                                  <span data-entry-reviews="" style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                                    ({business.googleReviewCount} Google reviews)
                                  </span>
                                </span>
                                <span aria-hidden="true" data-entry-rule="" style={{ width: "1px", height: "14px", background: "var(--border-strong)" }} />
                              </>
                            ) : null}
                            {business.addressLine ? (
                              <span data-entry-address="" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "var(--text-secondary)" }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                                  <path d="M12 7a3 3 0 1 0 0 6 3 3 0 1 0 0-6" />
                                </svg>
                                {business.addressLine}
                              </span>
                            ) : null}
                            {business.verified ? (
                              <span data-entry-verified="" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: "600", color: "#178054" }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                                Details verified
                              </span>
                            ) : null}
                          </span>
                          {business.bestFor ? (
                            <span data-entry-bestfor="">
                              <strong>Best for</strong> {business.bestFor}
                            </span>
                          ) : null}
                        </span>
                        <span
                          data-entry-mark=""
                          style={{
                            flex: "0 0 auto",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "2px",
                            paddingLeft: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              letterSpacing: "var(--ls-wider)",
                              textTransform: "uppercase",
                              color: "var(--color-primary)",
                            }}
                          >
                            Rank
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontSize: "56px",
                              lineHeight: "0.9",
                              fontWeight: "700",
                              letterSpacing: "-0.05em",
                              color: "var(--color-primary)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span style={{ display: "block", width: "28px", height: "3px", borderRadius: "2px", background: "#D99A1C" }} />
                        </span>
                        <span data-entry-open="" aria-hidden="true">
                          <span data-entry-open-label="">Read review</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9 6 6 6-6 6" />
                          </svg>
                        </span>
                      </summary>
                      <div data-split="" style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: "32px", padding: "26px" }}>
                        <div>
                          {entry.whyPicked ? (
                            <>
                              <h4 style={{ ...LABEL, marginBottom: "8px" }}>Why we picked them</h4>
                              <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-primary)", marginBottom: "22px" }}>
                                {entry.whyPicked}
                              </p>
                            </>
                          ) : null}

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                            {likes.length > 0 ? (
                              <div>
                                <h4 style={{ ...LABEL, color: "var(--color-success)", marginBottom: "10px" }}>What we like</h4>
                                <ul style={{ display: "grid", gap: "8px" }}>
                                  {likes.map((item) => (
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
                            {concerns.length > 0 ? (
                              <div>
                                <h4 style={{ ...LABEL, color: "#8A5F0B", marginBottom: "10px" }}>Things to consider</h4>
                                <ul style={{ display: "grid", gap: "8px" }}>
                                  {concerns.map((item) => (
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

                          {services.length > 0 ? (
                            <>
                              <h4 style={{ ...LABEL, margin: "22px 0 10px" }}>Services</h4>
                              <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {services.map((name) => (
                                  <li key={name} style={CHIP}>
                                    {name}
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : null}
                        </div>

                        <div>
                          <div
                            style={{
                              background: "var(--surface-page)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "16px",
                              padding: "20px 22px",
                            }}
                          >
                            <h4 style={{ ...LABEL, marginBottom: "14px" }}>Key details</h4>
                            <dl style={{ display: "grid", gap: "10px", margin: "0" }}>
                              {[
                                ["Best for", business.bestFor],
                                ["Service area", area],
                                ["Years in business", business.yearFounded ? `${new Date().getFullYear() - business.yearFounded} years` : null],
                                ["Warranty", business.warrantyTerms],
                                ["Emergency service", business.emergency ? "Available" : null],
                                ["Financing", business.financing ? "Available" : null],
                                ["Credentials", credential ? credential.label : null],
                              ]
                                .filter(([, value]) => Boolean(value))
                                .map(([term, value]) => (
                                  <div key={term as string} style={{ display: "grid", gap: "2px" }}>
                                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{term}</dt>
                                    <dd style={{ margin: "0", fontSize: "15px", color: "var(--text-primary)" }}>{value}</dd>
                                  </div>
                                ))}
                            </dl>
                          </div>
                          <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
                            <Link href={routes.business(business.slug)} style={BTN_PRIMARY}>
                              View Company Profile
                            </Link>
                            {business.website ? (
                              <a href={business.website} rel="nofollow noopener" target="_blank" style={BTN_GHOST}>
                                Visit Website
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </details>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------- comparison */}
      <section id="compare" aria-labelledby="cmp-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "72px 24px" }}>
          <h2 id="cmp-h2" style={{ ...H2, marginBottom: "8px" }}>
            Compare the top {category.serviceName.toLowerCase()} companies in {city.name}
          </h2>
          <p style={{ ...LEAD, marginBottom: "28px" }}>
            Ranking position reflects our editorial review, not customer ratings.
          </p>
          <div
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "18px",
              background: "var(--surface-card)",
              overflow: "hidden",
              overflowX: "auto",
              boxShadow: "var(--shadow-sm)",
            }}
            data-rtable-wrap=""
          >
            <table role="table" style={{ minWidth: "880px" }} data-rtable="">
              <caption
                style={{
                  textAlign: "left",
                  padding: "18px 24px",
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                Editorial comparison of the {ranking.entries.length} ranked companies. Customer ratings, where shown,
                come from the source named on each company profile.
              </caption>
              <thead role="rowgroup">
                <tr role="row" style={{ background: "var(--surface-page)" }}>
                  <th role="columnheader" scope="col" style={{ ...TH, padding: "12px 24px" }}>Rank</th>
                  <th role="columnheader" scope="col" style={TH}>Company</th>
                  <th role="columnheader" scope="col" style={TH}>Best for</th>
                  <th role="columnheader" scope="col" style={TH}>Key services</th>
                  <th role="columnheader" scope="col" style={TH}>Service area</th>
                  <th role="columnheader" scope="col" style={TH}>Google rating</th>
                  <th role="columnheader" scope="col" style={TH}>Emergency</th>
                  <th role="columnheader" scope="col" style={{ ...TH, padding: "12px 24px" }}>Profile</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {ranking.entries.map((entry, index) => {
                  const business = entry.business;
                  return (
                    <tr role="row" key={entry.id}>
                      <th role="rowheader" scope="row" style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "34px",
                            height: "34px",
                            padding: "0 8px",
                            borderRadius: "10px",
                            background: "var(--blue-50)",
                            color: "var(--blue-800)",
                            fontSize: "15px",
                            fontWeight: "700",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </th>
                      <td role="cell" style={TD} data-label="Company">
                        <Link href={routes.business(business.slug)} style={{ fontWeight: "600", color: "var(--blue-900)" }}>
                          {business.name}
                        </Link>
                      </td>
                      <td role="cell" style={TD} data-label="Best for">{business.bestFor}</td>
                      <td role="cell" style={TD} data-label="Key services">
                        {business.services.slice(0, 3).map((link) => link.subservice.name).join(", ")}
                      </td>
                      <td role="cell" style={TD} data-label="Service area">
                        {business.areas.find((a) => a.primary)?.city.name ?? city.name}
                      </td>
                      <td role="cell" style={TD} data-label="Google rating">
                        {business.googleRating ? `${business.googleRating.toFixed(1)} (${business.googleReviewCount})` : "Not listed"}
                      </td>
                      <td role="cell" style={TD} data-label="Emergency">{business.emergency ? "Yes" : "Not listed"}</td>
                      <td role="cell" style={{ ...TD, padding: "16px 24px" }} data-label="Profile">
                        <Link href={routes.business(business.slug)} style={{ fontWeight: "600", whiteSpace: "nowrap" }}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- coverage */}
      {areas.length > 0 || nearbyRankings.length > 0 ? (
        <section id="coverage" aria-labelledby="cov-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            data-split=""
            style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start" }}
          >
            <div>
              <h2 id="cov-h2" style={{ ...H2, marginBottom: "16px", textWrap: "balance" }}>
                {category.serviceName} companies serving {city.name} and nearby areas
              </h2>
              <p style={{ ...LEAD, marginBottom: "22px" }}>
                Most companies in this ranking work across {region.name} and the surrounding suburbs. Coverage and
                travel fees vary, so confirm your address is inside the service area before scheduling.
              </p>
              {areas.length > 0 ? (
                <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {areas.map((area) => (
                    <li key={area.id} style={PILL}>
                      {area.name}
                    </li>
                  ))}
                </ul>
              ) : null}
              {nearbyRankings.length > 0 ? (
                <>
                  <h3 style={{ fontSize: "17px", fontWeight: "700", margin: "28px 0 12px" }}>Nearby rankings</h3>
                  <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                    {nearbyRankings.map((near) => (
                      <RowLink key={near.id} href={rankingUrl({ category, city: near.city ? { slug: near.city.slug, region: { slug: region.slug, country: { code: country.code } } } : null })}>
                        {near.city?.name}
                      </RowLink>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
            <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "20px", overflow: "hidden", background: "var(--surface-card)" }}>
              <div style={{ height: "320px", background: "var(--surface-sunken)" }}>
                <Media src={city.heroImage} alt="" />
              </div>
              <p style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-secondary)" }}>
                Service coverage across {city.name}. Individual company areas are listed on each profile.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- methodology */}
      <section id="method" aria-labelledby="method-h2" style={{ background: "var(--blue-900)", color: "var(--text-on-ink)" }}>
        <div style={{ ...SHELL, padding: "76px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "16px" }}>
            <h2 id="method-h2" style={{ ...H2, color: "#fff" }}>
              How we chose the best {category.serviceName.toLowerCase()} companies in {city.name}
            </h2>
            <Link href={routes.howWeRank()} style={{ fontSize: "15px", fontWeight: "600", color: "#E8B551" }}>
              Read our full ranking methodology →
            </Link>
          </div>
          <p style={{ fontSize: "17px", lineHeight: "1.7", color: "rgba(232,237,245,0.78)", maxWidth: "760px", marginBottom: "40px" }}>
            {ranking.methodologyNote ??
              `We started from ${ranking.companiesReviewed} ${category.serviceName.toLowerCase()} companies serving ${city.name} and narrowed the list against the criteria below. Position reflects our editorial judgment of overall fit for local homeowners, not payment.`}
          </p>
          {ranking.criteria.length > 0 ? (
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
              {ranking.criteria.map((criterion) => (
                <li
                  key={criterion.id}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: "16px",
                    padding: "22px 24px",
                  }}
                >
                  <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>{criterion.title}</h3>
                  <p style={{ fontSize: "15px", lineHeight: "1.6", color: "rgba(232,237,245,0.78)" }}>{criterion.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------------------ costs */}
      {ranking.costs.length > 0 ? (
        <section id="cost" aria-labelledby="cost-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            data-split=""
            style={{ ...SHELL, padding: "76px 24px", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "56px", alignItems: "start" }}
          >
            <div>
              <h2 id="cost-h2" style={{ ...H2, marginBottom: "18px", textWrap: "balance" }}>
                How much does {category.serviceName.toLowerCase()} cost in {city.name}?
              </h2>
              <p style={{ ...LEAD, lineHeight: "1.75" }}>
                Prices depend on the size of the job, the materials, access, permits and how much has to be removed
                before the new work starts. The figures below are what local companies quote most often.
              </p>
              <p style={{ marginTop: "20px" }}>
                <Link href={routes.category(category.slug)} style={{ fontSize: "16px", fontWeight: "600" }}>
                  See our {category.serviceName.toLowerCase()} cost guide →
                </Link>
              </p>
            </div>
            <div>
              <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "18px", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)" }}>
                <table style={{ minWidth: "520px" }}>
                  <caption
                    style={{
                      textAlign: "left",
                      padding: "20px 26px 16px",
                      fontSize: "15px",
                      fontWeight: "700",
                      color: "var(--blue-900)",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    Typical {city.name} {category.serviceName.toLowerCase()} costs
                  </caption>
                  <thead>
                    <tr style={{ background: "var(--surface-page)" }}>
                      <th scope="col" style={{ ...TH, padding: "12px 26px" }}>Service</th>
                      <th scope="col" style={{ ...TH, padding: "12px 20px", whiteSpace: "nowrap" }}>Typical range</th>
                      <th scope="col" style={{ ...TH, padding: "12px 26px" }}>What moves the price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.costs.map((row) => (
                      <tr key={row.id}>
                        <td style={{ ...TD, padding: "16px 26px", fontWeight: "600", color: "var(--blue-900)" }}>{row.label}</td>
                        <td style={{ ...TD, padding: "16px 20px", whiteSpace: "nowrap" }}>
                          {row.lowPrice && row.highPrice
                            ? `${money(row.lowPrice, row.currency)} – ${money(row.highPrice, row.currency)}`
                            : row.typical
                              ? money(row.typical, row.currency)
                              : "On request"}
                        </td>
                        <td style={{ ...TD, padding: "16px 26px", color: "var(--text-secondary)" }}>{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <details data-pop="" style={{ position: "relative", marginTop: "16px" }}>
                <summary
                  aria-label="About these cost ranges"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: "1.5px solid var(--border-strong)",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--color-primary)",
                    }}
                  >
                    i
                  </span>
                  How to read these ranges
                </summary>
                <div
                  role="note"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    left: "0",
                    right: "0",
                    zIndex: "180",
                    background: "var(--blue-900)",
                    color: "var(--text-on-ink)",
                    borderRadius: "14px",
                    boxShadow: "var(--shadow-xl)",
                    padding: "18px 20px",
                  }}
                >
                  <p style={{ fontSize: "13px", lineHeight: "1.65", color: "rgba(232,237,245,0.88)" }}>
                    Ranges are for installed work, including removal, materials, labour and disposal. Your own quote
                    moves with the size of the job, the grade of material, what is found underneath, access, permits
                    and the extent of any damage. Where an insurance claim is involved, what you pay is usually the
                    excess rather than the figures above.
                  </p>
                  <p style={{ marginTop: "12px", fontSize: "12px", lineHeight: "1.6", color: "rgba(232,237,245,0.7)" }}>
                    Ranges are updated with each editorial review of this page.
                  </p>
                  <p style={{ marginTop: "10px" }}>
                    <Link href={routes.howWeRank()} style={{ fontSize: "13px", fontWeight: "600", color: "#E8B551" }}>
                      Full cost methodology →
                    </Link>
                  </p>
                </div>
              </details>
            </div>
          </div>
        </section>
      ) : null}

      {localNotes.length > 0 ? (
        <section id="local" aria-labelledby="local-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "76px 24px" }}>
            <h2 id="local-h2" style={{ ...H2, marginBottom: "12px" }}>
              What {city.name} homeowners should know about {category.serviceName.toLowerCase()}
            </h2>
            <p style={{ ...LEAD, maxWidth: "760px", marginBottom: "32px" }}>
              Local conditions shape both the work and the paperwork. These are the factors that come up most often in
              the {city.name} market.
            </p>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {localNotes.map((note) => (
                <li
                  key={note.title}
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "16px",
                    padding: "22px 24px",
                  }}
                >
                  <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "6px" }}>{note.title}</h3>
                  <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{note.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- hiring */}
      <section id="hiring" aria-labelledby="hire-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "76px 24px" }}>
          <div data-split="" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: "48px", alignItems: "start" }}>
            <div>
              <h2 id="hire-h2" style={{ ...H2, marginBottom: "20px", textWrap: "balance" }}>
                How to choose a {category.singular.toLowerCase()} in {city.name}
              </h2>
              <ul data-hire-steps="" style={{ display: "grid", gap: "18px" }}>
                {HIRING_STEPS.map((step) => (
                  <li key={step.title} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <span aria-hidden="true" style={{ flex: "0 0 auto", color: "var(--color-primary)", display: "inline-flex", paddingTop: "2px" }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20" />
                        <path d="m8 12 3 3 5-6" />
                      </svg>
                    </span>
                    <span style={{ display: "block" }}>
                      <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "4px" }}>{step.title}</h3>
                      <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{step.body}</p>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: "grid", gap: "20px" }}>
              <details data-tip="" style={{ background: "var(--blue-50)", border: "1px solid var(--blue-100)", borderRadius: "20px", padding: "26px" }}>
                <summary data-tip-head="">
                  <h3 style={{ fontSize: "20px", fontWeight: "700" }}>Questions to ask before hiring</h3>
                  <span data-tip-ico="" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <ul style={{ display: "grid", gap: "10px" }}>
                  {QUESTIONS.map((question) => (
                    <li key={question} style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.6", color: "var(--text-primary)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "4px" }}>
                        <path d="M4 5h16v12a1 1 0 0 1-1 1H9l-5 4z" />
                      </svg>
                      {question}
                    </li>
                  ))}
                </ul>
              </details>
              <details data-tip="" style={{ background: "var(--surface-card)", border: "1px solid #F0DDB4", borderRadius: "20px", padding: "26px" }}>
                <summary data-tip-head="">
                  <h3 style={{ fontSize: "20px", fontWeight: "700" }}>Red flags</h3>
                  <span data-tip-ico="" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <ul style={{ display: "grid", gap: "10px" }}>
                  {RED_FLAGS.map((flag) => (
                    <li key={flag} style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.6", color: "var(--text-primary)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C32620" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "4px" }}>
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                        <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
                      </svg>
                      {flag}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- related */}
      {relatedRankings.length > 0 || guides.length > 0 ? (
        <section id="related" aria-labelledby="rel-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "72px 24px" }}>
            {relatedRankings.length > 0 ? (
              <>
                <h2 id="rel-h2" style={{ ...H2, marginBottom: "24px" }}>
                  Related home services in {city.name}
                </h2>
                <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginBottom: "44px" }}>
                  {relatedRankings.map((related) => (
                    <RowLink
                      key={related.id}
                      boxed
                      href={routes.ranking(country.code, region.slug, city.slug, related.category.slug)}
                    >
                      {related.category.name}
                    </RowLink>
                  ))}
                </ul>
              </>
            ) : null}

            {guides.length > 0 ? (
              <>
                <h2 style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700", marginBottom: "24px" }}>
                  {category.serviceName} guides for {city.name} homeowners
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
                      <p style={{ ...LABEL, fontSize: "11px", marginBottom: "8px" }}>{category.name}</p>
                      <h3 style={{ fontSize: "17px", lineHeight: "1.35", fontWeight: "700", marginBottom: "10px" }}>
                        <Link href={routes.guide(guide.slug)} style={{ color: "var(--blue-900)" }}>
                          {guide.title}
                        </Link>
                      </h3>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        {guide.author ? `${guide.author.name} · ` : ""}
                        {guide.readingMinutes} min read
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- faqs */}
      {faqs.length > 0 ? (
        <section id="faqs" aria-labelledby="faqs-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            data-split=""
            style={{ ...SHELL, padding: "76px 24px", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "56px", alignItems: "start" }}
          >
            <h2 id="faqs-h2" style={{ ...H2, textWrap: "balance" }}>
              {category.serviceName} companies in {city.name} FAQs
            </h2>
            <ul style={{ display: "grid", gap: "12px" }}>
              {faqs.map((faq) => (
                <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------- about this ranking */}
      <section id="about" aria-labelledby="about-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "64px 24px" }}>
          <div
            data-split=""
            data-about-card=""
            style={{
              display: "grid",
              gridTemplateColumns: ranking.author ? "1.2fr 0.8fr" : "1fr",
              gap: "40px",
              alignItems: "start",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "30px",
            }}
          >
            <div>
              <h2 id="about-h2" style={{ fontSize: "22px", fontWeight: "700", marginBottom: "18px" }}>
                About this ranking
              </h2>
              <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px 32px", margin: "0" }}>
                <div>
                  <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Originally published</dt>
                  <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                    {monthYear(ranking.publishedAt)}
                  </dd>
                </div>
                <div>
                  <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Last reviewed</dt>
                  <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                    {monthYear(ranking.lastReviewedAt ?? ranking.publishedAt)}
                  </dd>
                </div>
                {ranking.reviewer ? (
                  <div>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Reviewed by</dt>
                    <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600" }}>
                      <Link href={routes.expert(ranking.reviewer.slug)}>{ranking.reviewer.name}</Link>
                      {ranking.reviewer.role ? `, ${ranking.reviewer.role}` : ""}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Companies evaluated</dt>
                  <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                    {ranking.companiesReviewed}
                  </dd>
                </div>
                <div>
                  <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Methodology</dt>
                  <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600" }}>
                    <Link href={routes.howWeRank()}>Ranking methodology</Link>
                  </dd>
                </div>
                {ranking.sources.length > 0 ? (
                  <div>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Sources reviewed</dt>
                    <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600" }}>
                      <a href="#method">
                        {ranking.sources.length} {ranking.sources.length === 1 ? "source" : "sources"}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
            {ranking.author ? (
              <div data-author-bio="" style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "6px" }}>
                    <Link href={routes.expert(ranking.author.slug)}>{ranking.author.name}</Link>
                  </h3>
                  <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    {ranking.author.bio}
                  </p>
                  <Link
                    href={routes.corrections()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      height: "44px",
                      padding: "0 18px",
                      borderRadius: "12px",
                      border: "1.5px solid var(--border-strong)",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--blue-900)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 4h2" />
                      <path d="m14.5 5.5 4 4" />
                      <path d="M4 20l1-4 11-11a2 2 0 0 1 3 3L8 19z" />
                    </svg>
                    Suggest a correction
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <FinalSearchBand
        heading={`Need a ${category.singular.toLowerCase()} in ${city.name}?`}
        service={category.serviceName}
        after={
          <a href="#compare" style={{ fontSize: "15px", fontWeight: "600", color: "#E8B551" }}>
            Or compare the {city.name} {category.serviceName.toLowerCase()} companies again
          </a>
        }
      />
      </div>
    </SiteChrome>
  );
}
