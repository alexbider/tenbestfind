import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { GuideBlock } from "../../../../prisma/data/editorial";
import {
  CheckList,
  CostTable,
  CrumbBar,
  FinalSearch,
  GuideBody,
  LinkGrid,
  SourceList,
  TransparencyBlock,
} from "@/components/site/blocks";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import {
  AiAssistanceDisclosure,
  EditorialDisclosure,
  PricingDisclosure,
} from "@/components/site/disclosures";
import { Icon } from "@/components/ui/Icon";
import { JsonLd, Monogram, Section, SectionHead } from "@/components/ui/primitives";
import { dollars, fullDate, monthYear } from "@/lib/format";
import { parseJson, parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { seoFor } from "@/lib/seo";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { rankingCardSelect } from "@/lib/queries";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

async function loadGuide(slug: string) {
  return db.guide.findUnique({
    where: { slug },
    include: {
      category: true,
      author: true,
      reviewer: true,
      costs: { orderBy: { sortOrder: "asc" } },
      sources: { orderBy: { sortOrder: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await loadGuide(slug);
  if (!guide) return {};
  return seoFor("guide", guide.id, {
    title: guide.title,
    description: guide.excerpt,
    path: routes.guide(guide.slug),
    image: guide.heroImage,
    type: "article",
    publishedAt: guide.publishedAt,
    modifiedAt: guide.reviewedAt ?? guide.updatedAt,
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await loadGuide(slug);
  if (!guide || guide.status !== "PUBLISHED") {
    await redirectIfKnown(routes.guide(slug));
    notFound();
  }

  const blocks = parseJson<GuideBlock[]>(guide.body, []);
  const takeaways = parseList(guide.keyTakeaways);
  const headings = blocks.filter(
    (block): block is Extract<GuideBlock, { kind: "heading" }> => block.kind === "heading",
  );
  const faqs = guide.faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }));
  const isCost = guide.type === "COST";

  const [relatedRankings, relatedGuides] = await Promise.all([
    guide.categoryId
      ? db.ranking.findMany({
          where: { status: "PUBLISHED", categoryId: guide.categoryId },
          orderBy: { lastReviewedAt: "desc" },
          take: 4,
          select: rankingCardSelect,
        })
      : Promise.resolve([]),
    db.guide.findMany({
      where: { status: "PUBLISHED", NOT: { id: guide.id } },
      orderBy: { publishedAt: "desc" },
      take: 4,
      include: { category: { select: { serviceName: true } } },
    }),
  ]);

  return (
    <SiteChrome active="guides">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.excerpt,
          url: absoluteUrl(routes.guide(guide.slug)),
          datePublished: guide.publishedAt?.toISOString(),
          dateModified: (guide.reviewedAt ?? guide.updatedAt).toISOString(),
          author: guide.author ? { "@type": "Person", name: guide.author.name } : undefined,
          reviewedBy: guide.reviewer ? { "@type": "Person", name: guide.reviewer.name } : undefined,
          publisher: { "@type": "Organization", name: "TenBestFind" },
        }}
      />
      <FaqJsonLd faqs={faqs} />

      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "Guides", href: routes.guidesIndex() },
          ...(guide.category
            ? [{ label: guide.category.serviceName, href: routes.category(guide.category.slug) }]
            : []),
          { label: guide.title },
        ]}
      />

      <section aria-labelledby="guide-h1" style={{ background: "var(--surface-page)" }}>
        <div className="shell" style={{ padding: "48px var(--gutter) 40px", maxWidth: 900 }}>
          <p className="eyebrow" style={{ marginBottom: 14 }}>
            {isCost ? "Cost guide" : "Guide"}
            {guide.category ? ` · ${guide.category.serviceName}` : ""}
          </p>
          <h1 id="guide-h1" className="hero__title" style={{ fontSize: "clamp(32px, 3.8vw, 46px)" }}>
            {guide.title}
          </h1>
          <p className="hero__lead" style={{ maxWidth: 680 }}>
            {guide.excerpt}
          </p>
          <ul className="hero-meta" style={{ marginTop: 24 }}>
            {guide.author ? (
              <li>
                <Icon name="pen" size={16} color="var(--gray-400)" />
                By <Link href={routes.expert(guide.author.slug)}>{guide.author.name}</Link>
              </li>
            ) : null}
            {guide.reviewer ? (
              <li>
                <Icon name="usercheck" size={16} color="var(--gray-400)" />
                Reviewed by <Link href={routes.expert(guide.reviewer.slug)}>{guide.reviewer.name}</Link>
              </li>
            ) : null}
            <li>
              <Icon name="calendar" size={16} color="var(--gray-400)" />
              Updated {monthYear(guide.reviewedAt ?? guide.publishedAt)}
            </li>
            <li>
              <Icon name="clock" size={16} color="var(--gray-400)" />
              {guide.readingMinutes} min read
            </li>
            <li>
              <EditorialDisclosure />
            </li>
          </ul>
        </div>
      </section>

      <Section ruleTop labelledBy="article-h2">
        <h2 id="article-h2" className="sr-only">
          {guide.title}
        </h2>
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 760px)", gap: 56, alignItems: "start" }}
        >
          <div className="toc">
            {isCost && (guide.typicalLow || guide.typicalHigh) ? (
              <div className="card" style={{ padding: "20px 22px", marginBottom: 24 }}>
                <p className="toc__title" style={{ marginBottom: 8 }}>
                  Typical cost
                </p>
                <p style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                  {dollars(guide.typicalLow)}–{dollars(guide.typicalHigh)}
                </p>
                {guide.unitLow && guide.unitHigh ? (
                  <p style={{ marginTop: 6, fontSize: 13.5, color: "var(--text-secondary)" }}>
                    {dollars(guide.unitLow)}–{dollars(guide.unitHigh)} {guide.unitLabel}
                  </p>
                ) : null}
                <div style={{ marginTop: 10 }}>
                  <PricingDisclosure />
                </div>
              </div>
            ) : null}

            {headings.length > 1 ? (
              <nav aria-label="In this guide">
                <p className="toc__title">In this guide</p>
                <ul>
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <a href={`#${heading.id}`}>{heading.text}</a>
                    </li>
                  ))}
                  {faqs.length > 0 ? (
                    <li>
                      <a href="#guide-faqs">Common questions</a>
                    </li>
                  ) : null}
                  {guide.sources.length > 0 ? (
                    <li>
                      <a href="#guide-sources">Sources</a>
                    </li>
                  ) : null}
                </ul>
              </nav>
            ) : null}

            {relatedRankings[0] ? (
              <div className="card" style={{ padding: "20px 22px", marginTop: 24 }}>
                <p className="toc__title" style={{ marginBottom: 10 }}>
                  Ready to hire?
                </p>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--text-secondary)", marginBottom: 14 }}>
                  See the researched shortlist for a covered market.
                </p>
                <Link href={rankingUrl(relatedRankings[0])} className="btn btn--primary btn--sm btn--block">
                  {relatedRankings[0].title}
                </Link>
              </div>
            ) : null}
          </div>

          <article>
            {guide.shortAnswer ? (
              <div className="short-answer">
                <p className="short-answer__label">The short answer</p>
                <p>{guide.shortAnswer}</p>
              </div>
            ) : null}

            {takeaways.length > 0 ? (
              <div className="card" style={{ padding: "24px 26px", marginBottom: 32 }}>
                <h2 style={{ fontSize: 17, marginBottom: 16 }}>Key takeaways</h2>
                <CheckList items={takeaways} />
              </div>
            ) : null}

            <GuideBody blocks={blocks} />

            {guide.costs.length > 0 ? (
              <div style={{ marginTop: 40 }}>
                <h2 id="guide-costs" style={{ fontSize: 28, marginBottom: 16 }}>
                  {isCost ? "Cost breakdown" : "What this costs"}
                </h2>
                <CostTable
                  caption="Sourced figures"
                  rows={guide.costs.map((row) => ({
                    id: row.id,
                    label: row.label,
                    lowPrice: row.lowPrice,
                    highPrice: row.highPrice,
                    typical: row.typical,
                    unit: row.unit,
                    currency: row.currency,
                    note: row.note,
                  }))}
                />
              </div>
            ) : null}

            {faqs.length > 0 ? (
              <div style={{ marginTop: 44 }}>
                <h2 id="guide-faqs" style={{ fontSize: 28, marginBottom: 20 }}>
                  Common questions
                </h2>
                <FaqList faqs={faqs} />
              </div>
            ) : null}

            {guide.sources.length > 0 ? (
              <div style={{ marginTop: 44 }}>
                <h2 id="guide-sources" style={{ fontSize: 28, marginBottom: 20 }}>
                  Sources and references
                </h2>
                <SourceList
                  sources={guide.sources.map((source) => ({
                    id: source.id,
                    label: source.label,
                    publisher: source.publisher,
                    url: source.url,
                    tier: source.tier,
                    accessedAt: source.accessedAt,
                  }))}
                />
              </div>
            ) : null}

            <div style={{ marginTop: 44 }}>
              <TransparencyBlock
                title="About this guide"
                rows={[
                  { label: "Published", value: fullDate(guide.publishedAt) },
                  { label: "Last reviewed", value: fullDate(guide.reviewedAt ?? guide.updatedAt) },
                  {
                    label: "Written by",
                    value: guide.author ? (
                      <Link href={routes.expert(guide.author.slug)}>{guide.author.name}</Link>
                    ) : (
                      "TenBestFind editorial"
                    ),
                  },
                  {
                    label: "Expert review",
                    value: guide.reviewer ? (
                      <Link href={routes.expert(guide.reviewer.slug)}>{guide.reviewer.name}</Link>
                    ) : (
                      "Not required for this topic"
                    ),
                  },
                ]}
              >
                <div style={{ marginTop: 18, display: "flex", gap: 18, flexWrap: "wrap" }}>
                  <AiAssistanceDisclosure />
                  <EditorialDisclosure />
                </div>
              </TransparencyBlock>
            </div>

            {guide.author ? (
              <div className="author-card" style={{ marginTop: 24 }}>
                <Monogram name={guide.author.name} size={64} />
                <div>
                  <p className="related-heading" style={{ marginBottom: 6 }}>
                    About the author
                  </p>
                  <h3 style={{ fontSize: 18, marginBottom: 4 }}>
                    <Link href={routes.expert(guide.author.slug)} style={{ color: "var(--ink)" }}>
                      {guide.author.name}
                    </Link>
                  </h3>
                  <p style={{ fontSize: 14, color: "var(--color-primary)", marginBottom: 10 }}>
                    {guide.author.role}
                  </p>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--text-secondary)" }}>
                    {guide.author.bio}
                  </p>
                </div>
              </div>
            ) : null}
          </article>
        </div>
      </Section>

      {relatedRankings.length > 0 ? (
        <Section tone="page" labelledBy="rank-h2">
          <SectionHead
            id="rank-h2"
            title="Researched shortlists"
            lead="Where we have already done the comparison for you."
          />
          <LinkGrid
            columns={2}
            items={relatedRankings.map((ranking) => ({
              label: ranking.title,
              href: rankingUrl(ranking),
              meta: `Updated ${monthYear(ranking.lastReviewedAt)}`,
            }))}
          />
        </Section>
      ) : null}

      {relatedGuides.length > 0 ? (
        <Section labelledBy="rel-h2" ruleBottom={false}>
          <SectionHead id="rel-h2" title="Related guides" linkHref={routes.guidesIndex()} linkLabel="All guides" />
          <LinkGrid
            columns={2}
            items={relatedGuides.map((related) => ({
              label: related.title,
              href: routes.guide(related.slug),
              meta: related.category?.serviceName,
            }))}
          />
        </Section>
      ) : null}

      <FinalSearch title="Ready to find someone?" />
    </SiteChrome>
  );
}
