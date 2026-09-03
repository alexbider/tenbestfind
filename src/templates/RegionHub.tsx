import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { InfoModal } from "@/components/site/InfoModal";
import { SiteChrome } from "@/components/site/SiteChrome";
import {
  Chevron,
  Crumbs,
  Eyebrow,
  FaqItem,
  FinalSearchBand,
  GRID_BACKDROP,
  SHELL,
  SR_ONLY,
  TenOutline,
} from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd, Media } from "@/components/ui/primitives";
import { compactNumber, fullDate, monthYear, priceRange, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { parseJson, type ConditionRow, type LicensingRow } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

const SECTION = { ...SHELL, padding: "64px 24px" };
const SECTION_H2 = { fontSize: "clamp(26px, 3vw, 36px)", fontWeight: "700" };
const SECTION_HEAD = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "24px",
  flexWrap: "wrap" as const,
};
const CARD = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "18px",
  boxShadow: "var(--shadow-sm)",
};
const ICON_TILE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  background: "var(--blue-50)",
  color: "var(--color-primary)",
};
const DARK_CELL = {
  padding: "14px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

export async function RegionHub({
  countryCode,
  regionSlug,
}: {
  countryCode: string;
  regionSlug: string;
}) {
  // A moved region keeps its inbound links: the redirect table is consulted
  // before this path is allowed to 404.
  const path = routes.region(countryCode, regionSlug);

  const country = await db.country.findUnique({ where: { code: countryCode } });
  if (!country) {
    await redirectIfKnown(path);
    notFound();
  }

  const region = await db.region.findUnique({
    where: { countryId_slug: { countryId: country.id, slug: regionSlug } },
    include: {
      country: true,
      cities: { where: { published: true }, orderBy: [{ topMetro: "desc" }, { sortOrder: "asc" }] },
    },
  });
  if (!region || !region.published) {
    await redirectIfKnown(path);
    notFound();
  }

  const [rankings, allRankings, costRows, guides, businessCount, siblingRegions] = await Promise.all([
    db.ranking.findMany({
      where: { status: "PUBLISHED", regionId: region.id },
      orderBy: { lastReviewedAt: "desc" },
      take: 6,
      select: rankingCardSelect,
    }),
    // Just enough of every published ranking in the region to count them by
    // city and by category.
    db.ranking.findMany({
      where: { status: "PUBLISHED", regionId: region.id },
      select: {
        id: true,
        cityId: true,
        category: { select: { id: true, name: true, slug: true, iconKey: true } },
      },
    }),
    db.costRow.findMany({
      where: { city: { regionId: region.id } },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 4,
      include: { category: { select: { serviceName: true } }, author: { select: { name: true } } },
    }),
    db.business.count({ where: { status: "PUBLISHED", city: { regionId: region.id } } }),
    db.region.findMany({
      where: { countryId: country.id, published: true, NOT: { id: region.id } },
      orderBy: { sortOrder: "asc" },
      take: 8,
      include: { _count: { select: { cities: true } } },
    }),
  ]);

  const licensing = parseJson<LicensingRow[]>(region.licensing, []);
  const conditions = parseJson<ConditionRow[]>(region.conditions, []);
  const unitLabel = country.regionLabel === "provinces" ? "province" : "state";
  const metros = region.cities.filter((city) => city.topMetro);
  const otherCities = region.cities.filter((city) => !city.topMetro);
  const icon = (key: string | null | undefined): IconName =>
    key && hasIcon(key) ? (key as IconName) : "house";

  const rankingsByCity = new Map<string, number>();
  const byCategory = new Map<string, { name: string; slug: string; iconKey: string; count: number }>();
  for (const entry of allRankings) {
    if (entry.cityId) rankingsByCity.set(entry.cityId, (rankingsByCity.get(entry.cityId) ?? 0) + 1);
    const existing = byCategory.get(entry.category.id);
    if (existing) existing.count += 1;
    else
      byCategory.set(entry.category.id, {
        name: entry.category.name,
        slug: entry.category.slug,
        iconKey: entry.category.iconKey,
        count: 1,
      });
  }
  const services = [...byCategory.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  const lastReviewed = rankings[0]?.lastReviewedAt ?? rankings[0]?.publishedAt ?? null;

  const faqs = [
    {
      id: "coverage",
      question: `How does TenBestFind choose which ${region.name} cities to cover?`,
      answer:
        "A market needs enough qualifying businesses and enough verifiable information to make a ranking useful. Where that threshold is not met we publish nothing rather than a thin page, so coverage grows city by city.",
    },
    {
      id: "licensing",
      question: `Which trades does ${region.name} license?`,
      answer:
        licensing.length > 0
          ? `${licensing
              .filter((row) => row.licensed)
              .map((row) => row.trade)
              .join(", ")} are licensed here. ${
              licensing.some((row) => !row.licensed)
                ? `${licensing
                    .filter((row) => !row.licensed)
                    .map((row) => row.trade)
                    .join(", ")} ${licensing.filter((row) => !row.licensed).length === 1 ? "is" : "are"} not licensed at ${unitLabel} level, so insurance certificates and manufacturer certification do that work instead.`
                : ""
            }`
          : `Licensing in ${region.name} varies by trade. Every ranking page lists which authority we checked for that trade, and what the licence actually covers.`,
    },
    {
      id: "cities",
      question: `How many cities in ${region.name} are covered?`,
      answer: `${region.cities.length} ${region.cities.length === 1 ? "city has" : "cities have"} a published hub, and we add more each month working outward from the largest metros. If yours is missing, tell us through the contact form and it goes on the list.`,
    },
    {
      id: "prices",
      question: `Do prices differ across the ${unitLabel}?`,
      answer:
        "Considerably. Labour rates, permit fees and material availability all change between metros, which is why cost figures are published per market rather than as a single statewide average.",
    },
  ];

  const glance = [
    {
      label: "Cities covered",
      value: `${region.cities.length} published ${region.cities.length === 1 ? "hub" : "hubs"}`,
    },
    {
      label: "Active rankings",
      value: `${allRankings.length} Top 10 ${allRankings.length === 1 ? "list" : "lists"}`,
    },
    { label: "Companies reviewed", value: `${compactNumber(businessCount)} across the ${unitLabel}` },
    { label: "Last reviewed", value: lastReviewed ? monthYear(lastReviewed) : "Not yet reviewed" },
  ];

  const sourcesModal = (
    <InfoModal
      label=""
      srLabel="Where our review data comes from"
      title="Where our data comes from"
      points={[
        "Business details come from the company's own listings and public registers",
        "Review counts and ratings are read from Google at the time of the last check",
        "Licence numbers are confirmed with the issuing authority where a register exists",
        "Anything we could not confirm is labelled as reported by the business",
      ]}
      link={{ href: routes.howWeRank(), label: "How we rank" }}
    >
      Every figure on this page traces back to a source we can name, and the date it was last looked
      at is published beside it.
    </InfoModal>
  );

  return (
    <SiteChrome active="locations">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Home services in ${region.name}`,
          url: absoluteUrl(routes.region(country.code, region.slug)),
        }}
      />
      <FaqJsonLd faqs={faqs} />

      {/* ------------------------------------------------------------- hero */}
      <section style={{ ...GRID_BACKDROP, borderBottom: "1px solid var(--border-subtle)" }}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 44px" }}>
          <Crumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Locations", href: routes.locationsIndex() },
              { label: region.name },
            ]}
          />
          <div
            data-split=""
            style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "40px", alignItems: "start" }}
          >
            <div>
              <Eyebrow heroIn="1" gap="16px">
                {unitLabel === "province" ? "Province hub" : "State hub"}
              </Eyebrow>
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
                The best home service companies in {region.name}
              </h1>
              <p
                data-hero-in="3"
                style={{
                  marginTop: "20px",
                  fontSize: "18px",
                  lineHeight: "1.7",
                  color: "var(--text-secondary)",
                  maxWidth: "640px",
                  textWrap: "pretty",
                }}
              >
                {region.blurb ??
                  `Independently researched top ten rankings across ${region.name} metros, with ${unitLabel} licensing context, local cost research and hiring guidance for homeowners.`}
              </p>
              <form
                action={routes.search()}
                method="get"
                role="search"
                aria-label={`Find providers in ${region.name}`}
                data-stack=""
                style={{
                  marginTop: "28px",
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
                <div style={{ flex: "1.1", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px" }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.34-4.34" />
                  </svg>
                  <label htmlFor="s-svc" style={SR_ONLY}>
                    What service do you need?
                  </label>
                  <input
                    id="s-svc"
                    name="service"
                    type="text"
                    placeholder="What service do you need?"
                    style={{
                      width: "100%",
                      border: "0",
                      outline: "none",
                      height: "50px",
                      fontFamily: "var(--font-sans)",
                      fontSize: "16px",
                      color: "var(--text-primary)",
                      background: "transparent",
                    }}
                  />
                </div>
                <div
                  aria-hidden="true"
                  style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }}
                />
                <div style={{ flex: "0.85", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px" }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <label htmlFor="s-city" style={SR_ONLY}>
                    City or postal code
                  </label>
                  <input
                    id="s-city"
                    name="location"
                    type="text"
                    list="region-cities"
                    placeholder={`${region.name} city or ${unitLabel === "province" ? "postal code" : "ZIP"}`}
                    autoComplete="postal-code"
                    style={{
                      width: "100%",
                      border: "0",
                      outline: "none",
                      height: "50px",
                      fontFamily: "var(--font-sans)",
                      fontSize: "16px",
                      color: "var(--text-primary)",
                      background: "transparent",
                    }}
                  />
                  <datalist id="region-cities">
                    {region.cities.map((city) => (
                      <option key={city.id} value={`${city.name}, ${region.code.toUpperCase()}`} />
                    ))}
                  </datalist>
                </div>
                <button
                  type="submit"
                  style={{
                    height: "50px",
                    padding: "0 26px",
                    border: "0",
                    borderRadius: "14px",
                    background: "var(--color-primary)",
                    color: "#fff",
                    fontFamily: "var(--font-sans)",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "var(--shadow-primary)",
                  }}
                >
                  Find top providers
                </button>
              </form>
            </div>

            <div style={{ ...CARD, borderRadius: "20px", overflow: "hidden" }}>
              <div style={{ height: "260px", background: "var(--surface-sunken)" }}>
                <Media src={region.heroImage} alt="" />
              </div>
              <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", margin: "0" }}>
                {glance.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: "16px 18px",
                      borderTop: "1px solid var(--border-subtle)",
                      borderRight: "1px solid var(--border-subtle)",
                    }}
                  >
                    <dt
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        letterSpacing: "var(--ls-wide)",
                        textTransform: "uppercase",
                        color: "var(--text-secondary)",
                        marginBottom: "3px",
                      }}
                    >
                      {item.label}
                    </dt>
                    <dd style={{ margin: "0", fontSize: "16px", fontWeight: "700", color: "var(--blue-900)" }}>
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <ul style={{ ...SHELL, padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
            {[
              { icon: "search" as IconName, label: "Independent research", color: "var(--color-primary)", modal: false },
              { icon: "shield" as IconName, label: "Editorially reviewed", color: "#178054", modal: false },
              { icon: "star" as IconName, label: "Google review data", color: "#D99A1C", modal: true },
              { icon: "refresh" as IconName, label: "Regularly updated", color: "var(--color-primary)", modal: false },
            ].map((item) => (
              <li key={item.label} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "18px 22px 18px 0" }}>
                <span aria-hidden="true" style={{ flexShrink: 0, display: "inline-flex", color: item.color }}>
                  <Icon name={item.icon} size={20} strokeWidth={1.8} />
                </span>
                <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>{item.label}</span>
                {item.modal ? sourcesModal : null}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------------- cities */}
      <section id="cities" aria-labelledby="ci-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <Eyebrow heroIn="1" gap="12px">
            Where we publish
          </Eyebrow>
          <div style={{ ...SECTION_HEAD, marginBottom: "12px" }}>
            <h2 id="ci-h2" style={SECTION_H2}>
              {region.name} cities we cover
            </h2>
            <InfoModal
              label="How we choose markets"
              title="How we choose markets"
              points={[
                "The market needs enough qualifying businesses to make a top ten meaningful",
                "We need verifiable information from primary sources for those businesses",
                "There has to be genuine local context worth writing, not template filler",
                "Repeated searches for an uncovered market flag it for research, not automatic publication",
              ]}
              link={{ href: routes.howWeRank(), label: "Ranking methodology" }}
            >
              We publish a city hub only when we can support it with real research, not because a
              service and a city name can be combined into a URL.
            </InfoModal>
          </div>
          <p
            style={{
              fontSize: "17px",
              lineHeight: "1.7",
              color: "var(--text-secondary)",
              maxWidth: "760px",
              marginBottom: "30px",
            }}
          >
            Each city hub carries its own rankings, cost research and local conditions. Cities without
            enough qualifying businesses are not published, so this list grows deliberately.
          </p>

          {metros.length > 0 ? (
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {metros.map((city) => {
                const count = rankingsByCity.get(city.id) ?? 0;
                return (
                  <li
                    key={city.id}
                    data-card=""
                    style={{ ...CARD, padding: "22px 24px", display: "flex", flexDirection: "column", gap: "10px" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                      <span aria-hidden="true" style={{ ...ICON_TILE, width: "44px", height: "44px" }}>
                        <Icon name="pin" size={21} strokeWidth={1.8} />
                      </span>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          background: "var(--amber-50)",
                          border: "1px solid #EBCE95",
                          fontSize: "11px",
                          fontWeight: "700",
                          letterSpacing: "var(--ls-wide)",
                          textTransform: "uppercase",
                          color: "#8A5F0B",
                        }}
                      >
                        {count} {count === 1 ? "ranking" : "rankings"}
                      </span>
                    </span>
                    <h3 style={{ fontSize: "19px", fontWeight: "700" }}>
                      <Link href={routes.city(country.code, region.slug, city.slug)} style={{ color: "var(--blue-900)" }}>
                        {city.name}, {region.code.toUpperCase()}
                      </Link>
                    </h3>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      {city.county ? `${city.county} · ${region.name}` : region.name}
                    </p>
                    {city.blurb ? (
                      <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{city.blurb}</p>
                    ) : null}
                    <Link
                      href={routes.city(country.code, region.slug, city.slug)}
                      style={{ marginTop: "auto", paddingTop: "8px", fontSize: "15px", fontWeight: "600" }}
                    >
                      Explore {city.name} →
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {otherCities.length > 0 ? (
            <div
              style={{
                marginTop: "24px",
                padding: "22px 26px",
                background: "var(--surface-page)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "18px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}>
                Other {region.name} markets with published rankings
              </h3>
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px" }}>
                {otherCities.map((city) => (
                  <li key={city.id}>
                    <Link
                      data-row=""
                      href={routes.city(country.code, region.slug, city.slug)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        padding: "10px 13px",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "12px",
                        background: "var(--surface-card)",
                        fontSize: "15px",
                        fontWeight: "600",
                        color: "var(--blue-900)",
                        textDecoration: "none",
                      }}
                    >
                      {city.name}
                      <Chevron />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* --------------------------------------------------------- services */}
      {services.length > 0 ? (
        <section
          id="services"
          aria-labelledby="sv-h2"
          style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div style={SECTION}>
            <div style={{ ...SECTION_HEAD, marginBottom: "28px" }}>
              <h2 id="sv-h2" style={SECTION_H2}>
                Popular home services in {region.name}
              </h2>
              <Link href={routes.servicesIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All service categories →
              </Link>
            </div>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "14px" }}>
              {services.map((service) => (
                <li key={service.slug}>
                  <Link
                    data-card=""
                    href={routes.category(service.slug)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "20px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "16px",
                      boxShadow: "var(--shadow-xs)",
                      textDecoration: "none",
                    }}
                  >
                    <span aria-hidden="true" style={{ ...ICON_TILE, flexShrink: 0, width: "42px", height: "42px" }}>
                      <Icon name={icon(service.iconKey)} size={20} strokeWidth={1.8} />
                    </span>
                    <span style={{ display: "block", minWidth: "0" }}>
                      <span style={{ display: "block", fontSize: "16px", fontWeight: "700", color: "var(--blue-900)" }}>
                        {service.name}
                      </span>
                      <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {service.count} {service.count === 1 ? "ranking" : "rankings"} in {region.name}
                      </span>
                    </span>
                    <span style={{ marginLeft: "auto", display: "inline-flex", color: "var(--color-primary)" }}>
                      <Chevron />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- conditions */}
      {conditions.length > 0 ? (
        <section id="conditions" aria-labelledby="co-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <Eyebrow heroIn="1" gap="12px">
              {unitLabel === "province" ? "Provincewide conditions" : "Statewide conditions"}
            </Eyebrow>
            <h2 id="co-h2" style={{ ...SECTION_H2, marginBottom: "12px" }}>
              What {region.name} homeowners should know
            </h2>
            <p
              style={{
                fontSize: "17px",
                lineHeight: "1.7",
                color: "var(--text-secondary)",
                maxWidth: "780px",
                marginBottom: "32px",
              }}
            >
              These are the factors that shape service demand and pricing across the whole {unitLabel},
              before you get to anything a single city adds.
            </p>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {conditions.map((item) => (
                <li key={item.title} data-card="" style={{ ...CARD, padding: "24px", display: "flex", gap: "16px" }}>
                  <span aria-hidden="true" style={{ ...ICON_TILE, flex: "0 0 44px", width: "44px", height: "44px" }}>
                    <Icon name={icon(item.iconKey)} size={21} strokeWidth={1.8} />
                  </span>
                  <span style={{ display: "block" }}>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "5px" }}>{item.title}</h3>
                    <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{item.body}</p>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------- licensing */}
      {licensing.length > 0 ? (
        <section id="licensing" aria-labelledby="li-h2" style={{ background: "var(--blue-900)", color: "var(--text-on-ink)" }}>
          <div
            data-split=""
            style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: "44px", alignItems: "start" }}
          >
            <div>
              <p
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                  letterSpacing: "var(--ls-wider)",
                  textTransform: "uppercase",
                  color: "#E8B551",
                  marginBottom: "14px",
                }}
              >
                <Icon name="shield" size={16} strokeWidth={2} />
                Licensing in {region.name}
              </p>
              <h2
                id="li-h2"
                style={{
                  fontSize: "clamp(24px, 2.8vw, 34px)",
                  lineHeight: "1.2",
                  fontWeight: "700",
                  color: "#fff",
                  marginBottom: "16px",
                }}
              >
                Which trades {region.name} licenses, and which it does not
              </h2>
              <p style={{ fontSize: "17px", lineHeight: "1.75", color: "rgba(232,237,245,0.82)", marginBottom: "18px" }}>
                {region.name} licenses some trades at {unitLabel} level and leaves others to
                municipalities or to no formal register at all. That changes how much weight a licence
                claim carries, and how hard you should verify it yourself.
              </p>
              <p style={{ fontSize: "15px", lineHeight: "1.7", color: "rgba(232,237,245,0.7)" }}>
                We record what we could verify per business and label the rest as reported. Always
                confirm current status with the issuing agency before signing.
              </p>
              <div style={{ marginTop: "8px" }}>
                <InfoModal
                  label="How we verify licences"
                  title="How we verify licences"
                  points={[
                    "Where a trade is licensed we check the number against the issuing register",
                    "Where no register exists we verify insurance and voluntary certifications instead",
                    "Anything we cannot confirm is labelled as reported by the business",
                    "Expired credentials stay visible with their date range rather than disappearing",
                  ]}
                  link={{ href: `${routes.howWeRank()}#verification`, label: "How we verify" }}
                >
                  Where a trade is licensed we check the number against the issuing agency and record
                  the date. Where no register exists we say so rather than implying a licence.
                </InfoModal>
              </div>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: "18px",
                overflow: "hidden",
                overflowX: "auto",
              }}
            >
              <table style={{ minWidth: "560px" }}>
                <caption
                  style={{
                    textAlign: "left",
                    padding: "16px 20px",
                    fontSize: "13px",
                    fontWeight: "700",
                    letterSpacing: "var(--ls-wide)",
                    textTransform: "uppercase",
                    color: "rgba(232,237,245,0.6)",
                    borderBottom: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  Licensing at a glance
                </caption>
                <tbody>
                  {licensing.map((row) => (
                    <tr key={row.trade}>
                      <th scope="row" style={{ ...DARK_CELL, fontSize: "15px", fontWeight: "700", color: "#fff" }}>
                        {row.trade}
                      </th>
                      <td style={{ ...DARK_CELL, fontSize: "14px", lineHeight: "1.55", color: "rgba(232,237,245,0.8)" }}>
                        {row.note || (row.authority ? `Licensed by ${row.authority}.` : "")}
                      </td>
                      <td style={DARK_CELL}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: row.licensed ? "rgba(31,157,107,0.22)" : "rgba(217,154,28,0.22)",
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "var(--ls-wide)",
                            textTransform: "uppercase",
                            color: row.licensed ? "#7BE0B4" : "#F0C97A",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.licensed ? `${unitLabel} licensed` : `No ${unitLabel} licence`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- rankings */}
      {rankings.length > 0 ? (
        <section id="rankings" aria-labelledby="ra-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <div style={{ ...SECTION_HEAD, marginBottom: "26px" }}>
              <h2 id="ra-h2" style={SECTION_H2}>
                Recently reviewed in {region.name}
              </h2>
              <Link href={routes.rankingsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All {region.name} rankings →
              </Link>
            </div>
            <ul style={{ borderTop: "1px solid var(--border-subtle)" }}>
              {rankings.map((entry) => (
                <li key={entry.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <Link
                    data-row=""
                    href={rankingUrl(entry)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "18px",
                      padding: "18px 16px",
                      margin: "0 -16px",
                      borderRadius: "12px",
                      textDecoration: "none",
                      color: "var(--text-primary)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        flex: "0 0 auto",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "40px",
                        height: "40px",
                        borderRadius: "11px",
                        background: "var(--amber-50)",
                        color: "#8A5F0B",
                        fontSize: "14px",
                        fontWeight: "700",
                      }}
                    >
                      10
                    </span>
                    <span style={{ flex: "1", minWidth: "240px", fontSize: "17px", fontWeight: "700", color: "var(--blue-900)" }}>
                      {entry.title}
                    </span>
                    <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      {entry.companiesReviewed} evaluated · Reviewed{" "}
                      {shortMonthYear(entry.lastReviewedAt ?? entry.publishedAt)}
                    </span>
                    <Chevron size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ costs */}
      {costRows.length > 0 ? (
        <section
          id="costs"
          aria-labelledby="cs-h2"
          style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            data-split=""
            style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "44px", alignItems: "start" }}
          >
            <div>
              <h2
                id="cs-h2"
                style={{ fontSize: "clamp(24px, 2.8vw, 34px)", lineHeight: "1.2", fontWeight: "700", marginBottom: "16px" }}
              >
                What services cost across {region.name}
              </h2>
              <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Pricing varies between metros, so these are the ranges recorded for the {region.name}{" "}
                markets we cover rather than a single {unitLabel}wide average. Each city hub carries
                its own figures where we have them.
              </p>
              <div>
                <InfoModal
                  label="About these prices"
                  title="About these prices"
                  points={[
                    "Figures come from pricing published by licensed contractors and regional cost data",
                    "Actual pricing depends on scope, materials, labour, permits and property condition",
                    "Nothing here is an estimate or offer from any company",
                    "Ask for multiple written estimates on identical scope before deciding",
                  ]}
                  link={{ href: routes.howWeRank(), label: "How we research costs" }}
                >
                  These are market ranges for budgeting, not quotes.
                </InfoModal>
              </div>
              <p style={{ marginTop: "8px" }}>
                <Link href={routes.guidesIndex()} style={{ fontSize: "16px", fontWeight: "600" }}>
                  Explore all cost guides →
                </Link>
              </p>
            </div>
            <div style={{ ...CARD, overflow: "hidden", overflowX: "auto" }}>
              <table style={{ minWidth: "480px" }}>
                <thead>
                  <tr style={{ background: "var(--surface-page)" }}>
                    {["Service", "Typical range"].map((head) => (
                      <th
                        key={head}
                        scope="col"
                        style={{
                          padding: "13px 24px",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "var(--ls-wide)",
                          textTransform: "uppercase",
                          color: "var(--text-secondary)",
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {costRows.map((row) => (
                    <tr key={row.id}>
                      <th
                        scope="row"
                        style={{
                          padding: "15px 24px",
                          fontSize: "16px",
                          fontWeight: "700",
                          color: "var(--blue-900)",
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        {row.label}
                      </th>
                      <td
                        style={{
                          padding: "15px 24px",
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "var(--blue-900)",
                          borderBottom: "1px solid var(--border-subtle)",
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {priceRange(row.lowPrice, row.highPrice, row.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- guides */}
      {guides.length > 0 ? (
        <section id="guides" aria-labelledby="gu-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <div style={{ ...SECTION_HEAD, marginBottom: "26px" }}>
              <h2 id="gu-h2" style={SECTION_H2}>
                Guides for {region.name} homeowners
              </h2>
              <Link href={routes.guidesIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All guides →
              </Link>
            </div>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "16px" }}>
              {guides.map((guide) => (
                <li
                  key={guide.id}
                  data-card=""
                  style={{ ...CARD, padding: "22px 24px", display: "flex", flexDirection: "column", gap: "10px" }}
                >
                  <span aria-hidden="true" style={{ ...ICON_TILE, width: "40px", height: "40px", borderRadius: "11px" }}>
                    <Icon name="book" size={19} strokeWidth={1.8} />
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "var(--ls-wide)",
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {guide.category?.serviceName ?? "Guides"}
                  </span>
                  <h3 style={{ fontSize: "17px", lineHeight: "1.35", fontWeight: "700" }}>
                    <Link href={routes.guide(guide.slug)} style={{ color: "var(--blue-900)" }}>
                      {guide.title}
                    </Link>
                  </h3>
                  <span style={{ marginTop: "auto", paddingTop: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    {[
                      guide.author ? `By ${guide.author.name}` : null,
                      `Updated ${shortMonthYear(guide.reviewedAt ?? guide.publishedAt)}`,
                      `${guide.readingMinutes} min`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------- nearby */}
      {siblingRegions.length > 0 ? (
        <section
          id="nearby"
          aria-labelledby="nb-h2"
          style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div style={{ ...SHELL, padding: "56px 24px" }}>
            <h2 id="nb-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700", marginBottom: "20px" }}>
              Explore other {country.regionLabel}
            </h2>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
              {siblingRegions.map((sibling) => (
                <li key={sibling.id}>
                  <Link
                    data-row=""
                    href={routes.region(country.code, sibling.slug)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "11px",
                      padding: "15px 18px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "14px",
                      textDecoration: "none",
                      color: "var(--blue-900)",
                    }}
                  >
                    <Icon name="map" size={16} color="#2D74D7" strokeWidth={1.9} />
                    <span style={{ display: "block" }}>
                      <span style={{ display: "block", fontSize: "15px", fontWeight: "600" }}>{sibling.name}</span>
                      <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {sibling._count.cities} city {sibling._count.cities === 1 ? "hub" : "hubs"}
                      </span>
                    </span>
                    <span style={{ marginLeft: "auto", display: "inline-flex" }}>
                      <Chevron />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- faqs */}
      <section id="faqs" aria-labelledby="fq-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          data-split=""
          style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "48px", alignItems: "start" }}
        >
          <h2 id="fq-h2" style={{ fontSize: "clamp(24px, 2.8vw, 34px)", lineHeight: "1.2", fontWeight: "700" }}>
            Finding local businesses in {region.name} FAQs
          </h2>
          <ul style={{ display: "grid", gap: "12px" }}>
            {faqs.map((faq) => (
              <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------- about box */}
      <section aria-labelledby="tr-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "56px 24px" }}>
          <div
            style={{
              background: "var(--surface-page)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "20px",
              padding: "30px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: "20px",
                flexWrap: "wrap",
                marginBottom: "22px",
              }}
            >
              <h2 id="tr-h2" style={{ fontSize: "21px", fontWeight: "700" }}>
                About this {region.name} hub
              </h2>
              {sourcesModal}
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "18px 32px", margin: "0" }}>
              {[
                {
                  icon: "shield" as IconName,
                  label: "Last reviewed",
                  value: lastReviewed ? monthYear(lastReviewed) : "Not yet reviewed",
                },
                { icon: "refresh" as IconName, label: "Last updated", value: fullDate(region.updatedAt) },
                { icon: "users" as IconName, label: "Editorial team", value: "Home services desk" },
                {
                  icon: "pin" as IconName,
                  label: "City hubs published",
                  value: `${region.cities.length} in ${region.name}`,
                },
                {
                  icon: "layers" as IconName,
                  label: "Categories covered",
                  value: `${byCategory.size} in ${region.name}`,
                },
                { icon: "store" as IconName, label: "Companies reviewed", value: compactNumber(businessCount) },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "0 0 34px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <Icon name={item.icon} size={17} strokeWidth={1.8} />
                  </span>
                  <span style={{ display: "block" }}>
                    <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>{item.label}</dt>
                    <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>
                      {item.value}
                    </dd>
                  </span>
                </div>
              ))}
            </dl>
            <div
              style={{
                marginTop: "24px",
                paddingTop: "20px",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <Link
                href={routes.corrections()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "46px",
                  padding: "0 20px",
                  borderRadius: "12px",
                  border: "1.5px solid var(--border-strong)",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "var(--blue-900)",
                }}
              >
                <Icon name="pencil" size={17} strokeWidth={2} />
                Suggest an update
              </Link>
              <Link href={routes.howWeRank()} style={{ fontSize: "15px", fontWeight: "600" }}>
                How we rank
              </Link>
              <Link href={routes.editorialTeam()} style={{ fontSize: "15px", fontWeight: "600" }}>
                Editorial standards
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FinalSearchBand
        heading={`Find the right local pro in ${region.name}`}
        after={
          <Link href={routes.locationsIndex()} style={{ fontSize: "15px", fontWeight: "600", color: "#E8B551" }}>
            Browse all {country.regionLabel} and cities
          </Link>
        }
      />
    </SiteChrome>
  );
}
