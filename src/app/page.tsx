import type { Metadata } from "next";
import { withSocial } from "@/lib/static-meta";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SiteChrome } from "@/components/site/SiteChrome";
import { CountUp, InView } from "@/components/site/InView";
import { CityMap, type MapCountry } from "@/components/site/home/CityMap";
import { HowSteps } from "@/components/site/home/HowSteps";
import { TradeGrid } from "@/components/site/home/TradeGrid";
import { Accent, accent, accentTail } from "@/components/ui/Accent";
import { JsonLd, Media } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { ICON_PATHS, type IconName } from "@/lib/icon-paths";
import { shortMonthYear } from "@/lib/format";
import { parseList } from "@/lib/json";
import {
  getCountriesWithRegions,
  getDirectoryCounts,
  getFeaturedCategories,
  getGlobalFaqs,
  getHeroRanking,
  getPopularCities,
  getPublishedGuides,
  getPublishedRankings,
  getTrendingSubservices,
} from "@/lib/queries";
import { rankingUrl, routes } from "@/lib/urls";
import { homeCopy, rankingCardTitle } from "@/lib/seo-copy";

const copy = homeCopy();

export const metadata: Metadata = withSocial({
  // Absolute, because the copy module decides where the brand goes rather than
  // the global title template appending it to everything.
  title: { absolute: copy.title },
  description: copy.description,
  alternates: { canonical: "/" },
});

/* ------------------------------------------------------------ fragments */

/** A style object that carries a CSS custom property alongside real ones. */
const vars = (style: Record<string, string | number>) => style as CSSProperties;

/** The gold rule and small caps that open every section. */
function Eyebrow({
  children,
  tone = "gold",
  after = false,
  mb = "8px",
}: {
  children: ReactNode;
  tone?: "gold" | "ink";
  after?: boolean;
  mb?: string;
}) {
  const rule = (
    <span aria-hidden="true" style={{ width: "22px", height: "2px", background: "var(--gold-ink)" }} />
  );
  return (
    <p
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "11.5px",
        fontWeight: "700",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: tone === "ink" ? "var(--gold-ink)" : "var(--gold)",
        marginBottom: mb,
      }}
    >
      {rule}
      {children}
      {after ? rule : null}
    </p>
  );
}

function Arrow({ size = 14, width = 2.4, stroke = "currentColor" }: { size?: number; width?: number; stroke?: string }) {
  return (
    <svg
      data-arrow=""
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** The small blue link at the right of a section heading. */
function HeadLink({ href, children, size = 14 }: { href: string; children: ReactNode; size?: number }) {
  return (
    <Link
      data-link=""
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "14px",
        fontWeight: "600",
        color: "var(--color-primary)",
        whiteSpace: "nowrap",
        minHeight: "44px",
      }}
    >
      {children}
      <Arrow size={size} width={size === 14 ? 2.4 : 2.2} />
    </Link>
  );
}

const H2: CSSProperties = {
  fontSize: "26px",
  fontWeight: "800",
  letterSpacing: "-0.035em",
  lineHeight: "1.05",
};

const LEDE: CSSProperties = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "var(--text-secondary)",
  textWrap: "pretty",
};

const HEAD_ROW: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "18px",
};

const FIELD: CSSProperties = {
  width: "100%",
  border: "0",
  outline: "none",
  height: "54px",
  fontSize: "16px",
  color: "var(--text-primary)",
  background: "transparent",
};

const SR_ONLY: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
};

const SEARCH_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "0 12px",
};

/** Two initials for the small round author mark. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function placeLine(ranking: {
  category: { name: string };
  city: { name: string; region: { code: string } } | null;
}) {
  return `${ranking.category.name}${
    ranking.city ? ` · ${ranking.city.name}, ${ranking.city.region.code.toUpperCase()}` : ""
  }`;
}

const STEPS = [
  {
    n: "01",
    title: "Research",
    body: "We list every company that genuinely works the area, then pull license records, insurance status, years in business and the public complaint history for each one.",
  },
  {
    n: "02",
    title: "Evaluate",
    body: "Companies are compared on what decides a job: who is licensed for that exact work, who answers after hours, who puts warranty terms in writing before the deposit.",
  },
  {
    n: "03",
    title: "Publish and Re-check",
    body: "Up to ten names go live with the criteria, the sources and the review date. If we could not verify something we say so. Every list is re-checked inside 90 days.",
  },
];

const EEAT = [
  {
    icon: "users" as IconName,
    title: "Named Editors",
    text: "Every list carries the name of the person who researched it and the date they last checked it.",
    cta: "Meet the team",
    href: routes.editorialTeam(),
  },
  {
    icon: "eye" as IconName,
    title: "Published Criteria",
    text: "What we check for each trade, and where the limits of that checking are, is written down for anyone to read.",
    cta: "Our methodology",
    href: routes.howWeRank(),
  },
  {
    icon: "coin" as IconName,
    title: "How We Make Money",
    text: "Businesses pay for managed profiles and labelled featured slots. They cannot pay for a ranked position.",
    cta: "Advertising disclosure",
    href: routes.advertisingDisclosure(),
  },
  {
    icon: "history" as IconName,
    title: "Fixing Mistakes",
    text: "Lists are re-checked on a schedule, anyone can flag an error, and changes are noted on the page with a date.",
    cta: "Corrections policy",
    href: routes.corrections(),
  },
];

const BIZ_POINTS = [
  {
    icon: "pin" as IconName,
    title: "Only Where You Actually Work",
    text: "Appear in the cities and regions you cover. There is no national blast and no lead auction.",
  },
  {
    icon: "card" as IconName,
    title: "A Profile That Answers the Questions",
    text: "Services, license, insurance, coverage area and contact details on one page a homeowner can trust.",
  },
  {
    icon: "chart" as IconName,
    title: "See Every Call and Click",
    text: "Your dashboard shows profile views, phone reveals, website clicks and quote requests, by day.",
  },
];

/** The three tiers of the site's address, drawn as the strip above the country cards. */
const TIER_ICONS = [
  "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20 M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  "M14.1 4.6 9.9 2.4a2 2 0 0 0-1.8 0L3.6 4.6A1 1 0 0 0 3 5.5v14.9a.5.5 0 0 0 .7.4l4.4-2.2a2 2 0 0 1 1.8 0l4.2 2.1a2 2 0 0 0 1.8 0l4.5-2.2a1 1 0 0 0 .6-.9V3.6a.5.5 0 0 0-.7-.4l-4.4 2.2a2 2 0 0 1-1.8 0z M15 5.8v15 M9 3.2v15",
  "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M10 18h4",
];

/* ----------------------------------------------------------- the page */

