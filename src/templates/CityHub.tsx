import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { InfoModal } from "@/components/site/InfoModal";
import { BusinessLogo } from "@/components/site/BusinessLogo";
import {
  Arrow,
  CHIP,
  Crumbs,
  FaqItem,
  FinalSearchBand,
  GRID_BACKDROP,
  H2,
  LABEL,
  LEAD,
  PILL,
  RowLink,
  SHELL,
  SR_ONLY,
  TD,
  TH,
  TenOutline,
} from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
import { compactNumber, money, monthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { parseJson, type ConditionRow } from "@/lib/json";
import { db } from "@/lib/db";
import { rankingCardSelect } from "@/lib/queries";
import { redirectIfKnown } from "@/lib/redirects";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { cityCopy } from "@/lib/seo-copy";
import { breadcrumbSchema, cityCrumbs } from "@/lib/breadcrumbs";

/** The five steps the methodology band walks through, same on every hub. */
const RESEARCH_STEPS = [
  { title: "Build the list", body: "Every company that genuinely works the area, not just the ones that advertise in it." },
  { title: "Check the paperwork", body: "Licensing or registration against the authority that issues it, plus insurance status." },
  { title: "Read the record", body: "Years working locally, the range of work actually performed, and patterns in public feedback." },
  { title: "Compare on what decides a job", body: "Who is licensed for that exact work, who answers after hours, who puts warranty terms in writing." },
  { title: "Publish and re-check", body: "Ten names with the criteria and the review date, re-checked inside 90 days." },
];

const SEASONS = [
  { title: "Spring", body: "Storm damage, roof inspections and exterior projects booked before summer." },
  { title: "Summer", body: "Cooling failures, emergency HVAC and the longest lead times of the year." },
  { title: "Autumn", body: "Chimney inspections, gutter work and heating tune-ups before the first cold snap." },
  { title: "Winter", body: "Heating repair, frozen pipe calls and quieter scheduling for interior work." },
];

export async function CityHub({
  countryCode,
  regionSlug,
  citySlug,
}: {
  countryCode: string;
  regionSlug: string;
  citySlug: string;
}) {
  // A moved city keeps its inbound links: the redirect table is consulted
  // before any of these paths is allowed to 404.
  const path = routes.city(countryCode, regionSlug, citySlug);

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
  if (!city || !city.published) {
    await redirectIfKnown(path);
    notFound();
  }

  const [rankings, businesses, costRows, categories, guides, nearbyCities, placements] =
    await Promise.all([
      db.ranking.findMany({
        where: { status: "PUBLISHED", cityId: city.id },
        orderBy: { lastReviewedAt: "desc" },
        select: rankingCardSelect,
      }),
      db.business.findMany({
        where: { status: "PUBLISHED", cityId: city.id },
        orderBy: [{ googleRating: "desc" }],
        take: 6,
        include: {
          category: { select: { name: true, slug: true, serviceName: true, iconKey: true } },
          entries: { select: { position: true }, orderBy: { position: "asc" }, take: 1 },
        },
      }),
      db.costRow.findMany({ where: { cityId: city.id }, orderBy: { sortOrder: "asc" } }),
      db.category.findMany({ where: { published: true, featured: true }, orderBy: { sortOrder: "asc" } }),
      db.guide.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 6,
        include: { category: { select: { serviceName: true } }, author: { select: { name: true } } },
      }),
      db.city.findMany({
        where: { published: true, regionId: region.id, NOT: { id: city.id } },
        orderBy: { population: "desc" },
        take: 6,
      }),
      db.sponsoredPlacement.findMany({
        where: { status: "ACTIVE", cityId: city.id },
        include: {
          business: {
            include: { category: { select: { name: true, serviceName: true } } },
          },
        },
        take: 1,
      }),
    ]);

  const conditions = parseJson<ConditionRow[]>(city.conditions, []);
  const neighborhoods = parseJson<string[]>(city.neighborhoods, []);
  const businessCount = await db.business.count({ where: { status: "PUBLISHED", cityId: city.id } });
  const partner = placements[0];
  const cityLabel = `${city.name}, ${region.code.toUpperCase()}`;
  // The heading, the title and the description all come from one place, so the
  // page cannot promise one thing in the tab and another on the page.
  const copy = cityCopy(city, region, { publishedRankings: rankings.length });
  const crumbs = cityCrumbs(country, region, city);

  const faqs = [
    {
      question: `How do you decide which ${city.name} companies make a list?`,
      answer: `We start with every company that genuinely serves ${city.name}, then check licensing or registration with the issuing authority, years working in the market, the range of work actually performed, and patterns in public feedback. The criteria for each trade are published on the ranking itself.`,
    },
    {
      question: `Do you cover the suburbs around ${city.name}?`,
      answer:
        "Company service areas often extend past the city line, and coverage is listed on each profile. Where a neighbouring city has enough demand to justify its own research, it gets its own hub rather than being folded into this one.",
    },
    {
      question: "Are the prices on this page quotes?",
      answer:
        "No. They are sourced ranges for this market, published so you can tell whether a quote is in the normal band. A real quote depends on your property, and every contractor prices it differently.",
    },
    {
      question: "Can a company pay to appear here?",
      answer:
        "A company can buy a labelled sponsored placement, which sits outside the ranked list and carries a Sponsored label. It cannot buy a ranking position, and sponsors do not see a ranking before it publishes.",
    },
    {
      question: "How often is this page updated?",
      answer: `Rankings for ${city.name} are re-checked on a schedule, and sooner when something significant changes such as a licence lapsing or a company closing. Each ranking shows the date an editor last reviewed it.`,
    },
  ];

  const glance: { label: string; value: string; icon: IconName }[] = [
    { label: "Published rankings", value: `${rankings.length}`, icon: "trophy" },
    { label: "Companies researched", value: `${businessCount}`, icon: "store" },
    { label: "Trades covered", value: `${new Set(rankings.map((r) => r.category.slug)).size}`, icon: "grid" },
    city.population ? { label: "Population", value: compactNumber(city.population), icon: "users" } : null,
    city.county ? { label: "County", value: city.county, icon: "map" } : null,
    { label: "State", value: region.name, icon: "pin" },
  ].filter(Boolean) as { label: string; value: string; icon: IconName }[];

  // Trades with a published ranking here come first, since those are the ones
  // a reader can actually act on.
  const ranked = new Map(rankings.map((entry) => [entry.category.slug, entry]));
  const services = categories
    .slice()
    .sort((a, b) => Number(ranked.has(b.slug)) - Number(ranked.has(a.slug)))
    .slice(0, 12);

  const icon = (key: string | null | undefined): IconName => (key && hasIcon(key) ? (key as IconName) : "house");

  return (
    <SiteChrome active="locations">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: copy.h1,
          description: copy.description,
          url: absoluteUrl(routes.city(country.code, region.slug, city.slug)),
        }}
      />
      <JsonLd data={breadcrumbSchema(crumbs, absoluteUrl)} />
      <FaqJsonLd faqs={faqs.map((faq, index) => ({ id: String(index), ...faq }))} />

      {/* ------------------------------------------------------------- hero */}
      <section style={GRID_BACKDROP}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 48px" }}>
          <Crumbs items={crumbs} />

          <div style={{ maxWidth: "820px" }}>
            <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "16px" }}>
              <span data-eyebrow-rule="" aria-hidden="true" />
              {city.name}, {region.name}
            </p>
            <h1
              data-hero-in="2"
              style={{
                fontSize: "clamp(32px, 4.2vw, 50px)",
                lineHeight: "1.07",
                letterSpacing: "-0.04em",
                fontWeight: "800",
                textWrap: "balance",
              }}
            >
              {copy.h1}
            </h1>
            <p data-hero-in="3" style={{ ...LEAD, marginTop: "20px", fontSize: "18px", maxWidth: "700px", textWrap: "pretty" }}>
              {city.blurb ??
                `Explore independently researched local businesses and home-service providers across ${city.name}. Compare Top 10 rankings, local costs, company profiles, review data and practical hiring guides.`}
            </p>
          </div>

          <form
            action={routes.search()}
            method="get"
            role="search"
            aria-label={`Find providers in ${city.name}`}
            data-stack=""
            style={{
              marginTop: "32px",
              maxWidth: "900px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "18px",
              boxShadow: "var(--shadow-lg)",
              padding: "8px",
            }}
          >
            <div style={{ flex: "1.2", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.34-4.34" />
              </svg>
              <label htmlFor="loc-svc" style={SR_ONLY}>
                What service do you need?
              </label>
              <input
                id="loc-svc"
                name="service"
                type="text"
                list="loc-services"
                placeholder="What service do you need?"
                style={{
                  width: "100%",
                  border: "0",
                  outline: "none",
                  height: "52px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "16px",
                  color: "var(--text-primary)",
                  background: "transparent",
                }}
              />
              <datalist id="loc-services">
                {categories.map((entry) => (
                  <option key={entry.id} value={entry.serviceName} />
                ))}
              </datalist>
            </div>
            <div
              data-divider=""
              aria-hidden="true"
              style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }}
            />
            <div style={{ flex: "0.9", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <label htmlFor="loc-city" style={SR_ONLY}>
                City
              </label>
              <input
                id="loc-city"
                name="location"
                type="text"
                defaultValue={cityLabel}
                style={{
                  width: "100%",
                  border: "0",
                  outline: "none",
                  height: "52px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "16px",
                  color: "var(--text-primary)",
                  background: "transparent",
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                height: "52px",
                padding: "0 26px",
                border: "0",
                borderRadius: "14px",
                background: "var(--color-primary)",
                color: "#fff",
                fontFamily: "var(--font-sans)",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </form>
        </div>

        {/* The trust strip that closes the hero. */}
        <div style={{ position: "relative", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <ul
            style={{
              ...SHELL,
              padding: "0 24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            }}
          >
            <li style={{ display: "flex", alignItems: "center", gap: "12px", padding: "18px 24px 18px 0", borderRight: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>
                <Icon name="pin" size={21} strokeWidth={1.75} />
              </span>
              <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>Local rankings</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "12px", padding: "18px 24px", borderRight: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--color-success)", display: "inline-flex" }}>
                <Icon name="shield" size={21} strokeWidth={1.75} />
              </span>
              <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>Editorially reviewed</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "10px", padding: "18px 24px", borderRight: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "#D99A1C", display: "inline-flex" }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                  <path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z" />
                </svg>
              </span>
              <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>Google review data</span>
              <InfoModal
                label=""
                srLabel="About Google review data"
                title="About Google review data"
                link={{ href: routes.howWeRank(), label: "How we research" }}
              >
                Star ratings and review counts come from each company&apos;s Google Business Profile, read on the date
                shown on its profile page. They are republished with attribution and are separate from our own
                editorial assessment.
              </InfoModal>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "12px", padding: "18px 0 18px 24px" }}>
              <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>
                <Icon name="refresh" size={21} strokeWidth={1.75} />
              </span>
              <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>Regularly updated</span>
            </li>
          </ul>
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
          <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
            <span data-eyebrow-rule="" aria-hidden="true" />
            Local context
          </p>
          <h2 id="glance-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700", marginBottom: "24px" }}>
            {city.name} at a glance
          </h2>
          <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "14px", margin: "0" }}>
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

      {/* --------------------------------------------------------- services */}
      <section id="services" aria-labelledby="svc-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "72px 24px" }}>
          <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
            <span data-eyebrow-rule="" aria-hidden="true" />
            Explore services
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "32px" }}>
            <h2 id="svc-h2" style={H2}>
              Popular home services in {city.name}
            </h2>
            <Link href={routes.servicesIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
              Browse all services →
            </Link>
          </div>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {services.map((entry) => {
              const withRanking = ranked.get(entry.slug);
              return (
                <li
                  key={entry.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    boxShadow: "var(--shadow-sm)",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "46px",
                      height: "46px",
                      borderRadius: "13px",
                      background: "var(--blue-50)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <Icon name={icon(entry.iconKey)} size={22} strokeWidth={1.75} />
                  </span>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", lineHeight: "1.3" }}>{entry.name}</h3>
                  <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{entry.tagline}</p>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    {withRanking ? `Top 10 published for ${city.name}` : `Research under way in ${city.name}`}
                  </span>
                  <Link
                    href={withRanking ? rankingUrl(withRanking) : routes.category(entry.slug)}
                    style={{ marginTop: "auto", paddingTop: "10px", fontSize: "15px", fontWeight: "600" }}
                  >
                    {withRanking ? `View the top 10` : `About ${entry.name.toLowerCase()}`} →
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- rankings */}
      {rankings.length > 0 ? (
        <section id="rankings" aria-labelledby="rank-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "72px 24px" }}>
            <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
              <span data-eyebrow-rule="" aria-hidden="true" />
              Top 10 rankings
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "32px" }}>
              <h2 id="rank-h2" style={H2}>
                Trending top 10 rankings in {city.name}
              </h2>
              <Link href={routes.rankingsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All rankings →
              </Link>
            </div>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: "18px" }}>
              {rankings.slice(0, 6).map((entry) => (
                <li
                  key={entry.id}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    boxShadow: "var(--shadow-sm)",
                    padding: "22px 24px",
                    display: "flex",
                    gap: "18px",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "0 0 46px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "46px",
                      height: "46px",
                      borderRadius: "13px",
                      background: "var(--amber-50)",
                      color: "#8A5F0B",
                    }}
                  >
                    <Icon name={icon(entry.category.iconKey)} size={22} strokeWidth={1.75} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
                    <h3 style={{ fontSize: "18px", lineHeight: "1.3", fontWeight: "700" }}>
                      <Link href={rankingUrl(entry)} style={{ color: "var(--blue-900)" }}>
                        {entry.title}
                      </Link>
                    </h3>
                    <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      {entry.companiesReviewed} researched · reviewed {monthYear(entry.lastReviewedAt ?? entry.publishedAt)}
                    </span>
                    <Link href={rankingUrl(entry)} style={{ marginTop: "2px", fontSize: "14px", fontWeight: "600" }}>
                      View top 10 →
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- businesses */}
      {businesses.length > 0 ? (
        <section id="businesses" aria-labelledby="biz-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "72px 24px" }}>
            <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
              <span data-eyebrow-rule="" aria-hidden="true" />
              Local businesses
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "8px" }}>
              <h2 id="biz-h2" style={H2}>
                Featured {city.name} businesses
              </h2>
              <InfoModal
                label="Sponsored placements"
                title="Sponsored placements"
                link={{ href: routes.advertisingDisclosure(), label: "Advertising disclosure" }}
                points={[
                  "A sponsored slot is always labelled as one.",
                  "It sits outside the ranked list and never moves a position.",
                  "Editors do not see who holds a slot while they research.",
                ]}
              >
                TenBestFind may receive compensation from selected businesses or partners. That relationship never
                earns, moves or protects a place in a Top 10.
              </InfoModal>
            </div>
            <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginBottom: "28px" }}>
              Companies currently featured in {city.name} rankings, plus clearly labelled commercial partners.
            </p>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "16px" }}>
              {businesses.map((entry) => {
                const sponsored = partner?.businessId === entry.id;
                return (
                  <li
                    key={entry.id}
                    data-card=""
                    style={{
                      background: "var(--surface-card)",
                      border: `1px solid ${sponsored ? "#EBCE95" : "var(--border-subtle)"}`,
                      borderRadius: "18px",
                      boxShadow: "var(--shadow-sm)",
                      padding: "22px 24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <BusinessLogo name={entry.name} url={entry.logoUrl} size={46} radius={12} />
                      <span style={{ display: "block", minWidth: 0 }}>
                        <h3 style={{ fontSize: "17px", lineHeight: "1.3", fontWeight: "700" }}>
                          <Link href={routes.business(entry.slug)} style={{ color: "var(--blue-900)" }}>
                            {entry.name}
                          </Link>
                        </h3>
                        <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>
                          {entry.category.name}
                        </span>
                      </span>
                    </span>
                    {entry.googleRating ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "var(--text-secondary)" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="#D99A1C" stroke="none" aria-hidden="true">
                          <path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z" />
                        </svg>
                        <strong style={{ fontWeight: "700", color: "var(--blue-900)", fontVariantNumeric: "tabular-nums" }}>
                          {entry.googleRating.toFixed(1)}
                        </strong>
                        on Google · {entry.googleReviewCount} reviews
                      </span>
                    ) : null}
                    <span
                      style={{
                        ...CHIP,
                        alignSelf: "flex-start",
                        ...(sponsored
                          ? { background: "var(--amber-50)", color: "#8A5F0B" }
                          : entry.entries[0]
                            ? {}
                            : { background: "var(--surface-sunken)", color: "var(--text-secondary)" }),
                      }}
                    >
                      {sponsored ? "Sponsored" : entry.entries[0] ? `Ranked #${entry.entries[0].position}` : "Researched"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ costs */}
      {costRows.length > 0 ? (
        <section id="costs" aria-labelledby="cost-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "72px 24px" }}>
            <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
              <span data-eyebrow-rule="" aria-hidden="true" />
              Local pricing
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "8px" }}>
              <h2 id="cost-h2" style={H2}>
                What do home services cost in {city.name}?
              </h2>
              <InfoModal
                label="About these prices"
                title="About these prices"
                link={{ href: routes.howWeRank(), label: "How we research" }}
              >
                These are sourced ranges for this market, published so you can tell whether a quote sits in the normal
                band. They are not quotes. A real price depends on your property, and every company prices it
                differently.
              </InfoModal>
            </div>
            <div
              data-split=""
              style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "48px", alignItems: "start", marginTop: "20px" }}
            >
            <p style={{ fontSize: "16px", lineHeight: "1.75", color: "var(--text-secondary)" }}>
              Typical ranges local companies quote, updated with each review of this page. They are not quotes: a real
              price depends on the property and every company prices it differently.
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
            >
              <table style={{ minWidth: "520px" }}>
                <thead>
                  <tr style={{ background: "var(--surface-page)" }}>
                    <th scope="col" style={{ ...TH, padding: "12px 26px" }}>Service</th>
                    <th scope="col" style={{ ...TH, whiteSpace: "nowrap" }}>Typical {city.name} range</th>
                    <th scope="col" style={{ ...TH, padding: "12px 26px" }}>What moves the price</th>
                  </tr>
                </thead>
                <tbody>
                  {costRows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ ...TD, padding: "16px 26px", fontWeight: "600", color: "var(--blue-900)" }} data-label="Service">
                        {row.label}
                      </td>
                      <td style={{ ...TD, whiteSpace: "nowrap" }} data-label="Range">
                        {row.lowPrice && row.highPrice
                          ? `${money(row.lowPrice, row.currency)} – ${money(row.highPrice, row.currency)}`
                          : row.typical
                            ? money(row.typical, row.currency)
                            : "On request"}
                      </td>
                      <td style={{ ...TD, padding: "16px 26px", color: "var(--text-secondary)" }} data-label="Notes">
                        {row.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------ local notes */}
      {conditions.length > 0 ? (
        <section id="local" aria-labelledby="local-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "72px 24px" }}>
            <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
              <span data-eyebrow-rule="" aria-hidden="true" />
              Local conditions
            </p>
            <h2 id="local-h2" style={{ ...H2, marginBottom: "12px" }}>
              What {city.name} homeowners should know
            </h2>
            <p style={{ ...LEAD, maxWidth: "760px", marginBottom: "32px" }}>
              Local conditions shape both the work and the paperwork.
            </p>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {conditions.map((condition) => (
                <li
                  key={condition.title}
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "16px",
                    padding: "22px 24px",
                  }}
                >
                  <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "6px" }}>{condition.title}</h3>
                  <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{condition.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- seasons */}
      <section id="seasons" aria-labelledby="season-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "72px 24px" }}>
            <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
              <span data-eyebrow-rule="" aria-hidden="true" />
              Seasonal demand
            </p>
          <h2 id="season-h2" style={{ ...H2, marginBottom: "24px" }}>
            Popular services by season in {city.name}
          </h2>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
            {SEASONS.map((season) => (
              <li
                key={season.title}
                data-card=""
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "16px",
                  padding: "22px 24px",
                }}
              >
                <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "6px" }}>{season.title}</h3>
                <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{season.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ areas */}
      {neighborhoods.length > 0 || nearbyCities.length > 0 ? (
        <section id="areas" aria-labelledby="areas-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "72px 24px" }}>
            <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "12px" }}>
              <span data-eyebrow-rule="" aria-hidden="true" />
              Coverage
            </p>
            <h2 id="areas-h2" style={{ ...H2, marginBottom: "20px" }}>
              Areas we cover in {city.name}
            </h2>
            <div data-split="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "start" }}>
            {neighborhoods.length > 0 ? (
              <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {neighborhoods.map((name) => (
                  <li key={name} style={PILL}>
                    {name}
                  </li>
                ))}
              </ul>
            ) : null}
            {nearbyCities.length > 0 ? (
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "12px" }}>Across the metro</h3>
                <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                  {nearbyCities.map((near) => (
                    <RowLink key={near.id} href={routes.city(country.code, region.slug, near.slug)} outline compact>
                      {near.name}
                    </RowLink>
                  ))}
                </ul>
              </div>
            ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------ methodology */}
      <section id="method" aria-labelledby="method-h2" style={{ background: "var(--blue-900)", color: "var(--text-on-ink)" }}>
        <div style={{ ...SHELL, padding: "72px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "32px" }}>
            <h2 id="method-h2" style={{ ...H2, color: "#fff" }}>
              How we research {city.name} businesses
            </h2>
            <Link href={routes.howWeRank()} style={{ fontSize: "15px", fontWeight: "600", color: "#E8B551" }}>
              Full methodology →
            </Link>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <InfoModal
              label="Methodology details"
              title="Methodology details"
              link={{ href: routes.howWeRank(), label: "Read the full methodology" }}
              points={[
                "The steps never change; the criteria do, by trade.",
                "Position reflects editorial judgment, never payment.",
                "Every list is re-checked inside 90 days.",
              ]}
            >
              Every {city.name} ranking follows the same five steps, with the criteria for each trade published on the
              ranking itself.
            </InfoModal>
          </div>
          <ol style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {RESEARCH_STEPS.map((step, index) => (
              <li
                key={step.title}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "16px",
                  padding: "22px 24px",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#E8B551", marginBottom: "8px", fontVariantNumeric: "tabular-nums" }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>{step.title}</h3>
                <p style={{ fontSize: "15px", lineHeight: "1.6", color: "rgba(232,237,245,0.78)" }}>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------------- guides */}
      {guides.length > 0 || rankings.length > 0 ? (
        <section id="guides" aria-labelledby="guides-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "72px 24px" }}>
            {guides.length > 0 ? (
              <>
                <h2 id="guides-h2" style={{ ...H2, marginBottom: "24px" }}>
                  Guides for {city.name} homeowners
                </h2>
                <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "16px", marginBottom: "44px" }}>
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
                      <p style={{ ...LABEL, fontSize: "11px", marginBottom: "8px" }}>
                        {guide.category?.serviceName ?? "Guide"}
                      </p>
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

            {rankings.length > 0 ? (
              <>
                <h2 style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700", marginBottom: "20px" }}>
                  Recently reviewed in {city.name}
                </h2>
                <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                  {rankings.slice(0, 4).map((entry) => (
                    <RowLink key={entry.id} href={rankingUrl(entry)} outline compact>
                      {entry.title}
                    </RowLink>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- categories */}
      <section id="categories" aria-labelledby="cat-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "72px 24px" }}>
          <h2 id="cat-h2" style={{ ...H2, marginBottom: "24px" }}>
            Explore {city.name} businesses by category
          </h2>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
            {categories.map((entry) => (
              <RowLink key={entry.id} href={routes.category(entry.slug)} outline compact>
                {entry.name}
              </RowLink>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------------- nearby */}
      {nearbyCities.length > 0 ? (
        <section id="nearby" aria-labelledby="near-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "72px 24px" }}>
            <h2 id="near-h2" style={{ ...H2, marginBottom: "24px" }}>
              Explore nearby cities
            </h2>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
              {nearbyCities.map((near) => (
                <RowLink key={near.id} href={routes.city(country.code, region.slug, near.slug)} outline compact>
                  {near.name}
                </RowLink>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- faqs */}
      <section id="faqs" aria-labelledby="faq-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SHELL, padding: "72px 24px", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "48px", alignItems: "start" }}
        >
          <h2 id="faq-h2" style={{ fontSize: "clamp(24px, 2.8vw, 34px)", lineHeight: "1.2", fontWeight: "700" }}>
            Finding local businesses in {city.name} FAQs
          </h2>
          <ul style={{ display: "grid", gap: "12px" }}>
            {faqs.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------- transparency */}
      <section id="transparency" aria-labelledby="trans-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "56px 24px" }}>
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "30px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "18px" }}>
              <h2 id="trans-h2" style={{ fontSize: "22px", fontWeight: "700" }}>
                About this {city.name} guide
              </h2>
              <InfoModal
                label="About our local data"
                title="About our local data"
                link={{ href: routes.howWeRank(), label: "How we research" }}
                points={[
                  "Licensing and registration from the authority that issues it.",
                  "Ratings from each company's Google Business Profile, with the date read.",
                  "Coverage and services as the company states them, checked against its recent work.",
                ]}
              >
                Information on this page is assembled from public records, what companies publish about themselves, and
                our editors&apos; own review. Where a company is the only source for a claim, the page says so.
              </InfoModal>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px 32px", margin: "0" }}>
              <div>
                <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Rankings published</dt>
                <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>{rankings.length}</dd>
              </div>
              <div>
                <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Companies researched</dt>
                <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>{businessCount}</dd>
              </div>
              {rankings[0] ? (
                <div>
                  <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Last reviewed</dt>
                  <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                    {monthYear(rankings[0].lastReviewedAt ?? rankings[0].publishedAt)}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Re-check interval</dt>
                <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>90 days</dd>
              </div>
              <div>
                <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>Corrections</dt>
                <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600" }}>
                  <Link href={routes.corrections()}>Report an error</Link>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <FinalSearchBand heading={`Find the right local service in ${city.name}`} />
    </SiteChrome>
  );
}
