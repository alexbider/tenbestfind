import type { Metadata } from "next";
import Link from "next/link";
import { CoverageMap } from "@/components/site/rankings/CoverageMap";
import { RankingsArchive } from "@/components/site/rankings/RankingsArchive";
import type { ArchiveCountry, ArchiveRow, ArchiveTrade } from "@/components/site/rankings/types";
import { SiteChrome } from "@/components/site/SiteChrome";
import { accentTail } from "@/components/ui/Accent";
import { JsonLd } from "@/components/ui/primitives";
import { shortMonthYear } from "@/lib/format";
import { db } from "@/lib/db";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, cityUrl, rankingUrl, routes } from "@/lib/urls";
import { rankingsArchiveCopy, rankingCardTitle } from "@/lib/seo-copy";

export const revalidate = 60;

const copy = rankingsArchiveCopy();

export const metadata: Metadata = {
  title: { absolute: copy.title },
  description: copy.description,
  alternates: { canonical: "/rankings/" },
};

/** The coverage tiles are 30px wide, so each trade gets a short label. */
const SHORT: Record<string, string> = {
  roofing: "Roof",
  electricians: "Elec",
  plumbers: "Plumb",
  hvac: "HVAC",
  "garage-doors": "Garage",
  "chimney-services": "Chimney",
};

function shortLabel(slug: string, name: string): string {
  if (SHORT[slug]) return SHORT[slug];
  const first = name.split(/\s+/)[0] ?? name;
  return first.length > 7 ? first.slice(0, 6) : first;
}

const monthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

const visuallyHidden = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
};

