import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { TrackView } from "@/components/site/Track";
import { BusinessLogo } from "@/components/site/BusinessLogo";
import { initials } from "@/components/site/page-parts";
import { Checklist } from "@/components/site/ranking/Checklist";
import { CoverageMap, type CoveragePin } from "@/components/site/ranking/CoverageMap";
import { RankingList, type RankItem } from "@/components/site/ranking/RankingList";
import {
  Accent,
  ArrowSvg,
  CRITERIA_ICONS,
  FaqList,
  FinalBand,
  H2S,
  HeroBackdrop,
  HeroCrumbs,
  ICO,
  Kicker,
  NOTE_ICONS,
  OutArrow,
  PageNav,
  Pop,
  SHELL_STYLE,
  Tile,
} from "@/components/site/ranking/parts";
import { JsonLd, Media } from "@/components/ui/primitives";
import { money, monthYear } from "@/lib/format";
import { parseList, parseNotes } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { rankingCopy } from "@/lib/seo-copy";
import { tradeWords } from "@/lib/trade-words";
import { breadcrumbSchema, rankingCrumbs } from "@/lib/breadcrumbs";
import { graph, listId, pageEntity, personEntity, personFromRow, personRef, rankingListEntity } from "@/lib/schema";
import { businessSchemaInput } from "@/lib/schema-entities";
import { relatedForRanking } from "@/lib/related";
import { RelatedContent } from "@/components/site/RelatedContent";

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
    // A guide about one place only belongs on that place's pages. Matching on
    // trade alone put the Chicago plumber guide on every plumber ranking.
    db.guide.findMany({
      where: {
        status: "PUBLISHED",
        categoryId: category.id,
        AND: [
          { OR: [{ cityId: null }, { cityId: city.id }] },
          { OR: [{ regionId: null }, { regionId: region.id }] },
          { OR: [{ countryId: null }, { countryId: country.id }] },
        ],
      },
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
  const related = await relatedForRanking({
    rankingId: ranking.id,
    categoryId: category.id,
    categorySlug: category.slug,
    categoryName: category.name,
    cityId: city.id,
    citySlug: city.slug,
    cityName: city.name,
    regionId: region.id,
    regionSlug: region.slug,
    regionName: region.name,
    countryCode: country.code,
  });

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

  const total = ranking.entries.length;
  const words = tradeWords(category);
  const serviceLower = words.trade;
  const reviewedOn = ranking.lastReviewedAt ?? ranking.publishedAt;
  const year = reviewedOn ? new Date(reviewedOn).getFullYear() : null;
  // The share of the companies looked at that did not make the list, which is
  // where the gold part of the bar starts.
  const funnelPct =
    ranking.companiesReviewed > total ? Math.round(((ranking.companiesReviewed - total) / ranking.companiesReviewed) * 100) : null;
  const reviewer = ranking.reviewer;
  const author = ranking.author;
  const podium = total >= 3 ? ranking.entries.slice(0, 3) : [];
  const hasSide = podium.length > 0 || Boolean(placement);

  const coveragePlaces = [
    city,
    ...areas.filter((area) => area.id !== city.id),
  ].filter((place) => place.latitude != null && place.longitude != null);
  const pins: CoveragePin[] = coveragePlaces.map((place) => ({
    id: place.id,
    name: place.name,
    latitude: place.latitude as number,
    longitude: place.longitude as number,
    primary: place.id === city.id,
  }));

  const items: RankItem[] = ranking.entries.map((entry, index) => {
    const business = entry.business;
    const num = String(index + 1).padStart(2, "0");
    const likes = parseList(entry.likes);
    const concerns = parseList(entry.concerns);
    const services = business.services.map((link) => link.subservice.name);
    const area = business.areas.find((a) => a.primary)?.city.name ?? city.name;
    const credential = business.credentials[0];
    const href = routes.business(business.slug);
    const years = business.yearFounded ? `${new Date().getFullYear() - business.yearFounded} years` : null;
    const details = (
      [
        ["Best for", business.bestFor],
        ["Service area", area],
        ["Address", business.addressLine],
        ["Years in business", years],
        ["Warranty", business.warrantyTerms],
        ["Emergency service", business.emergency ? "Available" : null],
        ["Financing", business.financing ? "Available" : null],
        ["Credentials", credential ? credential.label : null],
      ] as [string, string | null | undefined][]
    ).filter(([, value]) => Boolean(value)) as [string, string][];

    return {
      id: entry.id,
      anchor: `rank-${index + 1}`,
      rankNum: num,
      rankLabel: `Rank ${index + 1}`,
      name: business.name,
      href,
      top3: index < 3,
      emergency: business.emergency,
      financing: business.financing,
      logo: business.logoUrl ? (
        <BusinessLogo name={business.name} url={business.logoUrl} size={52} radius={15} />
      ) : (
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "52px",
            height: "52px",
            borderRadius: "15px",
            background: "var(--ink)",
            color: "var(--gold-ink)",
            fontSize: "15px",
            fontWeight: "800",
            letterSpacing: "0.02em",
          }}
        >
          {initials(business.name)}
        </span>
      ),
      info: (
        <>
          {entry.designation ? (
            <p style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: "3px" }}>
              {entry.designation}
            </p>
          ) : null}
          <h3 style={{ ["--fs" as string]: "20px", fontSize: "20px", lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.022em" }}>
            <Link href={href} style={{ color: "var(--ink)" }}>
              {business.name}
            </Link>
          </h3>
          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 14px", fontSize: "13px", color: "var(--text-secondary)" }}>
            {business.googleRating ? (
              <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: "2px 7px" }}>
                <Stars rating={business.googleRating} index={index} />
                <strong style={{ fontSize: "14px", color: "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{business.googleRating.toFixed(1)}</strong>
                <span>({business.googleReviewCount} Google reviews)</span>
              </span>
            ) : null}
            {business.verified ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: "600", color: "#178054" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Details verified
              </span>
            ) : null}
          </div>
        </>
      ),
      spec: (
        <div
          data-spec=""
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            margin: "0 20px 16px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "14px",
            background: "var(--paper)",
          }}
        >
          {(
            [
              ["Best for", business.bestFor],
              ["In business", years],
              ["Warranty", business.warrantyTerms],
              ["Emergency", business.emergency ? "Available" : null],
            ] as [string, string | null][]
          ).map(([label, value], i) => (
            <div key={label} style={{ padding: "10px 14px", borderRight: i < 3 ? "1px solid var(--border-subtle)" : undefined, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "2px" }}>
                {label}
              </span>
              <span
                title={value ?? undefined}
                style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {value ?? "Not listed"}
              </span>
            </div>
          ))}
        </div>
      ),
      body: (
        <div
          data-split=""
          style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 0.65fr)", gap: "28px", paddingTop: "18px", borderTop: "1px dashed var(--border-subtle)" }}
        >
          <div>
            {entry.whyPicked ? (
              <>
                <p style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Why we picked them</p>
                <p style={{ fontSize: "15.5px", lineHeight: "1.7", color: "var(--text-primary)", marginBottom: "18px", textWrap: "pretty" }}>{entry.whyPicked}</p>
              </>
            ) : null}
            {likes.length > 0 || concerns.length > 0 ? (
              <div data-two="" style={{ display: "grid", gridTemplateColumns: likes.length > 0 && concerns.length > 0 ? "1fr 1fr" : "1fr", gap: "12px" }}>
                {likes.length > 0 ? (
                  <div style={{ padding: "16px", borderRadius: "16px", background: "rgba(31,157,107,0.06)", border: "1px solid rgba(31,157,107,0.18)" }}>
                    <p style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase", color: "#178054", marginBottom: "10px" }}>What we like</p>
                    <ul style={{ display: "grid", gap: "8px" }}>
                      {likes.map((item) => (
                        <li key={item} style={{ display: "flex", gap: "9px", fontSize: "14px", lineHeight: "1.5", color: "var(--text-primary)" }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {concerns.length > 0 ? (
                  <div style={{ padding: "16px", borderRadius: "16px", background: "var(--gold-soft)", border: "1px solid #F0DDB4" }}>
                    <p style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "10px" }}>Things to consider</p>
                    <ul style={{ display: "grid", gap: "8px" }}>
                      {concerns.map((item) => (
                        <li key={item} style={{ display: "flex", gap: "9px", fontSize: "14px", lineHeight: "1.5", color: "var(--text-primary)" }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8A5F0B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
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
            ) : null}
            {services.length > 0 ? (
              <>
                <p style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", margin: "18px 0 8px" }}>Services</p>
                <ul style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {services.map((name) => (
                    <li key={name} style={{ padding: "6px 12px", borderRadius: "999px", background: "var(--blue-50)", color: "var(--blue-800)", fontSize: "12.5px", fontWeight: "600" }}>
                      {name}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <dl style={{ margin: "0", padding: "4px 16px 6px", borderRadius: "16px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ padding: "10px 0 6px", fontSize: "11px", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Key details</div>
              {details.map(([term, value]) => (
                <div key={term} style={{ display: "grid", gridTemplateColumns: "112px minmax(0, 1fr)", gap: "10px", padding: "9px 0", borderTop: "1px solid var(--border-subtle)" }}>
                  <dt style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>{term}</dt>
                  <dd style={{ margin: "0", fontSize: "14px", fontWeight: "600", color: "var(--ink)", overflowWrap: "anywhere" }}>{value}</dd>
                </div>
              ))}
            </dl>
            <div style={{ display: "grid", gridTemplateColumns: business.website ? "1fr 1fr" : "1fr", gap: "8px" }}>
              <Link
                data-btn=""
                data-btn-dark=""
                href={href}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "46px", padding: "0 10px", textAlign: "center", borderRadius: "12px", background: "var(--ink)", color: "#fff", fontSize: "14px", fontWeight: "700" }}
              >
                View Company Profile
              </Link>
              {business.website ? (
                <a
                  data-btn=""
                  href={business.website}
                  rel="nofollow noopener"
                  target="_blank"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "46px", padding: "0 10px", borderRadius: "12px", border: "1.5px solid var(--border-strong)", color: "var(--ink)", fontSize: "14px", fontWeight: "700" }}
                >
                  Visit Website
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ),
    };
  });

  return (
    <SiteChrome active="rankings">
      <div className="rk2">
        {/* One graph: the page, the list it carries, and the two editors who
          signed it. A "best of" claim with nobody's name on it is the one thing
          an engine has no way to weigh, and the names are already on the page. */}
        <JsonLd
          label={path4}
          data={graph(
            pageEntity({
              path: path4,
              name: copy.h1,
              description: copy.description,
              type: "CollectionPage",
              datePublished: ranking.publishedAt,
              dateModified: ranking.lastReviewedAt ?? ranking.updatedAt,
              mainEntity: { "@id": listId(path4) },
              author: ranking.author ? personRef(ranking.author.slug) : null,
              reviewedBy: ranking.reviewer ? personRef(ranking.reviewer.slug) : null,
            }),
            rankingListEntity({
              path: path4,
              name: copy.h1,
              description: copy.description,
              datePublished: ranking.publishedAt,
              dateModified: ranking.lastReviewedAt ?? ranking.updatedAt,
              author: ranking.author ? personRef(ranking.author.slug) : null,
              reviewedBy: ranking.reviewer ? personRef(ranking.reviewer.slug) : null,
              businesses: ranking.entries.map((entry) =>
                businessSchemaInput(entry.business, {
                  cityName: city.name,
                  regionCode: region.code,
                  countryCode: country.code,
                  categorySlug: category.slug,
                  areaServed: entry.business.areas
                    .map((area) => area.city?.name)
                    .filter((name): name is string => Boolean(name)),
                }),
              ),
            }),
            ranking.author ? personEntity(personFromRow(ranking.author)) : null,
            // Only once when the same person did both.
            ranking.reviewer && ranking.reviewer.id !== ranking.author?.id
              ? personEntity(personFromRow(ranking.reviewer))
              : null,
          )}
        />
        <JsonLd data={breadcrumbSchema(crumbs, absoluteUrl)} />
        <FaqJsonLd faqs={faqs} />
        <TrackView type="RANKING_VIEW" rankingId={ranking.id} />

        {/* ------------------------------------------------------------- hero */}
        <section data-hero="" style={{ position: "relative", overflow: "hidden", background: "var(--paper)" }}>
          <HeroBackdrop />
          <div data-shell="" data-hero-shell="" style={{ position: "relative", ...SHELL_STYLE, padding: "20px 24px 48px" }}>
            <HeroCrumbs items={crumbs} />

            <div
              data-split=""
              style={{
                display: "grid",
                gridTemplateColumns: hasSide ? "minmax(0, 1.1fr) minmax(0, 0.9fr)" : "minmax(0, 1fr)",
                gap: "48px",
                alignItems: "start",
              }}
            >
              <div>
                <p
                  data-in="1"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "4px 10px",
                    minHeight: "34px",
                    padding: "4px 14px 4px 10px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.85)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    color: "var(--ink)",
                    marginBottom: "20px",
                  }}
                >
                  <span data-live-dot="" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gold-ink)" }} />
                  {category.name} · {cityLabel}
                  <span style={{ color: "var(--text-muted)", fontWeight: "600" }}>Last reviewed {monthYear(reviewedOn)}</span>
                </p>
                <h1
                  data-in="2"
                  style={{
                    fontSize: "clamp(36px, 5vw, 64px)",
                    lineHeight: "0.98",
                    fontWeight: "800",
                    letterSpacing: "-0.045em",
                    textWrap: "balance",
                  }}
                >
                  <LeadAccent text={copy.h1} />
                </h1>
                {ranking.summary ? (
                  <p data-in="3" style={{ marginTop: "18px", fontSize: "17px", lineHeight: "1.65", color: "var(--text-secondary)", maxWidth: "640px", textWrap: "pretty" }}>
                    {ranking.summary}
                  </p>
                ) : null}
                <div data-in="4" style={{ marginTop: "24px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  <a
                    data-btn=""
                    data-btn-dark=""
                    href="#rankings"
                    style={{ display: "inline-flex", alignItems: "center", gap: "10px", height: "52px", padding: "0 24px", borderRadius: "16px", background: "var(--ink)", color: "#fff", fontSize: "15.5px", fontWeight: "700" }}
                  >
                    See the top {total}
                    <ArrowSvg stroke="var(--gold-ink)" width={2.4} />
                  </a>
                  <a
                    data-btn=""
                    href="#compare"
                    style={{ display: "inline-flex", alignItems: "center", height: "52px", padding: "0 22px", borderRadius: "16px", border: "1.5px solid var(--border-strong)", background: "var(--surface-card)", color: "var(--ink)", fontSize: "15.5px", fontWeight: "700" }}
                  >
                    Compare all {total}
                  </a>
                </div>
                <div
                  data-in="5"
                  style={{ marginTop: "26px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px 22px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)", maxWidth: "640px" }}
                >
                  {/* The names sit beside the date rather than at the foot of
                      the page, and they are the same two names the markup
                      references. A review date with nobody attached to it is the
                      part a reader cannot check. */}
                  {reviewer ? (
                    <Link href={routes.expert(reviewer.slug)} style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "var(--ink)" }}>
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: "var(--ink)",
                          color: "var(--gold-ink)",
                          fontSize: "12.5px",
                          fontWeight: "800",
                          boxShadow: "0 0 0 2px var(--paper), 0 0 0 3.5px var(--gold-ink)",
                        }}
                      >
                        {initials(reviewer.name)}
                      </span>
                      <span style={{ display: "block", lineHeight: "1.25" }}>
                        <span style={{ display: "block", fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>Reviewed by</span>
                        <span style={{ fontSize: "14px", fontWeight: "700" }}>{reviewer.name}</span>
                        {reviewer.role ? <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>, {reviewer.role}</span> : null}
                      </span>
                    </Link>
                  ) : null}
                  {author ? (
                    <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      Written by{" "}
                      <Link href={routes.expert(author.slug)} style={{ fontWeight: "700", color: "var(--ink)" }}>
                        {author.name}
                      </Link>
                    </span>
                  ) : null}
                  {ranking.companiesReviewed > 0 ? (
                    <span style={{ display: "inline-flex", flexDirection: "column", gap: "6px", minWidth: "190px" }}>
                      <span style={{ display: "flex", justifyContent: "space-between", gap: "14px", fontSize: "12.5px", fontWeight: "700", color: "var(--ink)" }}>
                        <span>{ranking.companiesReviewed} companies reviewed</span>
                        <span style={{ color: "var(--gold)" }}>{total} ranked</span>
                      </span>
                      <span aria-hidden="true" style={{ position: "relative", display: "block", height: "6px", borderRadius: "99px", background: "rgba(16,31,61,0.1)", overflow: "hidden" }}>
                        <span
                          data-funnel=""
                          style={{
                            position: "absolute",
                            left: "0",
                            top: "0",
                            bottom: "0",
                            width: "100%",
                            background:
                              funnelPct === null
                                ? "var(--gold-ink)"
                                : `linear-gradient(90deg, rgba(16,31,61,0.25) 0%, rgba(16,31,61,0.25) ${funnelPct}%, var(--gold-ink) ${funnelPct}%)`,
                          }}
                        />
                      </span>
                    </span>
                  ) : null}
                  <Link data-link="" href={routes.howWeRank()} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: "600", minHeight: "44px" }}>
                    How We Rank
                    <ArrowSvg />
                  </Link>
                </div>
              </div>

              {hasSide ? (
                <div data-hero-side="" style={{ display: "grid", gap: "14px" }}>
                  {podium.length > 0 ? (
                    <aside
                      data-in="4"
                      data-tilt=""
                      aria-labelledby="podium-h2"
                      style={{ position: "relative", background: "var(--ink)", color: "#fff", borderRadius: "24px", overflow: "hidden", boxShadow: "0 50px 90px -40px rgba(16,31,61,0.75)", transition: "transform 500ms var(--spring)" }}
                    >
                      <div aria-hidden="true" style={{ position: "absolute", inset: "0", background: "radial-gradient(420px 260px at 100% 0%, rgba(45,116,215,0.38), transparent 70%)", pointerEvents: "none" }} />
                      <div
                        data-scan=""
                        aria-hidden="true"
                        style={{ position: "absolute", left: "0", right: "0", top: "0", height: "30%", background: "linear-gradient(180deg, transparent, rgba(231,184,99,0.1) 70%, rgba(231,184,99,0.3))", pointerEvents: "none" }}
                      />
                      <div style={{ position: "relative", padding: "20px 22px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                          <h2 id="podium-h2" data-minih="" data-eyebrow="" style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold-ink)" }}>
                            Top 3 at a glance
                          </h2>
                          <span style={{ fontSize: "12px", color: "rgba(232,237,245,0.62)" }}>Editorial rank</span>
                        </div>
                        <ol data-podium="">
                          {podium.map((entry, index) => (
                            <li key={entry.id} style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                              <a href={`#rank-${index + 1}`} style={{ display: "flex", alignItems: "center", gap: "14px", minHeight: "64px", padding: "10px 0", color: "#fff" }}>
                                <span className="serif-accent" style={{ fontSize: "34px", lineHeight: "1", color: "var(--gold-ink)", width: "40px", flexShrink: 0, letterSpacing: "0" }}>
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <span style={{ flex: "1", minWidth: "0" }}>
                                  <span style={{ display: "block", fontSize: "15.5px", fontWeight: "700", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {entry.business.name}
                                  </span>
                                  {entry.designation ? (
                                    <span style={{ display: "block", fontSize: "12.5px", color: "rgba(232,237,245,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {entry.designation}
                                    </span>
                                  ) : null}
                                </span>
                                {entry.business.googleRating ? (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "13px", fontWeight: "700", color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#E7B863" aria-hidden="true">
                                      <path d={ICO.star} />
                                    </svg>
                                    {entry.business.googleRating.toFixed(1)}
                                  </span>
                                ) : null}
                              </a>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </aside>
                  ) : null}

                  {placement ? (
                    <aside
                      data-in="5"
                      aria-labelledby="partner-h2"
                      style={{ position: "relative", borderRadius: "20px", background: "var(--surface-card)", border: "1.5px solid #EBCE95", boxShadow: "0 20px 40px -30px rgba(138,95,11,0.5)" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          padding: "10px 18px",
                          borderBottom: "1px solid #F0DDB4",
                          background: "linear-gradient(120deg, var(--gold-soft), var(--surface-card))",
                          borderRadius: "18px 18px 0 0",
                        }}
                      >
                        <h2 id="partner-h2" data-minih="" data-eyebrow="" style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: "800", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
                            <path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1" />
                          </svg>
                          Featured Partner
                        </h2>
                        <span style={{ fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)" }}>Sponsored</span>
                      </div>
                      <div style={{ padding: "16px 18px 18px", display: "grid", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span
                            aria-hidden="true"
                            style={{
                              flexShrink: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "46px",
                              height: "46px",
                              borderRadius: "13px",
                              border: "1px solid #EBCE95",
                              background: "var(--gold-soft)",
                              fontSize: "15px",
                              fontWeight: "800",
                              color: "var(--gold)",
                            }}
                          >
                            {initials(placement.business.name)}
                          </span>
                          <span style={{ flex: "1", minWidth: "0" }}>
                            <h3 style={{ fontSize: "16.5px", fontWeight: "700" }}>{placement.business.name}</h3>
                            {placement.business.verified ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12.5px", fontWeight: "600", color: "var(--color-success)" }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                                Business details verified
                              </span>
                            ) : null}
                          </span>
                          <Link
                            data-btn=""
                            href={routes.business(placement.business.slug)}
                            style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", height: "42px", padding: "0 16px", borderRadius: "12px", background: "var(--color-primary)", color: "#fff", fontSize: "14px", fontWeight: "700" }}
                          >
                            Visit Partner
                          </Link>
                        </div>
                        {placement.business.description ? (
                          <p style={{ fontSize: "13.5px", lineHeight: "1.55", color: "var(--text-secondary)" }}>{placement.business.description}</p>
                        ) : null}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                          <ul style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {parseList(placement.business.strengths)
                              .slice(0, 3)
                              .map((item) => (
                                <li key={item} style={{ padding: "4px 10px", borderRadius: "999px", background: "var(--blue-50)", color: "var(--blue-800)", fontSize: "11.5px", fontWeight: "600" }}>
                                  {item}
                                </li>
                              ))}
                          </ul>
                          <Pop ariaLabel="About sponsored placements" label="Why am I seeing this?">
                            <p style={{ fontSize: "13px", lineHeight: "1.6", color: "rgba(232,237,245,0.88)" }}>
                              This is a sponsored placement. Sponsorship does not determine TenBestFind editorial rankings,
                              and paid partners hold no position in the Top {total} unless they earned it
                              independently.
                            </p>
                            <p style={{ marginTop: "10px" }}>
                              <Link href={routes.advertisingDisclosure()} style={{ fontSize: "13px", fontWeight: "600", color: "var(--gold-ink)" }}>
                                Advertising &amp; Sponsorship Disclosure →
                              </Link>
                            </p>
                          </Pop>
                        </div>
                      </div>
                    </aside>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <PageNav items={toc} />

        {/* -------------------------------------------------------- the ten */}
        <section id="rankings" aria-labelledby="rank-h2" style={{ background: "var(--surface-card)" }}>
          <div data-shell="" style={{ ...SHELL_STYLE, padding: "48px 24px 64px" }}>
            <RankingList
              items={items}
              heading={
                <>
                  <Kicker>The Ranking</Kicker>
                  <h2 id="rank-h2" style={{ ...H2S, marginBottom: "10px" }}>
                    Our <Accent>top {total}</Accent> {words.pros} in {city.name}
                  </h2>
                  <p style={{ fontSize: "16px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                    {ranking.intro ??
                      "Each entry explains why the company was selected, what it does well and what to weigh before hiring."}
                  </p>
                </>
              }
            />
          </div>
        </section>

        {/* ------------------------------------------------------- comparison */}
        <section id="compare" aria-labelledby="cmp-h2" style={{ background: "var(--paper)", borderTop: "1px solid var(--border-subtle)" }}>
          <div data-shell="" style={{ ...SHELL_STYLE, padding: "64px 24px" }}>
            <div data-reveal="" style={{ maxWidth: "720px", marginBottom: "22px" }}>
              <Kicker>Side by Side</Kicker>
              <h2 id="cmp-h2" style={{ ...H2S, marginBottom: "10px" }}>
                Compare the top {words.pros} <Accent>in {city.name}</Accent>
              </h2>
              <p style={{ fontSize: "16px", color: "var(--text-secondary)" }}>Ranking position reflects our editorial review, not customer ratings.</p>
            </div>
            <div data-reveal="" style={{ border: "1px solid var(--border-subtle)", borderRadius: "22px", background: "var(--surface-card)", overflow: "auto", boxShadow: "0 30px 60px -44px rgba(16,31,61,0.45)" }}>
              <table data-ctable="" style={{ minWidth: "960px" }}>
                <caption style={{ textAlign: "left", padding: "14px 20px", fontSize: "13px", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-subtle)", captionSide: "top" }}>
                  Editorial comparison of the {total} ranked companies. Customer ratings, where shown, come from the
                  source named on each company profile.
                </caption>
                <thead>
                  <tr>
                    {["Rank", "Company", "Best for", "Key services", "Service area", "Google rating", "Emergency", "Profile"].map((label, i) => (
                      <th
                        key={label}
                        scope="col"
                        style={{
                          position: "sticky",
                          top: "0",
                          padding: i === 0 ? "12px 16px 12px 20px" : i === 7 ? "12px 20px 12px 16px" : "12px 16px",
                          fontSize: "10.5px",
                          fontWeight: "800",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "rgba(232,237,245,0.75)",
                          background: "var(--ink)",
                          ...(i === 0 ? { left: "0", zIndex: "3" } : i === 1 ? { left: "72px", zIndex: "3" } : null),
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody data-stagger="">
                  {ranking.entries.map((entry, index) => {
                    const business = entry.business;
                    const href = routes.business(business.slug);
                    const td = { padding: "14px 16px", fontSize: "14px", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle" } as const;
                    return (
                      <tr key={entry.id} data-trow="">
                        <th scope="row" style={{ position: "sticky", left: "0", zIndex: "1", width: "72px", padding: "14px 16px 14px 20px", background: "var(--surface-card)", borderBottom: "1px solid var(--border-subtle)" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "38px",
                              height: "38px",
                              borderRadius: "11px",
                              background: index < 3 ? "var(--gold-ink)" : "var(--paper)",
                              color: "var(--ink)",
                              fontSize: "13px",
                              fontWeight: "800",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </th>
                        <td style={{ ...td, position: "sticky", left: "72px", zIndex: "1", fontSize: "14.5px", fontWeight: "700", background: "var(--surface-card)", borderRight: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>
                          <Link href={href} style={{ color: "var(--ink)" }}>
                            {business.name}
                          </Link>
                        </td>
                        <td style={td}>{business.bestFor}</td>
                        <td style={td}>{business.services.slice(0, 3).map((link) => link.subservice.name).join(", ")}</td>
                        <td style={td}>{business.areas.find((a) => a.primary)?.city.name ?? city.name}</td>
                        <td style={td}>
                          {business.googleRating ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
                              <strong style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{business.googleRating.toFixed(1)}</strong>
                              <span aria-hidden="true" style={{ position: "relative", display: "block", width: "56px", height: "5px", borderRadius: "99px", background: "rgba(16,31,61,0.1)", overflow: "hidden" }}>
                                <span
                                  data-mbar=""
                                  style={{ display: "block", height: "100%", width: `${Math.min(100, (business.googleRating / 5) * 100).toFixed(1)}%`, background: "var(--gold-ink)", borderRadius: "99px" }}
                                />
                              </span>
                              <span>({business.googleReviewCount})</span>
                            </span>
                          ) : (
                            "Not listed"
                          )}
                        </td>
                        <td style={td}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              height: "26px",
                              padding: "0 10px",
                              borderRadius: "999px",
                              background: business.emergency ? "rgba(31,157,107,0.12)" : "var(--paper)",
                              color: business.emergency ? "#178054" : "var(--text-muted)",
                              fontSize: "12px",
                              fontWeight: "700",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {business.emergency ? "Yes" : "Not listed"}
                          </span>
                        </td>
                        <td style={{ ...td, paddingRight: "20px" }}>
                          <Link data-link="" href={href} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: "700", whiteSpace: "nowrap" }}>
                            View
                            <ArrowSvg />
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
          <section id="coverage" aria-labelledby="cov-h2" style={{ background: "var(--surface-card)", borderTop: "1px solid var(--border-subtle)" }}>
            <div data-shell="" style={{ ...SHELL_STYLE, padding: "64px 24px" }}>
              <div data-split="" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: "40px", alignItems: "start" }}>
                <div data-reveal="">
                  <Kicker>Coverage</Kicker>
                  <h2 id="cov-h2" style={{ ...H2S, marginBottom: "14px" }}>
                    {category.serviceName} companies serving {city.name} <Accent>and nearby areas</Accent>
                  </h2>
                  <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)", marginBottom: "20px" }}>
                    Most companies in this ranking work across {region.name} and the surrounding suburbs. Coverage and
                    travel fees vary, so confirm your address is inside the service area before scheduling.
                  </p>
                  {areas.length > 0 ? (
                    <ul style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "26px" }}>
                      {areas.map((area) => (
                        <li
                          key={area.id}
                          style={{ display: "inline-flex", alignItems: "center", gap: "7px", height: "34px", padding: "0 13px", borderRadius: "999px", background: "var(--paper)", border: "1px solid var(--border-subtle)", fontSize: "13.5px", fontWeight: "600", color: "var(--ink)" }}
                        >
                          <span aria-hidden="true" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold-ink)" }} />
                          {area.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {nearbyRankings.length > 0 ? (
                    <>
                      <h3 style={{ ["--fs" as string]: "12px", fontSize: "12px", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>Nearby rankings</h3>
                      <ul data-two="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {nearbyRankings.map((near) => (
                          <li key={near.id}>
                            <Link
                              data-rowlink=""
                              href={rankingUrl({ category, city: near.city ? { slug: near.city.slug, region: { slug: region.slug, country: { code: country.code } } } : null })}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "8px",
                                minHeight: "48px",
                                padding: "0 14px",
                                borderRadius: "14px",
                                border: "1px solid var(--border-subtle)",
                                background: "var(--surface-card)",
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "var(--ink)",
                                transition: "background 200ms ease, border-color 200ms ease",
                              }}
                            >
                              {near.city?.name}
                              <OutArrow />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
                <div data-reveal="" style={{ position: "relative", borderRadius: "26px", overflow: "hidden", background: "var(--ink)", boxShadow: "0 40px 80px -44px rgba(16,31,61,0.7)" }}>
                  {pins.length > 0 ? (
                    <CoverageMap pins={pins} label={`Map of ${city.name} areas served`} />
                  ) : (
                    <div style={{ height: "320px", background: "var(--ink-2)" }}>
                      <Media src={city.heroImage} alt={`${city.name}, ${region.name}`} tone="dark" />
                    </div>
                  )}
                  <p style={{ padding: "14px 18px", fontSize: "13px", color: "rgba(232,237,245,0.75)" }}>
                    Service coverage across {city.name}. Individual company areas are listed on each profile.
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------- methodology */}
        <section id="method" aria-labelledby="method-h2" style={{ position: "relative", overflow: "hidden", background: "var(--ink)", color: "var(--text-on-ink)" }}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              background: "radial-gradient(700px 420px at 0% 110%, rgba(45,116,215,0.3), transparent 62%), radial-gradient(520px 320px at 100% 0%, rgba(231,184,99,0.1), transparent 62%)",
              pointerEvents: "none",
            }}
          />
          <div data-shell="" style={{ ...SHELL_STYLE, padding: "72px 24px" }}>
            <div data-reveal="" style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "26px" }}>
              <div style={{ maxWidth: "760px" }}>
                <Kicker tone="ink">Methodology</Kicker>
                <h2 id="method-h2" style={{ ...H2S, color: "#fff", marginBottom: "12px" }}>
                  How we chose the best {words.pros} <Accent>in {city.name}</Accent>
                </h2>
                <p style={{ fontSize: "16px", lineHeight: "1.7", color: "rgba(232,237,245,0.78)" }}>
                  {ranking.methodologyNote ??
                    `We started from ${ranking.companiesReviewed} ${words.pros} serving ${city.name} and narrowed the list against the criteria below. Position reflects our editorial judgment of overall fit for local homeowners, not payment.`}
                </p>
              </div>
              <Link data-link="" href={routes.howWeRank()} style={{ display: "inline-flex", alignItems: "center", gap: "8px", minHeight: "44px", fontSize: "15px", fontWeight: "700", color: "var(--gold-ink)" }}>
                Read our full ranking methodology
                <ArrowSvg />
              </Link>
            </div>
            {ranking.companiesReviewed > 0 ? (
              <div data-reveal="" style={{ position: "relative", display: "grid", gap: "8px", marginBottom: "26px", maxWidth: "760px" }}>
                {[
                  { label: "Evaluated", value: ranking.companiesReviewed, pct: 100, color: "rgba(255,255,255,0.3)", text: "#fff", labelColor: "rgba(232,237,245,0.7)" },
                  {
                    label: "Ranked",
                    value: total,
                    pct: Math.min(100, Math.round((total / ranking.companiesReviewed) * 1000) / 10),
                    color: "var(--gold-ink)",
                    text: "var(--gold-ink)",
                    labelColor: "var(--gold-ink)",
                  },
                ].map((bar, i) => (
                  <div key={bar.label} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <span style={{ width: "92px", fontSize: "12.5px", fontWeight: "700", color: bar.labelColor }}>{bar.label}</span>
                    <span aria-hidden="true" style={{ flex: "1", height: "10px", borderRadius: "99px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <span data-mbar="" style={{ ["--i" as string]: i * 6, display: "block", height: "100%", width: `${bar.pct}%`, background: bar.color, borderRadius: "99px" }} />
                    </span>
                    <span style={{ minWidth: "32px", fontSize: "18px", fontWeight: "800", color: bar.text, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{bar.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {ranking.criteria.length > 0 ? (
              <ul data-stagger="" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
                {ranking.criteria.map((criterion, index) => (
                  <li
                    key={criterion.id}
                    data-hov=""
                    data-dark-card=""
                    style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "20px", borderRadius: "20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", transition: "background 200ms ease, border-color 200ms ease" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Tile d={CRITERIA_ICONS[index % CRITERIA_ICONS.length]} tone="goldDark" />
                      <span className="serif-accent" style={{ fontSize: "26px", color: "rgba(231,184,99,0.55)" }}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </span>
                    <span style={{ display: "block" }}>
                      <h3 style={{ fontSize: "16.5px", fontWeight: "700", color: "#fff", marginBottom: "5px" }}>{criterion.title}</h3>
                      <p style={{ fontSize: "14px", lineHeight: "1.55", color: "rgba(232,237,245,0.75)" }}>{criterion.body}</p>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        {/* ------------------------------------------------------------ costs */}
        {ranking.costs.length > 0 ? (
          <section id="cost" aria-labelledby="cost-h2" style={{ background: "var(--surface-card)" }}>
            <div data-shell="" style={{ ...SHELL_STYLE, padding: "72px 24px" }}>
              <div data-split="" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)", gap: "48px", alignItems: "start" }}>
                <div data-reveal="" style={{ position: "sticky", top: "150px" }}>
                  <Kicker>Costs</Kicker>
                  <h2 id="cost-h2" style={{ ...H2S, marginBottom: "16px" }}>
                    How much does {serviceLower} <Accent>cost in {city.name}?</Accent>
                  </h2>
                  <p style={{ fontSize: "16px", lineHeight: "1.75", color: "var(--text-secondary)" }}>
                    Prices depend on the size of the job, the materials, access, permits and how much has to be removed
                    before the new work starts. The figures below are what local companies quote most often.
                  </p>
                  <Link data-link="" href={routes.category(category.slug)} style={{ marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "8px", minHeight: "44px", fontSize: "15px", fontWeight: "700" }}>
                    See our {serviceLower} cost guide
                    <ArrowSvg />
                  </Link>
                </div>
                <div data-reveal="">
                  <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "22px", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "16px 22px", borderBottom: "1px solid var(--border-subtle)", background: "var(--paper)" }}>
                      <h3 style={{ ["--fs" as string]: "15px", fontSize: "15px", fontWeight: "700" }}>
                        Typical {city.name} {serviceLower} costs
                      </h3>
                      {year ? <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)" }}>{year} ranges</span> : null}
                    </div>
                    <table data-costs="">
                      <thead>
                        <tr>
                          <th scope="col">Service</th>
                          <th scope="col">Typical range</th>
                          <th scope="col">What moves the price</th>
                        </tr>
                      </thead>
                      <tbody data-stagger="">
                        {ranking.costs.map((row) => (
                          <tr key={row.id} data-trow="">
                            <td style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>{row.label}</td>
                            <td style={{ fontSize: "16px", fontWeight: "800", color: "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", textAlign: "right" }}>
                              {row.lowPrice && row.highPrice
                                ? `${money(row.lowPrice, row.currency)} to ${money(row.highPrice, row.currency)}`
                                : row.typical
                                  ? money(row.typical, row.currency)
                                  : "On request"}
                            </td>
                            <td style={{ fontSize: "13.5px", lineHeight: "1.55", color: "var(--text-secondary)" }}>{row.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pop ariaLabel="About these cost ranges" label="How to read these ranges" side="wide" style={{ marginTop: "14px" }}>
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
                      <Link href={routes.howWeRank()} style={{ fontSize: "13px", fontWeight: "600", color: "var(--gold-ink)" }}>
                        Full cost methodology →
                      </Link>
                    </p>
                  </Pop>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------ local notes */}
        {localNotes.length > 0 ? (
          <section id="local" aria-labelledby="local-h2" style={{ background: "var(--paper)", borderTop: "1px solid var(--border-subtle)" }}>
            <div data-shell="" style={{ ...SHELL_STYLE, padding: "64px 24px" }}>
              <div data-reveal="" style={{ maxWidth: "760px", marginBottom: "24px" }}>
                <Kicker>{city.name} Notes</Kicker>
                <h2 id="local-h2" style={{ ...H2S, marginBottom: "12px" }}>
                  What {city.name} homeowners should know <Accent>about {serviceLower}</Accent>
                </h2>
                <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)" }}>
                  Local conditions shape both the work and the paperwork. These are the factors that come up most often in
                  the {city.name} market.
                </p>
              </div>
              <ul data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
                {localNotes.map((note, index) => (
                  <li
                    key={note.title}
                    data-card=""
                    style={{ display: "flex", gap: "16px", alignItems: "flex-start", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "22px", padding: "20px" }}
                  >
                    <Tile d={NOTE_ICONS[index % NOTE_ICONS.length]} />
                    <span style={{ display: "block" }}>
                      <h3 style={{ fontSize: "16.5px", fontWeight: "700", marginBottom: "5px" }}>{note.title}</h3>
                      <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{note.body}</p>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ----------------------------------------------------------- hiring */}
        <section id="hiring" aria-labelledby="hire-h2" style={{ background: "var(--surface-card)" }}>
          <div data-shell="" style={{ ...SHELL_STYLE, padding: "72px 24px" }}>
            <div data-split="" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)", gap: "44px", alignItems: "start" }}>
              <div>
                <div data-reveal="">
                  <Kicker>Hiring</Kicker>
                  <h2 id="hire-h2" style={{ ...H2S, marginBottom: "22px" }}>
                    How to choose {words.aPro} <Accent>in {city.name}</Accent>
                  </h2>
                </div>
                <div data-reveal="" style={{ position: "relative" }}>
                  <span data-tl="" aria-hidden="true" style={{ position: "absolute", left: "19px", top: "20px", bottom: "20px", width: "2px", background: "linear-gradient(180deg, var(--gold-ink), var(--color-primary))" }} />
                  <ol style={{ position: "relative", display: "grid", gap: "4px" }}>
                    {HIRING_STEPS.map((step, index) => (
                      <li key={step.title} style={{ display: "grid", gridTemplateColumns: "40px minmax(0, 1fr)", gap: "16px", alignItems: "start", padding: "10px 0" }}>
                        <span
                          aria-hidden="true"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background: "var(--ink)",
                            color: "var(--gold-ink)",
                            fontSize: "12.5px",
                            fontWeight: "800",
                            boxShadow: "0 0 0 5px var(--surface-card)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span style={{ display: "block", paddingTop: "8px" }}>
                          <h3 style={{ fontSize: "16.5px", fontWeight: "700", marginBottom: "4px" }}>{step.title}</h3>
                          <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{step.body}</p>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div style={{ display: "grid", gap: "14px", position: "sticky", top: "150px" }}>
                <div data-reveal="" style={{ border: "1px solid var(--border-subtle)", borderRadius: "22px", padding: "22px", background: "var(--paper)" }}>
                  <h2 data-minih="" data-sm="" style={{ fontSize: "19px", fontWeight: "700", marginBottom: "6px" }}>Questions to ask before hiring</h2>
                  <Checklist questions={QUESTIONS} />
                </div>
                <div data-reveal="" style={{ border: "1px solid rgba(195,38,32,0.22)", borderRadius: "22px", padding: "22px", background: "rgba(195,38,32,0.03)" }}>
                  <h2 data-minih="" data-sm="" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "19px", fontWeight: "700", marginBottom: "12px" }}>
                    <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "10px", background: "rgba(195,38,32,0.1)", color: "#C32620" }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                        <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" />
                      </svg>
                    </span>
                    Red flags
                  </h2>
                  <ul data-stagger="" style={{ display: "grid", gap: "8px" }}>
                    {RED_FLAGS.map((flag) => (
                      <li key={flag} style={{ display: "flex", gap: "10px", fontSize: "14.5px", lineHeight: "1.55", color: "var(--text-primary)" }}>
                        <span aria-hidden="true" style={{ flexShrink: 0, width: "6px", height: "6px", marginTop: "8px", borderRadius: "50%", background: "#C32620" }} />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- related */}
        {relatedRankings.length > 0 || guides.length > 0 ? (
          <section id="guides" aria-labelledby={relatedRankings.length > 0 ? "rel-h2" : undefined} style={{ background: "var(--paper)", borderTop: "1px solid var(--border-subtle)" }}>
            <div data-shell="" style={{ ...SHELL_STYLE, padding: "64px 24px" }}>
              {relatedRankings.length > 0 ? (
                <>
                  <div data-reveal="">
                    <Kicker>Keep Going</Kicker>
                    <h2 id="rel-h2" style={{ ...H2S, marginBottom: "20px" }}>
                      Related home services <Accent>in {city.name}</Accent>
                    </h2>
                  </div>
                  <ul data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "8px", marginBottom: guides.length > 0 ? "44px" : "0" }}>
                    {relatedRankings.map((rel) => (
                      <li key={rel.id}>
                        <Link
                          data-rowlink=""
                          href={routes.ranking(country.code, region.slug, city.slug, rel.category.slug)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            minHeight: "56px",
                            padding: "0 18px",
                            background: "var(--surface-card)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "16px",
                            fontSize: "14.5px",
                            fontWeight: "700",
                            color: "var(--ink)",
                            transition: "background 200ms ease, border-color 200ms ease",
                          }}
                        >
                          {rel.category.name}
                          <OutArrow />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {guides.length > 0 ? (
                <>
                  <h2 data-reveal="" style={{ fontSize: "clamp(22px, 2.4vw, 28px)", fontWeight: "800", letterSpacing: "-0.03em", marginBottom: "18px" }}>
                    {category.serviceName} guides for <Accent>{city.name} homeowners</Accent>
                  </h2>
                  <ul data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                    {guides.map((guide) => (
                      <li
                        key={guide.id}
                        data-card=""
                        style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "22px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}
                      >
                        <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", height: "24px", padding: "0 9px", borderRadius: "999px", background: "var(--gold-soft)", fontSize: "10.5px", fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold)" }}>
                          {category.name}
                        </span>
                        <h3 style={{ ["--fs" as string]: "17px", fontSize: "17px", lineHeight: "1.3", fontWeight: "700" }}>
                          <Link href={routes.guide(guide.slug)} style={{ color: "var(--ink)" }}>
                            {guide.title}
                          </Link>
                        </h3>
                        <p style={{ marginTop: "auto", fontSize: "12.5px", color: "var(--text-muted)" }}>
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
          <section id="faqs" aria-labelledby="faqs-h2" style={{ background: "var(--surface-card)", borderTop: "1px solid var(--border-subtle)" }}>
            <div data-shell="" style={{ ...SHELL_STYLE, padding: "72px 24px" }}>
              <div data-split="" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.75fr) minmax(0, 1.25fr)", gap: "48px", alignItems: "start" }}>
                <div data-reveal="" style={{ position: "sticky", top: "150px" }}>
                  <Kicker>FAQ</Kicker>
                  <h2 id="faqs-h2" style={H2S}>
                    {category.serviceName} companies in {city.name} <Accent>FAQs</Accent>
                  </h2>
                </div>
                <FaqList faqs={faqs} />
              </div>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------- about this ranking */}
        <section id="about" aria-labelledby="about-h2" style={{ background: "var(--paper)", borderTop: "1px solid var(--border-subtle)" }}>
          <div data-shell="" style={{ ...SHELL_STYLE, padding: "56px 24px" }}>
            <div
              data-reveal=""
              data-split=""
              style={{
                display: "grid",
                gridTemplateColumns: author ? "minmax(0, 1.25fr) minmax(0, 0.75fr)" : "minmax(0, 1fr)",
                gap: "36px",
                alignItems: "stretch",
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "22px",
                padding: "28px",
              }}
            >
              <div>
                <Kicker>Editorial Record</Kicker>
                <h2 id="about-h2" style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.03em", marginBottom: "8px" }}>
                  About this ranking
                </h2>
                <dl data-two="" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0 28px", margin: "0" }}>
                  {[
                    { term: "Originally published", node: monthYear(ranking.publishedAt) },
                    { term: "Last reviewed", node: monthYear(reviewedOn) },
                    ...(reviewer
                      ? [
                          {
                            term: "Reviewed by",
                            node: (
                              <>
                                <Link href={routes.expert(reviewer.slug)}>{reviewer.name}</Link>
                                {reviewer.role ? `, ${reviewer.role}` : ""}
                              </>
                            ),
                          },
                        ]
                      : []),
                    { term: "Companies evaluated", node: ranking.companiesReviewed },
                    { term: "Methodology", node: <Link href={routes.howWeRank()}>Ranking methodology</Link> },
                    ...(ranking.sources.length > 0
                      ? [
                          {
                            term: "Sources reviewed",
                            node: (
                              <a href="#method">
                                {ranking.sources.length} {ranking.sources.length === 1 ? "source" : "sources"}
                              </a>
                            ),
                          },
                        ]
                      : []),
                  ].map((fact) => (
                    <div key={fact.term} style={{ padding: "14px 0", borderTop: "1px solid var(--border-subtle)" }}>
                      <dt style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "3px" }}>{fact.term}</dt>
                      <dd style={{ margin: "0", fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>{fact.node}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {author ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "22px", borderRadius: "18px", background: "var(--ink)", color: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        width: "58px",
                        height: "58px",
                        borderRadius: "50%",
                        background: "var(--ink-2)",
                        color: "var(--gold-ink)",
                        fontSize: "18px",
                        fontWeight: "800",
                        boxShadow: "0 0 0 2px var(--ink), 0 0 0 4px var(--gold-ink)",
                      }}
                    >
                      {initials(author.name)}
                    </span>
                    <span>
                      <h3 style={{ ["--fs" as string]: "16px", fontSize: "16px", fontWeight: "700", color: "#fff" }}>
                        <Link href={routes.expert(author.slug)} style={{ color: "#fff" }}>
                          {author.name}
                        </Link>
                      </h3>
                      {author.role ? <span style={{ fontSize: "13px", color: "rgba(232,237,245,0.7)" }}>{author.role}</span> : null}
                    </span>
                  </div>
                  <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(232,237,245,0.8)" }}>{author.bio}</p>
                  <Link
                    data-btn=""
                    href={routes.corrections()}
                    style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", height: "46px", borderRadius: "12px", background: "var(--gold-ink)", color: "var(--ink)", fontSize: "14px", fontWeight: "800" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m14.5 5.5 4 4" />
                      <path d="M4 20l1-4 11-11a2 2 0 0 1 3 3L8 19z" />
                    </svg>
                    Suggest a correction
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <RelatedContent groups={related} title="Keep comparing" />

        <FinalBand
          heading={
            <>
              Need {words.aPro} <span className="serif-accent" style={{ color: "var(--gold-ink)" }}>in {city.name}?</span>
            </>
          }
          service={category.serviceName}
          after={
            <a data-link="" href="#compare" style={{ display: "inline-flex", alignItems: "center", gap: "8px", minHeight: "44px", fontSize: "15px", fontWeight: "600", color: "var(--gold-ink)" }}>
              Or compare the {city.name} {words.pros} again
              <ArrowSvg />
            </a>
          }
        />
      </div>
    </SiteChrome>
  );
}

/** Five stars, filled to the rating by clipping a gold row over a pale one. */
function Stars({ rating, index }: { rating: number; index: number }) {
  const pct = `${Math.max(0, Math.min(100, (rating / 5) * 100)).toFixed(1)}%`;
  const row = (fill: string) => (
    <svg viewBox="0 0 120 24" width="80" height="16" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      {[0, 24, 48, 72, 96].map((x) => (
        <path key={x} transform={`translate(${x} 0)`} d={ICO.star} fill={fill} />
      ))}
    </svg>
  );
  return (
    <span style={{ ["--i" as string]: Math.min(index, 12), position: "relative", display: "inline-block", width: "80px", height: "16px", flexShrink: 0 }}>
      {row("rgba(16,31,61,0.14)")}
      <span data-starfill="" style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: pct, overflow: "hidden" }}>
        {row("#D99A1C")}
      </span>
    </span>
  );
}

/** The leading "10 Best" (or "Best") in the serif accent, with the gold rule under it. */
function LeadAccent({ text }: { text: string }) {
  const match = text.match(/^(\d+\s+Best|Best)\b/);
  if (!match) return <>{text}</>;
  return (
    <>
      <span
        className="serif-accent"
        style={{ position: "relative", display: "inline-block", isolation: "isolate", paddingRight: "0.06em", letterSpacing: "-0.02em" }}
      >
        {match[1]}
        <span
          data-uline=""
          aria-hidden="true"
          style={{ position: "absolute", left: "0", right: "0.06em", bottom: "0.04em", height: "0.12em", borderRadius: "99px", background: "var(--gold-ink)", zIndex: -1 }}
        />
      </span>
      {text.slice(match[1].length)}
    </>
  );
}
