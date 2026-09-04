import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import {
  Arrow,
  Chevron,
  Crumbs,
  FaqItem,
  GRID_BACKDROP,
  SHELL,
  SR_ONLY,
  TenOutline,
} from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd, Media } from "@/components/ui/primitives";
import { countryCopy } from "@/lib/seo-copy";
import { breadcrumbSchema, countryCrumbs } from "@/lib/breadcrumbs";
import { compactNumber, monthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { db } from "@/lib/db";
import { rankingCardSelect } from "@/lib/queries";
import { redirectIfKnown } from "@/lib/redirects";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

// Section heads on this template share one shape: a 640px column with the
// heading and a line of context, and an arrow link pushed to the right.
const SECTION = { ...SHELL, padding: "88px 24px" };
const SECTION_H2 = {
  fontSize: "clamp(28px, 3.2vw, 40px)",
  lineHeight: "1.1",
  fontWeight: "700",
};
const SECTION_HEAD = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "24px",
  flexWrap: "wrap" as const,
  marginBottom: "40px",
};
const SECTION_SUB = {
  marginTop: "14px",
  fontSize: "17px",
  lineHeight: "1.6",
  color: "var(--text-secondary)",
};
const CARD = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  boxShadow: "var(--shadow-xs)",
};
const BTN_FILLED = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  height: "52px",
  padding: "0 24px",
  borderRadius: "12px",
  background: "var(--color-primary)",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  boxShadow: "var(--shadow-primary)",
};
const BTN_OUTLINE = {
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
};
const FIELD = {
  width: "100%",
  border: "0",
  outline: "none",
  height: "52px",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  color: "var(--text-primary)",
  background: "transparent",
};
const SUBMIT = {
  height: "52px",
  border: "0",
  borderRadius: "12px",
  background: "var(--color-primary)",
  color: "#fff",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
};

/** What the three research steps say, in the order the work actually happens. */
const STEPS = [
  {
    n: "01",
    title: "Verify the licence at source",
    body:
      "Every candidate is checked against the register that issues the licence, for an active licence in the class that covers the job a homeowner is hiring for.",
  },
  {
    n: "02",
    title: "Compare on the job that matters",
    body:
      "Service range, emergency response, permit handling and written warranty terms, weighted for what the trade and the local market actually demand.",
  },
  {
    n: "03",
    title: "Publish the criteria with the list",
    body:
      "Ten names go up with the checks behind them, the editor who wrote it, and the date it was last looked at. Anything we could not confirm is left off.",
  },
];

const EEAT = [
  {
    title: "Named editors",
    body: "Every list is written or reviewed by someone on the editorial team, and their name is on the page.",
    cta: "Meet the team",
    href: routes.editorialTeam(),
  },
  {
    title: "Published criteria",
    body: "We publish what we check for each trade, and where the limits of that checking are.",
    cta: "Our methodology",
    href: routes.howWeRank(),
  },
  {
    title: "How we make money",
    body: "Sponsorship is sold separately from the rankings, and every paid placement carries a label.",
    cta: "Advertising disclosure",
    href: routes.advertisingDisclosure(),
  },
  {
    title: "Getting it wrong",
    body: "When a detail is out of date or a licence has lapsed, tell us and the page gets corrected.",
    cta: "Corrections policy",
    href: routes.corrections(),
  },
];

const BIZ_POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "pin",
    title: "Only where you actually work",
    body: "Appear in the metros and areas you genuinely cover, not a national blast.",
  },
  {
    icon: "book",
    title: "A profile that answers questions",
    body: "Services, credentials, coverage area and contact details in one place.",
  },
  {
    icon: "layout",
    title: "Next to the right category",
    body: "Placement beside the exact service people are comparing.",
  },
];