export default async function HomePage() {
  const [categories, trending, rankings, countries, guides, faqs, usCities, caCities, hero, counts, people, located] =
    await Promise.all([
      getFeaturedCategories(),
      getTrendingSubservices(),
      getPublishedRankings(10),
      getCountriesWithRegions(),
      getPublishedGuides(6),
      getGlobalFaqs(),
      getPopularCities("us"),
      getPopularCities("ca"),
      getHeroRanking(),
      getDirectoryCounts(),
      // The same ordering the editorial team page uses, cut to the first three.
      db.person.findMany({
        where: { published: true },
        orderBy: [{ isExpert: "desc" }, { name: "asc" }],
        take: 3,
        select: { id: true, name: true, slug: true, role: true, portrait: true, specializations: true },
      }),
      // Pin positions for the city map. getPopularCities does not select them.
      db.city.findMany({
        where: {
          published: true,
          latitude: { not: null },
          longitude: { not: null },
          region: { country: { code: { in: ["us", "ca"] } } },
        },
        select: {
          slug: true,
          latitude: true,
          longitude: true,
          region: { select: { slug: true, country: { select: { code: true } } } },
        },
      }),
    ]);

  // The hero card takes the freshest list, so the cards that follow are the
  // next ones down rather than the same page twice.
  const heroPath = hero ? rankingUrl(hero) : routes.rankingsIndex();
  const rest = rankings.filter((entry) => entry.id !== hero?.id);
  const featured = rest.slice(0, 4);
  const latest = rest.slice(0, 6);

  const ledger = [
    { value: counts.cities, suffix: "", label: "Cities with published rankings" },
    { value: counts.categories, suffix: "", label: "Trades, each with its own criteria" },
    { value: counts.businesses, suffix: "", label: "Companies checked against license registers" },
    { value: 90, suffix: " days", label: "Maximum time between re-checks" },
  ];

  // The trades most people arrive looking for, in that order. Any that is not
  // a published category here is left out rather than linking nowhere.
  const CHIP_SLUGS = ["plumbers", "hvac", "roofing", "electricians", "moving-companies", "pest-control"];
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const chips = CHIP_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (category): category is (typeof categories)[number] => Boolean(category),
  );

  const trades = categories.map((category) => ({
    href: routes.category(category.slug),
    name: category.name,
    d: ICON_PATHS[category.iconKey as IconName] ?? ICON_PATHS.wrench,
  }));

  // Each country's busiest cities for the map and its list.
  const coordsByCity = new Map(
    located.map((city) => [`${city.region.country.code}/${city.region.slug}/${city.slug}`, city]),
  );
  const mapCountries: MapCountry[] = [
    { code: "us", label: "United States", browseLabel: "All U.S. cities", cities: usCities },
    { code: "ca", label: "Canada", browseLabel: "All Canadian cities", cities: caCities },
  ].map(({ code, label, browseLabel, cities }) => ({
    code,
    label,
    browseLabel,
    browseHref: routes.country(code),
    cities: cities.map((city) => {
      const key = `${city.region.country.code}/${city.region.slug}/${city.slug}`;
      const at = coordsByCity.get(key);
      return {
        href: routes.city(city.region.country.code, city.region.slug, city.slug),
        name: `${city.name}, ${city.region.code.toUpperCase()}`,
        count: city._count.rankings,
        lat: at?.latitude ?? null,
        lng: at?.longitude ?? null,
      };
    }),
  }));

  // The address strip uses the first country, region and city that exist.
  const tierCountry = countries[0];
  const tierRegion = tierCountry?.regions.find((region) => region.cities.length > 0) ?? tierCountry?.regions[0];
  const tiers = [
    { label: "01 · Country", value: tierCountry?.name },
    { label: "02 · State or province", value: tierRegion?.name },
    { label: "03 · City", value: tierRegion?.cities[0]?.name },
  ].filter((tier): tier is { label: string; value: string } => Boolean(tier.value));

  return (
    <SiteChrome active="home">
      {faqs.length > 0 ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }}
        />
      ) : null}

      <div className="hm">
        {/* ------------------------------------------------------------ hero */}
        <section
          data-hero=""
          aria-labelledby="hero-h1"
          style={vars({ "--mx": "70%", "--my": "20%", position: "relative", overflow: "hidden", background: "var(--paper)" })}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              backgroundImage:
                "linear-gradient(rgba(16,31,61,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(16,31,61,0.06) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              WebkitMaskImage: "radial-gradient(520px 420px at var(--mx) var(--my), #000, transparent 75%)",
              maskImage: "radial-gradient(520px 420px at var(--mx) var(--my), #000, transparent 75%)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              backgroundImage:
                "linear-gradient(rgba(16,31,61,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(16,31,61,0.025) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              pointerEvents: "none",
            }}
          />
          <div
            data-blob-a=""
            aria-hidden="true"
            style={{
              position: "absolute",
              right: "-10%",
              top: "-20%",
              width: "620px",
              height: "620px",
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(45,116,215,0.2), transparent)",
              pointerEvents: "none",
            }}
          />
          <div
            data-blob-b=""
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-12%",
              bottom: "-30%",
              width: "520px",
              height: "520px",
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(231,184,99,0.22), transparent)",
              pointerEvents: "none",
            }}
          />
          <svg
            data-ten-outline=""
            aria-hidden="true"
            viewBox="0 0 240 170"
            width="220"
            height="156"
            style={{ position: "absolute", right: "-60px", top: "14px", overflow: "visible", pointerEvents: "none" }}
          >
            <path
              pathLength={1}
              d="M18 40 L52 16 L52 158"
              fill="none"
              stroke="rgba(16,31,61,0.13)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              pathLength={1}
              d="M150 16 C 196 16, 226 46, 226 87 C 226 128, 196 158, 150 158 C 104 158, 74 128, 74 87 C 74 46, 104 16, 150 16 Z"
              fill="none"
              stroke="rgba(16,31,61,0.13)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="226" cy="30" r="4" fill="var(--gold-ink)" />
          </svg>

          <div data-shell="" data-hm-hero="" style={{ position: "relative", padding: "28px var(--gutter) 36px" }}>
            <div
              data-hero-grid=""
              style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "28px" }}
            >
              <div>
                <p
                  data-in="1"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink)",
                    marginBottom: "22px",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ display: "inline-block", width: "28px", height: "2px", background: "var(--gold-ink)" }}
                  />
                  Local Rankings for the US and Canada
                </p>
                <h1
                  id="hero-h1"
                  data-in="2"
                  style={{
                    fontSize: "clamp(36px, 10vw, 48px)",
                    lineHeight: "0.98",
                    fontWeight: "800",
                    letterSpacing: "-0.045em",
                    color: "var(--ink)",
                    textWrap: "balance",
                    maxWidth: "760px",
                  }}
                >
                  Find the{" "}
                  <span
                    className="serif-accent"
                    style={{
                      position: "relative",
                      display: "inline-block",
                      color: "var(--ink)",
                      paddingRight: "0.06em",
                    }}
                  >
                    Best
                    <span
                      data-uline=""
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "0",
                        right: "0.06em",
                        bottom: "0.04em",
                        height: "0.12em",
                        borderRadius: "99px",
                        background: "var(--gold-ink)",
                        zIndex: -1,
                      }}
                    />
                  </span>{" "}
                  Home Service Companies by City
                </h1>
                <p
                  data-in="3"
                  style={{
                    marginTop: "18px",
                    fontSize: "17px",
                    lineHeight: "1.55",
                    color: "var(--text-secondary)",
                    maxWidth: "540px",
                    textWrap: "pretty",
                  }}
                >
                  Most &quot;best of&quot; pages are ads with a headline. Ours are written by editors who pull
                  license records, read the complaints and phone the shops. One city, one trade, and up to ten
                  names you can actually call.
                </p>

                <div data-searchbox="" data-in="4" style={{ position: "relative", marginTop: "26px", maxWidth: "680px" }}>
                  <form
                    data-searchform=""
                    action={routes.search()}
                    method="get"
                    role="search"
                    aria-label="Find local businesses"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "22px",
                      boxShadow: "0 30px 60px -30px rgba(16,31,61,0.4)",
                      padding: "8px",
                    }}
                  >
                    <div style={{ ...SEARCH_ROW, borderBottom: "1px solid var(--border-subtle)", flex: "1.15" }}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--gray-400)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.34-4.34" />
                      </svg>
                      <label htmlFor="svc" style={SR_ONLY}>
                        What service do you need?
                      </label>
                      <input
                        id="svc"
                        name="service"
                        type="text"
                        autoComplete="off"
                        placeholder="Roofer, plumber, HVAC, movers…"
                        style={FIELD}
                      />
                    </div>
                    <div
                      data-divider=""
                      aria-hidden="true"
                      style={{
                        display: "none",
                        width: "1px",
                        alignSelf: "stretch",
                        background: "var(--border-subtle)",
                        margin: "10px 0",
                      }}
                    />
                    <div style={{ ...SEARCH_ROW, flex: "1" }}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--gray-400)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <label htmlFor="loc" style={SR_ONLY}>
                        Your city or postal code
                      </label>
                      <input
                        id="loc"
                        name="location"
                        type="text"
                        autoComplete="off"
                        placeholder="City or postal code"
                        style={FIELD}
                      />
                    </div>
                    <button
                      data-btn=""
                      data-btn-dark=""
                      type="submit"
                      style={{
                        width: "100%",
                        height: "54px",
                        marginTop: "6px",
                        padding: "0 22px 0 26px",
                        border: "0",
                        borderRadius: "16px",
                        background: "var(--ink)",
                        color: "#fff",
                        fontSize: "16px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Show Me the List
                      <Arrow size={17} width={2.4} stroke="var(--gold-ink)" />
                    </button>
                  </form>

                  <div
                    data-suggest=""
                    role="listbox"
                    aria-label="Suggestions"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      left: "0",
                      right: "0",
                      zIndex: "150",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "18px",
                      boxShadow: "var(--shadow-xl)",
                      padding: "22px 24px",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                      gap: "22px",
                    }}
                  >
                    <SuggestColumn label="Trades">
                      {categories.slice(0, 3).map((category) => (
                        <SuggestLink key={category.id} href={routes.category(category.slug)}>
                          {category.name}
                        </SuggestLink>
                      ))}
                    </SuggestColumn>
                    <SuggestColumn label="Busy cities">
                      {usCities.slice(0, 2).concat(caCities.slice(0, 1)).map((city) => (
                        <SuggestLink
                          key={`${city.region.country.code}-${city.slug}`}
                          href={routes.city(city.region.country.code, city.region.slug, city.slug)}
                        >
                          {`${city.name}, ${city.region.code.toUpperCase()}`}
                        </SuggestLink>
                      ))}
                    </SuggestColumn>
                    <SuggestColumn label="Just re-checked">
                      {rankings.slice(0, 2).map((ranking) => (
                        <SuggestLink key={ranking.id} href={rankingUrl(ranking)}>
                          {rankingCardTitle(ranking)}
                        </SuggestLink>
                      ))}
                    </SuggestColumn>
                  </div>
                </div>

                <div
                  data-in="5"
                  data-chips=""
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    overflowX: "auto",
                    scrollbarWidth: "none",
                    marginLeft: "calc(-1 * var(--gutter))",
                    marginRight: "calc(-1 * var(--gutter))",
                    padding: "2px var(--gutter)",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)", flex: "0 0 auto" }}>
                    Try
                  </span>
                  {chips.map((category) => (
                    <Link
                      key={category.id}
                      data-chip=""
                      href={routes.category(category.slug)}
                      style={{
                        flex: "0 0 auto",
                        height: "36px",
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "0 14px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.85)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "var(--ink)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>

              {hero ? (
                <div data-hm-aside="" data-in="6" style={{ position: "relative", perspective: "1200px" }}>
                  <aside
                    data-tilt=""
                    aria-labelledby="hero-preview-h2"
                    style={{
                      position: "relative",
                      background: "var(--ink)",
                      color: "#fff",
                      borderRadius: "24px",
                      boxShadow: "0 50px 90px -40px rgba(16,31,61,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset",
                      overflow: "hidden",
                      maxWidth: "520px",
                      marginLeft: "auto",
                      transition: "transform 500ms var(--spring)",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "0",
                        background:
                          "radial-gradient(420px 260px at 100% 0%, rgba(45,116,215,0.35), transparent 70%), radial-gradient(300px 200px at 0% 100%, rgba(231,184,99,0.12), transparent 70%)",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      data-scan=""
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "0",
                        right: "0",
                        top: "0",
                        height: "30%",
                        background:
                          "linear-gradient(180deg, transparent, rgba(231,184,99,0.1) 70%, rgba(231,184,99,0.35))",
                        pointerEvents: "none",
                        opacity: 0.9,
                      }}
                    />
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "18px 20px 0",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "7px",
                          flex: "0 0 auto",
                          padding: "6px 11px",
                          borderRadius: "999px",
                          background: "rgba(255,255,255,0.1)",
                          border: "1px solid rgba(255,255,255,0.16)",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "#fff",
                        }}
                      >
                        <span
                          data-live-dot=""
                          style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold-ink)" }}
                        />
                        Live ranking
                      </span>
                      <span
                        style={{
                          minWidth: "0",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "12px",
                          color: "rgba(232,237,245,0.62)",
                        }}
                      >
                        Reviewed {shortMonthYear(hero.lastReviewedAt ?? hero.publishedAt)}
                        {hero.author ? ` · ${hero.author.name}` : ""}
                      </span>
                    </div>
                    <div style={{ position: "relative", padding: "16px 20px 20px" }}>
                      <p
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--gold-ink)",
                          marginBottom: "6px",
                        }}
                      >
                        {hero.category.serviceName}
                        {hero.city ? ` · ${hero.city.name}, ${hero.city.region.code.toUpperCase()}` : ""}
                      </p>
                      <h2
                        id="hero-preview-h2"
                        style={{
                          fontSize: "22px",
                          lineHeight: "1.15",
                          fontWeight: "700",
                          letterSpacing: "-0.025em",
                          color: "#fff",
                          marginBottom: "12px",
                        }}
                      >
                        <Link href={heroPath} style={{ color: "#fff" }}>
                          {rankingCardTitle(hero)}
                        </Link>
                      </h2>
                      <ol data-hero-rows="">
                        {hero.entries.map((entry) => {
                          const meta = [
                            entry.business.yearFounded ? `Since ${entry.business.yearFounded}` : null,
                            entry.business.licenseNumber,
                          ]
                            .filter(Boolean)
                            .join(" · ");
                          const badge = entry.business.verified
                            ? "Details verified"
                            : entry.business.credentials[0]?.label ?? null;
                          return (
                            <li
                              key={entry.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "14px",
                                minHeight: "58px",
                                padding: "10px 0",
                                borderTop: "1px solid rgba(255,255,255,0.1)",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "34px",
                                  height: "34px",
                                  borderRadius: "10px",
                                  background: "rgba(231,184,99,0.12)",
                                  border: "1px solid rgba(231,184,99,0.3)",
                                  fontSize: "13px",
                                  fontWeight: "800",
                                  color: "var(--gold-ink)",
                                  fontVariantNumeric: "tabular-nums",
                                  flexShrink: 0,
                                }}
                              >
                                {String(entry.position).padStart(2, "0")}
                              </span>
                              <span style={{ flex: "1", minWidth: "0" }}>
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    color: "#fff",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {entry.business.name}
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "12px",
                                    color: "rgba(232,237,245,0.62)",
                                    fontVariantNumeric: "tabular-nums",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {meta || entry.designation}
                                </span>
                              </span>
                              {badge ? (
                                <span data-chk-ok="" title={badge} style={{ flexShrink: 1, minWidth: "0", maxWidth: "46%" }}>
                                  <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                    style={{ flexShrink: 0 }}
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                  <span>{badge}</span>
                                </span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ol>
                      <Link
                        data-btn=""
                        href={heroPath}
                        style={{
                          marginTop: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          height: "48px",
                          borderRadius: "14px",
                          background: "var(--gold-ink)",
                          color: "var(--ink)",
                          fontSize: "14.5px",
                          fontWeight: "700",
                        }}
                      >
                        {hero._count.entries >= 10 ? "See all ten" : `See all ${hero._count.entries}`}
                        <Arrow size={15} width={2.4} />
                      </Link>
                    </div>
                  </aside>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ categories */}
        <section
          aria-labelledby="cats-h2"
          style={{
            background: "var(--surface-card)",
            borderTop: "1px solid var(--border-subtle)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div data-shell="" data-sec="" style={{ padding: "34px var(--gutter) 0" }}>
            <div data-reveal="" style={{ ...HEAD_ROW, marginBottom: "20px" }}>
              <div style={{ maxWidth: "660px" }}>
                <Eyebrow>Home Services</Eyebrow>
                <h2 id="cats-h2" data-h2="" style={{ ...H2, textWrap: "balance" }}>
                  Home Service Rankings <Accent>by Trade</Accent>
                </h2>
                <p style={{ ...LEDE, marginTop: "12px" }}>
                  {counts.categories} trades, from emergency plumbing to full kitchen remodels. Every category
                  page opens with what a valid license covers in your state or province, then the ten
                  companies that cleared our checks.
                </p>
              </div>
              <HeadLink href={routes.servicesIndex()}>All {counts.categories} services</HeadLink>
            </div>
            <TradeGrid trades={trades} />
          </div>

          {trending.length > 0 ? (
            <div
              data-hm-marq=""
              style={{
                position: "relative",
                marginTop: "26px",
                borderTop: "1px solid var(--border-subtle)",
                background: "var(--paper)",
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "relative",
                  zIndex: 2,
                  flex: "0 0 auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  height: "60px",
                  padding: "0 18px 0 var(--gutter)",
                  background: "var(--ink)",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  boxShadow: "18px 0 24px -8px var(--paper)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gold-ink)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M16 7h6v6" />
                  <path d="m22 7-8.5 8.5-5-5L2 17" />
                </svg>
                Searched most this week
              </span>
              <div
                style={{
                  flex: "1",
                  minWidth: "0",
                  overflow: "hidden",
                  WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
                  maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
                }}
              >
                <div data-track="" style={{ display: "flex", width: "max-content" }}>
                  {[false, true].map((copyOfList) => (
                    <div
                      key={String(copyOfList)}
                      aria-hidden={copyOfList ? "true" : undefined}
                      style={{ display: "flex", alignItems: "center", gap: "10px", paddingRight: "10px" }}
                    >
                      {trending.map((sub) => (
                        <Link
                          key={sub.id}
                          data-chip=""
                          href={routes.subservice(sub.category.slug, sub.slug)}
                          tabIndex={copyOfList ? -1 : undefined}
                          style={{
                            flex: "0 0 auto",
                            height: "38px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "0 16px",
                            borderRadius: "999px",
                            background: "var(--surface-card)",
                            border: "1px solid var(--border-subtle)",
                            fontSize: "13.5px",
                            fontWeight: "600",
                            color: "var(--ink)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--gold-ink)" }}
                          />
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* ------------------------------------------------- featured rankings */}
        {featured.length > 0 ? (
          <section aria-labelledby="feat-h2" style={{ background: "var(--paper)" }}>
            <div data-shell="" data-sec="" style={{ padding: "38px var(--gutter) 18px" }}>
              <div data-reveal="" style={HEAD_ROW}>
                <div style={{ maxWidth: "660px" }}>
                  <Eyebrow>Rankings</Eyebrow>
                  <h2 id="feat-h2" data-h2="" style={{ ...H2, textWrap: "balance" }}>
                    {accent("Most Popular City Rankings", "City Rankings")}
                  </h2>
                  <p style={{ ...LEDE, marginTop: "12px" }}>
                    Four rankings that get more traffic than the rest combined. Each one shows the date an
                    editor last checked it, not the date the page was made.
                  </p>
                </div>
                <HeadLink href={routes.rankingsIndex()}>Every ranking</HeadLink>
              </div>
              <ul data-rail="" data-stagger="">
                {featured.map((ranking) => {
                  const photo = ranking.city?.heroImage;
                  return (
                    <li
                      key={ranking.id}
                      data-card=""
                      style={{
                        width: "min(78vw, 300px)",
                        background: "var(--surface-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "22px",
                        overflow: "hidden",
                        boxShadow: "var(--shadow-xs)",
                      }}
                    >
                      <Link href={rankingUrl(ranking)} style={{ display: "block", color: "inherit" }}>
                        <span
                          style={{
                            position: "relative",
                            display: "block",
                            height: "176px",
                            background: photo
                              ? "var(--surface-sunken)"
                              : "linear-gradient(135deg, var(--ink-2), var(--ink))",
                            overflow: "hidden",
                          }}
                        >
                          <Media
                            src={photo}
                            tone="dark"
                            alt={
                              ranking.city
                                ? `${ranking.category.name} in ${ranking.city.name}`
                                : ranking.category.name
                            }
                            sizes="(max-width: 760px) 80vw, 300px"
                          />
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              inset: "0",
                              background: "linear-gradient(180deg, transparent 50%, rgba(16,31,61,0.55))",
                              pointerEvents: "none",
                            }}
                          />
                          <span
                            style={{
                              position: "absolute",
                              top: "12px",
                              left: "12px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "5px 10px",
                              borderRadius: "999px",
                              background: "rgba(16,31,61,0.75)",
                              backdropFilter: "blur(8px)",
                              fontSize: "10.5px",
                              fontWeight: "700",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "#fff",
                            }}
                          >
                            <span
                              data-live-dot=""
                              style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold-ink)" }}
                            />
                            Live
                          </span>
                          <span
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              right: "14px",
                              bottom: "10px",
                              fontFamily: "var(--serif)",
                              fontStyle: "italic",
                              fontSize: "56px",
                              lineHeight: "1",
                              color: "#fff",
                              letterSpacing: "-0.03em",
                              textShadow: "0 6px 20px rgba(0,0,0,0.3)",
                            }}
                          >
                            10
                          </span>
                        </span>
                        <span style={{ display: "block", padding: "16px 18px 18px" }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: "11px",
                              fontWeight: "700",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              color: "var(--color-primary)",
                              marginBottom: "6px",
                            }}
                          >
                            {placeLine(ranking)}
                          </span>
                          <h3
                            style={{
                              fontSize: "18px",
                              lineHeight: "1.22",
                              fontWeight: "700",
                              letterSpacing: "-0.022em",
                              marginBottom: "12px",
                            }}
                          >
                            {rankingCardTitle(ranking)}
                          </h3>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              paddingTop: "12px",
                              borderTop: "1px dashed var(--border-subtle)",
                              fontSize: "12.5px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {ranking.author ? (
                              <span
                                aria-hidden="true"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "50%",
                                  background: "var(--ink)",
                                  color: "var(--gold-ink)",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  flexShrink: 0,
                                }}
                              >
                                {initials(ranking.author.name)}
                              </span>
                            ) : null}
                            <span>
                              {ranking.author ? (
                                <>
                                  <span style={{ fontWeight: "600", color: "var(--ink)" }}>{ranking.author.name}</span>
                                  {" · "}
                                </>
                              ) : null}
                              Reviewed {shortMonthYear(ranking.lastReviewedAt ?? ranking.publishedAt)}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- ledger */}
        <section
          aria-label="What we have checked"
          style={{ position: "relative", overflow: "hidden", background: "var(--ink)", marginTop: "22px" }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
              WebkitMaskImage: "linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)",
              maskImage: "linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent)",
              pointerEvents: "none",
            }}
          />
          <InView
            as="ul"
            data-shell=""
            data-ledger=""
            style={{
              position: "relative",
              padding: "0 var(--gutter)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            {ledger.map((row) => (
              <li key={row.label} style={{ position: "relative", padding: "26px 14px 24px 0" }}>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    right: "14px",
                    height: "2px",
                    background: "rgba(255,255,255,0.1)",
                  }}
                />
                <span
                  data-ledger-bar=""
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    right: "14px",
                    height: "2px",
                    background: "var(--gold-ink)",
                  }}
                />
                <p
                  style={{
                    fontSize: "clamp(34px, 9vw, 60px)",
                    fontWeight: "800",
                    letterSpacing: "-0.05em",
                    color: "#fff",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: "1",
                  }}
                >
                  <CountUp value={row.value} suffix={row.suffix} />
                </p>
                <p
                  style={{
                    marginTop: "10px",
                    fontSize: "13px",
                    lineHeight: "1.45",
                    color: "rgba(232,237,245,0.72)",
                    maxWidth: "220px",
                  }}
                >
                  {row.label}
                </p>
              </li>
            ))}
          </InView>
        </section>

        {/* --------------------------------------------------- how we rank */}
        <section aria-labelledby="how-h2" style={{ position: "relative", background: "var(--paper)" }}>
          <div data-shell="" data-sec="" style={{ padding: "44px var(--gutter) 24px" }}>
            <div data-reveal="" style={{ maxWidth: "720px" }}>
              <Eyebrow>How We Rank</Eyebrow>
              <h2 id="how-h2" data-h2="" style={{ ...H2, marginBottom: "10px", textWrap: "balance" }}>
                How We Rank <Accent>Local Companies</Accent>
              </h2>
              <p style={{ ...LEDE, marginBottom: "12px" }}>
                TenBestFind is a small editorial team, not a lead-generation company. We check a
                contractor&apos;s license against the state or provincial register, count the years it has
                pulled permits locally, look at the range of work it takes on, and read what customers say
                about it in public.
              </p>
              <p style={{ ...LEDE, marginBottom: "24px" }}>
                Up to ten names make the page, with the reasoning next to each one. When fewer companies
                meet the criteria, the list is shorter. The steps never change. The criteria do, because a
                good mover and a good electrician are not measured the same way.
              </p>
            </div>
            <HowSteps steps={STEPS} />
            <Link
              data-btn=""
              href={routes.howWeRank()}
              style={{
                marginTop: "20px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                height: "50px",
                padding: "0 24px",
                borderRadius: "999px",
                border: "1.5px solid var(--ink)",
                background: "transparent",
                color: "var(--ink)",
                fontSize: "15px",
                fontWeight: "700",
              }}
            >
              Read the full methodology
              <Arrow size={16} width={2.2} />
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------------- countries */}
        <section aria-labelledby="country-h2" style={{ background: "var(--paper)" }}>
          <div data-shell="" data-sec="" style={{ padding: "40px var(--gutter) 22px" }}>
            <div data-reveal="" style={{ maxWidth: "720px" }}>
              <Eyebrow>Locations</Eyebrow>
              <h2 id="country-h2" data-h2="" style={{ ...H2, marginBottom: "10px", textWrap: "balance" }}>
                {`Home Service Rankings in ${counts.cities} `}
                <Accent>{countries.length === 2 ? "US and Canadian Cities" : "Cities"}</Accent>
              </h2>
              <p style={{ ...LEDE, marginBottom: "22px" }}>
                Rankings are organized by country, then state or province, then city. A roofing license in
                Florida means something different from one in Ontario, so the research is done at the level
                where the rules actually live.
              </p>
            </div>
            {tiers.length === 3 ? (
              <div
                data-reveal=""
                style={{
                  position: "relative",
                  marginBottom: "18px",
                  padding: "20px 8px 18px",
                  borderRadius: "22px",
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "16.6%",
                    right: "16.6%",
                    top: "42px",
                    height: "2px",
                    background: "var(--border-subtle)",
                  }}
                />
                <span
                  data-tier-line=""
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "16.6%",
                    right: "16.6%",
                    top: "42px",
                    height: "2px",
                    background: "linear-gradient(90deg, var(--gold-ink), var(--color-primary))",
                  }}
                />
                <ol
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "8px",
                  }}
                >
                  {tiers.map((tier, i) => (
                    <li
                      key={tier.label}
                      data-tier=""
                      style={vars({
                        "--d": i,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        gap: "8px",
                      })}
                    >
                      <span
                        data-tile=""
                        aria-hidden="true"
                        style={{
                          position: "relative",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "46px",
                          height: "46px",
                          borderRadius: "50%",
                          background: "var(--ink)",
                          color: "var(--gold-ink)",
                          boxShadow: "0 0 0 6px var(--surface-card)",
                        }}
                      >
                        <svg
                          data-ico=""
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path pathLength="1" d={TIER_ICONS[i]} />
                        </svg>
                      </span>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: "800",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--gold)",
                        }}
                      >
                        {tier.label}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--ink)" }}>{tier.value}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <ul
              data-two=""
              data-stagger=""
              style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "14px" }}
            >
              {countries.map((country) => (
                <li
                  key={country.code}
                  data-card=""
                  data-country=""
                  style={{
                    position: "relative",
                    borderRadius: "26px",
                    overflow: "hidden",
                    background: "var(--ink)",
                    color: "#fff",
                    padding: "24px 22px 20px",
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid var(--ink)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: "0",
                      background: "radial-gradient(460px 260px at 100% 0%, rgba(45,116,215,0.42), transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />
                  <span
                    data-ghost=""
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      right: "-8px",
                      top: "-30px",
                      fontSize: "200px",
                      fontWeight: "800",
                      letterSpacing: "-0.08em",
                      lineHeight: "1",
                      color: "rgba(255,255,255,0.06)",
                      pointerEvents: "none",
                    }}
                  >
                    {country.code.toUpperCase()}
                  </span>
                  <span
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "18px",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        height: "28px",
                        padding: "0 11px",
                        borderRadius: "999px",
                        background: "rgba(231,184,99,0.14)",
                        border: "1px solid rgba(231,184,99,0.35)",
                        fontSize: "11px",
                        fontWeight: "800",
                        letterSpacing: "0.1em",
                        color: "var(--gold-ink)",
                      }}
                    >
                      {country.code.toUpperCase()}
                    </span>
                  </span>
                  <h3
                    style={{
                      position: "relative",
                      fontSize: "32px",
                      fontWeight: "800",
                      letterSpacing: "-0.04em",
                      color: "#fff",
                      marginBottom: "8px",
                    }}
                  >
                    <Link href={routes.country(country.code)} style={{ color: "#fff" }}>
                      {country.name}
                    </Link>
                  </h3>
                  <p
                    style={{
                      position: "relative",
                      fontSize: "14.5px",
                      lineHeight: "1.6",
                      color: "rgba(232,237,245,0.78)",
                      marginBottom: "20px",
                      maxWidth: "460px",
                      textWrap: "pretty",
                    }}
                  >
                    {country.blurb}
                  </p>
                  <ul
                    style={{
                      position: "relative",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      marginBottom: "14px",
                      marginTop: "auto",
                    }}
                  >
                    {country.regions.slice(0, 4).map((region) => (
                      <li key={region.id}>
                        <Link
                          data-region=""
                          href={routes.region(country.code, region.slug)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            minHeight: "48px",
                            padding: "0 14px",
                            borderRadius: "14px",
                            border: "1px solid rgba(255,255,255,0.14)",
                            background: "rgba(255,255,255,0.06)",
                            fontSize: "13.5px",
                            fontWeight: "600",
                            color: "#fff",
                            transition: "background 220ms ease, color 220ms ease, border-color 220ms ease",
                          }}
                        >
                          {region.name}
                          <svg
                            data-arrow=""
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M7 17 17 7" />
                            <path d="M7 7h10v10" />
                          </svg>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    data-link=""
                    href={routes.country(country.code)}
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      minHeight: "44px",
                      fontSize: "14.5px",
                      fontWeight: "700",
                      color: "var(--gold-ink)",
                    }}
                  >
                    Browse {country.name}
                    <Arrow size={16} width={2.2} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------------------- cities */}
        <section
          aria-labelledby="geo-h2"
          style={{ background: "var(--surface-card)", borderTop: "1px solid var(--border-subtle)", marginTop: "18px" }}
        >
          <div data-shell="" data-sec="" style={{ padding: "40px var(--gutter) 34px" }}>
            <div data-reveal="" style={{ ...HEAD_ROW, flexWrap: "wrap" }}>
              <div style={{ maxWidth: "660px" }}>
                <Eyebrow>Cities</Eyebrow>
                <h2 id="geo-h2" data-h2="" style={H2}>
                  {accent("Start With Your City", "Your City")}
                </h2>
                <p style={{ ...LEDE, marginTop: "12px" }}>
                  The metros with the most published rankings. The number is how many trades we have already
                  covered there.
                </p>
              </div>
              <HeadLink href={routes.locationsIndex()} size={16}>
                Every city
              </HeadLink>
            </div>
            <CityMap countries={mapCountries} />
          </div>
        </section>

        {/* ---------------------------------------------------------- latest */}
        {latest.length > 0 ? (
          <section aria-labelledby="latest-h2" style={{ background: "var(--paper)" }}>
            <div data-shell="" data-sec="" style={{ padding: "38px var(--gutter) 14px" }}>
              <div data-reveal="" style={HEAD_ROW}>
                <div style={{ maxWidth: "660px" }}>
                  <Eyebrow>Fresh Off the Editor&apos;s Desk</Eyebrow>
                  <h2 id="latest-h2" data-h2="" style={H2}>
                    Recently Reviewed <Accent>Rankings</Accent>
                  </h2>
                  <p style={{ ...LEDE, marginTop: "12px" }}>New lists and re-checked ones, most recent first.</p>
                </div>
                <HeadLink href={routes.rankingsIndex()}>The full archive</HeadLink>
              </div>
              <ol
                data-list-two=""
                data-stagger=""
                style={{ display: "grid", gridTemplateColumns: "1fr", borderTop: "2px solid var(--ink)" }}
              >
                {latest.map((ranking, index) => (
                  <li key={ranking.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <Link
                      data-row=""
                      href={rankingUrl(ranking)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "18px 8px",
                        color: "var(--text-primary)",
                        borderRadius: "12px",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          flexShrink: 0,
                          width: "34px",
                          fontFamily: "var(--serif)",
                          fontStyle: "italic",
                          fontSize: "30px",
                          lineHeight: "1",
                          color: "var(--gold)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span style={{ flex: "1", minWidth: "0" }}>
                        <span
                          style={{
                            display: "block",
                            fontSize: "16px",
                            lineHeight: "1.3",
                            fontWeight: "700",
                            letterSpacing: "-0.018em",
                            color: "var(--ink)",
                          }}
                        >
                          {rankingCardTitle(ranking)}
                        </span>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginTop: "4px",
                            fontSize: "12.5px",
                            color: "var(--text-muted)",
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            style={{ flexShrink: 0 }}
                          >
                            <path d={ICON_PATHS[ranking.category.iconKey as IconName] ?? ICON_PATHS.wrench} />
                          </svg>
                          {ranking.category.name} · {ranking.lastReviewedAt ? "Reviewed " : "Published "}
                          {shortMonthYear(ranking.lastReviewedAt ?? ranking.publishedAt)}
                        </span>
                      </span>
                      <span
                        data-arrow=""
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--gray-400)",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M7 17 17 7" />
                          <path d="M7 7h10v10" />
                        </svg>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------- guides */}
        {guides.length > 0 ? (
          <section aria-labelledby="guides-h2" style={{ background: "var(--paper)" }}>
            <div data-shell="" data-sec="" style={{ padding: "34px var(--gutter) 18px" }}>
              <div data-reveal="" style={HEAD_ROW}>
                <div style={{ maxWidth: "660px" }}>
                  <Eyebrow>Know What to Ask</Eyebrow>
                  <h2 id="guides-h2" data-h2="" style={{ ...H2, textWrap: "balance", maxWidth: "640px" }}>
                    {accentTail("Hiring Guides for Homeowners", 2)}
                  </h2>
                  <p style={{ ...LEDE, marginTop: "12px" }}>
                    Short, practical reads: how to line up three quotes, what a license does and does not
                    cover, and what a fair price looks like in your market this year.
                  </p>
                </div>
                <HeadLink href={routes.guidesIndex()}>All guides</HeadLink>
              </div>
              <ul
                data-rail=""
                data-stagger=""
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
              >
                {guides.map((guide) => (
                  <li
                    key={guide.id}
                    data-card=""
                    style={{
                      width: "min(70vw, 260px)",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "20px",
                      overflow: "hidden",
                    }}
                  >
                    <Link
                      href={routes.guide(guide.slug)}
                      style={{ display: "flex", flexDirection: "column", alignItems: "stretch", height: "100%", color: "inherit" }}
                    >
                      <span
                        style={{
                          position: "relative",
                          display: "block",
                          height: "150px",
                          background: guide.heroImage ? "var(--surface-sunken)" : "var(--gold-soft)",
                          overflow: "hidden",
                        }}
                      >
                        <Media src={guide.heroImage} tone="dark" alt={guide.title} sizes="(max-width: 760px) 70vw, 260px" />
                        {guide.heroImage ? null : (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 240 170"
                            width="150"
                            height="106"
                            style={{
                              position: "absolute",
                              right: "-10px",
                              bottom: "-14px",
                              pointerEvents: "none",
                            }}
                          >
                            <path
                              d="M18 40 L52 16 L52 158"
                              fill="none"
                              stroke="rgba(138,95,11,0.22)"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M150 16 C 196 16, 226 46, 226 87 C 226 128, 196 158, 150 158 C 104 158, 74 128, 74 87 C 74 46, 104 16, 150 16 Z"
                              fill="none"
                              stroke="rgba(138,95,11,0.22)"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", flex: "1", padding: "16px 18px 18px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignSelf: "flex-start",
                            alignItems: "center",
                            height: "24px",
                            padding: "0 9px",
                            borderRadius: "999px",
                            background: "var(--gold-soft)",
                            fontSize: "10.5px",
                            fontWeight: "700",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--gold)",
                            marginBottom: "10px",
                          }}
                        >
                          {guide.category?.name ?? "Guide"} · {guide.readingMinutes} min read
                        </span>
                        <h3
                          style={{
                            fontSize: "17px",
                            lineHeight: "1.28",
                            fontWeight: "700",
                            letterSpacing: "-0.02em",
                            marginBottom: "12px",
                            textWrap: "pretty",
                          }}
                        >
                          {guide.title}
                        </h3>
                        <span style={{ display: "block", marginTop: "auto", fontSize: "12.5px", color: "var(--text-muted)" }}>
                          {guide.author ? `${guide.author.name} · ` : ""}
                          Updated {shortMonthYear(guide.reviewedAt ?? guide.publishedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------------ eeat */}
        <section
          aria-labelledby="eeat-h2"
          style={{
            position: "relative",
            overflow: "hidden",
            background: "var(--ink)",
            color: "var(--text-on-ink)",
            marginTop: "26px",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              background:
                "radial-gradient(700px 420px at 0% 110%, rgba(45,116,215,0.32), transparent 62%), radial-gradient(500px 300px at 100% 0%, rgba(231,184,99,0.1), transparent 62%)",
              pointerEvents: "none",
            }}
          />
          <div data-shell="" data-sec="" style={{ position: "relative", padding: "48px var(--gutter) 48px" }}>
            <div
              data-eeat-grid=""
              style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "28px" }}
            >
              <div data-reveal="" data-sticky="">
                <Eyebrow tone="ink">Who Is Behind This</Eyebrow>
                <h2
                  id="eeat-h2"
                  data-h2=""
                  data-ls="40"
                  style={{
                    fontSize: "30px",
                    fontWeight: "800",
                    letterSpacing: "-0.04em",
                    lineHeight: "1.02",
                    color: "#fff",
                    marginBottom: "14px",
                    textWrap: "balance",
                  }}
                >
                  Our Editorial Standards:{" "}
                  <span className="serif-accent" style={{ color: "var(--gold-ink)" }}>
                    Who Checks the Lists
                  </span>
                </h2>
                <p
                  style={{
                    fontSize: "16px",
                    lineHeight: "1.6",
                    color: "rgba(232,237,245,0.76)",
                    textWrap: "pretty",
                    maxWidth: "460px",
                  }}
                >
                  You should be able to see who wrote a list, what they checked, how the site makes money and
                  what happens when we get something wrong. All four are one click away on every page.
                </p>
              </div>
              <div style={{ display: "grid", gap: "30px", minWidth: "0" }}>
                {people.length > 0 ? (
                  <div data-reveal="">
                    <p
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "rgba(232,237,245,0.6)",
                        marginBottom: "12px",
                      }}
                    >
                      The editors
                      <Link
                        data-link=""
                        href={routes.editorialTeam()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          letterSpacing: "0",
                          textTransform: "none",
                          fontSize: "13.5px",
                          fontWeight: "600",
                          color: "var(--gold-ink)",
                          minHeight: "44px",
                        }}
                      >
                        Full team
                        <Arrow size={16} width={2.2} />
                      </Link>
                    </p>
                    <ul data-stagger="" style={{ display: "grid", gap: "10px" }}>
                      {people.map((person) => {
                        const beat = parseList(person.specializations).slice(0, 3).join(" · ");
                        return (
                          <li key={person.id}>
                            <Link
                              data-row=""
                              data-row-dark=""
                              href={routes.expert(person.slug)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                                padding: "14px 16px",
                                borderRadius: "20px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#fff",
                                transition: "background 200ms ease, border-color 200ms ease",
                              }}
                            >
                              <span
                                data-avatar=""
                                style={{
                                  position: "relative",
                                  flexShrink: 0,
                                  width: "60px",
                                  height: "60px",
                                  borderRadius: "50%",
                                  padding: "2px",
                                  background:
                                    "conic-gradient(var(--gold-ink), rgba(231,184,99,0.2), var(--gold-ink))",
                                }}
                              >
                                <span
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    background: "var(--ink-2)",
                                    border: "2px solid var(--ink)",
                                    color: "var(--gold-ink)",
                                    fontSize: "17px",
                                    fontWeight: "700",
                                    letterSpacing: "0.01em",
                                  }}
                                >
                                  {person.portrait ? (
                                    <Media src={person.portrait} alt={person.name} tone="dark" sizes="60px" />
                                  ) : (
                                    <span aria-hidden="true">{initials(person.name)}</span>
                                  )}
                                </span>
                              </span>
                              <span style={{ flex: "1", minWidth: "0" }}>
                                <h3
                                  style={{
                                    fontSize: "17px",
                                    fontWeight: "700",
                                    letterSpacing: "-0.018em",
                                    color: "#fff",
                                  }}
                                >
                                  {person.name}
                                </h3>
                                <span
                                  style={{
                                    display: "block",
                                    marginTop: "2px",
                                    fontSize: "13px",
                                    lineHeight: "1.4",
                                    color: "rgba(232,237,245,0.7)",
                                  }}
                                >
                                  {person.role}
                                </span>
                                {beat ? (
                                  <span
                                    style={{
                                      display: "block",
                                      marginTop: "6px",
                                      fontSize: "11px",
                                      fontWeight: "700",
                                      letterSpacing: "0.06em",
                                      textTransform: "uppercase",
                                      color: "var(--gold-ink)",
                                    }}
                                  >
                                    {beat}
                                  </span>
                                ) : null}
                              </span>
                              <svg
                                data-arrow=""
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="rgba(255,255,255,0.55)"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                                style={{ flexShrink: 0 }}
                              >
                                <path d="M7 17 17 7" />
                                <path d="M7 7h10v10" />
                              </svg>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                <div data-reveal="">
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(232,237,245,0.6)",
                      marginBottom: "12px",
                    }}
                  >
                    How we stay accountable
                  </p>
                  <ul
                    data-two=""
                    data-stagger=""
                    style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}
                  >
                    {EEAT.map((item) => (
                      <li key={item.title}>
                        <Link
                          data-row=""
                          data-row-dark=""
                          href={item.href}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "stretch",
                            gap: "14px",
                            height: "100%",
                            padding: "20px",
                            borderRadius: "20px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#fff",
                            transition: "background 200ms ease, border-color 200ms ease",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span
                              data-eico=""
                              aria-hidden="true"
                              style={{
                                position: "relative",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "46px",
                                height: "46px",
                                borderRadius: "14px",
                                background: "rgba(231,184,99,0.12)",
                                color: "var(--gold-ink)",
                                overflow: "hidden",
                              }}
                            >
                              <span
                                data-duo=""
                                style={{
                                  position: "absolute",
                                  right: "7px",
                                  top: "7px",
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "50%",
                                  background: "var(--gold-ink)",
                                  opacity: 0.3,
                                }}
                              />
                              <svg
                                data-ico=""
                                width="21"
                                height="21"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ position: "relative" }}
                              >
                                <path pathLength="1" d={ICON_PATHS[item.icon]} />
                              </svg>
                            </span>
                            <svg
                              data-arrow=""
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="rgba(255,255,255,0.5)"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M7 17 17 7" />
                              <path d="M7 7h10v10" />
                            </svg>
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", flex: "1" }}>
                            <h3 style={{ fontSize: "17px", fontWeight: "700", letterSpacing: "-0.018em", color: "#fff" }}>
                              {item.title}
                            </h3>
                            <span
                              style={{
                                display: "block",
                                marginTop: "4px",
                                fontSize: "13.5px",
                                lineHeight: "1.5",
                                color: "rgba(232,237,245,0.7)",
                              }}
                            >
                              {item.text}
                            </span>
                            <span
                              style={{
                                display: "block",
                                marginTop: "auto",
                                paddingTop: "12px",
                                fontSize: "13px",
                                fontWeight: "700",
                                color: "var(--gold-ink)",
                              }}
                            >
                              {item.cta}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- faq */}
        {faqs.length > 0 ? (
          <section aria-labelledby="faq-h2" style={{ background: "var(--surface-card)" }}>
            <div data-shell="" data-sec="" style={{ padding: "40px var(--gutter) 30px" }}>
              <div
                data-eeat-grid=""
                style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "20px" }}
              >
                <div data-reveal="">
                  <Eyebrow>FAQ</Eyebrow>
                  <h2 id="faq-h2" data-h2="" style={{ ...H2, marginBottom: "14px" }}>
                    Frequently Asked <Accent>Questions</Accent>
                  </h2>
                  <p style={{ ...LEDE, marginBottom: "10px", maxWidth: "460px" }}>
                    Straight answers about how the lists are built and what they cost, which is nothing.
                  </p>
                  <Link
                    data-link=""
                    href={routes.contact()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      minHeight: "44px",
                      fontSize: "15px",
                      fontWeight: "600",
                      color: "var(--color-primary)",
                    }}
                  >
                    Ask something else
                    <Arrow size={16} width={2} />
                  </Link>
                </div>
                <div data-reveal="" style={{ borderTop: "2px solid var(--ink)" }}>
                  {faqs.map((faq) => (
                    <details key={faq.id} data-faq="" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <summary
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                          minHeight: "64px",
                          padding: "16px 2px",
                          fontSize: "16px",
                          fontWeight: "600",
                          letterSpacing: "-0.012em",
                          lineHeight: "1.35",
                          color: "var(--text-primary)",
                        }}
                      >
                        <span>{faq.question}</span>
                        <span
                          data-fq-ico=""
                          aria-hidden="true"
                          style={{
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            border: "1px solid var(--border-strong)",
                            color: "var(--ink)",
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          >
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                          </svg>
                        </span>
                      </summary>
                      <div style={{ padding: "0 50px 20px 2px" }}>
                        <p
                          style={{
                            fontSize: "15px",
                            lineHeight: "1.65",
                            color: "var(--text-secondary)",
                            textWrap: "pretty",
                          }}
                        >
                          {faq.answer}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* -------------------------------------------------- for businesses */}
        <section
          aria-labelledby="biz-h2"
          style={{ background: "var(--paper)", borderTop: "1px solid var(--border-subtle)" }}
        >
          <div data-shell="" data-sec="" style={{ padding: "34px var(--gutter) 40px" }}>
            <div data-biz="" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "12px" }}>
              <div
                data-reveal=""
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "26px",
                  padding: "28px 22px 24px",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: "-40px",
                    top: "-40px",
                    width: "200px",
                    height: "200px",
                    borderRadius: "50%",
                    background: "radial-gradient(closest-side, rgba(231,184,99,0.25), transparent)",
                    pointerEvents: "none",
                  }}
                />
                <div style={{ position: "relative" }}>
                  <Eyebrow mb="10px">For Businesses</Eyebrow>
                </div>
                <h2
                  id="biz-h2"
                  data-h2=""
                  style={{
                    position: "relative",
                    fontSize: "26px",
                    lineHeight: "1.05",
                    fontWeight: "800",
                    letterSpacing: "-0.035em",
                    marginBottom: "12px",
                    textWrap: "balance",
                  }}
                >
                  Homeowners Are Already Comparing You. <Accent>Make Sure the Facts Are Right.</Accent>
                </h2>
                <p
                  style={{
                    position: "relative",
                    fontSize: "15.5px",
                    lineHeight: "1.6",
                    color: "var(--text-secondary)",
                    marginBottom: "22px",
                    textWrap: "pretty",
                  }}
                >
                  Claim your profile and keep your license, hours, service area and photos current. Or take a
                  labelled featured slot on the ranking page for your city and trade.
                </p>
                <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <Link
                    data-btn=""
                    data-btn-dark=""
                    href={routes.claim()}
                    style={{
                      flex: "1 1 200px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      height: "52px",
                      borderRadius: "14px",
                      background: "var(--ink)",
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: "700",
                    }}
                  >
                    Claim Your Profile
                    <Arrow size={16} width={2.2} stroke="var(--gold-ink)" />
                  </Link>
                  <Link
                    data-press=""
                    href={routes.forBusinesses()}
                    style={{
                      flex: "1 1 200px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "52px",
                      borderRadius: "14px",
                      border: "1.5px solid var(--border-strong)",
                      background: "var(--surface-card)",
                      color: "var(--ink)",
                      fontSize: "16px",
                      fontWeight: "700",
                    }}
                  >
                    See Business Plans
                  </Link>
                </div>
                <p
                  style={{
                    position: "relative",
                    marginTop: "18px",
                    paddingTop: "16px",
                    borderTop: "1px dashed var(--border-subtle)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 7px",
                      borderRadius: "6px",
                      background: "var(--ink)",
                      color: "var(--gold-ink)",
                      fontSize: "10px",
                      fontWeight: "800",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Featured
                  </span>
                  A subscription buys visibility and a managed profile. It cannot buy, move or protect a
                  ranked position.
                </p>
              </div>
              <ul data-stagger="" style={{ display: "grid", gap: "10px", alignContent: "stretch" }}>
                {BIZ_POINTS.map((point) => (
                  <li
                    key={point.title}
                    data-card=""
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "16px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "20px",
                      padding: "20px",
                    }}
                  >
                    <span
                      data-eico=""
                      aria-hidden="true"
                      style={{
                        position: "relative",
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "48px",
                        height: "48px",
                        borderRadius: "15px",
                        background: "var(--ink)",
                        color: "var(--gold-ink)",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        data-duo=""
                        style={{
                          position: "absolute",
                          right: "7px",
                          top: "7px",
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          background: "var(--gold-ink)",
                          opacity: 0.3,
                        }}
                      />
                      <svg
                        data-ico=""
                        width="21"
                        height="21"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ position: "relative" }}
                      >
                        <path pathLength="1" d={ICON_PATHS[point.icon]} />
                      </svg>
                    </span>
                    <span style={{ display: "block", minWidth: "0" }}>
                      <h3 style={{ fontSize: "16.5px", fontWeight: "700", letterSpacing: "-0.018em", marginBottom: "4px" }}>
                        {point.title}
                      </h3>
                      <p style={{ fontSize: "14px", lineHeight: "1.55", color: "var(--text-secondary)" }}>
                        {point.text}
                      </p>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ final call */}
        <section
          aria-labelledby="final-h2"
          style={{ position: "relative", overflow: "hidden", background: "var(--ink)" }}
        >
          <div
            data-blob-a=""
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              bottom: "-60%",
              width: "900px",
              height: "600px",
              marginLeft: "-450px",
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(45,116,215,0.5), transparent)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              WebkitMaskImage: "radial-gradient(600px 400px at 50% 50%, #000, transparent)",
              maskImage: "radial-gradient(600px 400px at 50% 50%, #000, transparent)",
              pointerEvents: "none",
            }}
          />
          <div
            data-shell=""
            data-final=""
            data-reveal=""
            style={{ position: "relative", padding: "52px var(--gutter) 56px", textAlign: "center", maxWidth: "820px" }}
          >
            <p
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "11.5px",
                fontWeight: "700",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--gold-ink)",
                marginBottom: "14px",
              }}
            >
              <span aria-hidden="true" style={{ width: "22px", height: "2px", background: "var(--gold-ink)" }} />
              Forty Tabs or One Short List
              <span aria-hidden="true" style={{ width: "22px", height: "2px", background: "var(--gold-ink)" }} />
            </p>
            <h2
              id="final-h2"
              data-ls="45"
              style={{
                fontSize: "clamp(34px, 8vw, 68px)",
                lineHeight: "0.98",
                fontWeight: "800",
                letterSpacing: "-0.045em",
                color: "#fff",
                marginBottom: "14px",
                textWrap: "balance",
              }}
            >
              Tell Us the Job and{" "}
              <span className="serif-accent" style={{ color: "var(--gold-ink)" }}>
                the City
              </span>
            </h2>
            <p
              style={{
                fontSize: "16px",
                lineHeight: "1.6",
                color: "rgba(232,237,245,0.74)",
                margin: "0 auto 28px",
                maxWidth: "520px",
              }}
            >
              We will hand you the companies worth a phone call, with the reasons next to each name.
            </p>
            <div data-searchbox="">
              <form
                data-searchform=""
                action={routes.search()}
                method="get"
                role="search"
                aria-label="Find local businesses"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--surface-card)",
                  borderRadius: "22px",
                  boxShadow: "0 40px 80px -20px rgba(0,0,0,0.55)",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                <div style={{ ...SEARCH_ROW, borderBottom: "1px solid var(--border-subtle)", flex: "1.15" }}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--gray-400)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.34-4.34" />
                  </svg>
                  <label htmlFor="svc2" style={SR_ONLY}>
                    Service
                  </label>
                  <input id="svc2" name="service" type="text" placeholder="What needs doing?" style={FIELD} />
                </div>
                <div
                  data-divider=""
                  aria-hidden="true"
                  style={{
                    display: "none",
                    width: "1px",
                    alignSelf: "stretch",
                    background: "var(--border-subtle)",
                    margin: "10px 0",
                  }}
                />
                <div style={{ ...SEARCH_ROW, flex: "1" }}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--gray-400)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <label htmlFor="loc2" style={SR_ONLY}>
                    City or postal code
                  </label>
                  <input id="loc2" name="location" type="text" placeholder="City or postal code" style={FIELD} />
                </div>
                <button
                  data-btn=""
                  type="submit"
                  style={{
                    width: "100%",
                    height: "54px",
                    marginTop: "6px",
                    padding: "0 22px 0 26px",
                    border: "0",
                    borderRadius: "16px",
                    background: "var(--gold-ink)",
                    color: "var(--ink)",
                    fontSize: "16px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Show Me the List
                  <Arrow size={17} width={2.4} />
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </SiteChrome>
  );
}

/* ------------------------------------------------------ small helpers */

function SuggestColumn({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontSize: "11px",
          fontWeight: "700",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "8px",
        }}
      >
        {label}
      </p>
      <ul>{children}</ul>
    </div>
  );
}

function SuggestLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} style={{ display: "block", padding: "6px 0", fontSize: "15px", color: "var(--text-primary)" }}>
        {children}
      </Link>
    </li>
  );
}
