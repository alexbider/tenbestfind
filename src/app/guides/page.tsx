import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar, FinalSearch } from "@/components/site/blocks";
import { SiteChrome } from "@/components/site/SiteChrome";
import { JsonLd, Media, Section, SectionHead } from "@/components/ui/primitives";
import { monthYear } from "@/lib/format";
import { db } from "@/lib/db";
import { absoluteUrl, routes } from "@/lib/urls";
import { guidesCopy } from "@/lib/seo-copy";

export const revalidate = 60;

const copy = guidesCopy();

export const metadata: Metadata = {
  title: { absolute: copy.title },
  description: copy.description,
  alternates: { canonical: "/guides/" },
};

export default async function GuidesIndexPage() {
  const [guides, categories] = await Promise.all([
    db.guide.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: {
        category: { select: { name: true, slug: true, serviceName: true } },
        author: { select: { name: true, slug: true } },
      },
    }),
    db.category.findMany({
      where: { published: true, guides: { some: { status: "PUBLISHED" } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const costGuides = guides.filter((guide) => guide.type === "COST");
  const editorialGuides = guides.filter((guide) => guide.type === "EDITORIAL");

  return (
    <SiteChrome active="guides">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Guides",
          url: absoluteUrl(routes.guidesIndex()),
        }}
      />
      <CrumbBar items={[{ label: "Home", href: "/" }, { label: "Guides" }]} />

      <section aria-labelledby="hero-h1" className="index-hero">
        <div className="shell" style={{ padding: "52px var(--gutter) 44px" }}>
          <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(32px, 3.8vw, 46px)" }}>
            {copy.h1}
          </h1>
          <p className="hero__lead" style={{ maxWidth: 640 }}>
            Guides on comparing quotes, verifying a licence, and what a fair price looks like.
            Written by named editors, and reviewed by people who have done the work where the trade
            warrants it.
          </p>
          {categories.length > 0 ? (
            <div className="filter-bar">
              <span style={{ fontSize: 14, color: "var(--text-secondary)", marginRight: 4 }}>By service:</span>
              {categories.map((category) => (
                <Link key={category.slug} className="chip" href={routes.category(category.slug)}>
                  {category.serviceName}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {editorialGuides.length > 0 ? (
        <Section labelledBy="ed-h2">
          <SectionHead id="ed-h2" title="How to choose and what to ask" />
          <div className="card-grid">
            {editorialGuides.map((guide) => (
              <article key={guide.id} className="card card--lift" style={{ overflow: "hidden" }}>
                <div className="thumb" style={{ height: 150 }}>
                  <Media src={guide.heroImage} alt="" />
                </div>
                <div style={{ padding: "20px 22px 22px" }}>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>
                    {guide.category?.serviceName ?? "General"}
                  </p>
                  <h3 style={{ fontSize: 18, lineHeight: 1.3, marginBottom: 8 }}>
                    <Link href={routes.guide(guide.slug)} style={{ color: "var(--ink)" }}>
                      {guide.title}
                    </Link>
                  </h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--text-secondary)", marginBottom: 10 }}>
                    {guide.excerpt}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    By {guide.author?.name} · {monthYear(guide.publishedAt)} · {guide.readingMinutes} min
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {costGuides.length > 0 ? (
        <Section tone="page" labelledBy="cost-h2" ruleBottom={false}>
          <SectionHead
            id="cost-h2"
            title="What things cost"
            lead="Sourced ranges with the reasoning behind them, and an honest note wherever we have no figure to publish."
          />
          <div className="card-grid card-grid--2">
            {costGuides.map((guide) => (
              <article key={guide.id} className="card card--lift" style={{ padding: "24px 26px" }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>
                  {guide.category?.serviceName ?? "Cost guide"}
                </p>
                <h3 style={{ fontSize: 20, lineHeight: 1.3, marginBottom: 10 }}>
                  <Link href={routes.guide(guide.slug)} style={{ color: "var(--ink)" }}>
                    {guide.title}
                  </Link>
                </h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: 14 }}>
                  {guide.excerpt}
                </p>
                {guide.typicalLow && guide.typicalHigh ? (
                  <p
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--ink)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    ${guide.typicalLow.toLocaleString()}–${guide.typicalHigh.toLocaleString()}
                  </p>
                ) : null}
                <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
                  By {guide.author?.name} · Updated {monthYear(guide.reviewedAt ?? guide.publishedAt)}
                </p>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      <FinalSearch title="Ready to find someone?" />
    </SiteChrome>
  );
}
