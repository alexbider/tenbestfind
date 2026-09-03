import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/site/SiteChrome";
import { CountUp, InView } from "@/components/site/InView";
import { JsonLd, Media } from "@/components/ui/primitives";
import { ICON_PATHS, type IconName } from "@/lib/icon-paths";
import { shortMonthYear } from "@/lib/format";
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
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

export const metadata: Metadata = {
  title: "TenBestFind — the ten best local businesses, researched",
  description:
    "We research local service companies one city at a time, then publish a short list of the ones worth calling. Independent research, never paid placement.",
  alternates: { canonical: "/" },
};

/* ------------------------------------------------------------ fragments */

/** The gold rule and small caps that open every section. */
function Eyebrow({ children, tone = "ink" }: { children: string; tone?: "ink" | "gold" }) {
  return (
    <p
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "12.5px",
        fontWeight: "700",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: tone === "gold" ? "var(--gold-ink)" : "var(--ink)",
        marginBottom: "16px",
      }}
    >
      <span
        aria-hidden="true"
        style={{ display: "inline-block", width: "28px", height: "2px", background: "var(--gold-ink)" }}
      />
      {children}
    </p>
  );
}

function Arrow({ size = 16, width = 2 }: { size?: number; width?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** The outlined "10" that drifts behind the hero and the dark band. */
function TenMark({
  variant,
}: {
  variant: "hero" | "big";
}) {
  const hero = variant === "hero";
  const stroke = hero ? "rgba(16,31,61,0.22)" : "rgba(255,255,255,0.14)";
  return (
    <>
      <path
        pathLength={1}
        d="M18 40 L52 16 L52 158"
        fill="none"
        stroke={stroke}
        strokeWidth={hero ? 3 : 1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        pathLength={1}
        d="M150 16 C 196 16, 226 46, 226 87 C 226 128, 196 158, 150 158 C 104 158, 74 128, 74 87 C 74 46, 104 16, 150 16 Z"
        fill="none"
        stroke={stroke}
        strokeWidth={hero ? 3 : 1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {hero ? <circle cx="226" cy="30" r="5" fill="var(--gold-ink)" /> : null}
    </>
  );
}

const SECTION_PAD = { maxWidth: "var(--shell)", margin: "0 auto", padding: "104px var(--gutter)" };

const HEAD_ROW = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "24px",
  flexWrap: "wrap" as const,
  marginBottom: "44px",
};

const H2 = {
  fontSize: "clamp(32px, 3.6vw, 48px)",
  lineHeight: "1.04",
  fontWeight: "800",
  letterSpacing: "-0.035em",
};

const LEAD = { marginTop: "16px", fontSize: "17px", lineHeight: "1.65", color: "var(--text-secondary)" };

const FIELD = {
  width: "100%",
  border: "0",
  outline: "none",
  height: "54px",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  color: "var(--text-primary)",
  background: "transparent",
};

const SR_ONLY = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
};

const CHIP = {
  padding: "8px 15px",
  borderRadius: "999px",
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  fontSize: "14px",
  fontWeight: "600",
  color: "var(--ink)",
};

const AVATAR = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  background: "var(--blue-50)",
  color: "var(--blue-800)",
  fontSize: "11px",
  fontWeight: "700",
};

/** Two initials for the small round author mark. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

const STEPS = [
  {
    n: "01",
    title: "Research",
    body: "We list every company that genuinely works the area, then pull licence records, insurance status, years in business and the public complaint history for each one.",
  },
  {
    n: "02",
    title: "Evaluate",
    body: "Companies are compared on what decides a job: who is licensed for that exact work, who answers after hours, who puts warranty terms in writing before the deposit.",
  },
  {
    n: "03",
    title: "Publish and Re-check",
    body: "Ten names go live with the criteria, the sources and the review date. If we could not verify something we say so. Every list is re-checked inside 90 days.",
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
    text: "Services, licence, insurance, coverage area and contact details on one page a homeowner can trust.",
  },
  {
    icon: "chart" as IconName,
    title: "See Every Call and Click",
    text: "Your dashboard shows profile views, phone reveals, website clicks and quote requests, by day.",
  },
];

/* ----------------------------------------------------------- the page */

export default async function HomePage() {
  const [categories, trending, rankings, countries, guides, faqs, usCities, caCities, hero, counts] =
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
    ]);

  // The hero card takes the freshest list, so the four that follow are the
  // next ones down rather than the same page twice.
  const heroPath = hero ? rankingUrl(hero) : routes.rankingsIndex();
  const rest = rankings.filter((entry) => entry.id !== hero?.id);
  const [leadRanking, ...sideAll] = rest;
  const sideRankings = sideAll.slice(0, 3);
  const latest = rest.slice(0, 6);
  const [leadGuide, ...sideGuides] = guides;

  const ledger = [
    { value: counts.cities, suffix: "", label: "Cities with published rankings", pad: "0" },
    { value: counts.categories, suffix: "", label: "Trades, each with its own criteria", pad: "24px" },
    { value: counts.businesses, suffix: "", label: "Companies checked against licence registers", pad: "24px" },
    { value: 90, suffix: " days", label: "Maximum time between re-checks", pad: "24px" },
  ];

  // The five the design names, in its order, since they are the trades most
  // people arrive looking for. Any that is not a published category here is
  // simply left out rather than linking nowhere.
  const CHIP_SLUGS = ["plumbers", "hvac", "roofing", "electricians", "moving-companies"];
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const chips = CHIP_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (category): category is (typeof categories)[number] => Boolean(category),
  );

  return (
    <SiteChrome active="none">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "TenBestFind",
          url: absoluteUrl("/"),
          description:
            "Independent research into local service companies, published one city and one trade at a time.",
        }}
      />
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

      <div className="home-2026">
        {/* ------------------------------------------------------------ hero */}
        <section
          aria-labelledby="hero-h1"
          style={{
            position: "relative",
            overflow: "hidden",
            background: "var(--paper)",
            backgroundImage:
              "linear-gradient(rgba(16,31,61,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(16,31,61,0.045) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            backgroundPosition: "center top",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              background:
                "radial-gradient(1100px 520px at 70% -20%, rgba(45,116,215,0.14), transparent 62%), linear-gradient(180deg, rgba(247,249,252,0) 0%, rgba(247,249,252,0) 55%, var(--paper) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            data-split=""
            style={{
              position: "relative",
              maxWidth: "var(--shell)",
              margin: "0 auto",
              padding: "84px var(--gutter) 72px",
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: "64px",
              alignItems: "center",
            }}
          >
            <div>
              <p
                data-hero-in="1"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                  marginBottom: "26px",
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
                data-hero-in="2"
                style={{
                  fontSize: "clamp(44px, 5.8vw, 76px)",
                  lineHeight: "0.98",
                  fontWeight: "800",
                  letterSpacing: "-0.04em",
                  color: "var(--ink)",
                  textWrap: "balance",
                }}
              >
                Find the 10 Best Local Service Companies in Your City
              </h1>
              <p
                data-hero-in="3"
                style={{
                  marginTop: "26px",
                  fontSize: "19px",
                  lineHeight: "1.6",
                  color: "var(--text-secondary)",
                  maxWidth: "560px",
                  textWrap: "pretty",
                }}
              >
                Most &quot;best of&quot; pages are ads with a headline. Ours are written by editors who
                pull licence records, read the complaints and phone the shops. One city, one trade,
                ten names you can actually call.
              </p>

              <div data-searchbox="" data-hero-in="4" style={{ position: "relative", marginTop: "36px" }}>
                <form
                  data-searchform=""
                  action={routes.search()}
                  method="get"
                  role="search"
                  aria-label="Find local businesses"
                  data-stack=""
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    boxShadow: "0 24px 60px -24px rgba(16,31,61,0.35)",
                    padding: "8px",
                  }}
                >
                  <div style={{ flex: "1.15", display: "flex", alignItems: "center", gap: "10px", padding: "0 14px" }}>
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
                    style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "10px 0" }}
                  />
                  <div style={{ flex: "1", display: "flex", alignItems: "center", gap: "10px", padding: "0 14px" }}>
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
                    data-btn-primary=""
                    type="submit"
                    style={{
                      height: "54px",
                      padding: "0 26px",
                      border: "0",
                      borderRadius: "12px",
                      background: "var(--ink)",
                      color: "#fff",
                      fontFamily: "var(--font-sans)",
                      fontSize: "16px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Show Me the Ten
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
                        {ranking.title}
                      </SuggestLink>
                    ))}
                  </SuggestColumn>
                </div>
              </div>

              <div
                data-hero-in="5"
                style={{ marginTop: "24px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}
              >
                <span
                  style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-muted)", marginRight: "4px" }}
                >
                  Try
                </span>
                {chips.map((category) => (
                  <Link key={category.id} data-chip="" href={routes.category(category.slug)} style={CHIP}>
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>

            {hero ? (
              <div data-hero-aside="" style={{ position: "relative", padding: "26px 0 0 26px" }}>
                <svg
                  data-ten-outline=""
                  aria-hidden="true"
                  viewBox="0 0 240 170"
                  width="250"
                  height="176"
                  style={{ position: "absolute", top: "-10px", left: "-6px", overflow: "visible", pointerEvents: "none" }}
                >
                  <TenMark variant="hero" />
                </svg>
                <aside
                  data-hero-card=""
                  aria-labelledby="hero-preview-h2"
                  style={{
                    position: "relative",
                    background: "var(--ink)",
                    color: "#fff",
                    borderRadius: "24px",
                    boxShadow: "0 40px 90px -30px rgba(16,31,61,0.6)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    data-thumb=""
                    style={{ position: "relative", height: "176px", background: "#1B2D55", overflow: "hidden" }}
                  >
                    <Media src={hero.city?.heroImage} alt="" />
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "0",
                        background: "linear-gradient(180deg, rgba(16,31,61,0) 40%, var(--ink) 100%)",
                        pointerEvents: "none",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: "14px",
                        left: "14px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                        padding: "6px 11px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.14)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#fff",
                        pointerEvents: "none",
                      }}
                    >
                      <span
                        data-live-dot=""
                        style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold-ink)" }}
                      />
                      Live ranking
                    </span>
                  </div>
                  <div style={{ padding: "4px 26px 26px" }}>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--gold-ink)",
                        marginBottom: "8px",
                      }}
                    >
                      {hero.category.serviceName}
                      {hero.city ? ` · ${hero.city.name}, ${hero.city.region.code.toUpperCase()}` : ""}
                    </p>
                    <h2
                      id="hero-preview-h2"
                      style={{
                        fontSize: "24px",
                        lineHeight: "1.2",
                        fontWeight: "700",
                        letterSpacing: "-0.025em",
                        color: "#fff",
                        marginBottom: "18px",
                      }}
                    >
                      <Link href={heroPath} style={{ color: "#fff" }}>
                        {hero.title}
                      </Link>
                    </h2>
                    <ol style={{ display: "grid", gap: "0" }}>
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
                            data-hero-row=""
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "14px",
                              padding: "11px 0",
                              borderTop: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            <span
                              style={{
                                width: "26px",
                                fontSize: "13px",
                                fontWeight: "800",
                                color: "var(--gold-ink)",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {String(entry.position).padStart(2, "0")}
                            </span>
                            <span style={{ flex: "1", minWidth: "0" }}>
                              <span style={{ display: "block", fontSize: "15px", fontWeight: "600", color: "#fff" }}>
                                {entry.business.name}
                              </span>
                              <span
                                style={{ display: "block", fontSize: "12.5px", color: "rgba(232,237,245,0.62)" }}
                              >
                                {meta || entry.designation}
                              </span>
                            </span>
                            {badge ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  fontSize: "11.5px",
                                  fontWeight: "700",
                                  color: "#7BDCB0",
                                }}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                                {badge}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                    <div
                      style={{
                        marginTop: "8px",
                        paddingTop: "16px",
                        borderTop: "1px solid rgba(255,255,255,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <span style={{ fontSize: "12.5px", color: "rgba(232,237,245,0.62)" }}>
                        Reviewed {shortMonthYear(hero.lastReviewedAt ?? hero.publishedAt)}
                        {hero.author ? ` · ${hero.author.name}` : ""}
                      </span>
                      <Link className="arrow-link" href={heroPath} style={{ fontSize: "14px", color: "var(--gold-ink)" }}>
                        See all ten
                        <Arrow size={15} width={2.2} />
                      </Link>
                    </div>
                  </div>
                </aside>
              </div>
            ) : null}
          </div>

          <div
            style={{
              position: "relative",
              borderTop: "1px solid var(--border-subtle)",
              background: "var(--surface-card)",
            }}
          >
            <InView
              as="ul"
              data-ledger=""
              style={{
                maxWidth: "var(--shell)",
                margin: "0 auto",
                padding: "0 var(--gutter)",
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              }}
            >
              {ledger.map((row) => (
                <li
                  key={row.label}
                  style={{
                    padding: "26px 24px 26px 0",
                    borderRight: "1px solid var(--border-subtle)",
                    paddingLeft: row.pad,
                  }}
                >
                  <span
                    data-ledger-bar=""
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: "0",
                      left: row.pad,
                      right: "24px",
                      height: "2px",
                      background: "var(--gold-ink)",
                    }}
                  />
                  <p
                    data-count=""
                    style={{
                      fontSize: "30px",
                      fontWeight: "800",
                      letterSpacing: "-0.04em",
                      color: "var(--ink)",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: "1",
                    }}
                  >
                    <CountUp value={row.value} suffix={row.suffix} />
                  </p>
                  <p style={{ marginTop: "7px", fontSize: "13.5px", color: "var(--text-secondary)" }}>{row.label}</p>
                </li>
              ))}
            </InView>
          </div>
        </section>

        {/* ------------------------------------------------------ categories */}
        <section aria-labelledby="cats-h2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div style={SECTION_PAD}>
            <div style={HEAD_ROW}>
              <div style={{ maxWidth: "660px" }}>
                <Eyebrow>Home Services</Eyebrow>
                <h2 id="cats-h2" style={H2}>
                  Pick the Trade. We Have Already Done the Phone Calls.
                </h2>
                <p style={{ ...LEAD, textWrap: "pretty" }}>
                  {counts.categories} trades, from emergency plumbing to full kitchen remodels. Every
                  category page opens with what a valid licence covers in your state or province, then
                  the ten companies that cleared our checks.
                </p>
              </div>
              <Link className="arrow-link" href={routes.servicesIndex()}>
                All {counts.categories} services
                <Arrow />
              </Link>
            </div>

            <ul
              data-cat-grid=""
              style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px" }}
            >
              {categories.map((category) => (
                <li
                  key={category.id}
                  data-tile=""
                  data-span2={category.wide ? "" : undefined}
                  style={{
                    gridColumn: category.wide ? "span 2" : "auto",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    padding: "22px 22px 20px",
                  }}
                >
                  <Link
                    href={routes.category(category.slug)}
                    style={{ display: "flex", flexDirection: "column", height: "100%", color: "inherit" }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: "26px",
                      }}
                    >
                      <span
                        data-tico=""
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "46px",
                          height: "46px",
                          borderRadius: "13px",
                          border: "1px solid var(--border-subtle)",
                          background: "var(--paper)",
                          color: "var(--ink)",
                        }}
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d={ICON_PATHS[category.iconKey as IconName] ?? ICON_PATHS.wrench} />
                        </svg>
                      </span>
                      <svg
                        data-tarrow=""
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{ color: "var(--ink)", marginTop: "4px" }}
                      >
                        <path d="M7 17 17 7" />
                        <path d="M8 7h9v9" />
                      </svg>
                    </span>
                    <h3
                      data-tname=""
                      style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        lineHeight: "1.25",
                        letterSpacing: "-0.02em",
                        marginBottom: "6px",
                        color: "var(--ink)",
                      }}
                    >
                      {category.name}
                    </h3>
                    <p
                      data-tsub=""
                      style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.5" }}
                    >
                      {category.tagline}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            {trending.length > 0 ? (
              <InView
                data-trend-rail=""
                style={{
                  marginTop: "20px",
                  padding: "18px 22px",
                  background: "var(--paper)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--ink)",
                    marginRight: "6px",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M16 7h6v6" />
                    <path d="m22 7-8.5 8.5-5-5L2 17" />
                  </svg>
                  Searched most this week
                </span>
                {trending.map((sub, index) => (
                  <Link
                    key={sub.id}
                    data-chip=""
                    href={routes.subservice(sub.category.slug, sub.slug)}
                    style={{ ...CHIP, animationDelay: `${index * 60}ms` }}
                  >
                    {sub.name}
                  </Link>
                ))}
              </InView>
            ) : null}
          </div>
        </section>

        {/* ------------------------------------------------- featured rankings */}
        {leadRanking ? (
          <section
            aria-labelledby="feat-h2"
            style={{
              background: "var(--paper)",
              borderTop: "1px solid var(--border-subtle)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div style={SECTION_PAD}>
              <div style={HEAD_ROW}>
                <div style={{ maxWidth: "660px" }}>
                  <Eyebrow>Rankings</Eyebrow>
                  <h2 id="feat-h2" style={H2}>
                    The Lists People Open Most
                  </h2>
                  <p style={LEAD}>
                    Four rankings that get more traffic than the rest combined. Each one shows the date
                    an editor last checked it, not the date the page was made.
                  </p>
                </div>
                <Link className="arrow-link" href={routes.rankingsIndex()}>
                  Every ranking
                  <Arrow />
                </Link>
              </div>

              <div
                data-split=""
                style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px", alignItems: "stretch" }}
              >
                <article
                  data-card=""
                  style={{
                    position: "relative",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "24px",
                    overflow: "hidden",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    data-thumb=""
                    style={{
                      position: "relative",
                      height: "340px",
                      background: "var(--surface-sunken)",
                      overflow: "hidden",
                    }}
                  >
                    <Media src={leadRanking.city?.heroImage} alt="" />
                    <span
                      data-badge-ten=""
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "24px",
                        bottom: "-22px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "64px",
                        height: "64px",
                        borderRadius: "18px",
                        background: "var(--ink)",
                        color: "var(--gold-ink)",
                        fontSize: "24px",
                        fontWeight: "800",
                        letterSpacing: "-0.05em",
                        boxShadow: "var(--shadow-lg)",
                      }}
                    >
                      10
                    </span>
                  </div>
                  <div style={{ padding: "40px 28px 28px", display: "flex", flexDirection: "column", flex: "1" }}>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--color-primary)",
                        marginBottom: "10px",
                      }}
                    >
                      {leadRanking.category.name}
                      {leadRanking.city
                        ? ` · ${leadRanking.city.name}, ${leadRanking.city.region.code.toUpperCase()}`
                        : ""}
                    </p>
                    <h3
                      style={{
                        fontSize: "30px",
                        lineHeight: "1.12",
                        fontWeight: "800",
                        letterSpacing: "-0.03em",
                        marginBottom: "14px",
                        textWrap: "balance",
                      }}
                    >
                      <Link href={rankingUrl(leadRanking)} style={{ color: "var(--ink)" }}>
                        {leadRanking.title}
                      </Link>
                    </h3>
                    <p
                      style={{
                        fontSize: "16px",
                        lineHeight: "1.65",
                        color: "var(--text-secondary)",
                        marginBottom: "22px",
                      }}
                    >
                      {leadRanking.summary}
                    </p>
                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: "18px",
                        borderTop: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          fontSize: "13.5px",
                          color: "var(--text-muted)",
                        }}
                      >
                        {leadRanking.author ? (
                          <span aria-hidden="true" style={AVATAR}>
                            {initials(leadRanking.author.name)}
                          </span>
                        ) : null}
                        <span>
                          Reviewed {shortMonthYear(leadRanking.lastReviewedAt ?? leadRanking.publishedAt)}
                          {leadRanking.author ? (
                            <>
                              {" by "}
                              <Link
                                href={routes.expert(leadRanking.author.slug)}
                                style={{ color: "var(--ink)", fontWeight: "600" }}
                              >
                                {leadRanking.author.name}
                              </Link>
                            </>
                          ) : null}
                        </span>
                      </span>
                      <Link className="arrow-link" href={rankingUrl(leadRanking)} style={{ fontSize: "14px" }}>
                        Open the ranking
                        <Arrow size={15} />
                      </Link>
                    </div>
                  </div>
                </article>

                <ul style={{ display: "grid", gap: "14px" }}>
                  {sideRankings.map((ranking) => (
                    <li
                      key={ranking.id}
                      data-card=""
                      style={{
                        background: "var(--surface-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "20px",
                        boxShadow: "var(--shadow-xs)",
                        display: "flex",
                        gap: "18px",
                        padding: "16px",
                        alignItems: "stretch",
                      }}
                    >
                      <span
                        data-thumb=""
                        style={{
                          flex: "0 0 124px",
                          borderRadius: "14px",
                          overflow: "hidden",
                          background: "var(--surface-sunken)",
                          display: "block",
                          minHeight: "124px",
                        }}
                      >
                        <Media src={ranking.city?.heroImage} alt="" />
                      </span>
                      <span
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          minWidth: "0",
                          padding: "4px 4px 4px 0",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11.5px",
                            fontWeight: "700",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "var(--color-primary)",
                          }}
                        >
                          {ranking.category.name}
                          {ranking.city ? ` · ${ranking.city.name}, ${ranking.city.region.code.toUpperCase()}` : ""}
                        </span>
                        <h3
                          style={{
                            fontSize: "18px",
                            lineHeight: "1.25",
                            fontWeight: "700",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          <Link href={rankingUrl(ranking)} style={{ color: "var(--ink)" }}>
                            {ranking.title}
                          </Link>
                        </h3>
                        <span style={{ fontSize: "14px", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                          {ranking.summary}
                        </span>
                        <span style={{ marginTop: "auto", fontSize: "12.5px", color: "var(--text-muted)" }}>
                          Reviewed {shortMonthYear(ranking.lastReviewedAt ?? ranking.publishedAt)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {/* --------------------------------------------------- how we rank */}
        <section aria-labelledby="how-h2" style={{ background: "var(--surface-card)" }}>
          <div style={SECTION_PAD}>
            <div
              data-split=""
              style={{
                display: "grid",
                gridTemplateColumns: "0.9fr 1.1fr",
                gap: "64px",
                alignItems: "start",
                marginBottom: "56px",
              }}
            >
              <div>
                <Eyebrow>How We Rank</Eyebrow>
                <h2 id="how-h2" style={{ ...H2, textWrap: "balance" }}>
                  Nobody Buys a Spot. Here Is What Earns One.
                </h2>
              </div>
              <div style={{ paddingTop: "8px" }}>
                <p
                  style={{
                    fontSize: "18px",
                    lineHeight: "1.7",
                    color: "var(--text-secondary)",
                    marginBottom: "16px",
                    textWrap: "pretty",
                  }}
                >
                  TenBestFind is a small editorial team, not a lead-generation company. We check a
                  contractor&apos;s licence against the state or provincial register, count the years it
                  has pulled permits locally, look at the range of work it takes on, and read what
                  customers say about it in public.
                </p>
                <p
                  style={{
                    fontSize: "18px",
                    lineHeight: "1.7",
                    color: "var(--text-secondary)",
                    marginBottom: "26px",
                    textWrap: "pretty",
                  }}
                >
                  Ten names make the page, with the reasoning next to each one. The steps never change.
                  The criteria do, because a good mover and a good electrician are not measured the same
                  way.
                </p>
                <Link
                  data-btn-ghost=""
                  href={routes.howWeRank()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "9px",
                    height: "52px",
                    padding: "0 24px",
                    borderRadius: "12px",
                    border: "1.5px solid var(--border-strong)",
                    background: "var(--surface-card)",
                    color: "var(--ink)",
                    fontSize: "15.5px",
                    fontWeight: "600",
                  }}
                >
                  Read the full methodology
                  <Arrow size={17} />
                </Link>
              </div>
            </div>

            <ol
              data-steps=""
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "0",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              {STEPS.map((step, index) => (
                <li
                  key={step.n}
                  data-step=""
                  style={{
                    padding:
                      index === 0 ? "36px 32px 0 0" : index === 1 ? "36px 32px 0" : "36px 0 0 32px",
                    borderLeft: index === 0 ? undefined : "1px solid var(--border-subtle)",
                  }}
                >
                  <span
                    data-step-n=""
                    aria-hidden="true"
                    style={{
                      display: "block",
                      fontSize: "64px",
                      lineHeight: "1",
                      fontWeight: "800",
                      letterSpacing: "-0.05em",
                      color: "transparent",
                      WebkitTextStroke: "1.5px var(--ink)",
                      marginBottom: "22px",
                    }}
                  >
                    {step.n}
                  </span>
                  <h3
                    style={{
                      fontSize: "22px",
                      fontWeight: "700",
                      letterSpacing: "-0.02em",
                      marginBottom: "10px",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p style={{ fontSize: "16px", lineHeight: "1.65", color: "var(--text-secondary)" }}>
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------- countries */}
        <section
          aria-labelledby="country-h2"
          style={{
            background: "var(--paper)",
            borderTop: "1px solid var(--border-subtle)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={SECTION_PAD}>
            <div style={{ maxWidth: "680px", marginBottom: "44px" }}>
              <Eyebrow>Locations</Eyebrow>
              <h2 id="country-h2" style={H2}>
                {countries.length === 2 ? "Two Countries" : `${countries.length} Countries`}
                {`, ${counts.cities} Cities, One Standard`}
              </h2>
              <p style={{ ...LEAD, textWrap: "pretty" }}>
                Rankings are organised by country, then state or province, then city. A roofing licence
                in Florida means something different from one in Ontario, so the research is done at the
                level where the rules actually live.
              </p>
            </div>
            <div
              data-country-grid=""
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
            >
              {countries.map((country) => (
                <article
                  key={country.code}
                  data-ctry=""
                  style={{
                    position: "relative",
                    borderRadius: "24px",
                    overflow: "hidden",
                    background: "var(--ink)",
                    color: "#fff",
                    minHeight: "420px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    data-thumb=""
                    style={{ position: "absolute", inset: "0", background: "#1B2D55", overflow: "hidden" }}
                  >
                    <Media src={country.heroImage} alt="" />
                  </div>
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: "0",
                      background:
                        "linear-gradient(180deg, rgba(16,31,61,0.1) 0%, rgba(16,31,61,0.55) 45%, rgba(16,31,61,0.96) 100%)",
                      pointerEvents: "none",
                    }}
                  />
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: "22px",
                      left: "26px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "34px",
                      padding: "0 12px",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.14)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      fontSize: "12px",
                      fontWeight: "800",
                      letterSpacing: "0.08em",
                      color: "#fff",
                    }}
                  >
                    {country.code.toUpperCase()}
                  </span>
                  <div style={{ position: "relative", padding: "30px 30px 30px" }}>
                    <h3
                      style={{
                        fontSize: "32px",
                        fontWeight: "800",
                        letterSpacing: "-0.035em",
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
                        fontSize: "15.5px",
                        lineHeight: "1.6",
                        color: "rgba(232,237,245,0.78)",
                        marginBottom: "20px",
                        maxWidth: "460px",
                      }}
                    >
                      {country.blurb}
                    </p>
                    <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
                      {country.regions.slice(0, 4).map((region) => (
                        <li key={region.id}>
                          <Link
                            href={routes.region(country.code, region.slug)}
                            style={{
                              display: "block",
                              padding: "7px 14px",
                              borderRadius: "999px",
                              border: "1px solid rgba(255,255,255,0.24)",
                              background: "rgba(255,255,255,0.08)",
                              fontSize: "13.5px",
                              fontWeight: "600",
                              color: "#fff",
                            }}
                          >
                            {region.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={routes.country(country.code)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "9px",
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "var(--gold-ink)",
                      }}
                    >
                      Browse {country.name}
                      <svg
                        data-ctry-arrow=""
                        width="17"
                        height="17"
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
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- cities */}
        <section aria-labelledby="geo-h2" style={{ background: "var(--surface-card)" }}>
          <div style={SECTION_PAD}>
            <div style={HEAD_ROW}>
              <div style={{ maxWidth: "660px" }}>
                <Eyebrow>Cities</Eyebrow>
                <h2 id="geo-h2" style={H2}>
                  Start With Your City
                </h2>
                <p style={LEAD}>
                  The metros with the most published rankings. The number is how many trades we have
                  already covered there.
                </p>
              </div>
              <Link className="arrow-link" href={routes.locationsIndex()}>
                Every city
                <Arrow />
              </Link>
            </div>
            <div data-split="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <CityColumn title="United States" href={routes.country("us")} linkLabel="All U.S. cities" cities={usCities} />
              <CityColumn title="Canada" href={routes.country("ca")} linkLabel="All Canadian cities" cities={caCities} />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- latest */}
        <section
          aria-labelledby="latest-h2"
          style={{
            background: "var(--paper)",
            borderTop: "1px solid var(--border-subtle)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={SECTION_PAD}>
            <div style={{ ...HEAD_ROW, marginBottom: "36px" }}>
              <div style={{ maxWidth: "660px" }}>
                <Eyebrow>Recently Reviewed</Eyebrow>
                <h2 id="latest-h2" style={H2}>
                  Fresh Off the Editor&apos;s Desk
                </h2>
                <p style={LEAD}>New lists and re-checked ones, most recent first.</p>
              </div>
              <Link className="arrow-link" href={routes.rankingsIndex()}>
                The full archive
                <Arrow />
              </Link>
            </div>
            <ol
              style={{
                borderTop: "2px solid var(--ink)",
                background: "var(--surface-card)",
                borderRadius: "0 0 20px 20px",
                overflow: "hidden",
                borderLeft: "1px solid var(--border-subtle)",
                borderRight: "1px solid var(--border-subtle)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              {latest.map((ranking, index) => (
                <li key={ranking.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <Link
                    data-index=""
                    href={rankingUrl(ranking)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "64px 210px 1fr auto 24px",
                      alignItems: "center",
                      gap: "24px",
                      padding: "22px 26px",
                      color: "var(--text-primary)",
                    }}
                  >
                    <span
                      data-index-n=""
                      aria-hidden="true"
                      style={{
                        fontSize: "13px",
                        fontWeight: "800",
                        letterSpacing: "0.04em",
                        color: "var(--text-muted)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontSize: "11.5px",
                        fontWeight: "700",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--color-primary)",
                      }}
                    >
                      {ranking.category.name}
                      {ranking.city ? ` · ${ranking.city.name}, ${ranking.city.region.code.toUpperCase()}` : ""}
                    </span>
                    <span style={{ display: "block", minWidth: "0" }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: "19px",
                          lineHeight: "1.25",
                          fontWeight: "700",
                          letterSpacing: "-0.02em",
                          color: "var(--ink)",
                          marginBottom: "4px",
                        }}
                      >
                        {ranking.title}
                      </span>
                      <span style={{ display: "block", fontSize: "15px", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                        {ranking.summary}
                      </span>
                    </span>
                    <span
                      data-index-meta=""
                      style={{
                        justifySelf: "end",
                        fontSize: "13px",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ranking.lastReviewedAt ? "Reviewed " : "Published "}
                      {shortMonthYear(ranking.lastReviewedAt ?? ranking.publishedAt)}
                    </span>
                    <svg
                      data-index-arrow=""
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--ink)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------- guides */}
        {leadGuide ? (
          <section aria-labelledby="guides-h2" style={{ background: "var(--surface-card)" }}>
            <div style={SECTION_PAD}>
              <div style={HEAD_ROW}>
                <div style={{ maxWidth: "660px" }}>
                  <Eyebrow>Guides</Eyebrow>
                  <h2 id="guides-h2" style={H2}>
                    Know What to Ask Before Anyone Quotes You
                  </h2>
                  <p style={{ ...LEAD, textWrap: "pretty" }}>
                    Short, practical reads: how to line up three quotes, what a licence does and does not
                    cover, and what a fair price looks like in your market this year.
                  </p>
                </div>
                <Link className="arrow-link" href={routes.guidesIndex()}>
                  All guides
                  <Arrow />
                </Link>
              </div>
              <div
                data-split=""
                style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "28px", alignItems: "start" }}
              >
                <article
                  data-card=""
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "24px",
                    overflow: "hidden",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div data-thumb="" style={{ height: "250px", background: "var(--surface-sunken)", overflow: "hidden" }}>
                    <Media src={leadGuide.heroImage} alt="" />
                  </div>
                  <div style={{ padding: "28px 28px 30px" }}>
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--color-primary)",
                        marginBottom: "12px",
                      }}
                    >
                      {leadGuide.category?.name ?? "Guide"} · {leadGuide.readingMinutes} min read
                    </p>
                    <h3
                      style={{
                        fontSize: "26px",
                        lineHeight: "1.18",
                        fontWeight: "800",
                        letterSpacing: "-0.03em",
                        marginBottom: "12px",
                      }}
                    >
                      <Link href={routes.guide(leadGuide.slug)} style={{ color: "var(--ink)" }}>
                        {leadGuide.title}
                      </Link>
                    </h3>
                    <p
                      style={{
                        fontSize: "16px",
                        lineHeight: "1.65",
                        color: "var(--text-secondary)",
                        marginBottom: "18px",
                      }}
                    >
                      {leadGuide.excerpt}
                    </p>
                    <p
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "13.5px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {leadGuide.author ? (
                        <span aria-hidden="true" style={AVATAR}>
                          {initials(leadGuide.author.name)}
                        </span>
                      ) : null}
                      {leadGuide.author ? `${leadGuide.author.name} · ` : ""}
                      Updated {shortMonthYear(leadGuide.reviewedAt ?? leadGuide.publishedAt)}
                    </p>
                  </div>
                </article>
                <ol style={{ borderTop: "2px solid var(--ink)" }}>
                  {sideGuides.map((guide) => (
                    <li key={guide.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <Link
                        data-index=""
                        href={routes.guide(guide.slug)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 24px",
                          alignItems: "center",
                          gap: "16px",
                          padding: "20px 8px",
                          borderRadius: "12px",
                          color: "var(--text-primary)",
                        }}
                      >
                        <span style={{ display: "block", minWidth: "0" }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              color: "var(--text-muted)",
                              marginBottom: "6px",
                            }}
                          >
                            {guide.category?.name ?? "Guide"}
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontSize: "19px",
                              lineHeight: "1.25",
                              fontWeight: "700",
                              letterSpacing: "-0.02em",
                              marginBottom: "6px",
                              color: "var(--ink)",
                            }}
                          >
                            {guide.title}
                          </span>
                          <span
                            style={{
                              display: "block",
                              fontSize: "15px",
                              lineHeight: "1.5",
                              color: "var(--text-secondary)",
                              marginBottom: "8px",
                            }}
                          >
                            {guide.excerpt}
                          </span>
                          <span style={{ display: "block", fontSize: "13px", color: "var(--text-muted)" }}>
                            {guide.author ? `${guide.author.name} · ` : ""}
                            Updated {shortMonthYear(guide.reviewedAt ?? guide.publishedAt)}
                          </span>
                        </span>
                        <svg
                          data-index-arrow=""
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--ink)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
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
          }}
        >
          <InView
            as="svg"
            data-ten-big=""
            aria-hidden="true"
            viewBox="0 0 240 170"
            width="620"
            height="440"
            style={{
              position: "absolute",
              right: "-60px",
              top: "-70px",
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <TenMark variant="big" />
          </InView>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              background: "radial-gradient(900px 500px at 15% 100%, rgba(45,116,215,0.28), transparent 62%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", ...SECTION_PAD }}>
            <div
              data-split=""
              style={{
                display: "grid",
                gridTemplateColumns: "0.9fr 1.1fr",
                gap: "64px",
                alignItems: "end",
                marginBottom: "52px",
              }}
            >
              <div>
                <Eyebrow tone="gold">Who Is Behind This</Eyebrow>
                <h2 id="eeat-h2" style={{ ...H2, color: "#fff", textWrap: "balance" }}>
                  Real Names, Public Criteria, Published Mistakes
                </h2>
              </div>
              <p
                style={{
                  fontSize: "18px",
                  lineHeight: "1.7",
                  color: "rgba(232,237,245,0.74)",
                  textWrap: "pretty",
                }}
              >
                You should be able to see who wrote a list, what they checked, how the site makes money
                and what happens when we get something wrong. All four are one click away on every page.
              </p>
            </div>
            <ul
              data-eeat-grid=""
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "1px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "20px",
                overflow: "hidden",
              }}
            >
              {EEAT.map((item) => (
                <li
                  key={item.title}
                  style={{
                    background: "var(--ink)",
                    padding: "28px 26px 26px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.08)",
                      color: "var(--gold-ink)",
                      marginBottom: "22px",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={ICON_PATHS[item.icon]} />
                    </svg>
                  </span>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "700",
                      letterSpacing: "-0.02em",
                      color: "#fff",
                      marginBottom: "8px",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "15px",
                      lineHeight: "1.6",
                      color: "rgba(232,237,245,0.72)",
                      marginBottom: "18px",
                    }}
                  >
                    {item.text}
                  </p>
                  <Link
                    className="arrow-link"
                    href={item.href}
                    style={{ marginTop: "auto", color: "var(--gold-ink)", fontSize: "14.5px" }}
                  >
                    {item.cta}
                    <Arrow size={15} width={2.2} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------------- faq */}
        {faqs.length > 0 ? (
          <section aria-labelledby="faq-h2" style={{ background: "var(--surface-card)" }}>
            <div
              data-split=""
              style={{
                ...SECTION_PAD,
                display: "grid",
                gridTemplateColumns: "0.75fr 1.25fr",
                gap: "64px",
                alignItems: "start",
              }}
            >
              <div data-faq-sticky="" style={{ position: "sticky", top: "130px" }}>
                <Eyebrow>FAQ</Eyebrow>
                <h2 id="faq-h2" style={{ ...H2, marginBottom: "16px", textWrap: "balance" }}>
                  Questions We Get Every Week
                </h2>
                <p
                  style={{
                    fontSize: "17px",
                    lineHeight: "1.7",
                    color: "var(--text-secondary)",
                    marginBottom: "24px",
                    textWrap: "pretty",
                  }}
                >
                  Straight answers about how the lists are built and what they cost, which is nothing.
                </p>
                <Link className="arrow-link" href={routes.contact()}>
                  Ask something else
                  <Arrow />
                </Link>
              </div>
              <div style={{ borderTop: "2px solid var(--ink)" }}>
                {faqs.map((faq) => (
                  <details key={faq.id} data-faq="" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <summary
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "20px",
                        padding: "24px 4px",
                        fontSize: "19px",
                        fontWeight: "700",
                        letterSpacing: "-0.015em",
                        lineHeight: "1.4",
                        color: "var(--ink)",
                        transition: "color 160ms var(--ease-out)",
                      }}
                    >
                      <span>{faq.question}</span>
                      <span
                        data-fq-ico=""
                        aria-hidden="true"
                        style={{
                          flexShrink: "0",
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
                          width="16"
                          height="16"
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
                    <div style={{ padding: "0 58px 26px 4px" }}>
                      <p
                        style={{
                          fontSize: "16.5px",
                          lineHeight: "1.7",
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
          </section>
        ) : null}

        {/* -------------------------------------------------- for businesses */}
        <section
          aria-labelledby="biz-h2"
          style={{ background: "var(--paper)", borderTop: "1px solid var(--border-subtle)" }}
        >
          <div style={SECTION_PAD}>
            <div
              data-split=""
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "stretch" }}
            >
              <div
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "24px",
                  padding: "44px 44px 40px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Eyebrow>For Businesses</Eyebrow>
                <h2
                  id="biz-h2"
                  style={{
                    fontSize: "clamp(30px, 3.2vw, 42px)",
                    lineHeight: "1.06",
                    fontWeight: "800",
                    letterSpacing: "-0.035em",
                    marginBottom: "16px",
                    textWrap: "balance",
                  }}
                >
                  Homeowners Are Already Comparing You. Make Sure the Facts Are Right.
                </h2>
                <p
                  style={{
                    fontSize: "17px",
                    lineHeight: "1.65",
                    color: "var(--text-secondary)",
                    marginBottom: "28px",
                    maxWidth: "520px",
                    textWrap: "pretty",
                  }}
                >
                  Claim your profile and keep your licence, hours, service area and photos current. Or
                  take a labelled featured slot on the Top 10 page for your city and trade.
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "26px" }}>
                  <Link
                    data-btn-primary=""
                    href={routes.claim()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: "52px",
                      padding: "0 24px",
                      borderRadius: "12px",
                      background: "var(--ink)",
                      color: "#fff",
                      fontSize: "16px",
                      fontWeight: "600",
                    }}
                  >
                    Claim Your Profile
                  </Link>
                  <Link
                    data-btn-ghost=""
                    href={routes.forBusinesses()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: "52px",
                      padding: "0 22px",
                      borderRadius: "12px",
                      border: "1.5px solid var(--border-strong)",
                      background: "var(--surface-card)",
                      color: "var(--ink)",
                      fontSize: "16px",
                      fontWeight: "600",
                    }}
                  >
                    See Business Plans
                  </Link>
                </div>
                <p
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    fontSize: "14px",
                    lineHeight: "1.55",
                    color: "var(--text-secondary)",
                    maxWidth: "520px",
                  }}
                >
                  <span
                    style={{
                      flexShrink: "0",
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "var(--ink)",
                      color: "var(--gold-ink)",
                      fontSize: "10.5px",
                      fontWeight: "800",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Featured
                  </span>
                  A subscription buys visibility and a managed profile. It cannot buy, move or protect
                  one of the ten ranked positions.
                </p>
              </div>
              <ul style={{ display: "grid", gap: "12px" }}>
                {BIZ_POINTS.map((point) => (
                  <li
                    key={point.title}
                    data-card=""
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "18px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "20px",
                      padding: "26px 26px",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        flexShrink: "0",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "46px",
                        height: "46px",
                        borderRadius: "13px",
                        background: "var(--paper)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--ink)",
                      }}
                    >
                      <svg
                        width="21"
                        height="21"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={ICON_PATHS[point.icon]} />
                      </svg>
                    </span>
                    <span style={{ display: "block" }}>
                      <h3
                        style={{
                          fontSize: "18px",
                          fontWeight: "700",
                          letterSpacing: "-0.02em",
                          marginBottom: "5px",
                        }}
                      >
                        {point.title}
                      </h3>
                      <p style={{ fontSize: "15px", lineHeight: "1.55", color: "var(--text-secondary)" }}>
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
        <section aria-labelledby="final-h2" style={{ position: "relative", overflow: "hidden", background: "var(--ink)" }}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              background: "radial-gradient(800px 460px at 50% 130%, rgba(45,116,215,0.4), transparent 62%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              maxWidth: "900px",
              margin: "0 auto",
              padding: "112px var(--gutter)",
              textAlign: "center",
            }}
          >
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
                marginBottom: "18px",
              }}
            >
              Forty Tabs or Ten Names
            </p>
            <h2
              id="final-h2"
              style={{
                fontSize: "clamp(34px, 4.2vw, 56px)",
                lineHeight: "1.02",
                fontWeight: "800",
                letterSpacing: "-0.04em",
                color: "#fff",
                marginBottom: "16px",
                textWrap: "balance",
              }}
            >
              Tell Us the Job and the City
            </h2>
            <p
              style={{
                fontSize: "18px",
                lineHeight: "1.65",
                color: "rgba(232,237,245,0.72)",
                marginBottom: "36px",
              }}
            >
              We will hand you the ten companies worth a phone call, with the reasons next to each name.
            </p>
            <form
              action={routes.search()}
              method="get"
              role="search"
              aria-label="Find local businesses"
              data-stack=""
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--surface-card)",
                borderRadius: "18px",
                boxShadow: "0 30px 70px -20px rgba(0,0,0,0.5)",
                padding: "8px",
                textAlign: "left",
              }}
            >
              <div style={{ flex: "1.15", padding: "0 14px" }}>
                <label htmlFor="svc2" style={SR_ONLY}>
                  Service
                </label>
                <input id="svc2" name="service" type="text" placeholder="What needs doing?" style={FIELD} />
              </div>
              <div
                data-divider=""
                aria-hidden="true"
                style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "10px 0" }}
              />
              <div style={{ flex: "1", padding: "0 14px" }}>
                <label htmlFor="loc2" style={SR_ONLY}>
                  City or postal code
                </label>
                <input id="loc2" name="location" type="text" placeholder="City or postal code" style={FIELD} />
              </div>
              <button
                data-btn-primary=""
                type="submit"
                style={{
                  height: "54px",
                  padding: "0 28px",
                  border: "0",
                  borderRadius: "12px",
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontFamily: "var(--font-sans)",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Show Me the Ten
              </button>
            </form>
          </div>
        </section>
      </div>
    </SiteChrome>
  );
}

