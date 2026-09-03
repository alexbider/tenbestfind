import type { Metadata } from "next";
import Link from "next/link";
import { InfoModal } from "@/components/site/InfoModal";
import { SiteChrome } from "@/components/site/SiteChrome";
import { ActiveChips, ResultsFilter, ResultsSort } from "@/components/site/ResultsFilter";
import { BusinessLogo } from "@/components/site/BusinessLogo";
import { Chevron, GRID_BACKDROP, SHELL, SR_ONLY, TenOutline } from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { monthYear, shortMonthYear } from "@/lib/format";
import { parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { rankingCardSelect } from "@/lib/queries";
import { loadSeoSettings } from "@/lib/seo-settings";
import { rankingUrl, routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

// Search result pages are thin and effectively infinite, so they are kept out
// of the index by default. The switch is at /admin/seo.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSeoSettings();
  const indexable =
    settings.bool("seo.searchEngineVisible") && !settings.bool("seo.noindexSearch");

  return {
    title: "Search",
    description: "Search researched rankings, business profiles and guides.",
    robots: { index: indexable, follow: true },
  };
}

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

const CARD = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "18px",
  boxShadow: "var(--shadow-sm)",
};
const EYEBROW_H2 = {
  fontSize: "13px",
  fontWeight: "700",
  letterSpacing: "var(--ls-wide)",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
};
const BTN_PRIMARY = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "44px",
  padding: "0 20px",
  borderRadius: "12px",
  background: "var(--color-primary)",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600",
  whiteSpace: "nowrap" as const,
};
const BTN_GHOST = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "44px",
  padding: "0 20px",
  borderRadius: "12px",
  border: "1.5px solid var(--border-strong)",
  fontSize: "14px",
  fontWeight: "600",
  color: "var(--blue-900)",
  whiteSpace: "nowrap" as const,
};
const TRUST: { label: string; icon: IconName; color: string }[] = [
  { label: "Independent research", icon: "search", color: "var(--color-primary)" },
  { label: "Editorially reviewed", icon: "shield", color: "#178054" },
  { label: "Google review data", icon: "star", color: "#D99A1C" },
  { label: "Regularly updated", icon: "refresh", color: "var(--color-primary)" },
];

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const service = params.service?.trim() ?? "";
  const location = params.location?.trim() ?? "";
  const rating = params.rating === "4.5" ? "4.5" : params.rating === "4.0" ? "4.0" : "";
  const minRating = rating === "4.5" ? 4.5 : rating === "4.0" ? 4 : 0;
  const verifiedOnly = params.verified === "1";
  const rankedOnly = params.ranked === "1";
  const emergencyOnly = params.emergency === "1";
  const sort = ["rating", "reviews", "recent"].includes(params.sort ?? "") ? params.sort! : "recommended";
  const tab = ["rankings", "businesses", "guides"].includes(params.tab ?? "") ? params.tab! : "all";

  const serviceTerm = service.toLowerCase();
  const locationTerm = location.split(",")[0]?.trim().toLowerCase() ?? "";

  const [categories, cities] = await Promise.all([
    db.category.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    db.city.findMany({
      where: { published: true },
      include: { region: { include: { country: true } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const matchedCategory = serviceTerm
    ? categories.find(
        (category) =>
          category.slug === serviceTerm ||
          category.name.toLowerCase().includes(serviceTerm) ||
          category.serviceName.toLowerCase().includes(serviceTerm) ||
          category.singular.toLowerCase().includes(serviceTerm),
      )
    : undefined;

  const matchedCity = locationTerm
    ? (cities.find((city) => city.slug === locationTerm || city.name.toLowerCase() === locationTerm) ??
      cities.find((city) => city.name.toLowerCase().includes(locationTerm)))
    : undefined;

  const [rankings, businesses, guides] = await Promise.all([
    db.ranking.findMany({
      where: {
        status: "PUBLISHED",
        ...(matchedCategory ? { categoryId: matchedCategory.id } : {}),
        ...(matchedCity ? { cityId: matchedCity.id } : {}),
      },
      orderBy: { lastReviewedAt: "desc" },
      take: 8,
      select: rankingCardSelect,
    }),
    db.business.findMany({
      where: {
        status: "PUBLISHED",
        ...(matchedCategory ? { categoryId: matchedCategory.id } : {}),
        ...(matchedCity ? { cityId: matchedCity.id } : {}),
        ...(minRating > 0 ? { googleRating: { gte: minRating } } : {}),
        ...(verifiedOnly ? { verified: true } : {}),
        ...(emergencyOnly ? { emergency: true } : {}),
        ...(rankedOnly ? { entries: { some: { ranking: { status: "PUBLISHED" } } } } : {}),
      },
      orderBy:
        sort === "rating"
          ? [{ googleRating: "desc" }]
          : sort === "reviews"
            ? [{ googleReviewCount: "desc" }]
            : sort === "recent"
              ? [{ updatedAt: "desc" }]
              : [{ completeness: "desc" }, { googleRating: "desc" }],
      take: 12,
      include: {
        category: { select: { name: true } },
        city: { select: { name: true, region: { select: { code: true } } } },
        services: { include: { subservice: { select: { name: true } } }, take: 3 },
        entries: {
          where: { ranking: { status: "PUBLISHED" } },
          orderBy: { position: "asc" },
          take: 1,
          include: { ranking: { select: { city: { select: { name: true } } } } },
        },
        placements: { where: { status: "ACTIVE" }, take: 1 },
      },
    }),
    db.guide.findMany({
      where: {
        status: "PUBLISHED",
        ...(matchedCategory ? { categoryId: matchedCategory.id } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 6,
      include: { category: { select: { serviceName: true } } },
    }),
  ]);

  const leadRanking = rankings[0];
  const label = [matchedCategory?.name ?? service, matchedCity ? `${matchedCity.name}, ${matchedCity.region.code.toUpperCase()}` : location]
    .filter(Boolean)
    .join(" in ");

  const counts = {
    all: rankings.length + businesses.length + guides.length,
    rankings: rankings.length,
    businesses: businesses.length,
    guides: guides.length,
  };

  const tabs = [
    { id: "all", name: "All results", count: counts.all },
    { id: "rankings", name: "Rankings", count: counts.rankings },
    { id: "businesses", name: "Businesses", count: counts.businesses },
    { id: "guides", name: "Guides", count: counts.guides },
  ];

  const chips = [
    rating ? { key: "rating", label: `${rating} and up` } : null,
    verifiedOnly ? { key: "verified", label: "Verified only" } : null,
    rankedOnly ? { key: "ranked", label: "In a top ten" } : null,
    emergencyOnly ? { key: "emergency", label: "Emergency service" } : null,
  ].filter((chip): chip is { key: string; label: string } => chip !== null);

  const queryFor = (next: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...next })) {
      if (value) search.set(key, value);
    }
    const query = search.toString();
    return query ? `/search/?${query}` : "/search/";
  };

  const showRankings = (tab === "all" || tab === "rankings") && rankings.length > 0;
  const showBusinesses = (tab === "all" || tab === "businesses") && businesses.length > 0;
  const showGuides = (tab === "all" || tab === "guides") && guides.length > 0;

  const nearby = matchedCity
    ? cities.filter((city) => city.regionId === matchedCity.regionId && city.id !== matchedCity.id).slice(0, 6)
    : cities.filter((city) => city.topMetro).slice(0, 6);

  const orderModal = (
    <InfoModal
      label="How results are ordered"
      title="How results are ordered"
      points={[
        "Recommended puts the most complete, best-evidenced listings first",
        "Sorting by rating or review count orders on Google data alone",
        "A sponsored listing is labelled and never enters a ranked list",
        "Filters narrow what you see; they never change a ranking position",
      ]}
      link={{ href: routes.howWeRank(), label: "How we rank" }}
    >
      Search ordering is not the same thing as an editorial ranking.
    </InfoModal>
  );

  return (
    <SiteChrome active="none">
      {/* ------------------------------------------------------------- hero */}
      <section aria-labelledby="search-h1" style={{ ...GRID_BACKDROP, borderBottom: "1px solid var(--border-subtle)" }}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "28px 24px 24px" }}>
          <h1 id="search-h1" style={{ fontSize: "26px", fontWeight: "700", marginBottom: "16px" }}>
            Search rankings by trade and city
          </h1>
          <form
            action={routes.search()}
            method="get"
            role="search"
            aria-label="Search services and locations"
            data-stack=""
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "18px",
              boxShadow: "var(--shadow-md)",
              padding: "8px",
              maxWidth: "900px",
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
                list="svc-list"
                defaultValue={service}
                placeholder="What service do you need?"
                style={{
                  width: "100%",
                  border: "0",
                  outline: "none",
                  height: "50px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "var(--blue-900)",
                  background: "transparent",
                }}
              />
              <datalist id="svc-list">
                {categories.map((category) => (
                  <option key={category.id} value={category.name} />
                ))}
              </datalist>
            </div>
            <div aria-hidden="true" style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }} />
            <div style={{ flex: "0.9", display: "flex", alignItems: "center", gap: "10px", padding: "0 12px" }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <label htmlFor="s-loc" style={SR_ONLY}>
                Where?
              </label>
              <input
                id="s-loc"
                name="location"
                type="text"
                list="loc-list"
                defaultValue={location}
                placeholder="City or ZIP"
                autoComplete="postal-code"
                style={{
                  width: "100%",
                  border: "0",
                  outline: "none",
                  height: "50px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "var(--blue-900)",
                  background: "transparent",
                }}
              />
              <datalist id="loc-list">
                {cities.map((city) => (
                  <option key={city.id} value={`${city.name}, ${city.region.code.toUpperCase()}`} />
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
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ---------------------------------------------------------- summary */}
      <section aria-label="Search summary" style={{ background: "var(--surface-card)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ ...SHELL, padding: "20px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: "700" }}>{label || "Everything we have published"}</h2>
              <p style={{ marginTop: "6px", fontSize: "15px", color: "var(--text-secondary)" }}>
                Showing rankings, businesses and guides.{" "}
                {service || location ? (
                  <Link href={routes.search()} style={{ fontWeight: "600" }}>
                    Clear search
                  </Link>
                ) : null}
              </p>
            </div>
            {orderModal}
          </div>
          <nav aria-label="Result types" style={{ marginTop: "14px", overflowX: "auto" }}>
            <ul style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "12px" }}>
              {tabs.map((entry) => {
                const active = tab === entry.id;
                return (
                  <li key={entry.id}>
                    <Link
                      href={queryFor({ tab: entry.id === "all" ? undefined : entry.id })}
                      aria-current={active ? "page" : undefined}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        height: "40px",
                        padding: "0 15px",
                        borderRadius: "999px",
                        border: `1px solid ${active ? "var(--color-primary)" : "var(--border-subtle)"}`,
                        background: active ? "var(--blue-50)" : "var(--surface-card)",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: active ? "var(--blue-800)" : "var(--text-primary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.name}
                      <span style={{ fontSize: "12px", fontWeight: "700", opacity: 0.75 }}>{entry.count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </section>

      <div
        data-results-grid=""
        style={{ ...SHELL, padding: "28px 24px 72px", display: "grid", gridTemplateColumns: "264px minmax(0, 1fr)", gap: "32px", alignItems: "start" }}
      >
        <aside data-filters="" aria-label="Filters" style={{ position: "sticky", top: "96px", display: "grid", gap: "14px" }}>
          <ResultsFilter
            rating={rating}
            values={{
              verified: verifiedOnly ? "1" : "",
              ranked: rankedOnly ? "1" : "",
              emergency: emergencyOnly ? "1" : "",
            }}
            activeCount={chips.length}
            rankingHref={leadRanking ? rankingUrl(leadRanking) : undefined}
            rankingLabel={leadRanking?.city ? `See the ten best in ${leadRanking.city.name}` : "See the ten best"}
            evaluated={leadRanking?.companiesReviewed}
          />
        </aside>

        <div style={{ display: "grid", gap: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <p style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--blue-900)" }}>
                {counts.all} {counts.all === 1 ? "result" : "results"}
                {label ? ` for ${label}` : ""}
              </strong>
            </p>
            <ResultsSort value={sort} />
          </div>

          <ActiveChips chips={chips} />

          {showRankings && leadRanking ? (
            <section aria-labelledby="bm-h2">
              <h2 id="bm-h2" style={{ ...EYEBROW_H2, marginBottom: "12px" }}>
                Best match
              </h2>
              <div style={{ background: "var(--surface-card)", border: "1.5px solid var(--color-primary)", borderRadius: "20px", boxShadow: "var(--shadow-md)", padding: "26px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "5px 12px",
                    borderRadius: "999px",
                    background: "var(--amber-50)",
                    border: "1px solid #EBCE95",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#8A5F0B",
                    marginBottom: "14px",
                  }}
                >
                  <Icon name="award" size={13} strokeWidth={2.2} />
                  Top ten ranking
                </span>
                <h3 style={{ fontSize: "24px", lineHeight: "1.25", fontWeight: "700", marginBottom: "10px" }}>
                  <Link href={rankingUrl(leadRanking)} style={{ color: "var(--blue-900)" }}>
                    {leadRanking.title}
                  </Link>
                </h3>
                {leadRanking.summary ? (
                  <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)", maxWidth: "640px", marginBottom: "14px" }}>
                    {leadRanking.summary}
                  </p>
                ) : null}
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "18px" }}>
                  Reviewed {monthYear(leadRanking.lastReviewedAt ?? leadRanking.publishedAt)} ·{" "}
                  {leadRanking.companiesReviewed} companies evaluated
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
                  <Link
                    href={rankingUrl(leadRanking)}
                    style={{ ...BTN_PRIMARY, height: "48px", padding: "0 24px", borderRadius: "14px", fontSize: "15px", boxShadow: "var(--shadow-primary)" }}
                  >
                    View the top ten
                  </Link>
                  {orderModal}
                </div>
              </div>
            </section>
          ) : null}

          {showBusinesses ? (
            <section aria-labelledby="biz-h2">
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
                <h2 id="biz-h2" style={{ fontSize: "20px", fontWeight: "700" }}>
                  {label ? `Companies for ${label}` : "Companies we have researched"}
                </h2>
                <InfoModal
                  label="About Google reviews"
                  title="About Google reviews"
                  points={[
                    "Ratings and counts are read from Google at the time of the last check",
                    "They move between checks, so the date on the page is when they were true",
                    "We do not filter, weight or edit the review text itself",
                    "A rating is one signal, never the ranking on its own",
                  ]}
                  link={{ href: routes.howWeRank(), label: "How we rank" }}
                >
                  Where a rating appears it comes from Google, unedited.
                </InfoModal>
              </div>
              <ul style={{ display: "grid", gap: "14px" }}>
                {businesses.map((business) => {
                  const sponsored = business.placements.length > 0;
                  const entry = business.entries[0];
                  return (
                    <li
                      key={business.id}
                      data-card=""
                      data-biz=""
                      style={{
                        ...CARD,
                        border: `1px solid ${sponsored ? "#EBCE95" : "var(--border-subtle)"}`,
                        padding: "22px 24px",
                        display: "grid",
                        gridTemplateColumns: "56px minmax(0, 1fr) auto",
                        gap: "18px",
                        alignItems: "start",
                      }}
                    >
                      <BusinessLogo name={business.name} url={business.logoUrl} size={56} />
                      <span style={{ display: "block", minWidth: "0" }}>
                        <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "6px" }}>
                          <h3 style={{ fontSize: "19px", fontWeight: "700" }}>
                            <Link href={routes.business(business.slug)} style={{ color: "var(--blue-900)" }}>
                              {business.name}
                            </Link>
                          </h3>
                          {sponsored ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 10px",
                                borderRadius: "999px",
                                border: "1px solid #EBCE95",
                                fontSize: "11px",
                                fontWeight: "700",
                                letterSpacing: "var(--ls-wide)",
                                textTransform: "uppercase",
                                color: "#8A5F0B",
                              }}
                            >
                              Featured partner
                            </span>
                          ) : null}
                        </span>
                        <span style={{ display: "block", fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                          {business.category.name}
                          {business.city ? ` · ${business.city.name}, ${business.city.region.code.toUpperCase()}` : ""}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px 16px", marginBottom: "10px" }}>
                          {business.googleRating ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "var(--text-secondary)" }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="#D99A1C" stroke="none" aria-hidden="true">
                                <path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z" />
                              </svg>
                              <strong style={{ fontWeight: "700", color: "var(--blue-900)", fontVariantNumeric: "tabular-nums" }}>
                                {business.googleRating.toFixed(1)}
                              </strong>
                              on Google · {business.googleReviewCount ?? 0} reviews
                            </span>
                          ) : null}
                          {entry ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 10px",
                                borderRadius: "999px",
                                background: "var(--amber-50)",
                                border: "1px solid #EBCE95",
                                fontSize: "12px",
                                fontWeight: "700",
                                color: "#8A5F0B",
                              }}
                            >
                              <Icon name="award" size={13} strokeWidth={2.2} />#{entry.position}
                              {entry.ranking.city ? ` in ${entry.ranking.city.name}` : ""}
                            </span>
                          ) : null}
                          {business.verified ? (
                            <InfoModal
                              label="Verified business"
                              title="What verified means"
                              points={[
                                "Key business information was confirmed against a primary source",
                                "The date of that check is recorded",
                                "It says nothing about quality, and it is never sold",
                                "Anything we could not confirm is labelled as reported",
                              ]}
                              link={{ href: routes.howWeRank(), label: "How we rank" }}
                            >
                              Verification describes what we checked, not what we recommend.
                            </InfoModal>
                          ) : null}
                        </span>
                        {business.tagline ? (
                          <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "10px" }}>
                            {business.tagline}
                          </p>
                        ) : null}
                        {business.services.length > 0 ? (
                          <span style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {business.services.map((item) => (
                              <span
                                key={item.subserviceId}
                                style={{
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: "8px",
                                  background: "var(--surface-page)",
                                  border: "1px solid var(--border-subtle)",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "var(--text-primary)",
                                }}
                              >
                                {item.subservice.name}
                              </span>
                            ))}
                          </span>
                        ) : null}
                        {sponsored ? (
                          <span style={{ display: "block", marginTop: "6px" }}>
                            <InfoModal
                              label="Why am I seeing this?"
                              title="Why this listing is here"
                              points={[
                                "This company pays for a labelled placement in search results",
                                "It sits outside the editorial list and never enters one",
                                "Payment cannot create or improve a ranking position",
                                "Ending the placement changes nothing editorial",
                              ]}
                              link={{ href: routes.advertisingDisclosure(), label: "Advertising disclosure" }}
                            >
                              Paid visibility, labelled as such.
                            </InfoModal>
                          </span>
                        ) : null}
                      </span>
                      <span style={{ display: "grid", gap: "8px", justifyItems: "stretch" }}>
                        <Link href={routes.business(business.slug)} style={BTN_PRIMARY}>
                          View company
                        </Link>
                        {business.website ? (
                          <a href={business.website} rel="nofollow noopener" target="_blank" style={BTN_GHOST}>
                            Visit website
                          </a>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {showGuides ? (
            <section aria-labelledby="rel-h2">
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
                <h2 id="rel-h2" style={{ ...EYEBROW_H2, whiteSpace: "nowrap" }}>
                  Related results
                </h2>
                <span aria-hidden="true" style={{ flex: "1", height: "1px", background: "var(--border-subtle)" }} />
              </div>
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "14px" }}>
                {guides.map((guide) => (
                  <li key={guide.id} data-card="" style={{ ...CARD, boxShadow: "var(--shadow-xs)", padding: "22px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                      <span
                        aria-hidden="true"
                        style={{
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
                        <Icon name="book" size={19} strokeWidth={1.8} />
                      </span>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          background: "var(--surface-page)",
                          border: "1px solid var(--border-subtle)",
                          fontSize: "11px",
                          fontWeight: "700",
                          letterSpacing: "var(--ls-wide)",
                          textTransform: "uppercase",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {guide.type === "COST" ? "Cost guide" : "Guide"}
                      </span>
                    </span>
                    <h3 style={{ fontSize: "17px", lineHeight: "1.35", fontWeight: "700" }}>
                      <Link href={routes.guide(guide.slug)} style={{ color: "var(--blue-900)" }}>
                        {guide.title}
                      </Link>
                    </h3>
                    {guide.excerpt ? (
                      <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{guide.excerpt}</p>
                    ) : null}
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      Updated {shortMonthYear(guide.reviewedAt ?? guide.publishedAt)}
                    </span>
                    <Link href={routes.guide(guide.slug)} style={{ marginTop: "auto", paddingTop: "8px", fontSize: "14px", fontWeight: "600" }}>
                      Read the guide →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {nearby.length > 0 ? (
            <section aria-labelledby="nb-h2" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "26px" }}>
              <h2 id="nb-h2" style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}>
                Nearby markets
              </h2>
              <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Cities with a published hub. Markets without one are not listed.
              </p>
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "8px" }}>
                {nearby.map((city) => (
                  <li key={city.id}>
                    <Link
                      data-row=""
                      href={routes.city(city.region.country.code, city.region.slug, city.slug)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "11px 14px",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "12px",
                        fontSize: "15px",
                        fontWeight: "600",
                        color: "var(--blue-900)",
                        textDecoration: "none",
                      }}
                    >
                      <Icon name="pin" size={16} color="var(--color-primary)" strokeWidth={1.9} />
                      {city.name}, {city.region.code.toUpperCase()}
                      <span style={{ marginLeft: "auto", display: "inline-flex" }}>
                        <Chevron />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: "22px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}>Related services</h3>
                <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {categories
                    .filter((category) => category.id !== matchedCategory?.id)
                    .slice(0, 6)
                    .map((category) => (
                      <li key={category.id}>
                        <Link
                          href={routes.category(category.slug)}
                          style={{
                            display: "inline-block",
                            padding: "8px 14px",
                            borderRadius: "999px",
                            border: "1px solid var(--border-subtle)",
                            background: "var(--surface-page)",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "var(--blue-900)",
                          }}
                        >
                          {category.name}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            </section>
          ) : null}

          <section aria-labelledby="cov-h2" style={{ background: "var(--blue-50)", border: "1px solid var(--blue-100)", borderRadius: "20px", padding: "24px 26px" }}>
            <h2 id="cov-h2" style={{ fontSize: "17px", fontWeight: "700", marginBottom: "8px" }}>
              Not seeing what you expected?
            </h2>
            <p style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--text-primary)", maxWidth: "680px" }}>
              We publish a ranking only where there are enough qualifying businesses and enough
              verified information to make it useful. Where a market is not yet covered you will see
              businesses, nearby markets and guides instead of an empty page.
            </p>
            <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
              <InfoModal
                label="About search coverage"
                title="About search coverage"
                points={[
                  "A market needs enough qualifying businesses for a top ten to mean anything",
                  "We need verifiable information from primary sources for those businesses",
                  "Where that threshold is not met we publish nothing rather than a thin page",
                  "Repeated searches for an uncovered market flag it for research",
                ]}
                link={{ href: routes.howWeRank(), label: "How we rank" }}
              >
                Coverage grows city by city, and never by generating pages.
              </InfoModal>
              <Link href={routes.contact()} style={{ fontSize: "15px", fontWeight: "600" }}>
                Suggest this ranking →
              </Link>
            </div>
          </section>

          <ul aria-label="Editorial standards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
            {TRUST.map((item) => (
              <li
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "11px",
                  padding: "16px 18px",
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "14px",
                }}
              >
                <span aria-hidden="true" style={{ flexShrink: 0, display: "inline-flex", color: item.color }}>
                  <Icon name={item.icon} size={19} strokeWidth={1.8} />
                </span>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--blue-900)" }}>{item.label}</span>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
            <Link href={routes.howWeRank()} style={{ fontWeight: "600" }}>
              How TenBestFind ranks local businesses
            </Link>
            , our full methodology, including how review data and sponsorship are handled.
          </p>
        </div>
      </div>
    </SiteChrome>
  );
}
