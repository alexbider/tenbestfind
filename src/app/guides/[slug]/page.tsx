import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { GuideBlock } from "../../../../prisma/data/editorial";
import { GuideBody } from "@/components/site/blocks";
import { CostEstimator, CostSummary, CostTables, priceModal } from "@/components/site/CostGuide";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { InfoModal } from "@/components/site/InfoModal";
import { SiteChrome } from "@/components/site/SiteChrome";
import {
  Chevron,
  Crumbs,
  Eyebrow,
  FaqItem,
  GRID_BACKDROP,
  SHELL,
  SR_ONLY,
  TenOutline,
  initials,
} from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
import { dollars, fullDate, monthYear, priceRange, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { parseJson, parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { seoFor } from "@/lib/seo";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { rankingCardSelect } from "@/lib/queries";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

const SECTION = { ...SHELL, padding: "64px 24px" };
const SECTION_H2 = { fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: "700" };
const CARD = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "18px",
  boxShadow: "var(--shadow-sm)",
  padding: "22px 24px",
};
const META_ITEM = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "14px",
  color: "var(--text-secondary)",
};
const CELL_HEAD = {
  padding: "13px 22px",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "var(--ls-wide)",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border-subtle)",
};

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
  const service = guide.category?.serviceName ?? "home services";

  const [relatedRankings, relatedGuides, relatedCategories, companies] = await Promise.all([
    guide.categoryId
      ? db.ranking.findMany({
          where: { status: "PUBLISHED", categoryId: guide.categoryId },
          orderBy: { lastReviewedAt: "desc" },
          take: 3,
          select: rankingCardSelect,
        })
      : Promise.resolve([]),
    db.guide.findMany({
      where: { status: "PUBLISHED", NOT: { id: guide.id } },
      orderBy: { publishedAt: "desc" },
      take: 4,
      include: { category: { select: { serviceName: true } }, author: { select: { name: true } } },
    }),
    db.category.findMany({
      where: { published: true, NOT: guide.categoryId ? { id: guide.categoryId } : undefined },
      orderBy: { sortOrder: "asc" },
      take: 5,
    }),
    // The companies currently holding a place in one of this trade's rankings.
    guide.categoryId
      ? db.rankingEntry.findMany({
          where: { ranking: { status: "PUBLISHED", categoryId: guide.categoryId } },
          orderBy: { position: "asc" },
          take: 4,
          include: {
            business: {
              select: {
                slug: true,
                name: true,
                googleRating: true,
                googleReviewCount: true,
                city: { select: { name: true, region: { select: { code: true } } } },
              },
            },
            ranking: { select: { city: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
  ]);

  // The contents rail: the design's own section anchors, plus every heading the
  // editor wrote, in the order they appear on the page.
  const toc = [
    !isCost && guide.shortAnswer ? { name: "The short answer", href: "#short-answer" } : null,
    takeaways.length > 0 ? { name: "Key takeaways", href: "#takeaways" } : null,
    ...headings.map((heading) => ({ name: heading.text, href: `#${heading.id}` })),
    isCost && guide.costs.length > 0 ? { name: "Cost at a glance", href: "#summary" } : null,
    isCost && guide.unitLow && guide.unitHigh ? { name: "Estimate your cost", href: "#calculator" } : null,
    !isCost && guide.costs.length > 0 ? { name: "What it costs", href: "#cost" } : null,
    faqs.length > 0 ? { name: "Frequently asked questions", href: "#faqs" } : null,
    guide.bottomLine ? { name: "Bottom line", href: "#bottom-line" } : null,
    guide.sources.length > 0 ? { name: "Sources and references", href: "#sources" } : null,
    { name: "About this guide", href: "#about-guide" },
  ].filter((item): item is { name: string; href: string } => item !== null);

  const meta = [
    { icon: "calendar" as IconName, label: "Originally published", value: monthYear(guide.publishedAt) },
    { icon: "refresh" as IconName, label: "Last reviewed", value: monthYear(guide.reviewedAt ?? guide.updatedAt) },
    { icon: "pen" as IconName, label: "Written by", value: guide.author?.name ?? "TenBestFind editorial" },
    ...(guide.reviewer ? [{ icon: "usercheck" as IconName, label: "Reviewed by", value: guide.reviewer.name }] : []),
    { icon: "clock" as IconName, label: "Reading time", value: `${guide.readingMinutes} min` },
    { icon: "doc" as IconName, label: "Sources cited", value: String(guide.sources.length) },
  ];

  const editorialModal = (
    <InfoModal
      label="Editorial disclosure"
      title="Editorial disclosure"
      points={[
        "Guides are written and reviewed by named people on the editorial team",
        "No company pays to appear in a guide or to change what one says",
        "Sponsorship is sold separately and always labelled where it appears",
        "Where we could not verify something, the guide says so instead of guessing",
      ]}
      link={{ href: routes.howWeRank(), label: "How we rank" }}
    >
      This guide is editorial. Nothing in it is placed, paid for or approved by a company named on
      the site.
    </InfoModal>
  );

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

      <article>
        <div
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            background:
              "linear-gradient(180deg, var(--blue-50) 0%, rgba(234,244,255,0.3) 70%, var(--surface-card) 100%)",
          }}
        >
          <div style={{ ...SHELL, padding: "20px 24px 44px" }}>
            <Crumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Guides", href: routes.guidesIndex() },
                ...(guide.category
                  ? [{ label: guide.category.serviceName, href: routes.category(guide.category.slug) }]
                  : []),
                { label: guide.title },
              ]}
            />

            <div style={{ maxWidth: "820px" }}>
              <Eyebrow heroIn="1" gap="16px">
                {isCost ? `${service} cost guide` : `${service} guide`}
              </Eyebrow>
              <h1
                data-hero-in="2"
                style={{
                  fontSize: "clamp(31px, 4vw, 46px)",
                  lineHeight: "1.12",
                  letterSpacing: "-0.04em",
                  fontWeight: "800",
                  textWrap: "balance",
                }}
              >
                {guide.title}
              </h1>
              {guide.excerpt ? (
                <p
                  data-hero-in="3"
                  style={{
                    marginTop: "20px",
                    fontSize: "18px",
                    lineHeight: "1.75",
                    color: "var(--text-secondary)",
                    maxWidth: "720px",
                    textWrap: "pretty",
                  }}
                >
                  {guide.excerpt}
                </p>
              ) : null}
            </div>

            <div style={{ marginTop: "26px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px 26px" }}>
              {guide.author ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      background: "var(--blue-50)",
                      border: "1px solid var(--blue-100)",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "var(--blue-900)",
                    }}
                  >
                    {initials(guide.author.name)}
                  </span>
                  <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                    Written by{" "}
                    <Link href={routes.expert(guide.author.slug)} style={{ fontWeight: "600" }}>
                      {guide.author.name}
                    </Link>
                    , {guide.author.role}
                  </span>
                </span>
              ) : null}
              {guide.reviewer ? (
                <span style={META_ITEM}>
                  <Icon name="shield" size={16} color="#1F9D6B" strokeWidth={1.9} />
                  Reviewed by{" "}
                  <Link href={routes.expert(guide.reviewer.slug)} style={{ fontWeight: "600" }}>
                    {guide.reviewer.name}
                  </Link>
                  , {guide.reviewer.role}
                </span>
              ) : null}
              <span style={META_ITEM}>
                <Icon name="refresh" size={16} color="#2D74D7" strokeWidth={1.9} />
                Updated {monthYear(guide.reviewedAt ?? guide.updatedAt)}
              </span>
              <span style={META_ITEM}>
                <Icon name="clock" size={16} color="#2D74D7" strokeWidth={1.9} />
                {guide.readingMinutes} min read
              </span>
              {editorialModal}
            </div>
          </div>
        </div>

        <div
          data-article-grid=""
          style={{
            ...SHELL,
            padding: "48px 24px 72px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 300px",
            gap: "56px",
            alignItems: "start",
          }}
        >
          <div data-prose="" style={{ maxWidth: "760px", display: "grid", gap: "44px" }}>
            {toc.length > 2 ? (
              <details data-jump="" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "4px 20px" }}>
                <summary
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    padding: "16px 0",
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "var(--blue-900)",
                  }}
                >
                  Jump to section
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <ul style={{ padding: "0 0 16px" }}>
                  {toc.map((item) => (
                    <li key={item.href}>
                      <a href={item.href} style={{ display: "block", padding: "9px 0", fontSize: "15px", color: "var(--text-primary)" }}>
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            {!isCost && guide.shortAnswer ? (
              <section
                id="short-answer"
                aria-labelledby="sa-h2"
                style={{ ...GRID_BACKDROP, border: "1px solid var(--blue-100)", borderRadius: "20px" }}
              >
                <TenOutline style={{ right: "-30px", top: "-40px" }} />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 24px",
                    background: "var(--blue-50)",
                    borderBottom: "1px solid var(--blue-100)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <h2 id="sa-h2" style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase" }}>
                    The short answer
                  </h2>
                </div>
                <div style={{ padding: "22px 24px 24px" }}>
                  <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-primary)" }}>{guide.shortAnswer}</p>
                </div>
              </section>
            ) : null}

            {takeaways.length > 0 ? (
              <section id="takeaways" aria-labelledby="kt-h2">
                <h2 id="kt-h2" style={{ display: "flex", alignItems: "center", gap: "11px", fontSize: "26px", fontWeight: "700", marginBottom: "18px" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "40px",
                      height: "40px",
                      borderRadius: "11px",
                      background: "var(--amber-50)",
                      color: "#8A5F0B",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="bulb" size={20} strokeWidth={1.9} />
                  </span>
                  Key takeaways
                </h2>
                <ul
                  style={{
                    display: "grid",
                    gap: "11px",
                    background: "var(--surface-page)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "18px",
                    padding: "24px 26px",
                  }}
                >
                  {takeaways.map((item) => (
                    <li key={item} style={{ display: "flex", gap: "11px", fontSize: "16px", lineHeight: "1.65", color: "var(--text-primary)" }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "4px" }}>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {isCost ? (
              <section id="summary" aria-labelledby="sum-h2" style={{ ...GRID_BACKDROP, borderRadius: "20px", padding: "26px 24px 24px" }}>
                <TenOutline style={{ right: "-30px", top: "-40px" }} />
                <CostSummary guide={guide} title={guide.title} intro={guide.shortAnswer} />
              </section>
            ) : null}

            {isCost && guide.costs.length > 0 ? <CostTables rows={guide.costs} anchorPrefix="cost" /> : null}

            {isCost && guide.unitLow && guide.unitHigh ? (
              <CostEstimator
                title={guide.title}
                unitLow={guide.unitLow}
                unitHigh={guide.unitHigh}
                unitLabel={guide.unitLabel ?? "units"}
              />
            ) : null}

            <GuideBody blocks={blocks} />

            {!isCost && guide.costs.length > 0 ? (
              <section id="cost" aria-labelledby="cost-h2">
                <h2 id="cost-h2" style={{ fontSize: "28px", lineHeight: "1.25", fontWeight: "700", marginBottom: "8px" }}>
                  What {service.toLowerCase()} costs
                </h2>
                {isCost && (guide.typicalLow || guide.typicalHigh) ? (
                  <p style={{ marginBottom: "20px", fontSize: "17px", lineHeight: "1.75", color: "var(--text-primary)" }}>
                    Most projects land between {dollars(guide.typicalLow)} and {dollars(guide.typicalHigh)}
                    {guide.unitLow && guide.unitHigh
                      ? `, or ${dollars(guide.unitLow)} to ${dollars(guide.unitHigh)} ${guide.unitLabel ?? ""}`
                      : ""}
                    . Treat the table as a sanity check on the bids you receive, not a quote.
                  </p>
                ) : null}
                <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "18px", overflow: "hidden", overflowX: "auto", marginBottom: "8px" }}>
                  <table style={{ minWidth: "520px" }}>
                    <thead>
                      <tr style={{ background: "var(--surface-page)" }}>
                        {["Service", "Typical range"].map((head) => (
                          <th key={head} scope="col" style={CELL_HEAD}>
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {guide.costs.map((row) => (
                        <tr key={row.id}>
                          <th
                            scope="row"
                            style={{
                              padding: "15px 22px",
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
                              padding: "15px 22px",
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
                <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                  {priceModal()}
                  <Link href={routes.guidesIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                    View all cost guides →
                  </Link>
                </div>
              </section>
            ) : null}

            {faqs.length > 0 ? (
              <section id="faqs" aria-labelledby="faq-h2">
                <h2 id="faq-h2" style={{ fontSize: "28px", lineHeight: "1.25", fontWeight: "700", marginBottom: "18px" }}>
                  Frequently asked questions
                </h2>
                <ul style={{ display: "grid", gap: "12px" }}>
                  {faqs.map((faq) => (
                    <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
                  ))}
                </ul>
              </section>
            ) : null}

            {guide.bottomLine ? (
              <section id="bottom-line" aria-labelledby="bl-h2" style={{ background: "var(--blue-900)", borderRadius: "20px", padding: "28px 30px" }}>
                <h2 id="bl-h2" style={{ fontSize: "24px", fontWeight: "700", color: "#fff", marginBottom: "14px" }}>
                  Bottom line
                </h2>
                <p style={{ fontSize: "17px", lineHeight: "1.75", color: "rgba(232,237,245,0.9)" }}>{guide.bottomLine}</p>
              </section>
            ) : null}

            <section id="next" aria-labelledby="next-h2" style={{ border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "28px 30px" }}>
              <h2 id="next-h2" style={{ fontSize: "22px", fontWeight: "700", marginBottom: "16px" }}>
                Ready to compare {service.toLowerCase()} companies?
              </h2>
              <form
                action={routes.search()}
                method="get"
                role="search"
                aria-label={`Find ${service.toLowerCase()} companies`}
                data-stack=""
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "var(--surface-page)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "16px",
                  padding: "8px",
                }}
              >
                <div style={{ flex: "1", padding: "0 12px" }}>
                  <label htmlFor="g-svc" style={SR_ONLY}>
                    Service
                  </label>
                  <input
                    id="g-svc"
                    name="service"
                    type="text"
                    defaultValue={guide.category?.serviceName ?? ""}
                    style={{
                      width: "100%",
                      border: "0",
                      outline: "none",
                      height: "48px",
                      fontFamily: "var(--font-sans)",
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "var(--blue-900)",
                      background: "transparent",
                    }}
                  />
                </div>
                <div aria-hidden="true" style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "6px 0" }} />
                <div style={{ flex: "1", padding: "0 12px" }}>
                  <label htmlFor="g-loc" style={SR_ONLY}>
                    City or ZIP
                  </label>
                  <input
                    id="g-loc"
                    name="location"
                    type="text"
                    autoComplete="postal-code"
                    placeholder="City or ZIP"
                    style={{
                      width: "100%",
                      border: "0",
                      outline: "none",
                      height: "48px",
                      fontFamily: "var(--font-sans)",
                      fontSize: "16px",
                      color: "var(--text-primary)",
                      background: "transparent",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    height: "48px",
                    padding: "0 24px",
                    border: "0",
                    borderRadius: "12px",
                    background: "var(--color-primary)",
                    color: "#fff",
                    fontFamily: "var(--font-sans)",
                    fontSize: "15px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Find top providers
                </button>
              </form>
              <p style={{ marginTop: "14px" }}>
                <Link href={routes.rankingsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                  View {service.toLowerCase()} rankings →
                </Link>
              </p>
            </section>

            {guide.sources.length > 0 ? (
              <section id="sources" aria-labelledby="src-h2">
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <h2 id="src-h2" style={{ display: "flex", alignItems: "center", gap: "11px", fontSize: "24px", fontWeight: "700" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "38px",
                        height: "38px",
                        borderRadius: "11px",
                        background: "var(--surface-page)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--color-primary)",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="doc" size={19} strokeWidth={1.9} />
                    </span>
                    Sources and references
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                    <InfoModal
                      label="How we researched this guide"
                      title="How we researched this guide"
                      points={[
                        "Primary sources are named with the date they were read",
                        "Pricing comes from published contractor and regional cost data, not estimates",
                        "Anything reported by a business is labelled as such",
                        "A reviewer with trade experience checks the technical claims before publication",
                      ]}
                      link={{ href: routes.howWeRank(), label: "How we rank" }}
                    >
                      Every claim in this guide traces back to something we can point at.
                    </InfoModal>
                    <InfoModal
                      label="AI-assisted editorial process"
                      title="AI-assisted editorial process"
                      points={[
                        "Drafting and structuring may be assisted by a language model",
                        "Every published fact is checked by a person against a named source",
                        "A named editor is accountable for what appears on the page",
                        "Corrections are made by people, and the page records when",
                      ]}
                      link={{ href: routes.corrections(), label: "Corrections policy" }}
                    >
                      We use tools to help draft, and people to decide what is true.
                    </InfoModal>
                  </div>
                </div>
                <ol style={{ display: "grid", gap: "12px" }}>
                  {guide.sources.map((source, index) => (
                    <li key={source.id} style={{ display: "flex", gap: "14px", padding: "16px 18px", border: "1px solid var(--border-subtle)", borderRadius: "14px" }}>
                      <span
                        aria-hidden="true"
                        style={{
                          flex: "0 0 30px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          background: "var(--surface-page)",
                          fontSize: "13px",
                          fontWeight: "700",
                          color: "var(--blue-900)",
                        }}
                      >
                        {index + 1}
                      </span>
                      <span style={{ display: "block" }}>
                        <span style={{ display: "block", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)", marginBottom: "3px" }}>
                          {source.url ? (
                            <a href={source.url} rel="nofollow noopener" target="_blank">
                              {source.label}
                            </a>
                          ) : (
                            source.label
                          )}
                        </span>
                        <span style={{ display: "block", fontSize: "14px", color: "var(--text-secondary)" }}>
                          {[source.publisher, source.accessedAt ? `Read ${fullDate(source.accessedAt)}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <section id="about-guide" aria-labelledby="ag-h2" style={{ display: "grid", gap: "16px" }}>
              <div style={{ background: "var(--surface-page)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "26px" }}>
                <h2 id="ag-h2" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "18px" }}>
                  About this guide
                </h2>
                <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "16px 28px", margin: "0" }}>
                  {meta.map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: "11px" }}>
                      <span
                        aria-hidden="true"
                        style={{
                          flex: "0 0 32px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "32px",
                          height: "32px",
                          borderRadius: "9px",
                          background: "var(--surface-card)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--color-primary)",
                        }}
                      >
                        <Icon name={item.icon} size={16} strokeWidth={1.8} />
                      </span>
                      <span style={{ display: "block" }}>
                        <dt style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>{item.label}</dt>
                        <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--blue-900)" }}>{item.value}</dd>
                      </span>
                    </div>
                  ))}
                </dl>
                <div style={{ marginTop: "22px", paddingTop: "18px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>Found an error?</span>
                  <Link
                    href={routes.corrections()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      height: "44px",
                      padding: "0 18px",
                      borderRadius: "12px",
                      border: "1.5px solid var(--border-strong)",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--blue-900)",
                    }}
                  >
                    <Icon name="pencil" size={16} strokeWidth={2} />
                    Suggest a correction
                  </Link>
                  <Link href={routes.editorialTeam()} style={{ fontSize: "15px", fontWeight: "600" }}>
                    Editorial standards
                  </Link>
                </div>
              </div>

              {guide.author || guide.reviewer ? (
                <div data-split="" style={{ display: "grid", gridTemplateColumns: guide.author && guide.reviewer ? "1fr 1fr" : "1fr", gap: "16px" }}>
                  {guide.author ? (
                    <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "24px" }}>
                      <h2 style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "16px" }}>
                        About the author
                      </h2>
                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        <span
                          aria-hidden="true"
                          style={{
                            flex: "0 0 56px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            background: "var(--blue-50)",
                            border: "1px solid var(--blue-100)",
                            fontSize: "17px",
                            fontWeight: "700",
                            color: "var(--blue-900)",
                          }}
                        >
                          {initials(guide.author.name)}
                        </span>
                        <div>
                          <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "2px" }}>{guide.author.name}</h3>
                          <p style={{ fontSize: "14px", color: "var(--color-primary)", fontWeight: "600", marginBottom: "8px" }}>
                            {guide.author.role}
                          </p>
                          {guide.author.bio ? (
                            <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "12px" }}>
                              {guide.author.bio}
                            </p>
                          ) : null}
                          <Link href={routes.expert(guide.author.slug)} style={{ fontSize: "14px", fontWeight: "600" }}>
                            View all articles →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {guide.reviewer ? (
                    <div style={{ background: "var(--surface-card)", border: "1px solid var(--green-100)", borderRadius: "20px", padding: "24px" }}>
                      <h2 style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "#178054", marginBottom: "16px" }}>
                        <Icon name="shield" size={16} strokeWidth={2} />
                        Expert review
                      </h2>
                      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        <span
                          aria-hidden="true"
                          style={{
                            flex: "0 0 56px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            background: "var(--green-50)",
                            border: "1px solid var(--green-100)",
                            fontSize: "17px",
                            fontWeight: "700",
                            color: "#178054",
                          }}
                        >
                          {initials(guide.reviewer.name)}
                        </span>
                        <div>
                          <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "2px" }}>{guide.reviewer.name}</h3>
                          <p style={{ fontSize: "14px", color: "#178054", fontWeight: "600", marginBottom: "8px" }}>
                            {guide.reviewer.role}
                          </p>
                          <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)", marginBottom: "12px" }}>
                            Reviewed this guide for technical accuracy. Review does not imply endorsement of any company
                            named on TenBestFind.
                          </p>
                          <Link href={routes.expert(guide.reviewer.slug)} style={{ fontSize: "14px", fontWeight: "600" }}>
                            View reviewer profile →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>

          <aside data-aside="" aria-label="Guide navigation" style={{ position: "sticky", top: "100px", display: "grid", gap: "16px" }}>
            <nav data-toc="" aria-labelledby="toc-h2" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "22px" }}>
              <h2 id="toc-h2" style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "12px" }}>
                In this guide
              </h2>
              <ul style={{ display: "grid", gap: "2px" }}>
                {toc.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      style={{ display: "block", padding: "8px 10px", margin: "0 -10px", borderRadius: "9px", fontSize: "14px", lineHeight: "1.45", color: "var(--text-primary)" }}
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div style={{ background: "var(--blue-50)", border: "1px solid var(--blue-100)", borderRadius: "18px", padding: "22px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Compare local companies</h2>
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "14px" }}>
                Researched top ten rankings for the markets we cover.
              </p>
              <Link
                href={guide.category ? routes.category(guide.category.slug) : routes.rankingsIndex()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "46px",
                  borderRadius: "12px",
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "600",
                }}
              >
                View {service.toLowerCase()} rankings
              </Link>
            </div>
          </aside>
        </div>
      </article>

      {relatedRankings.length > 0 ? (
        <section
          aria-labelledby="rank-h2"
          style={{ background: "var(--surface-page)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div style={SECTION}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "24px" }}>
              <h2 id="rank-h2" style={SECTION_H2}>
                Compare top {service.toLowerCase()} companies
              </h2>
              <Link href={routes.rankingsIndex()} style={{ fontSize: "15px", fontWeight: "600" }}>
                All {service.toLowerCase()} rankings →
              </Link>
            </div>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {relatedRankings.map((ranking) => (
                <li key={ranking.id} data-card="" style={{ ...CARD, display: "flex", gap: "16px" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "0 0 44px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "var(--amber-50)",
                      color: "#8A5F0B",
                    }}
                  >
                    <Icon name="pin" size={21} strokeWidth={1.75} />
                  </span>
                  <span style={{ display: "block", minWidth: "0" }}>
                    <h3 style={{ fontSize: "17px", lineHeight: "1.3", fontWeight: "700", marginBottom: "6px" }}>
                      <Link href={rankingUrl(ranking)} style={{ color: "var(--blue-900)" }}>
                        {ranking.title}
                      </Link>
                    </h3>
                    <span style={{ display: "block", fontSize: "14px", color: "var(--text-secondary)", marginBottom: "10px" }}>
                      {ranking.companiesReviewed} evaluated · Reviewed{" "}
                      {shortMonthYear(ranking.lastReviewedAt ?? ranking.publishedAt)}
                    </span>
                    <Link href={rankingUrl(ranking)} style={{ fontSize: "14px", fontWeight: "600" }}>
                      View top 10 →
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {companies.length > 0 ? (
        <section aria-labelledby="biz-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "8px" }}>
              <h2 id="biz-h2" style={SECTION_H2}>
                {service} companies you can research
              </h2>
              <InfoModal
                label="About Google reviews"
                title="About Google reviews"
                points={[
                  "Ratings and counts are read from Google at the time of the last check",
                  "They move between checks, so the date on the page is the date they were true",
                  "A rating is one signal among several, never the ranking on its own",
                  "We do not filter, weight or edit the review text itself",
                ]}
                link={{ href: routes.howWeRank(), label: "How we rank" }}
              >
                Where a rating is shown it comes from Google, unedited.
              </InfoModal>
            </div>
            <p style={{ fontSize: "16px", color: "var(--text-secondary)", marginBottom: "24px" }}>
              Companies currently holding a position in one of our {service.toLowerCase()} rankings.
            </p>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {companies.map((entry) => (
                <li key={entry.id} data-card="" style={{ ...CARD, display: "flex", flexDirection: "column", gap: "10px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        flex: "0 0 44px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "var(--blue-900)",
                      }}
                    >
                      {initials(entry.business.name)}
                    </span>
                    <span style={{ display: "block", minWidth: "0" }}>
                      <h3 style={{ fontSize: "16px", lineHeight: "1.3", fontWeight: "700" }}>
                        <Link href={routes.business(entry.business.slug)} style={{ color: "var(--blue-900)" }}>
                          {entry.business.name}
                        </Link>
                      </h3>
                      {entry.business.city ? (
                        <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>
                          {entry.business.city.name}, {entry.business.city.region.code.toUpperCase()}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {entry.business.googleRating ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "var(--text-secondary)" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="#D99A1C" stroke="none" aria-hidden="true">
                        <path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z" />
                      </svg>
                      <strong style={{ fontWeight: "700", color: "var(--blue-900)", fontVariantNumeric: "tabular-nums" }}>
                        {entry.business.googleRating.toFixed(1)}
                      </strong>
                      on Google · {entry.business.googleReviewCount ?? 0} reviews
                    </span>
                  ) : null}
                  <span
                    style={{
                      display: "inline-flex",
                      alignSelf: "flex-start",
                      alignItems: "center",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      background: "var(--amber-50)",
                      border: "1px solid #EBCE95",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#8A5F0B",
                    }}
                  >
                    #{entry.position}
                    {entry.ranking.city ? ` in ${entry.ranking.city.name}` : ""}
                  </span>
                  <Link href={routes.business(entry.business.slug)} style={{ marginTop: "auto", paddingTop: "8px", fontSize: "14px", fontWeight: "600" }}>
                    View profile →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="rel-h2" style={{ background: "var(--surface-page)" }}>
        <div style={SECTION}>
          <h2 id="rel-h2" style={{ ...SECTION_H2, marginBottom: "20px" }}>
            Related home services
          </h2>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px", marginBottom: "44px" }}>
            {relatedCategories.map((category) => (
              <li key={category.id}>
                <Link
                  data-row=""
                  href={routes.category(category.slug)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "15px 18px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "14px",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "var(--blue-900)",
                    textDecoration: "none",
                  }}
                >
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
                      background: "var(--blue-50)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <Icon
                      name={hasIcon(category.iconKey) ? (category.iconKey as IconName) : "house"}
                      size={17}
                      strokeWidth={1.8}
                    />
                  </span>
                  {category.name}
                  <span style={{ marginLeft: "auto", display: "inline-flex" }}>
                    <Chevron />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {relatedGuides.length > 0 ? (
            <>
              <h2 style={{ fontSize: "clamp(22px, 2.4vw, 30px)", fontWeight: "700", marginBottom: "20px" }}>Related guides</h2>
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "16px" }}>
                {relatedGuides.map((item) => (
                  <li key={item.id} data-card="" style={{ ...CARD, display: "flex", flexDirection: "column", gap: "10px" }}>
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
                    <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                      {item.type === "COST" ? "Cost guide" : (item.category?.serviceName ?? "Guide")}
                    </span>
                    <h3 style={{ fontSize: "17px", lineHeight: "1.35", fontWeight: "700" }}>
                      <Link href={routes.guide(item.slug)} style={{ color: "var(--blue-900)" }}>
                        {item.title}
                      </Link>
                    </h3>
                    <span style={{ marginTop: "auto", paddingTop: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {[
                        item.author ? `By ${item.author.name}` : null,
                        `Updated ${shortMonthYear(item.reviewedAt ?? item.publishedAt)}`,
                        `${item.readingMinutes} min`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </section>
    </SiteChrome>
  );
}
