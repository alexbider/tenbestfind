import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar, FinalSearch } from "@/components/site/blocks";
import { SearchForm } from "@/components/site/SearchForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { SHELL } from "@/components/site/page-parts";
import { HeroBackdrop, Tile, autoGrid, heroAccentTail } from "@/components/site/trust/parts";
import { accentTail } from "@/components/ui/Accent";
import { ChevronRight } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
import { shortMonthYear } from "@/lib/format";
import { db } from "@/lib/db";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { rankingsArchiveCopy, rankingCardTitle } from "@/lib/seo-copy";

export const revalidate = 60;

const copy = rankingsArchiveCopy();

export const metadata: Metadata = {
  title: { absolute: copy.title },
  description: copy.description,
  alternates: { canonical: "/rankings/" },
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
      <CrumbBar items={[{ label: "Home", href: "/" }, { label: "Rankings" }]} />

      <div className="tr2 ut2">
        <section aria-labelledby="hero-h1" data-hero="" style={{ position: "relative", overflow: "hidden", background: "var(--paper)", borderBottom: "1px solid var(--border-subtle)" }}>
          <HeroBackdrop />
          <div style={{ ...SHELL, position: "relative", padding: "52px 24px 44px" }}>
            <h1
              id="hero-h1"
              data-in="2"
              style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: "1.08", letterSpacing: "-0.04em", fontWeight: "800", maxWidth: "840px", textWrap: "balance" }}
            >
              {heroAccentTail(copy.h1, 2)}
            </h1>
            <p data-in="3" style={{ marginTop: "18px", maxWidth: "640px", fontSize: "18px", lineHeight: "1.75", color: "var(--text-secondary)", textWrap: "pretty" }}>
              {rankings.length} researched shortlists across {categories.length}{" "}
              {categories.length === 1 ? "trade" : "trades"}. Each one carries its criteria, its
              sources and the date an editor last reviewed it.
            </p>
            <div style={{ marginTop: "28px", maxWidth: "720px" }}>
              <SearchForm idPrefix="rankings" />
            </div>
            {categories.length > 1 ? (
              <div style={{ marginTop: "22px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)", marginRight: "4px" }}>By trade:</span>
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={routes.category(category.slug)}
                    style={{
                      display: "inline-block",
                      padding: "8px 14px",
                      borderRadius: "999px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--surface-card)",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--blue-900)",
                    }}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="list-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL, padding: "56px 24px 72px" }}>
            <h2
              data-reveal=""
              id="list-h2"
              style={{ fontSize: "clamp(26px, 3vw, 36px)", lineHeight: "1.08", fontWeight: "800", letterSpacing: "-0.035em", marginBottom: "24px" }}
            >
              {accentTail("Newest first", 1)}
            </h2>
            <ul data-ag="one" style={autoGrid(520, "12px")}>
              {rankings.map((ranking) => (
                <li key={ranking.id}>
                  <Link
                    data-card=""
                    data-index=""
                    href={rankingUrl(ranking)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto minmax(0, 1fr) auto auto",
                      alignItems: "center",
                      gap: "20px",
                      padding: "20px 24px",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "18px",
                      boxShadow: "var(--shadow-xs)",
                      textDecoration: "none",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Tile icon="award" size={44} iconSize={21} />
                    <span style={{ display: "block", minWidth: "0" }}>
                      <span style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                        {ranking.category.serviceName} · {ranking.city?.name},{" "}
                        {ranking.city?.region.code.toUpperCase()}
                      </span>
                      <span style={{ display: "block", fontSize: "19px", lineHeight: "1.3", fontWeight: "700", color: "var(--blue-900)", marginBottom: "4px" }}>
                        {rankingCardTitle(ranking)}
                      </span>
                      <span style={{ display: "block", fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{ranking.summary}</span>
                    </span>
                    <span data-index-meta="" style={{ whiteSpace: "nowrap", fontSize: "13px", color: "var(--text-secondary)" }}>
                      Updated {shortMonthYear(ranking.lastReviewedAt)}
                    </span>
                    <ChevronRight />
                  </Link>
                </li>
              ))}
            </ul>
            {rankings.length === 0 ? (
              <p style={{ fontSize: "17px", lineHeight: "1.7", color: "var(--text-secondary)" }}>No rankings published yet.</p>
            ) : null}
          </div>
        </section>
      </div>

      <FinalSearch title="Looking for a market we have not covered?" lead="Tell us the job and where you are, and we will show you the nearest research." />
    </SiteChrome>
  );
}