/* ------------------------------------------------------ small helpers */

function SuggestColumn({ label, children }: { label: string; children: React.ReactNode }) {
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

function SuggestLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} style={{ display: "block", padding: "6px 0", fontSize: "15px", color: "var(--text-primary)" }}>
        {children}
      </Link>
    </li>
  );
}

/** One country's city list, with the trades covered counted on the right. */
function CityColumn({
  title,
  href,
  linkLabel,
  cities,
}: {
  title: string;
  href: string;
  linkLabel: string;
  cities: Awaited<ReturnType<typeof getPopularCities>>;
}) {
  return (
    <div style={{ borderTop: "2px solid var(--ink)", paddingTop: "18px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "8px",
        }}
      >
        <h3 style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.025em" }}>{title}</h3>
        <Link className="arrow-link" href={href} style={{ fontSize: "14px" }}>
          {linkLabel}
          <Arrow size={14} />
        </Link>
      </div>
      <ol data-city-cols="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
        {cities.map((city) => (
          <li key={`${city.region.slug}-${city.slug}`} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <Link
              data-row=""
              href={routes.city(city.region.country.code, city.region.slug, city.slug)}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "10px",
                padding: "12px 0",
                fontSize: "15.5px",
                fontWeight: "500",
                color: "var(--ink)",
              }}
            >
              <span style={{ flex: "1" }}>
                {city.name}, {city.region.code.toUpperCase()}
              </span>
              <span
                aria-hidden="true"
                style={{
                  flex: "0 0 auto",
                  minWidth: "24px",
                  borderBottom: "1px dotted var(--border-strong)",
                  alignSelf: "center",
                  flexGrow: "1",
                  margin: "0 4px",
                }}
              />
              <span
                data-row-n=""
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "var(--text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {city._count.rankings}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
