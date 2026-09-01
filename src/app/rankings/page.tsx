import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar, FinalSearch } from "@/components/site/blocks";
import { SearchForm } from "@/components/site/SearchForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { JsonLd, Section, SectionHead } from "@/components/ui/primitives";
import { shortMonthYear } from "@/lib/format";
import { db } from "@/lib/db";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "All rankings — every researched top ten",
  description:
    "Every published TenBestFind ranking, newest first. Each list carries its criteria, its sources and the date an editor last reviewed it.",
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
    <SiteChrome active="rankings">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "All rankings",
          url: absoluteUrl(routes.rankingsIndex()),
        }}
      />
      <CrumbBar items={[{ label: "Home", href: "/" }, { label: "Rankings" }]} />

      <section aria-labelledby="hero-h1" className="index-hero">
        <div className="shell" style={{ padding: "52px var(--gutter) 44px" }}>
          <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(32px, 3.8vw, 46px)" }}>
            Every ranking we have published
          </h1>
          <p className="hero__lead" style={{ maxWidth: 640 }}>
            {rankings.length} researched shortlists across {categories.length}{" "}
            {categories.length === 1 ? "trade" : "trades"}. Each one carries its criteria, its
            sources and the date an editor last reviewed it.
          </p>
          <div style={{ marginTop: 28, maxWidth: 720 }}>
            <SearchForm idPrefix="rankings" />
          </div>
          {categories.length > 1 ? (
            <div className="filter-bar">
              <span style={{ fontSize: 14, color: "var(--text-secondary)", marginRight: 4 }}>By trade:</span>
              {categories.map((category) => (
                <Link key={category.slug} className="chip" href={routes.category(category.slug)}>
                  {category.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <Section labelledBy="list-h2" ruleBottom={false}>
        <SectionHead id="list-h2" title="Newest first" />
        <ul className="index-list">
          {rankings.map((ranking) => (
            <li key={ranking.id}>
              <Link className="index-row" href={rankingUrl(ranking)}>
                <span aria-hidden="true" className="rank-mark">
                  10
                </span>
                <span className="eyebrow">
                  {ranking.category.serviceName} · {ranking.city?.name},{" "}
                  {ranking.city?.region.code.toUpperCase()}
                </span>
                <span style={{ display: "block", minWidth: 0 }}>
                  <span className="index-row__title">{ranking.title}</span>
                  <span className="index-row__summary">{ranking.summary}</span>
                </span>
                <span className="index-row__meta">Updated {shortMonthYear(ranking.lastReviewedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
        {rankings.length === 0 ? (
          <p className="lead">No rankings published yet.</p>
        ) : null}
      </Section>

      <FinalSearch title="Looking for a market we have not covered?" lead="Tell us the job and where you are, and we will show you the nearest research." />
    </SiteChrome>
  );
}
