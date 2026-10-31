import type { Metadata } from "next";
import { withSocial } from "@/lib/static-meta";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SiteChrome } from "@/components/site/SiteChrome";
import { CountUp, InView } from "@/components/site/InView";
import { CityMap, type MapCountry } from "@/components/site/home/CityMap";
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

/** The approved home page questions. The visible list and the FAQPage schema both read this. */
const HOME_FAQS = [
  {
    question: "How are companies chosen for a list?",
    answer:
      "Companies are chosen against published criteria. Editors check licence numbers against the issuing register where one exists, read recent reviews, look at how long a company has been in business, and check every list before it is published.",
  },
  {
    question: "How many companies are on each list?",
    answer: "Up to ten. A list shows fewer when fewer companies meet its criteria, and the title states the number.",
  },
  {
    question: "Do companies pay to be listed or to move up?",
    answer:
      "Some companies buy a sponsored placement, and we label it. A sponsored placement never changes where a company ranks.",
  },
  {
    question: "How current are the rankings?",
    answer: "Each ranking shows the date it was last reviewed. Check that date before you choose a company.",
  },
  {
    question: "Who writes the rankings?",
    answer: "Named editors write and review each ranking. Their names appear on the list they worked on.",
  },
  {
    question: "How do I report a mistake or ask for a correction?",
    answer:
      "Email hello@tenbestfind.com. Our corrections page explains how we check a claim and update a list.",
  },
];

/** Cities named on the home page. Add new cities here as they publish. */
const HOME_CITIES = [
  { name: "Austin, TX", href: "/us/tx/austin/" },
  { name: "Chicago, IL", href: "/us/il/chicago/" },
  { name: "Dallas, TX", href: "/us/tx/dallas/" },
  { name: "Houston, TX", href: "/us/tx/houston/" },
  { name: "Los Angeles, CA", href: "/us/ca/los-angeles/" },
  { name: "Montreal, QC", href: "/ca/qc/montreal/" },
  { name: "New York, NY", href: "/us/ny/new-york/" },
  { name: "San Diego, CA", href: "/us/ca/san-diego/" },
  { name: "Toronto, ON", href: "/ca/on/toronto/" },
];

/** "October 31, 2026". */
function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}


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
    text: "Anyone can report an error. The corrections page explains how we check a claim and update a list.",
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
  // The most recent review date of any published list.
  const lastUpdated = rankings[0]?.lastReviewedAt ?? rankings[0]?.publishedAt ?? null;

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
      {HOME_FAQS.length > 0 ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: HOME_FAQS.map((faq) => ({
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
                  TenBestFind ranks home service companies one city and one trade at a time. Each list names
                up to ten companies, and the title always shows the number. Our editors check licence
                numbers against the issuing register where one exists, read recent Google reviews,
                including the complaints, and look at how long each company has been in business. Every
                ranking states its criteria and shows when it was last reviewed. Payment never changes a
                company&apos;s position.
              </p>
              {lastUpdated ? (
                <p style={{ marginTop: "10px", fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>
                  Last updated <time dateTime={lastUpdated.toISOString()}>{formatDay(lastUpdated)}</time>
                </p>
              ) : null}
              

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
                      <p
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
                      </p>
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
                  Cities we <Accent>cover</Accent>
                </h2>
                <p style={{ ...LEDE, marginTop: "12px" }}>
                  Our lists cover cities across the US and Canada. Current examples:
                </p>
              </div>
              <HeadLink href={routes.locationsIndex()} size={16}>
                Every city
              </HeadLink>
            </div>
            <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "18px" }}>
              {HOME_CITIES.map((city) => (
                <li key={city.href}>
                  <Link
                    data-chip=""
                    href={city.href}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: "40px",
                      padding: "0 16px",
                      borderRadius: "999px",
                      background: "var(--paper)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "15px",
                      fontWeight: "600",
                      color: "var(--ink)",
                    }}
                  >
                    {city.name}
                  </Link>
                </li>
              ))}
            </ul>
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
                  Pick a <Accent>trade</Accent>
                </h2>
                <p style={{ ...LEDE, marginTop: "12px" }}>
                  We rank plumbers, HVAC companies, roofers, electricians, locksmiths and remodeling
                  contractors. Open the trade you need in your city, then compare the companies on that list.
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

        {/* --------------------------------------------------- how we rank */}
        <section aria-labelledby="how-h2" style={{ position: "relative", background: "var(--paper)" }}>
          <div data-shell="" data-sec="" style={{ padding: "44px var(--gutter) 24px" }}>
            <div data-reveal="" style={{ maxWidth: "720px" }}>
              <Eyebrow>How We Rank</Eyebrow>
              <h2 id="how-h2" data-h2="" style={{ ...H2, marginBottom: "10px", textWrap: "balance" }}>
                How the lists are <Accent>built</Accent>
              </h2>
              <p style={{ ...LEDE, marginBottom: "12px" }}>
                Each list follows published criteria. Where a licence register exists, we check the licence
                number against it. We read recent Google reviews, including the critical ones, and we look at
                how long a company has been in business. An editor checks every list before it is published.
              </p>
            </div>
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
                  Who checks the{" "}
                  <span className="serif-accent" style={{ color: "var(--gold-ink)" }}>
                    lists
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
                  Our named editors, including Marcus Reed, Dana Whitfield and Priya Nathan, write and review the
                  rankings. Each ranking shows its editor and the date it was last reviewed.
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
        {HOME_FAQS.length > 0 ? (
          <section aria-labelledby="faq-h2" style={{ background: "var(--surface-card)" }}>
            <div data-shell="" data-sec="" style={{ padding: "40px var(--gutter) 30px" }}>
              <div
                data-eeat-grid=""
                style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "20px" }}
              >
                <div data-reveal="">
                  <Eyebrow>FAQ</Eyebrow>
                  <h2 id="faq-h2" data-h2="" style={{ ...H2, marginBottom: "14px" }}>
                    Questions people <Accent>ask</Accent>
                  </h2>
                  <p style={{ ...LEDE, marginBottom: "10px", maxWidth: "460px" }}>
                    How the lists are built, how many companies they name, and how to report a mistake.
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
                  {HOME_FAQS.map((faq) => (
                    <details key={faq.question} data-faq="" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
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
              Hiring This Week
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
              Need a company{" "}
              <span className="serif-accent" style={{ color: "var(--gold-ink)" }}>
                this week?
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
              Open the ranking for your city and trade, then call at least two companies on it. Ask for a
              written quote and check the licence before any work starts.
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
                  For <Accent>businesses</Accent>
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
                  If you run one of the companies we rank, check your profile. If something is wrong, tell us,
                  and we will show you how we verified the detail.
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