export async function CountryHub({ countryCode }: { countryCode: string }) {
  const country = await db.country.findUnique({
    where: { code: countryCode },
    include: {
      regions: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        include: {
          cities: { where: { published: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!country || !country.published) {
    await redirectIfKnown(routes.country(countryCode));
    notFound();
  }

  const inCountry = { status: "PUBLISHED", city: { region: { countryId: country.id } } } as const;

  const [categories, rankings, allRankings, guides, businessCount, otherCountries] =
    await Promise.all([
      db.category.findMany({
        where: { published: true, featured: true },
        orderBy: [{ sortOrder: "asc" }],
        take: 12,
      }),
      db.ranking.findMany({
        where: inCountry,
        orderBy: [{ lastReviewedAt: "desc" }],
        take: 10,
        select: rankingCardSelect,
      }),
      // Only enough of every published ranking to count them per city and to
      // build the three trade links on a metro card.
      db.ranking.findMany({
        where: inCountry,
        select: {
          id: true,
          category: { select: { name: true, slug: true } },
          city: { select: { id: true, slug: true, region: { select: { slug: true } } } },
        },
      }),
      db.guide.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 6,
        include: {
          category: { select: { serviceName: true } },
          author: { select: { name: true } },
        },
      }),
      db.business.count({ where: { status: "PUBLISHED", city: { region: { countryId: country.id } } } }),
      db.country.findMany({
        where: { published: true, NOT: { id: country.id } },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

  const cities = country.regions.flatMap((region) =>
    region.cities.map((city) => ({ ...city, region })),
  );

  // Rankings per city, so a metro card can show how much work is behind it.
  const byCity = new Map<string, { name: string; href: string }[]>();
  for (const entry of allRankings) {
    if (!entry.city) continue;
    const links = byCity.get(entry.city.id) ?? [];
    links.push({
      name: entry.category.name,
      href: routes.ranking(country.code, entry.city.region.slug, entry.city.slug, entry.category.slug),
    });
    byCity.set(entry.city.id, links);
  }

  const metros = cities.filter((city) => city.topMetro).slice(0, 6);
  const moreCities = cities.filter((city) => !metros.some((m) => m.id === city.id)).slice(0, 10);

  // Region groups mirror the header's Northeast / South / Central split.
  const groups = new Map<string, typeof country.regions>();
  for (const region of country.regions) {
    const key = region.groupName ?? "Regions";
    groups.set(key, [...(groups.get(key) ?? []), region]);
  }

  const isUs = country.code === "us";
  const regionWord = country.regionLabel.replace(/s$/, "");
  const licensingCopy = isUs
    ? "Licensing in the United States is set state by state, and in some trades city by city. So the research starts with the state board: who holds an active licence for this work, what class it is, and whether it covers the job a homeowner is actually hiring for."
    : "Licensing in Canada is set province by province. Electrical and gas work runs through provincial safety authorities, so the research starts there: who holds an active licence, what it covers, and whether workers compensation coverage is current.";

  const faqs = country.faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }));
  const icon = (key: string | null | undefined): IconName =>
    key && hasIcon(key) ? (key as IconName) : "house";

  const copy = countryCopy(country, { publishedRankings: allRankings.length });
  const crumbs = countryCrumbs(country);

  const heroCard = rankings[0];
  const [leadRanking, ...restRankings] = rankings;
  const sideRankings = restRankings.slice(0, 3);
  const latest = rankings.slice(0, 6);
  const [leadGuide, ...sideGuides] = guides;
  const locPlaceholder = isUs ? "City or ZIP code" : "City or postal code";
  const otherCountry = otherCountries[0];

  const guideByline = (guide: (typeof guides)[number]) =>
    [guide.author ? `By ${guide.author.name}` : null, `Updated ${monthYear(guide.reviewedAt ?? guide.publishedAt)}`]
      .filter(Boolean)
      .join(" · ");

  return (
    <SiteChrome active="locations">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: copy.h1,
          description: copy.description,
          url: absoluteUrl(routes.country(country.code)),
        }}
      />
      <JsonLd data={breadcrumbSchema(crumbs, absoluteUrl)} />
      <FaqJsonLd faqs={faqs} />

      {/* ------------------------------------------------------------- hero */}
      <section aria-labelledby="hero-h1" style={GRID_BACKDROP}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 0" }}>
          <Crumbs flush items={crumbs} />
        </div>

        <div
          data-split=""
          style={{
            ...SHELL,
            padding: "40px 24px 60px",
            display: "grid",
            gridTemplateColumns: "1.14fr 0.86fr",
            gap: "60px",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--color-primary)",
                marginBottom: "22px",
                padding: "6px 14px 6px 6px",
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "999px",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "22px",
                  height: "22px",
                  borderRadius: "999px",
                  background: "var(--green-50)",
                  color: "var(--color-success)",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              Independent research across {country.regions.length} {country.regionLabel}
            </p>
            <h1
              data-hero-in="2"
              id="hero-h1"
              style={{
                fontSize: "clamp(38px, 4.6vw, 58px)",
                lineHeight: "1.04",
                fontWeight: "700",
                color: "var(--ink)",
                textWrap: "balance",
              }}
            >
              {copy.h1}
            </h1>
            <p
              data-hero-in="3"
              style={{
                marginTop: "22px",
                fontSize: "19px",
                lineHeight: "1.6",
                color: "var(--text-secondary)",
                maxWidth: "560px",
                textWrap: "pretty",
              }}
            >
              {country.blurb ??
                `Every list starts with the ${regionWord}, because licensing, permits and typical pricing all change at the ${regionWord} line. Choose a ${regionWord}, then a city, and read the shortlist an editor actually researched.`}
            </p>

            <form
              action={routes.search()}
              method="get"
              role="search"
              aria-label="Find local businesses"
              data-stack=""
              style={{
                marginTop: "32px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "16px",
                boxShadow: "var(--shadow-lg)",
                padding: "7px",
              }}
            >
              <input type="hidden" name="country" value={country.code} />
              <div style={{ flex: "1.15", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.34-4.34" />
                </svg>
                <label htmlFor="c-svc" style={SR_ONLY}>
                  What service do you need?
                </label>
                <input
                  id="c-svc"
                  name="service"
                  type="text"
                  autoComplete="off"
                  placeholder="Plumber, roofer, HVAC, movers…"
                  style={FIELD}
                />
              </div>
              <div
                data-divider=""
                aria-hidden="true"
                style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }}
              />
              <div style={{ flex: "1", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <label htmlFor="c-loc" style={SR_ONLY}>
                  Your city
                </label>
                <input
                  id="c-loc"
                  name="location"
                  type="text"
                  autoComplete="off"
                  placeholder={locPlaceholder}
                  style={FIELD}
                />
              </div>
              <button type="submit" style={{ ...SUBMIT, padding: "0 26px", boxShadow: "var(--shadow-primary)" }}>
                Find the best
              </button>
            </form>

            {categories.length > 0 ? (
              <div style={{ marginTop: "22px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)", marginRight: "2px" }}>Popular here:</span>
                {categories.slice(0, 5).map((entry) => (
                  <Link
                    key={entry.id}
                    data-chip=""
                    href={routes.category(entry.slug)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "999px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "var(--text-primary)",
                    }}
                  >
                    {entry.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {heroCard ? (
            <aside
              data-hero-aside=""
              aria-labelledby="hero-preview-h2"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "20px",
                boxShadow: "var(--shadow-xl)",
                overflow: "hidden",
              }}
            >
              <div data-thumb="" style={{ position: "relative", height: "180px", background: "var(--surface-sunken)", overflow: "hidden" }}>
                <Media src={heroCard.city?.heroImage} alt="" />
                <span
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    padding: "5px 11px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(6px)",
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "var(--ls-wide)",
                    textTransform: "uppercase",
                    color: "var(--ink)",
                    pointerEvents: "none",
                  }}
                >
                  Most recently reviewed
                </span>
              </div>
              <div style={{ padding: "22px 24px 24px" }}>
                <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "8px" }}>
                  <span data-eyebrow-rule="" aria-hidden="true" />
                  {heroCard.category.name}
                  {heroCard.city ? ` · ${heroCard.city.name}, ${heroCard.city.region.code.toUpperCase()}` : ""}
                </p>
                <h2 id="hero-preview-h2" style={{ fontSize: "21px", lineHeight: "1.25", fontWeight: "700", marginBottom: "18px" }}>
                  <Link href={rankingUrl(heroCard)} style={{ color: "var(--ink)" }}>
                    {heroCard.title}
                  </Link>
                </h2>
                <ul style={{ display: "grid", gap: "11px" }}>
                  {[
                    `${heroCard.companiesReviewed} companies researched`,
                    "Credentials checked with the issuing authority",
                    "Warranty terms in writing",
                  ].map((point) => (
                    <li key={point} style={{ display: "flex", alignItems: "center", gap: "11px", fontSize: "15px", color: "var(--text-primary)" }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
                <div
                  style={{
                    marginTop: "20px",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Updated {monthYear(heroCard.lastReviewedAt ?? heroCard.publishedAt)}
                  </span>
                  <Link className="arrow-link" href={rankingUrl(heroCard)} style={{ fontSize: "14px" }}>
                    View ranking
                    <Arrow size={15} />
                  </Link>
                </div>
              </div>
            </aside>
          ) : null}
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <ul
            data-trust-strip=""
            style={{ ...SHELL, padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
          >
            {[
              { icon: "house" as IconName, label: `${country.regions.length} ${country.regionLabel} covered` },
              { icon: "pin" as IconName, label: `${cities.length} city hubs published` },
              { icon: "shield" as IconName, label: `${compactNumber(businessCount)} companies researched` },
              { icon: "clock" as IconName, label: "Re-checked every quarter" },
            ].map((item, index, all) => (
              <li
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "11px",
                  padding:
                    index === 0 ? "20px 24px 20px 0" : index === all.length - 1 ? "20px 0 20px 24px" : "20px 24px",
                  borderRight: index === all.length - 1 ? undefined : "1px solid var(--border-subtle)",
                }}
              >
                <Icon name={item.icon} size={20} color="var(--gray-400)" strokeWidth={1.75} />
                <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- categories */}
      {categories.length > 0 ? (
        <section
          aria-labelledby="cats-h2"
          style={{
            background: "var(--surface-page)",
            borderTop: "1px solid var(--border-subtle)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={SECTION}>
            <div style={SECTION_HEAD}>
              <div style={{ maxWidth: "640px" }}>
                <h2 id="cats-h2" style={SECTION_H2}>
                  Browse home services in {country.name}
                </h2>
                <p style={{ ...SECTION_SUB, textWrap: "pretty" }}>
                  Pick the trade, then narrow to your {regionWord} and city. Each category page explains what a licence
                  covers there and what it does not.
                </p>
              </div>
              <Link className="arrow-link" href={routes.servicesIndex()}>
                View all services
                <Arrow />
              </Link>
            </div>
            <ul data-cat-grid="" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "14px" }}>
              {categories.map((entry) => (
                <li
                  key={entry.id}
                  data-card=""
                  style={{ ...CARD, borderRadius: "16px", padding: "22px" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <span aria-hidden="true" style={{ color: "var(--blue-700)", display: "inline-flex" }}>
                      <Icon name={icon(entry.iconKey)} size={24} strokeWidth={1.7} />
                    </span>
                    <Chevron size={16} />
                  </div>
                  <h3
                    data-cat-name=""
                    style={{
                      fontSize: "17px",
                      fontWeight: "700",
                      lineHeight: "1.3",
                      marginBottom: "5px",
                      transition: "color 200ms var(--ease-out)",
                    }}
                  >
                    <Link href={routes.category(entry.slug)} style={{ color: "var(--ink)" }}>
                      {entry.name}
                    </Link>
                  </h3>
                  <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{entry.tagline}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- regions */}
      {groups.size > 0 ? (
        <section aria-labelledby="regions-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <div style={SECTION_HEAD}>
              <div style={{ maxWidth: "640px" }}>
                <h2 id="regions-h2" style={SECTION_H2}>
                  Browse by {regionWord}
                </h2>
                <p style={{ ...SECTION_SUB, textWrap: "pretty" }}>
                  Grouped the way contractors actually work: by region, then by {regionWord}. Open one to see every city
                  we have published, plus the board that licenses the trade there.
                </p>
              </div>
              <Link className="arrow-link" href={routes.locationsIndex()}>
                All {country.regions.length} {country.regionLabel}
                <Arrow />
              </Link>
            </div>
            <div data-region-grid="" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px" }}>
              {[...groups.entries()].map(([title, list]) => (
                <div key={title} style={{ ...CARD, borderRadius: "18px", padding: "24px 22px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "12px",
                      paddingBottom: "12px",
                      marginBottom: "8px",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <h3 style={{ fontSize: "17px", fontWeight: "700" }}>{title}</h3>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {list.length} {list.length === 1 ? regionWord : country.regionLabel}
                    </span>
                  </div>
                  <ul>
                    {list.map((entry) => (
                      <li key={entry.id}>
                        <Link
                          data-row=""
                          href={routes.region(country.code, entry.slug)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            padding: "8px 10px",
                            margin: "0 -10px",
                            borderRadius: "10px",
                            fontSize: "15px",
                            color: "var(--text-primary)",
                          }}
                        >
                          {entry.name}
                          <Chevron />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- metros */}
      {metros.length > 0 ? (
        <section
          aria-labelledby="metros-h2"
          style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div style={SECTION}>
            <div style={SECTION_HEAD}>
              <div style={{ maxWidth: "640px" }}>
                <h2 id="metros-h2" style={SECTION_H2}>
                  Popular {country.name} metros
                </h2>
                <p style={SECTION_SUB}>The cities with the most published rankings right now.</p>
              </div>
              <Link className="arrow-link" href={routes.locationsIndex()}>
                All cities we cover
                <Arrow />
              </Link>
            </div>
            <ul data-metro-grid="" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "18px" }}>
              {metros.map((city) => {
                const links = byCity.get(city.id) ?? [];
                return (
                  <li
                    key={city.id}
                    data-card=""
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "18px",
                      overflow: "hidden",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div data-thumb="" style={{ height: "150px", background: "var(--surface-sunken)", overflow: "hidden" }}>
                      <Media src={city.heroImage} alt="" />
                    </div>
                    <div style={{ padding: "20px 22px 22px" }}>
                      <h3
                        data-cat-name=""
                        style={{ fontSize: "19px", fontWeight: "700", marginBottom: "4px", transition: "color 200ms var(--ease-out)" }}
                      >
                        <Link href={routes.city(country.code, city.region.slug, city.slug)} style={{ color: "var(--ink)" }}>
                          {city.name}, {city.region.code.toUpperCase()}
                        </Link>
                      </h3>
                      <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "14px" }}>
                        {links.length} {links.length === 1 ? "ranking" : "rankings"} · {city.county ?? city.region.name}
                      </p>
                      {links.length > 0 ? (
                        <ul style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                          {links.slice(0, 3).map((link) => (
                            <li key={link.href}>
                              <Link
                                data-chip=""
                                href={link.href}
                                style={{
                                  display: "block",
                                  padding: "6px 12px",
                                  borderRadius: "999px",
                                  border: "1px solid var(--border-subtle)",
                                  fontSize: "13.5px",
                                  fontWeight: "500",
                                  color: "var(--text-primary)",
                                }}
                              >
                                {link.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {moreCities.length > 0 ? (
              <div
                style={{
                  marginTop: "22px",
                  padding: "18px 22px",
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    letterSpacing: "var(--ls-wide)",
                    textTransform: "uppercase",
                    color: "var(--text-secondary)",
                    marginRight: "4px",
                  }}
                >
                  Also covered
                </span>
                {moreCities.map((city) => (
                  <Link
                    key={city.id}
                    data-chip=""
                    href={routes.city(country.code, city.region.slug, city.slug)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "999px",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "var(--ink)",
                    }}
                  >
                    {city.name}, {city.region.code.toUpperCase()}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- featured */}
      {leadRanking ? (
        <section aria-labelledby="feat-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <div style={SECTION_HEAD}>
              <div style={{ maxWidth: "640px" }}>
                <h2 id="feat-h2" style={SECTION_H2}>
                  Popular rankings in {country.name}
                </h2>
                <p style={SECTION_SUB}>The lists people open most this month.</p>
              </div>
              <Link className="arrow-link" href={routes.rankingsIndex()}>
                View all rankings
                <Arrow />
              </Link>
            </div>

            <div data-split="" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "28px", alignItems: "start" }}>
              <article
                data-card=""
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "20px",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div data-thumb="" style={{ position: "relative", height: "320px", background: "var(--surface-sunken)", overflow: "hidden" }}>
                  <Media src={leadRanking.city?.heroImage} alt="" />
                  <span
                    style={{
                      position: "absolute",
                      top: "16px",
                      left: "16px",
                      padding: "6px 13px",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.92)",
                      backdropFilter: "blur(6px)",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "var(--ls-wide)",
                      textTransform: "uppercase",
                      color: "var(--ink)",
                      pointerEvents: "none",
                    }}
                  >
                    {leadRanking.category.name}
                    {leadRanking.city ? ` · ${leadRanking.city.name}, ${leadRanking.city.region.code.toUpperCase()}` : ""}
                  </span>
                </div>
                <div style={{ padding: "28px" }}>
                  <h3 style={{ fontSize: "27px", lineHeight: "1.2", fontWeight: "700", marginBottom: "12px", textWrap: "balance" }}>
                    <Link href={rankingUrl(leadRanking)} style={{ color: "var(--ink)" }}>
                      {leadRanking.title}
                    </Link>
                  </h3>
                  {leadRanking.summary ? (
                    <p style={{ fontSize: "16px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "20px" }}>
                      {leadRanking.summary}
                    </p>
                  ) : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", marginBottom: "20px" }}>
                    {[`${leadRanking.companiesReviewed} companies researched`, "Sources cited"].map((check) => (
                      <span key={check} style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "14px", color: "var(--text-secondary)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        {check}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      paddingTop: "18px",
                      borderTop: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      Updated {monthYear(leadRanking.lastReviewedAt ?? leadRanking.publishedAt)}
                      {leadRanking.author ? ` · By ${leadRanking.author.name}` : ""}
                    </span>
                    <Link className="arrow-link" href={rankingUrl(leadRanking)} style={{ fontSize: "14px" }}>
                      View ranking
                      <Arrow size={15} />
                    </Link>
                  </div>
                </div>
              </article>

              <ul style={{ display: "grid", gap: "16px" }}>
                {sideRankings.map((entry) => (
                  <li
                    key={entry.id}
                    data-card=""
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "18px",
                      boxShadow: "var(--shadow-sm)",
                      display: "flex",
                      gap: "18px",
                      padding: "16px",
                      alignItems: "stretch",
                    }}
                  >
                    <span
                      data-thumb=""
                      style={{
                        flex: "0 0 116px",
                        height: "116px",
                        borderRadius: "12px",
                        overflow: "hidden",
                        background: "var(--surface-sunken)",
                        display: "block",
                      }}
                    >
                      <Media src={entry.city?.heroImage} alt="" />
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "0" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          letterSpacing: "var(--ls-wide)",
                          textTransform: "uppercase",
                          color: "var(--color-primary)",
                        }}
                      >
                        {entry.category.name}
                        {entry.city ? ` · ${entry.city.name}, ${entry.city.region.code.toUpperCase()}` : ""}
                      </span>
                      <h3 style={{ fontSize: "17px", lineHeight: "1.3", fontWeight: "700" }}>
                        <Link href={rankingUrl(entry)} style={{ color: "var(--ink)" }}>
                          {entry.title}
                        </Link>
                      </h3>
                      {entry.summary ? (
                        <span style={{ fontSize: "14px", lineHeight: "1.5", color: "var(--text-secondary)" }}>{entry.summary}</span>
                      ) : null}
                      <span style={{ marginTop: "auto", fontSize: "13px", color: "var(--text-muted)" }}>
                        Updated {monthYear(entry.lastReviewedAt ?? entry.publishedAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- how */}
      <section aria-labelledby="how-h2" style={{ background: "var(--surface-soft)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.82fr 1.18fr", gap: "56px", alignItems: "start" }}
        >
          <div>
            <h2 id="how-h2" style={{ ...SECTION_H2, lineHeight: "1.12", marginBottom: "18px", textWrap: "balance" }}>
              How a {country.name} ranking gets made
            </h2>
            <p style={{ fontSize: "17px", lineHeight: "1.7", color: "var(--text-secondary)", marginBottom: "18px", textWrap: "pretty" }}>
              {licensingCopy}
            </p>
            <p style={{ fontSize: "17px", lineHeight: "1.7", color: "var(--text-secondary)", marginBottom: "28px", textWrap: "pretty" }}>
              From there we compare service range, years working in the metro, how the company quotes, and what customers
              say in public. Ten names go up with the criteria and the date.
            </p>
            <Link href={routes.howWeRank()} style={BTN_FILLED}>
              Read our full methodology
              <Arrow size={17} />
            </Link>
          </div>
          <ol style={{ display: "grid", gap: "14px" }}>
            {STEPS.map((step) => (
              <li
                key={step.n}
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "18px",
                  padding: "26px 28px",
                  display: "flex",
                  gap: "22px",
                  alignItems: "flex-start",
                }}
              >
                <span aria-hidden="true" style={{ flex: "0 0 auto", fontSize: "22px", fontWeight: "700", color: "var(--blue-200)", lineHeight: "1.2" }}>
                  {step.n}
                </span>
                <span style={{ display: "block" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "7px" }}>{step.title}</h3>
                  <p style={{ fontSize: "16px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{step.body}</p>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------------- latest */}
      {latest.length > 0 ? (
        <section aria-labelledby="latest-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <div style={{ ...SECTION_HEAD, marginBottom: "32px" }}>
              <div style={{ maxWidth: "640px" }}>
                <h2 id="latest-h2" style={SECTION_H2}>
                  Latest {country.name} rankings
                </h2>
                <p style={SECTION_SUB}>Newly published and recently re-checked lists.</p>
              </div>
              <Link className="arrow-link" href={routes.rankingsIndex()}>
                Everything we have published
                <Arrow />
              </Link>
            </div>
            <ul style={{ borderTop: "1px solid var(--border-subtle)" }}>
              {latest.map((entry) => (
                <li key={entry.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <Link
                    data-index=""
                    href={rankingUrl(entry)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "52px 200px 1fr auto",
                      alignItems: "center",
                      gap: "24px",
                      padding: "18px 16px",
                      margin: "0 -16px",
                      borderRadius: "12px",
                      color: "var(--text-primary)",
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
                        borderRadius: "12px",
                        background: "var(--gold-soft)",
                        color: "var(--gold)",
                        fontSize: "16px",
                        fontWeight: "700",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      10
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--color-primary)",
                      }}
                    >
                      {entry.category.name}
                      {entry.city ? ` · ${entry.city.name}, ${entry.city.region.code.toUpperCase()}` : ""}
                    </span>
                    <span style={{ display: "block", minWidth: "0" }}>
                      <span style={{ display: "block", fontSize: "18px", lineHeight: "1.3", fontWeight: "700", color: "var(--ink)", marginBottom: "3px" }}>
                        {entry.title}
                      </span>
                      {entry.summary ? (
                        <span style={{ display: "block", fontSize: "15px", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                          {entry.summary}
                        </span>
                      ) : null}
                    </span>
                    <span data-index-meta="" style={{ justifySelf: "end", fontSize: "13px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      Updated {monthYear(entry.lastReviewedAt ?? entry.publishedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- eeat */}
      <section aria-labelledby="eeat-h2" style={{ background: "var(--ink)", color: "var(--text-on-ink)" }}>
        <div
          data-split=""
          style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "56px", alignItems: "start" }}
        >
          <div>
            <h2 id="eeat-h2" style={{ ...SECTION_H2, lineHeight: "1.12", color: "#fff", marginBottom: "16px", textWrap: "balance" }}>
              Who is behind the rankings
            </h2>
            <p style={{ fontSize: "17px", lineHeight: "1.7", color: "rgba(232,237,245,0.72)", textWrap: "pretty" }}>
              Who writes the {country.name} lists, which registers we check, how we make money, and how we fix mistakes.
              All of it is public.
            </p>
          </div>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            {EEAT.map((item) => (
              <li
                key={item.title}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "16px",
                  padding: "24px",
                }}
              >
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>{item.title}</h3>
                <p style={{ fontSize: "15px", lineHeight: "1.6", color: "rgba(232,237,245,0.72)", marginBottom: "14px" }}>
                  {item.body}
                </p>
                <Link className="arrow-link" href={item.href} style={{ color: "var(--gold-ink)" }}>
                  {item.cta}
                  <Arrow size={15} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------------- guides */}
      {leadGuide ? (
        <section
          aria-labelledby="guides-h2"
          style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div style={SECTION}>
            <div style={SECTION_HEAD}>
              <div style={{ maxWidth: "640px" }}>
                <h2 id="guides-h2" style={SECTION_H2}>
                  Know what to ask before you call
                </h2>
                <p style={{ ...SECTION_SUB, textWrap: "pretty" }}>
                  Short guides on comparing quotes, reading a licence properly, and what a fair price looks like.
                </p>
              </div>
              <Link className="arrow-link" href={routes.guidesIndex()}>
                All guides
                <Arrow />
              </Link>
            </div>
            <div data-split="" style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: "28px", alignItems: "start" }}>
              <article
                data-card=""
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "20px",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div data-thumb="" style={{ height: "220px", background: "var(--surface-sunken)", overflow: "hidden" }}>
                  <Media src={leadGuide.heroImage} alt="" />
                </div>
                <div style={{ padding: "26px 28px 28px" }}>
                  <p data-eyebrow="" data-hero-in="1" style={{ marginBottom: "10px" }}>
                    <span data-eyebrow-rule="" aria-hidden="true" />
                    {leadGuide.category?.serviceName ?? "Guides"}
                  </p>
                  <h3 style={{ fontSize: "24px", lineHeight: "1.25", fontWeight: "700", marginBottom: "10px" }}>
                    <Link href={routes.guide(leadGuide.slug)} style={{ color: "var(--ink)" }}>
                      {leadGuide.title}
                    </Link>
                  </h3>
                  {leadGuide.excerpt ? (
                    <p style={{ fontSize: "16px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "16px" }}>
                      {leadGuide.excerpt}
                    </p>
                  ) : null}
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{guideByline(leadGuide)}</p>
                </div>
              </article>
              <ul style={{ display: "grid", gap: "12px" }}>
                {sideGuides.map((guide) => (
                  <li key={guide.id} data-card="" style={{ ...CARD, borderRadius: "16px", padding: "20px 22px" }}>
                    <p
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        marginBottom: "6px",
                      }}
                    >
                      {guide.category?.serviceName ?? "Guides"}
                    </p>
                    <h3 style={{ fontSize: "18px", lineHeight: "1.3", fontWeight: "700", marginBottom: "6px" }}>
                      <Link href={routes.guide(guide.slug)} style={{ color: "var(--ink)" }}>
                        {guide.title}
                      </Link>
                    </h3>
                    {guide.excerpt ? (
                      <p style={{ fontSize: "15px", lineHeight: "1.55", color: "var(--text-secondary)", marginBottom: "8px" }}>
                        {guide.excerpt}
                      </p>
                    ) : null}
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{guideByline(guide)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- faq */}
      {faqs.length > 0 ? (
        <section
          aria-labelledby="faq-h2"
          itemScope
          itemType="https://schema.org/FAQPage"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            data-split=""
            style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: "56px", alignItems: "start" }}
          >
            <div data-faq-sticky="" style={{ position: "sticky", top: "106px" }}>
              <h2 id="faq-h2" style={{ ...SECTION_H2, lineHeight: "1.12", marginBottom: "16px", textWrap: "balance" }}>
                Questions about our {country.name} rankings
              </h2>
              <p style={{ fontSize: "17px", lineHeight: "1.7", color: "var(--text-secondary)", marginBottom: "22px", textWrap: "pretty" }}>
                The things people ask us most about how these lists work.
              </p>
              <Link className="arrow-link" href={routes.contact()}>
                Ask us something else
                <Arrow />
              </Link>
            </div>
            <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
              {faqs.map((faq) => (
                <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- switch */}
      {otherCountry ? (
        <section aria-labelledby="switch-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "64px 24px" }}>
            <div
              data-split=""
              style={{
                display: "grid",
                gridTemplateColumns: "0.9fr 1.1fr",
                gap: "40px",
                alignItems: "center",
                background: "var(--surface-page)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "20px",
                padding: "34px 36px",
              }}
            >
              <div>
                <h2 id="switch-h2" style={{ fontSize: "24px", lineHeight: "1.25", fontWeight: "700", marginBottom: "8px" }}>
                  Looking for a business in {otherCountry.name}?
                </h2>
                <p style={{ fontSize: "16px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                  {otherCountry.name} rankings are researched separately, against {otherCountry.regionLabel.replace(/s$/, "")}
                  {" "}licensing rather than the boards used here.
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Link href={routes.country(otherCountry.code)} style={BTN_FILLED}>
                  Browse {otherCountry.name}
                  <Arrow />
                </Link>
                <Link href={routes.locationsIndex()} style={BTN_OUTLINE}>
                  All locations
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- biz */}
      <section aria-labelledby="biz-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SECTION, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "56px", alignItems: "center" }}
        >
          <div>
            <h2 id="biz-h2" style={{ ...SECTION_H2, lineHeight: "1.12", marginBottom: "16px", textWrap: "balance" }}>
              Own a {country.name} business people are comparing?
            </h2>
            <p style={{ fontSize: "18px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "28px", maxWidth: "500px", textWrap: "pretty" }}>
              Get in front of homeowners in the areas you actually serve, at the point where they are shortlisting.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
              <Link href={routes.advertise()} style={BTN_FILLED}>
                Sponsor your business
              </Link>
              <Link href={routes.addBusiness()} style={BTN_OUTLINE}>
                Submit a business
              </Link>
            </div>
            <p
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "14px 16px",
                borderRadius: "12px",
                background: "var(--surface-page)",
                border: "1px solid var(--border-subtle)",
                fontSize: "14px",
                lineHeight: "1.55",
                color: "var(--text-secondary)",
                maxWidth: "520px",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: "var(--gray-700)",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "var(--ls-wide)",
                  textTransform: "uppercase",
                }}
              >
                Sponsored
              </span>
              Sponsorship buys visibility, not a spot on an editorial list. Paid placements are always labelled.
            </p>
          </div>
          <ul style={{ display: "grid", gap: "14px" }}>
            {BIZ_POINTS.map((point) => (
              <li
                key={point.title}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  ...CARD,
                  borderRadius: "16px",
                  padding: "22px 24px",
                }}
              >
                <span aria-hidden="true" style={{ flexShrink: 0, color: "var(--blue-700)", display: "inline-flex", paddingTop: "2px" }}>
                  <Icon name={point.icon} size={22} strokeWidth={1.7} />
                </span>
                <span style={{ display: "block" }}>
                  <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "4px" }}>{point.title}</h3>
                  <p style={{ fontSize: "15px", lineHeight: "1.55", color: "var(--text-secondary)" }}>{point.body}</p>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ final */}
      <section aria-labelledby="final-h2" style={{ background: "var(--ink)" }}>
        <div style={{ maxWidth: "880px", margin: "0 auto", padding: "88px 24px", textAlign: "center" }}>
          <h2
            id="final-h2"
            style={{
              fontSize: "clamp(28px, 3.2vw, 42px)",
              lineHeight: "1.12",
              fontWeight: "700",
              color: "#fff",
              marginBottom: "14px",
              textWrap: "balance",
            }}
          >
            Find the best local pros in {country.name}
          </h2>
          <p style={{ fontSize: "18px", lineHeight: "1.65", color: "rgba(232,237,245,0.72)", marginBottom: "32px" }}>
            Tell us the job and the city. We will point you at the ten worth calling.
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
              borderRadius: "16px",
              boxShadow: "var(--shadow-xl)",
              padding: "7px",
              textAlign: "left",
            }}
          >
            <input type="hidden" name="country" value={country.code} />
            <div style={{ flex: "1.15", padding: "0 14px" }}>
              <label htmlFor="c-svc2" style={SR_ONLY}>
                Service
              </label>
              <input id="c-svc2" name="service" type="text" placeholder="What do you need done?" style={FIELD} />
            </div>
            <div
              data-divider=""
              aria-hidden="true"
              style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }}
            />
            <div style={{ flex: "1", padding: "0 14px" }}>
              <label htmlFor="c-loc2" style={SR_ONLY}>
                City
              </label>
              <input id="c-loc2" name="location" type="text" placeholder={locPlaceholder} style={FIELD} />
            </div>
            <button type="submit" style={{ ...SUBMIT, padding: "0 28px" }}>
              Find the best
            </button>
          </form>
        </div>
      </section>
    </SiteChrome>
  );
}
