import { licenceWord } from "@/lib/trade-words";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { GuideBody } from "@/components/site/blocks";
import { RelatedContent } from "@/components/site/RelatedContent";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { InfoModal } from "@/components/site/InfoModal";
import { BusinessLogo } from "@/components/site/BusinessLogo";
import { SR_ONLY } from "@/components/site/page-parts";
import { CoverageMap, type CoveragePin } from "@/components/site/ranking/CoverageMap";
import {
  ArrowSvg,
  FaqList,
  FinalBand,
  H2S,
  HeroBackdrop,
  HeroCrumbs,
  ICO,
  Kicker,
  PageNav,
  SHELL_STYLE,
  Tile,
} from "@/components/site/ranking/parts";
import { accent } from "@/components/ui/Accent";
import { ICON_PATHS, hasIcon } from "@/lib/icon-paths";
import { type IconName } from "@/components/ui/Icon";
import { JsonLd, Media } from "@/components/ui/primitives";
import { compactNumber, money, monthYear } from "@/lib/format";
import { parseJson, type ConditionRow } from "@/lib/json";
import { db } from "@/lib/db";
import { rankingCardSelect } from "@/lib/queries";
import { regionNoun } from "@/lib/regions";
import { faqsFor } from "@/lib/faqs";
import { parseHubBody } from "@/lib/hub-body";
import { relatedForCity } from "@/lib/related";
import { redirectIfKnown } from "@/lib/redirects";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { cityCopy, rankingCardTitle, tradePlural } from "@/lib/seo-copy";
import { breadcrumbSchema, cityCrumbs } from "@/lib/breadcrumbs";

/** The five steps the methodology band walks through, same on every hub. */
const RESEARCH_STEPS = [
  { title: "Build the list", body: "Every company that genuinely works the area, not just the ones that advertise in it." },
  { title: "Check the paperwork", body: "Licensing or registration against the authority that issues it, plus insurance status." },
  { title: "Read the record", body: "Years working locally, the range of work actually performed, and patterns in public feedback." },
  { title: "Compare on what decides a job", body: "Who is licensed for that exact work, who answers after hours, who puts warranty terms in writing." },
  { title: "Publish and re-check", body: "Ten names with the criteria and the review date, re-checked inside 90 days." },
];

/** One glyph per step, in the order the steps run. */
const STEP_ICONS = [ICON_PATHS.search, ICON_PATHS.clipboard, ICON_PATHS.star, ICON_PATHS.award, ICON_PATHS.refresh];

const SEASONS = [
  { title: "Spring", body: "Storm damage, roof inspections and exterior projects booked before summer.", d: ICON_PATHS.cloud },
  { title: "Summer", body: "Cooling failures, emergency HVAC and the longest lead times of the year.", d: ICON_PATHS.sun },
  { title: "Autumn", body: "Chimney inspections, gutter work and heating tune-ups before the first cold snap.", d: ICON_PATHS.leaf },
  { title: "Winter", body: "Heating repair, frozen pipe calls and quieter scheduling for interior work.", d: ICON_PATHS.snow },
];

/** The markers a condition without its own icon cycles through. */
const CONDITION_FALLBACK = [ICON_PATHS.cloud, ICON_PATHS.sun, ICON_PATHS.house, ICON_PATHS.shield, ICON_PATHS.clipboard, ICON_PATHS.calendar];

/** An h3 whose size survives the phone layer, which would otherwise set all of them to one. */
function h3Style(px: number, extra: CSSProperties = {}): CSSProperties {
  return { ["--fs" as string]: `${px}px`, fontSize: `${px}px`, ...extra };
}