export default async function RankingsIndexPage() {
  const [rankings, categories] = await Promise.all([
    db.ranking.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ lastReviewedAt: "desc" }],
      select: rankingCardSelect,
    }),
    db.category.findMany({
      where: { published: true, rankings: { some: { status: "PUBLISHED" } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const rows: ArchiveRow[] = rankings
    .filter((ranking) => ranking.city)
    .map((ranking) => {
      const city = ranking.city!;
      const reviewed = ranking.lastReviewedAt ?? ranking.publishedAt ?? new Date(0);
      const st = city.region.code.toUpperCase();
      return {
        id: ranking.id,
        href: rankingUrl(ranking),
        title: rankingCardTitle(ranking),
        summary: ranking.summary ?? "",
        trade: ranking.category.name,
        tradeKey: ranking.category.slug,
        place: `${city.name}, ${st}`,
        city: city.name,
        st,
        cityHref: cityUrl(city),
        country: city.region.country.code,
        count: ranking._count.entries,
        updated: shortMonthYear(reviewed),
        monthKey: reviewed.toISOString().slice(0, 7),
        monthLabel: monthLabel(reviewed),
      };
    });

  const countByTrade = new Map<string, number>();
  for (const row of rows) countByTrade.set(row.tradeKey, (countByTrade.get(row.tradeKey) ?? 0) + 1);
  const trades: ArchiveTrade[] = categories
    .filter((category) => countByTrade.has(category.slug))
    .map((category, index) => ({ category, index }))
    .sort((a, b) => (countByTrade.get(b.category.slug) ?? 0) - (countByTrade.get(a.category.slug) ?? 0) || a.index - b.index)
    .map(({ category }) => ({ key: category.slug, name: category.name, short: shortLabel(category.slug, category.name) }));

  const countryNames = new Map<string, string>();
  const countByCountry = new Map<string, number>();
  for (const ranking of rankings) {
    if (!ranking.city) continue;
    const country = ranking.city.region.country;
    countryNames.set(country.code, country.name);
    countByCountry.set(country.code, (countByCountry.get(country.code) ?? 0) + 1);
  }
  const countries: ArchiveCountry[] = [...countryNames.entries()]
    .sort((a, b) => (countByCountry.get(b[0]) ?? 0) - (countByCountry.get(a[0]) ?? 0))
    .map(([code, name]) => ({ code, name }));

  const cityCount = new Set(rows.map((row) => row.cityHref)).size;
  const featured = rows.slice(0, 3);
  const latest = rankings[0]?.lastReviewedAt ?? null;

  return (
    <SiteChrome active="rankings" skin>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "All rankings",
          url: absoluteUrl(routes.rankingsIndex()),
        }}
      />

      <div className="rk-arch">
        <section data-hero="" style={{ position: "relative", background: "var(--paper)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div aria-hidden="true" style={{ position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none" }}>
            <div
              style={{
                position: "absolute",
                inset: "0",
                backgroundImage:
                  "linear-gradient(rgba(16,31,61,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,31,61,0.03) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: "-6%",
                top: "-30%",
                width: "620px",
                height: "620px",
                borderRadius: "50%",
                background: "radial-gradient(closest-side, rgba(45,116,215,0.16), transparent)",
              }}
            />
          </div>
          <div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", padding: "20px 24px 0" }}>
            <nav aria-label="Breadcrumb" style={{ marginBottom: "30px" }}>
              <ol data-rk-crumbs="" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
                <li>
                  <Link href="/" style={{ color: "var(--text-secondary)" }}>
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">›</li>
                <li aria-current="page" style={{ color: "var(--blue-900)", fontWeight: "600" }}>
                  Rankings
                </li>
              </ol>
            </nav>

            <div data-split="" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(0,0.75fr)", gap: "56px", alignItems: "end" }}>
              <div>
                <p data-rk-eyebrow="" style={{ marginBottom: "16px" }}>
                  <i aria-hidden="true" />
                  The full archive
                </p>
                <h1 style={{ fontSize: "clamp(38px, 5.2vw, 64px)", lineHeight: "1.02", letterSpacing: "-0.045em", textWrap: "balance" }}>
                  {accentTail(copy.h1, 2)}
                </h1>
                <p style={{ marginTop: "20px", fontSize: "19px", lineHeight: "1.6", color: "var(--text-secondary)", maxWidth: "620px", textWrap: "pretty" }}>
                  {rankings.length} researched shortlists across {categories.length}{" "}
                  {categories.length === 1 ? "trade" : "trades"}. Each one carries its criteria, its sources and the date an
                  editor last reviewed it.
                </p>
              </div>
              <dl
                data-rk-stats=""
                style={{
                  margin: "0",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "18px",
                  background: "var(--surface-card)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {[
                  { label: "Rankings", value: String(rankings.length), unit: "" },
                  { label: "Cities", value: String(cityCount), unit: "" },
                  { label: "Re-checked", value: "90", unit: "days" },
                ].map((stat, index) => (
                  <div key={stat.label} style={{ padding: "20px 20px 18px", borderRight: index < 2 ? "1px solid var(--border-subtle)" : undefined }}>
                    <dt style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      {stat.label}
                    </dt>
                    <dd style={{ margin: "6px 0 0", fontSize: "34px", fontWeight: "800", letterSpacing: "-0.04em", color: "var(--ink)" }}>
                      {stat.value}
                      {stat.unit ? (
                        <span style={{ fontSize: "15px", fontWeight: "700", letterSpacing: "0", color: "var(--text-secondary)", marginLeft: "4px" }}>
                          {stat.unit}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {featured.length > 0 ? (
              <>
                <div style={{ marginTop: "52px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <h2 data-minih="" style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-0.02em" }}>
                    Just published
                  </h2>
                  {latest ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
                      <span aria-hidden="true" style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--color-success)" }} />
                      Updated {monthLabel(latest)}
                    </span>
                  ) : null}
                </div>
                <ul data-rk-feat-list="" style={{ display: "grid", gap: "16px", marginBottom: "-44px", position: "relative", zIndex: "2" }}>
                  {featured.map((row) => (
                    <li key={row.id} style={{ display: "flex" }}>
                      <Link
                        data-feat=""
                        href={row.href}
                        style={{
                          flex: "1",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "stretch",
                          gap: "14px",
                          padding: "24px",
                          background: "var(--surface-card)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "20px",
                          boxShadow: "var(--shadow-md)",
                          color: "inherit",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                          <span
                            aria-hidden="true"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "46px",
                              height: "46px",
                              borderRadius: "13px",
                              background: "var(--ink)",
                              color: "var(--gold-ink)",
                              fontSize: "17px",
                              fontWeight: "800",
                              letterSpacing: "-0.06em",
                            }}
                          >
                            {row.count}
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-primary)" }}>
                            {row.trade}
                          </span>
                        </span>
                        <span style={{ display: "block", fontSize: "20px", lineHeight: "1.25", fontWeight: "700", letterSpacing: "-0.02em", color: "var(--blue-900)", textWrap: "balance" }}>
                          {row.title}
                        </span>
                        {row.summary ? (
                          <span
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              fontSize: "14.5px",
                              lineHeight: "1.6",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {row.summary}
                          </span>
                        ) : null}
                        <span
                          style={{
                            marginTop: "auto",
                            paddingTop: "12px",
                            borderTop: "1px solid var(--border-subtle)",
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "13px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {row.place}
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600", color: "var(--color-primary)" }}>
                            Read ranking
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                              <path d="M5 12h14" />
                              <path d="m12 5 7 7-7 7" />
                            </svg>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div style={{ height: "44px" }} />
            )}
          </div>
        </section>

        <RankingsArchive rows={rows} trades={trades} countries={countries} />

        {rows.length > 0 ? (
          <section id="coverage" aria-labelledby="cov-h2" style={{ position: "relative", background: "var(--ink)", color: "#fff" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none" }}>
              <div
                style={{
                  position: "absolute",
                  inset: "0",
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
                  backgroundSize: "56px 56px",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: "-12%",
                  top: "-20%",
                  width: "720px",
                  height: "720px",
                  borderRadius: "50%",
                  background: "radial-gradient(closest-side, rgba(45,116,215,0.28), transparent)",
                }}
              />
            </div>
            <div style={{ position: "relative", maxWidth: "1240px", margin: "0 auto", padding: "88px 24px" }}>
              <div data-split="" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "48px", alignItems: "end", marginBottom: "36px" }}>
                <div>
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
                      marginBottom: "14px",
                    }}
                  >
                    <i aria-hidden="true" style={{ display: "inline-block", width: "28px", height: "2px", background: "var(--gold-ink)" }} />
                    Coverage map
                  </p>
                  <h2 id="cov-h2" style={{ fontSize: "clamp(30px, 3.6vw, 46px)", lineHeight: "1.04", color: "#fff", textWrap: "balance" }}>
                    Which trades we cover{" "}
                    <span className="serif-accent" style={{ color: "var(--gold-ink)" }}>
                      in each city
                    </span>
                  </h2>
                </div>
                <p style={{ fontSize: "17px", lineHeight: "1.65", color: "rgba(232,237,245,0.78)", maxWidth: "480px", textWrap: "pretty" }}>
                  Pick a trade to light up every city where it has a published ranking. Gold tiles open the ranking.
                </p>
              </div>

              <CoverageMap rows={rows} trades={trades} countries={countries} />

              <p style={{ fontSize: "15px", color: "rgba(232,237,245,0.7)" }}>
                Missing your city or trade?{" "}
                <Link href={routes.contact()} style={{ color: "var(--gold-ink)", fontWeight: "600" }}>
                  Request coverage
                </Link>
              </p>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="miss-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div data-split="" style={{ maxWidth: "1240px", margin: "0 auto", padding: "72px 24px", display: "grid", gridTemplateColumns: "minmax(0,0.8fr) minmax(0,1.2fr)", gap: "48px", alignItems: "center" }}>
            <div>
              <h2 id="miss-h2" style={{ fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: "1.08", textWrap: "balance" }}>
                Looking for a market we <span className="serif-accent">have not covered?</span>
              </h2>
              <p style={{ marginTop: "14px", fontSize: "17px", lineHeight: "1.7", color: "var(--text-secondary)" }}>
                Tell us the job and where you are, and we will show you the nearest research.
              </p>
            </div>
            <form
              action={routes.search()}
              method="get"
              role="search"
              aria-label="Find a ranking"
              data-stack=""
              style={{
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
              <label style={{ position: "relative", flex: "1.1", padding: "0 14px" }}>
                <span style={visuallyHidden}>What service do you need?</span>
                <input
                  name="service"
                  type="text"
                  placeholder="What service do you need?"
                  style={{ width: "100%", border: "0", outline: "none", height: "52px", fontFamily: "var(--font-sans)", fontSize: "16px", background: "transparent" }}
                />
              </label>
              <span aria-hidden="true" data-divider="" style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }} />
              <label style={{ position: "relative", flex: "1", padding: "0 14px" }}>
                <span style={visuallyHidden}>City or postal code</span>
                <input
                  name="location"
                  type="text"
                  placeholder="City or postal code"
                  style={{ width: "100%", border: "0", outline: "none", height: "52px", fontFamily: "var(--font-sans)", fontSize: "16px", background: "transparent" }}
                />
              </label>
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
                  boxShadow: "var(--shadow-primary)",
                }}
              >
                Find the best
              </button>
            </form>
          </div>
        </section>

        <section aria-labelledby="final-h2" style={{ position: "relative", overflow: "hidden", background: "var(--ink)" }}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-10%",
              bottom: "-40%",
              width: "620px",
              height: "620px",
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(45,116,215,0.3), transparent)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
            <p style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold-ink)", marginBottom: "14px" }}>
              Forty tabs or ten names
            </p>
            <h2 id="final-h2" style={{ fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: "1.08", color: "#fff", textWrap: "balance" }}>
              Tell us the job and the city. We will hand you{" "}
              <span className="serif-accent" style={{ color: "var(--gold-ink)" }}>
                the ten worth calling.
              </span>
            </h2>
            <div style={{ marginTop: "28px", display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              <Link
                href={routes.search()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: "52px",
                  padding: "0 28px",
                  borderRadius: "14px",
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                Show me the ten
              </Link>
              <Link
                href={routes.howWeRank()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: "52px",
                  padding: "0 24px",
                  borderRadius: "14px",
                  border: "1.5px solid rgba(255,255,255,0.28)",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                How we rank
              </Link>
            </div>
          </div>
        </section>
      </div>
    </SiteChrome>
  );
}