const LINK_STYLE: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "44px", fontSize: "15px", fontWeight: "700" };
const CARD_LINK_STYLE: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "40px", fontSize: "14.5px", fontWeight: "700" };
const SECTION_HEAD: CSSProperties = { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "18px", flexWrap: "wrap", marginBottom: "26px" };
const SMALL_CAPS: CSSProperties = { fontSize: "11px", fontWeight: "800", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)" };

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

  const [rankings, businesses, costRows, categories, guides, nearbyPool, placements] =
    await Promise.all([
      db.ranking.findMany({
        where: { status: "PUBLISHED", cityId: city.id },
        orderBy: { lastReviewedAt: "desc" },
        select: {
          ...rankingCardSelect,
          // The company in first place, for the "Top pick" line on a card.
          entries: {
            where: { business: { status: "PUBLISHED" } },
            orderBy: { position: "asc" },
            take: 1,
            select: { business: { select: { name: true } } },
          },
        },
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
      // Guides about another place stay on that place's pages.
      db.guide.findMany({
        where: {
          status: "PUBLISHED",
          AND: [
            { OR: [{ cityId: null }, { cityId: city.id }] },
            { OR: [{ regionId: null }, { regionId: region.id }] },
            { OR: [{ countryId: null }, { countryId: country.id }] },
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 6,
        include: { category: { select: { serviceName: true } }, author: { select: { name: true } } },
      }),
      // Nearby means nearby, not "in the same state": 19 cities sat alone in
      // their state and linked to no other city at all, and Newark never
      // linked New York. Only cities with a published list are candidates.
      db.city.findMany({
        where: {
          published: true,
          NOT: { id: city.id },
          region: { countryId: country.id },
          rankings: { some: { status: "PUBLISHED" } },
        },
        orderBy: { population: "desc" },
        include: { region: { select: { slug: true, id: true } } },
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
  const body = parseHubBody(city.body);

  const generatedFaqs = [
    {
      question: `How do you decide which ${city.name} companies make a list?`,
      answer: `Each list follows the published criteria for its trade. Where a ${licenceWord(country.code)} register exists, editors check the number against it. They also read recent Google reviews and look at how long a company has been in business. The criteria are shown on each ranking.`,
    },
    {
      question: `Do you cover the suburbs around ${city.name}?`,
      answer:
        "Company service areas often extend past the city line, and coverage is listed on each profile. Where a neighbouring city has enough demand to justify its own research, it gets its own hub rather than being folded into this one.",
    },
    ...(costRows.length > 0 ? [{
      question: "Are the prices on this page quotes?",
      answer:
        "No. They are sourced ranges for this market, published so you can tell whether a quote is in the normal band. A real quote depends on your property, and every contractor prices it differently.",
    }] : []),
    {
      question: "Can a company pay to appear here?",
      answer:
        "A company can buy a labelled sponsored placement, which sits outside the ranked list and carries a Sponsored label. It cannot buy a ranking position.",
    },
    {
      question: "How often is this page updated?",
      answer: `Each ${city.name} ranking shows the date an editor last reviewed it. Check that date before you choose a company.`,
    },
  ];

  const glance: { label: string; value: string; icon: IconName }[] = [
    { label: "Published rankings", value: `${rankings.length}`, icon: "trophy" },
    { label: "Companies researched", value: `${businessCount}`, icon: "store" },
    { label: "Trades covered", value: `${new Set(rankings.map((r) => r.category.slug)).size}`, icon: "grid" },
    city.population ? { label: "Population", value: compactNumber(city.population), icon: "users" } : null,
    // Canada has no counties: the field holds a census division there, and
    // Toronto was being labelled "County — Toronto Division".
    city.county
      ? {
          label: country.regionLabel === "provinces" ? "Census division" : "County",
          value: city.county,
          icon: "map" as IconName,
        }
      : null,
    // "State" is only half the countries this template serves: a Toronto
    // page was printing "State — Ontario".
    {
      label: regionNoun(country).replace(/^./, (c) => c.toUpperCase()),
      value: region.name,
      icon: "pin",
    },
  ].filter(Boolean) as { label: string; value: string; icon: IconName }[];

  // Trades with a published ranking here come first, since those are the ones
  // a reader can actually act on.
  const ranked = new Map(rankings.map((entry) => [entry.category.slug, entry]));
  const services = categories
    .slice()
    .sort((a, b) => Number(ranked.has(b.slug)) - Number(ranked.has(a.slug)))
    .slice(0, 12);

  const icon = (key: string | null | undefined): IconName => (key && hasIcon(key) ? (key as IconName) : "house");
  const iconPath = (key: string | null | undefined): string => ICON_PATHS[icon(key)];

  const related = await relatedForCity({
    cityId: city.id,
    regionId: region.id,
    regionSlug: region.slug,
    regionName: region.name,
    countryCode: country.code,
    cityName: city.name,
  });

  const faqs = await faqsFor(
    "CITY",
    city.id,
    generatedFaqs.map((faq, index) => ({ id: String(index), ...faq })),
  );

  // The answer a reader (or an engine) needs first: what is ranked here, how
  // many names each list carries, how fresh the lists are, and where the rules are.
  const reviewDates = rankings.map((entry) => entry.lastReviewedAt ?? entry.publishedAt).filter((d): d is Date => Boolean(d));
  const newest = reviewDates.length ? monthYear(new Date(Math.max(...reviewDates.map((d) => d.getTime())))) : "";
  const oldest = reviewDates.length ? monthYear(new Date(Math.min(...reviewDates.map((d) => d.getTime())))) : "";
  const tradeNames = [...new Set(rankings.map((entry) => tradePlural(entry.category).toLowerCase().replace(/^hvac/, "HVAC")))];
  const tradeList =
    tradeNames.length <= 4
      ? tradeNames.length > 1
        ? `${tradeNames.slice(0, -1).join(", ")} and ${tradeNames[tradeNames.length - 1]}`
        : (tradeNames[0] ?? "")
      : `${tradeNames.slice(0, 3).join(", ")} and ${tradeNames.length - 3} more trades`;
  const openingAnswer =
    rankings.length > 0
      ? `TenBestFind has ${rankings.length} published ${rankings.length === 1 ? "ranking" : "rankings"} for ${city.name}, covering ${tradeList}. Each list names up to ten companies, and its title gives the exact number. ${
          rankings.length === 1
            ? `The list was last reviewed in ${newest}.`
            : oldest === newest
              ? `The lists were last reviewed in ${newest}.`
              : `The lists were last reviewed between ${oldest} and ${newest}.`
        } Each ranking states its criteria, and our editorial standards explain how they are applied.`
      : `We have not published a ranking for ${city.name} yet. Our editorial standards explain how a list is researched before it goes live.`;

  const topRankings = rankings.slice(0, 3);
  const hasSide = topRankings.length > 0;
  const updatedOn = rankings[0] ? monthYear(rankings[0].lastReviewedAt ?? rankings[0].publishedAt) : "";

  // The season it is now, for the one card the design lights up.
  const month = new Date().getMonth();
  const currentSeason = month >= 2 && month <= 4 ? "Spring" : month >= 5 && month <= 7 ? "Summer" : month >= 8 && month <= 10 ? "Autumn" : "Winter";

  // Ranges are drawn on one log scale, so a permit fee and a roof replacement
  // can sit in the same card. A bar needs a low and a high figure to be
  // honest, and a scale needs at least two of them to mean anything.
  const priced = costRows.filter((row) => row.lowPrice && row.highPrice && row.lowPrice > 0 && row.highPrice >= row.lowPrice);
  const scaleLow = priced.length > 1 ? Math.log(Math.min(...priced.map((row) => row.lowPrice as number))) : 0;
  const scaleSpan = priced.length > 1 ? Math.log(Math.max(...priced.map((row) => row.highPrice as number))) - scaleLow : 0;
  const drawBars = scaleSpan > 0;
  const barFor = (low: number, high: number) => {
    const left = ((Math.log(low) - scaleLow) / scaleSpan) * 100;
    const width = Math.max(4, ((Math.log(high) - Math.log(low)) / scaleSpan) * 100);
    return { left: Math.min(left, 100 - width), width };
  };

  // Categories sit under the band the editors filed them in.
  const groups: { title: string; icon: IconName; items: typeof categories }[] = [];
  for (const entry of categories) {
    const title = entry.groupName ?? "";
    let group = groups.find((candidate) => candidate.title === title);
    if (!group) {
      group = { title, icon: icon(entry.iconKey), items: [] };
      groups.push(group);
    }
    group.items.push(entry);
  }

  // Closest first by straight-line distance when both cities have coordinates;
  // otherwise same-region cities first, then by population (the query order).
  const distanceTo = (near: (typeof nearbyPool)[number]) =>
    city.latitude !== null && city.longitude !== null && near.latitude !== null && near.longitude !== null
      ? Math.hypot(near.latitude - city.latitude, (near.longitude - city.longitude) * Math.cos((city.latitude * Math.PI) / 180))
      : near.region.id === region.id
        ? 1000
        : 2000;
  const nearbyCities = [...nearbyPool].sort((a, b) => distanceTo(a) - distanceTo(b)).slice(0, 6);

  const pins: CoveragePin[] = [];
  if (city.latitude !== null && city.longitude !== null) {
    pins.push({ id: city.id, name: city.name, latitude: city.latitude, longitude: city.longitude, primary: true });
  }
  for (const near of nearbyCities) {
    if (near.latitude !== null && near.longitude !== null) {
      pins.push({ id: near.id, name: near.name, latitude: near.latitude, longitude: near.longitude });
    }
  }

  const toc = [
    ...(rankings.length > 0 ? [{ href: "#rankings", label: "Rankings" }] : []),
    ...(partner ? [{ href: "#sponsored", label: "Sponsored" }] : []),
    ...(costRows.length > 0 ? [{ href: "#costs", label: "Costs" }] : []),
    ...(conditions.length > 0 ? [{ href: "#local", label: "Local factors" }] : []),
    { href: "#method", label: "Method" },
    ...(guides.length > 0 ? [{ href: "#guides", label: "Guides" }] : []),
    ...(nearbyCities.length > 0 ? [{ href: "#nearby", label: "Nearby" }] : []),
    { href: "#faqs", label: "FAQs" },
  ];

  const shell: CSSProperties = { ...SHELL_STYLE, padding: "64px 24px" };
  const gridOf = (min: number, gap = 14): CSSProperties => ({
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
    gap: `${gap}px`,
  });

  return (
    <SiteChrome active="locations">
      <div className="ct2">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: copy.h1,
            description: copy.description,
            url: absoluteUrl(routes.city(country.code, region.slug, city.slug)),
            ...(rankings.length > 0
              ? {
                  mainEntity: {
                    "@type": "ItemList",
                    numberOfItems: rankings.length,
                    itemListElement: rankings.map((entry, index) => ({
                      "@type": "ListItem",
                      position: index + 1,
                      name: entry.title,
                      url: absoluteUrl(rankingUrl(entry)),
                    })),
                  },
                }
              : {}),
          }}
        />
        <JsonLd data={breadcrumbSchema(crumbs, absoluteUrl)} />
        <FaqJsonLd faqs={faqs} />

        {/* ------------------------------------------------------------- hero */}
        <section data-hero="" style={{ position: "relative", overflow: "hidden", background: "var(--paper)" }}>
          <HeroBackdrop />
          <div data-shell="" data-hero-shell="" style={{ position: "relative", ...SHELL_STYLE, padding: "20px 24px 40px" }}>
            <HeroCrumbs items={crumbs} />

            <div
              data-split=""
              style={{
                display: "grid",
                gridTemplateColumns: hasSide ? "minmax(0, 1.15fr) minmax(0, 0.85fr)" : "minmax(0, 1fr)",
                gap: "48px",
                alignItems: "start",
              }}
            >
              <div style={hasSide ? undefined : { maxWidth: "820px" }}>
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
                  {city.name}, {region.name}
                  {updatedOn ? <span style={{ color: "var(--text-muted)", fontWeight: "600" }}>Updated {updatedOn}</span> : null}
                </p>
                <h1
                  data-in="2"
                  style={{
                    fontSize: "clamp(36px, 5vw, 62px)",
                    lineHeight: "1",
                    fontWeight: "800",
                    letterSpacing: "-0.045em",
                    textWrap: "balance",
                  }}
                >
                  <PlaceAccent text={copy.h1} place={cityLabel} />
                </h1>
                <p data-in="3" style={{ marginTop: "18px", fontSize: "17px", lineHeight: "1.65", color: "var(--text-secondary)", maxWidth: "640px", textWrap: "pretty" }}>
                  {openingAnswer}
                </p>

                <form
                  data-in="4"
                  action={routes.search()}
                  method="get"
                  role="search"
                  aria-label={`Find providers in ${city.name}`}
                  data-stack=""
                  style={{
                    marginTop: "28px",
                    maxWidth: "720px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "20px",
                    boxShadow: "0 30px 60px -36px rgba(16,31,61,0.45)",
                    padding: "7px",
                  }}
                >
                  <div style={{ flex: "1.2", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px" }}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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
                      style={{ width: "100%", border: "0", outline: "none", height: "52px", fontFamily: "var(--font-sans)", fontSize: "16px", color: "var(--text-primary)", background: "transparent" }}
                    />
                    <datalist id="loc-services">
                      {categories.map((entry) => (
                        <option key={entry.id} value={entry.serviceName} />
                      ))}
                    </datalist>
                  </div>
                  <div data-divider="" aria-hidden="true" style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }} />
                  <div style={{ flex: "0.9", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px" }}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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
                      style={{ width: "100%", border: "0", outline: "none", height: "52px", fontFamily: "var(--font-sans)", fontSize: "16px", fontWeight: "600", color: "var(--ink)", background: "transparent" }}
                    />
                  </div>
                  <button
                    data-btn=""
                    data-btn-dark=""
                    type="submit"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      height: "52px",
                      padding: "0 22px",
                      border: "0",
                      borderRadius: "14px",
                      background: "var(--ink)",
                      color: "#fff",
                      fontFamily: "var(--font-sans)",
                      fontSize: "15.5px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Search
                    <ArrowSvg stroke="var(--gold-ink)" width={2.4} />
                  </button>
                </form>

                {/* What a reader can rely on, in the order the page makes the case. */}
                <ul data-in="5" style={{ marginTop: "22px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 18px", maxWidth: "720px" }}>
                  <TrustItem>
                    <Glyph d={ICO.pin} color="var(--color-primary)" />
                    Local rankings
                  </TrustItem>
                  <TrustItem>
                    <Glyph d={ICO.shield} color="var(--color-success)" />
                    Editorially reviewed
                  </TrustItem>
                  <TrustItem gap="4px">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#D99A1C" aria-hidden="true" style={{ marginRight: "4px" }}>
                      <path d={ICO.star} />
                    </svg>
                    Google review data
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
                  </TrustItem>
                </ul>
              </div>

              {hasSide ? (
                <div data-hero-side="">
                  <aside
                    data-in="4"
                    data-tilt=""
                    aria-labelledby="trend-h2"
                    style={{ position: "relative", background: "var(--ink)", color: "#fff", borderRadius: "24px", overflow: "hidden", boxShadow: "0 50px 90px -40px rgba(16,31,61,0.75)", transition: "transform 500ms var(--spring)" }}
                  >
                    <div aria-hidden="true" style={{ position: "absolute", inset: "0", background: "radial-gradient(420px 260px at 100% 0%, rgba(45,116,215,0.38), transparent 70%)", pointerEvents: "none" }} />
                    <div
                      data-scan=""
                      aria-hidden="true"
                      style={{ position: "absolute", left: "0", right: "0", top: "0", height: "30%", background: "linear-gradient(180deg, transparent, rgba(231,184,99,0.1) 70%, rgba(231,184,99,0.3))", pointerEvents: "none" }}
                    />
                    <div style={{ position: "relative", padding: "20px 22px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <p id="trend-h2" data-minih="" style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold-ink)" }}>
                          Recently reviewed
                        </p>
                        <span style={{ fontSize: "12px", color: "rgba(232,237,245,0.62)" }}>Top pick</span>
                      </div>
                      <ol data-podium="">
                        {topRankings.map((entry, index) => (
                          <li key={entry.id} style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                            <Link
                              data-darklink=""
                              href={rankingUrl(entry)}
                              style={{ display: "flex", alignItems: "center", gap: "14px", minHeight: "72px", padding: "12px 0", color: "#fff" }}
                            >
                              <span className="serif-accent" style={{ fontSize: "34px", lineHeight: "1", color: "var(--gold-ink)", width: "30px", flexShrink: 0, letterSpacing: "0" }}>
                                {index + 1}
                              </span>
                              <span style={{ flex: "1", minWidth: "0" }}>
                                <span style={{ display: "block", fontSize: "15px", fontWeight: "700", lineHeight: "1.3" }}>{rankingCardTitle(entry)}</span>
                                {entry.entries[0] ? (
                                  <span style={{ display: "block", marginTop: "3px", fontSize: "12.5px", color: "rgba(232,237,245,0.65)" }}>
                                    {entry.entries[0].business.name}
                                  </span>
                                ) : null}
                              </span>
                              <span style={{ flexShrink: 0, opacity: 0.5, display: "inline-flex" }}>
                                <ArrowSvg />
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <Link
                      data-darklink=""
                      href={routes.rankingsIndex()}
                      style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "52px", padding: "0 22px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", fontSize: "14px", fontWeight: "700", color: "#fff" }}
                    >
                      All rankings
                      <ArrowSvg stroke="var(--gold-ink)" />
                    </Link>
                  </aside>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <PageNav label={`${city.name} guide`} items={toc} />

        {/* --------------------------------------------------------- rankings */}
        {rankings.length > 0 ? (
          <section id="rankings" aria-labelledby="rank-h2" style={{ background: "var(--paper)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
            <div data-shell="" style={shell}>
              <div data-reveal="" style={SECTION_HEAD}>
                <div>
                  <Kicker>Rankings</Kicker>
                  <h2 id="rank-h2" style={H2S}>
                    {accent(`Home service rankings in ${city.name}`, `in ${city.name}`)}
                  </h2>
                </div>
                <Link data-link="" href={routes.rankingsIndex()} style={LINK_STYLE}>
                  All rankings
                  <ArrowSvg />
                </Link>
              </div>
              <ul data-stagger="" style={gridOf(340)}>
                {rankings.map((entry) => (
                  <li
                    key={entry.id}
                    data-card=""
                    style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", gap: "14px", padding: "22px", borderRadius: "22px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Tile d={iconPath(entry.category.iconKey)} size={46} icon={21} tone="gold" ten={false} />
                      <span style={{ fontSize: "12.5px", fontWeight: "600", color: "var(--text-secondary)" }}>
                        {entry._count.entries} {entry._count.entries === 1 ? "company" : "companies"} · reviewed{" "}
                        {monthYear(entry.lastReviewedAt ?? entry.publishedAt)}
                      </span>
                    </span>
                    <h3 style={h3Style(19, { position: "relative", lineHeight: "1.25", fontWeight: "700", letterSpacing: "-0.02em" })}>
                      <Link href={rankingUrl(entry)} style={{ color: "var(--ink)" }}>
                        {entry.title}
                      </Link>
                    </h3>
                    {entry.entries[0] ? (
                      <span style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "14px", background: "var(--paper)", border: "1px solid var(--border-subtle)" }}>
                        <span className="serif-accent" aria-hidden="true" style={{ fontSize: "24px", lineHeight: "1", color: "var(--gold)", letterSpacing: "0" }}>
                          1
                        </span>
                        <span style={{ display: "block", minWidth: "0", lineHeight: "1.3" }}>
                          <span style={{ display: "block", fontSize: "10.5px", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Top pick</span>
                          <strong style={{ fontSize: "14.5px", color: "var(--ink)" }}>{entry.entries[0].business.name}</strong>
                        </span>
                      </span>
                    ) : null}
                    <Link href={rankingUrl(entry)} style={{ ...CARD_LINK_STYLE, marginTop: "auto" }}>
                      View the list
                      <ArrowSvg size={15} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* -------------------------------------------------------- sponsored */}
        {partner ? (
          <section id="sponsored" aria-labelledby="sponsored-h2" style={{ background: "var(--surface-card)" }}>
            <div data-shell="" style={shell}>
              <div data-reveal="" style={{ maxWidth: "680px", marginBottom: "20px" }}>
                <Kicker>Sponsored</Kicker>
                <h2 id="sponsored-h2" style={{ ...H2S, marginBottom: "10px" }}>
                  {accent(`Sponsored placements in ${city.name}`, city.name)}
                </h2>
                <p style={{ fontSize: "16px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                  This company paid for a labelled placement. It sits outside the ranked lists and does not change any
                  position.{" "}
                  <Link data-link="" href={routes.advertisingDisclosure()} style={{ fontWeight: "600" }}>
                    Advertising disclosure
                  </Link>
                </p>
              </div>
              <div
                data-card=""
                style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", padding: "20px 22px", borderRadius: "22px", background: "var(--paper)", border: "1px solid var(--blue-100)", maxWidth: "680px" }}
              >
                <BusinessLogo name={partner.business.name} url={partner.business.logoUrl} size={48} radius={14} />
                <span style={{ flex: "1", minWidth: "0" }}>
                  <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: "999px", background: "var(--blue-50)", border: "1px solid var(--blue-100)", fontSize: "11.5px", fontWeight: "700", color: "var(--blue-800)", marginBottom: "4px" }}>
                    Sponsored
                  </span>
                  <span style={{ display: "block", fontSize: "17px", fontWeight: "700" }}>
                    <Link href={routes.business(partner.business.slug)} style={{ color: "var(--ink)" }}>
                      {partner.business.name}
                    </Link>
                  </span>
                  <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>{partner.business.category.name}</span>
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------------ costs */}
        {costRows.length > 0 ? (
          <section id="costs" aria-labelledby="cost-h2" style={{ background: "var(--paper)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
            <div
              data-shell=""
              data-split=""
              style={{ ...shell, display: "grid", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)", gap: "48px", alignItems: "start" }}
            >
              <div data-reveal="">
                <Kicker>Local pricing</Kicker>
                <h2 id="cost-h2" style={{ ...H2S, marginBottom: "18px" }}>
                  {accent(`What do home services cost in ${city.name}?`, `in ${city.name}?`)}
                </h2>
                <p style={{ fontSize: "16.5px", lineHeight: "1.7", color: "var(--text-secondary)", textWrap: "pretty" }}>
                  Typical ranges local companies quote, updated with each review of this page. They are not quotes: a real
                  price depends on the property and every company prices it differently.
                </p>
                <div style={{ marginTop: "14px" }}>
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
              </div>
              <div
                data-reveal=""
                style={{ border: "1px solid var(--border-subtle)", borderRadius: "22px", background: "var(--surface-card)", boxShadow: "0 30px 60px -44px rgba(16,31,61,0.5)", overflow: "hidden" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
                  <p style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }} aria-hidden="true">
                    Typical {city.name} range
                  </p>
                  {drawBars ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)" }}>
                      <span aria-hidden="true" style={{ width: "18px", height: "6px", borderRadius: "99px", background: "linear-gradient(90deg, var(--color-primary), var(--gold-ink))" }} />
                      Shared log scale
                    </span>
                  ) : null}
                </div>
                <table data-costs="">
                  <thead>
                    <tr>
                      <th scope="col">Service</th>
                      <th scope="col">Typical {city.name} range</th>
                      <th scope="col">What moves the price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costRows.map((row, index) => {
                      const range = row.lowPrice && row.highPrice;
                      const bar = drawBars && range && row.lowPrice! > 0 && row.highPrice! >= row.lowPrice! ? barFor(row.lowPrice!, row.highPrice!) : null;
                      return (
                        <tr key={row.id} data-trow="">
                          <th scope="row" style={{ fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>
                            {row.label}
                          </th>
                          <td>
                            {range ? (
                              <span style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "14.5px", fontWeight: "700", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                                <span>
                                  {money(row.lowPrice!, row.currency)}
                                  <span style={SR_ONLY}> to </span>
                                </span>
                                <span>{money(row.highPrice!, row.currency)}</span>
                              </span>
                            ) : (
                              <span style={{ fontSize: "14.5px", fontWeight: "700", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                                {row.typical ? money(row.typical, row.currency) : "On request"}
                              </span>
                            )}
                            {bar ? (
                              <span aria-hidden="true" style={{ position: "relative", display: "block", height: "8px", marginTop: "7px", borderRadius: "99px", background: "rgba(16,31,61,0.07)" }}>
                                <span
                                  data-cbar=""
                                  style={{ ["--i" as string]: index, position: "absolute", top: "0", bottom: "0", left: `${bar.left.toFixed(1)}%`, width: `${bar.width.toFixed(1)}%`, borderRadius: "99px", background: "linear-gradient(90deg, var(--color-primary), var(--gold-ink))" }}
                                />
                              </span>
                            ) : null}
                          </td>
                          {row.note ? (
                            <td style={{ fontSize: "13.5px", lineHeight: "1.55", color: "var(--text-secondary)" }}>{row.note}</td>
                          ) : (
                            <td />
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------ local notes */}
        {conditions.length > 0 ? (
          <section id="local" aria-labelledby="local-h2" style={{ background: "var(--surface-card)" }}>
            <div data-shell="" style={shell}>
              <div data-reveal="" style={{ maxWidth: "760px", marginBottom: "26px" }}>
                <Kicker>Local conditions</Kicker>
                <h2 id="local-h2" style={{ ...H2S, marginBottom: "12px" }}>
                  {accent(`What ${city.name} homeowners should know`, "should know")}
                </h2>
                <p style={{ fontSize: "16.5px", lineHeight: "1.65", color: "var(--text-secondary)" }}>
                  Local conditions shape both the work and the paperwork.
                </p>
              </div>
              <ul data-stagger="" style={gridOf(320)}>
                {conditions.map((condition, index) => (
                  <li
                    key={condition.title}
                    data-card=""
                    style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "22px", borderRadius: "22px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}
                  >
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <Tile
                        d={condition.iconKey && hasIcon(condition.iconKey) ? ICON_PATHS[condition.iconKey] : CONDITION_FALLBACK[index % CONDITION_FALLBACK.length]}
                        size={46}
                        icon={21}
                        tone="blue"
                        tenSize={24}
                      />
                      <span className="serif-accent" aria-hidden="true" style={{ fontSize: "20px", color: "var(--gold)", letterSpacing: "0" }}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </span>
                    <span style={{ display: "block", minWidth: "0" }}>
                      <h3 style={h3Style(17, { fontWeight: "700", marginBottom: "6px" })}>{condition.title}</h3>
                      <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "var(--text-secondary)", textWrap: "pretty" }}>{condition.body}</p>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------ methodology */}
        <section id="method" aria-labelledby="method-h2" style={{ background: "var(--paper)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div data-shell="" style={shell}>
            <div data-reveal="" style={{ maxWidth: "720px" }}>
              <Kicker>Our process</Kicker>
              <h2 id="method-h2" style={{ ...H2S, marginBottom: "14px" }}>
                {accent(`How we research ${city.name} businesses`, `${city.name} businesses`)}
              </h2>
              <p style={{ fontSize: "16.5px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Each {city.name} list follows the published criteria for its trade. Where a {licenceWord(country.code)}{" "}
                register exists, we check the number against it, and we read recent Google reviews, including the
                complaints. An editor checks every list before it is published.
              </p>
              <Link data-link="" href={routes.page("editorial-standards")} style={LINK_STYLE}>
                Our editorial standards
                <ArrowSvg />
              </Link>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- guides */}
        {guides.length > 0 ? (
          <section id="guides" aria-labelledby="guides-h2" style={{ background: "var(--surface-card)" }}>
            <div data-shell="" style={shell}>
              <div data-reveal="" style={SECTION_HEAD}>
                <div>
                  <Kicker>Homeowner resources</Kicker>
                  <h2 id="guides-h2" style={H2S}>
                    {accent(`Guides for ${city.name} homeowners`, `${city.name} homeowners`)}
                  </h2>
                </div>
                <Link data-link="" href={routes.guidesIndex()} style={LINK_STYLE}>
                  All guides
                  <ArrowSvg />
                </Link>
              </div>
              <ul data-stagger="" style={gridOf(300)}>
                {guides.slice(0, 3).map((guide) => (
                  <li
                    key={guide.id}
                    data-card=""
                    style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "22px", borderRadius: "22px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}
                  >
                    <span style={{ alignSelf: "flex-start", padding: "4px 10px", borderRadius: "999px", background: "var(--paper)", border: "1px solid var(--border-subtle)", fontSize: "11px", fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                      {guide.category?.serviceName ?? "Guide"}
                    </span>
                    <h3 style={h3Style(17.5, { lineHeight: "1.3", fontWeight: "700", letterSpacing: "-0.02em", textWrap: "balance" })}>
                      <Link href={routes.guide(guide.slug)} style={{ color: "var(--ink)" }}>
                        {guide.title}
                      </Link>
                    </h3>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ----------------------------------------------------------- nearby */}
        {nearbyCities.length > 0 ? (
          <section id="nearby" aria-labelledby="near-h2" style={{ background: "var(--surface-card)" }}>
            <div data-shell="" style={shell}>
              <h2 data-reveal="" id="near-h2" style={{ ...H2S, marginBottom: "26px" }}>
                {accent(`Cities near ${city.name}`, city.name)}
              </h2>
              <ul data-stagger="" style={{ ...gridOf(230, 12), marginBottom: "28px" }}>
                {nearbyCities.map((near) => (
                  <li key={near.id}>
                    <Link
                      data-card=""
                      href={routes.city(country.code, near.region.slug, near.slug)}
                      style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 18px", borderRadius: "18px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)" }}
                    >
                      <Tile d={ICO.pin} size={42} radius={12} icon={19} tone="blue" ten={false} stroke={1.75} />
                      <span style={{ flex: "1", minWidth: "0" }}>
                        <span style={{ display: "block", fontSize: "16px", fontWeight: "700", color: "var(--ink)" }}>{near.name}</span>
                        {near.county ? <span style={{ display: "block", fontSize: "12.5px", color: "var(--text-secondary)" }}>{near.county}</span> : null}
                      </span>
                      <span style={{ color: "var(--color-primary)", display: "inline-flex" }}>
                        <ArrowSvg size={15} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div
                data-reveal=""
                style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px", flexWrap: "wrap", padding: "22px 24px", borderRadius: "22px", background: "var(--ink)" }}
              >
                <p style={{ fontSize: "18px", fontWeight: "700", color: "#fff" }}>
                  Explore more in{" "}
                  <span className="serif-accent" style={{ color: "var(--gold-ink)", fontSize: "22px", letterSpacing: "0" }}>
                    {region.name}
                  </span>
                </p>
                <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <li>
                    <Link
                      data-btn=""
                      href={routes.region(country.code, region.slug)}
                      style={{ display: "inline-flex", alignItems: "center", minHeight: "40px", padding: "0 15px", borderRadius: "999px", background: "var(--gold-ink)", fontSize: "14px", fontWeight: "700", color: "var(--ink)" }}
                    >
                      {region.name} hub
                    </Link>
                  </li>
                  {nearbyCities.slice(0, 4).map((near) => (
                    <li key={near.id}>
                      <Link
                        data-btn=""
                        href={routes.city(country.code, near.region.slug, near.slug)}
                        style={{ display: "inline-flex", alignItems: "center", minHeight: "40px", padding: "0 15px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.2)", fontSize: "14px", color: "#fff" }}
                      >
                        {near.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------------- faqs */}
        <section id="faqs" aria-labelledby="faq-h2" style={{ background: "var(--paper)", borderTop: "1px solid var(--border-subtle)" }}>
          <div
            data-shell=""
            data-split=""
            style={{ ...shell, display: "grid", gridTemplateColumns: "minmax(0, 0.75fr) minmax(0, 1.25fr)", gap: "48px", alignItems: "start" }}
          >
            <div data-reveal="" data-faq-head="" style={{ position: "sticky", top: "150px" }}>
              <Kicker>FAQs</Kicker>
              <h2 id="faq-h2" style={{ ...H2S, fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: "1.06" }}>
                {accent(`Hiring in ${city.name}: questions`, "questions")}
              </h2>
            </div>
            <FaqList faqs={faqs} numbered />
          </div>
        </section>

      </div>
    </SiteChrome>
  );
}

/* ------------------------------------------------------------ local helpers */

/** The place at the end of the heading, in the serif accent with the gold rule under it. */
function PlaceAccent({ text, place }: { text: string; place: string }) {
  const at = text.lastIndexOf(place);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span
        className="serif-accent"
        style={{ position: "relative", display: "inline-block", isolation: "isolate", paddingRight: "0.06em", letterSpacing: "-0.02em" }}
      >
        {place}
        <span
          data-uline=""
          aria-hidden="true"
          style={{ position: "absolute", left: "0", right: "0.06em", bottom: "0.04em", height: "0.12em", borderRadius: "99px", background: "var(--gold-ink)", zIndex: -1 }}
        />
      </span>
      {text.slice(at + place.length)}
    </>
  );
}

function Glyph({ d, color, size = 17 }: { d: string; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function TrustItem({ children, gap = "8px" }: { children: ReactNode; gap?: string }) {
  return (
    <li style={{ display: "inline-flex", alignItems: "center", gap, minHeight: "40px", fontSize: "14px", fontWeight: "600", color: "var(--ink)" }}>
      {children}
    </li>
  );
}

/** A five-star row with the rating's share of it filled. */
function Stars({ rating }: { rating: number }) {
  const pct = `${Math.max(0, Math.min(100, (rating / 5) * 100)).toFixed(1)}%`;
  const row = (fill: string) => (
    <svg viewBox="0 0 120 24" width="76" height="15" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      {[0, 24, 48, 72, 96].map((x) => (
        <path key={x} transform={`translate(${x} 0)`} d={ICO.star} fill={fill} />
      ))}
    </svg>
  );
  return (
    <span aria-hidden="true" style={{ position: "relative", display: "inline-block", width: "76px", height: "15px", flexShrink: 0 }}>
      {row("rgba(16,31,61,0.14)")}
      <span style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: pct, overflow: "hidden" }}>{row("#D99A1C")}</span>
    </span>
  );
}

/** One line of the guide's record: an icon tile, the label and the value. */
function Fact({ d, label, children }: { d: string; label: string; children: ReactNode }) {
  return (
    <div data-hov="" style={{ position: "relative", minHeight: "38px", paddingLeft: "50px" }}>
      <Tile d={d} size={38} radius={11} icon={18} tone="blue" ten={false} stroke={1.75} style={{ position: "absolute", left: "0", top: "0" }} />
      <dt style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginBottom: "2px" }}>{label}</dt>
      <dd style={{ margin: "0", fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>{children}</dd>
    </div>
  );
}
