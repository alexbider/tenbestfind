import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { GuideBlock } from "../../../../prisma/data/editorial";
import { GuideBody } from "@/components/site/guides/GuideBody";
import { ArrowLink, GuideFaq, HeroBackdrop, HeroTitle, Tile, tail } from "@/components/site/guides/parts";
import { GuideHub } from "@/templates/GuideHub";
import { CostEstimator, CostSummary, CostTables, priceModal } from "@/components/site/CostGuide";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { InfoModal } from "@/components/site/InfoModal";
import { RelatedContent } from "@/components/site/RelatedContent";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Crumbs, GRID_BACKDROP, SHELL, SR_ONLY, TenOutline, initials } from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
import { dollars, fullDate, monthYear, priceRange, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { coverOf, imageMap, parseIllustrations } from "@/lib/guide-images";
import { describeImage, srcSetFor } from "@/lib/image-srcset";
import { parseJson, parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { findGuideHub, guidesForHub } from "@/lib/guide-hubs";
import { breadcrumbSchema } from "@/lib/breadcrumbs";
import { relatedForGuide } from "@/lib/related";
import { personId } from "@/lib/schema";
import { redirectIfKnown } from "@/lib/redirects";
import { seoFor } from "@/lib/seo";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";
import { rankingCardSelect } from "@/lib/queries";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

const SECTION = { ...SHELL, padding: "64px 24px" };
const SECTION_H2 = { fontSize: "clamp(26px, 3vw, 36px)", lineHeight: "1.08", fontWeight: "800", letterSpacing: "-0.035em" };
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
      country: { select: { name: true, code: true } },
      region: { select: { name: true, slug: true, country: { select: { code: true } } } },
      city: { select: { name: true, slug: true, region: { select: { slug: true, country: { select: { code: true } } } } } },
      costs: { orderBy: { sortOrder: "asc" } },
      sources: { orderBy: { sortOrder: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });
}

/**
 * The picture that represents a guide.
 *
 * A hero set by hand always wins. Otherwise the cover the guide commissioned
 * for itself stands in, which is what makes a written guide illustrated
 * without anybody editing it.
 */
function heroFor(guide: { heroImage: string | null; illustrations: string | null }): string | null {
  return guide.heroImage ?? coverOf(parseIllustrations(guide.illustrations))?.path ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await loadGuide(slug);

  // A real guide always wins its own URL; only a slug no guide has claimed can
  // be a hub. That ordering is what makes the four reserved question slugs
  // reserved rather than enforced.
  if (!guide) {
    const hub = await findGuideHub(slug);
    if (!hub) return {};
    const guides = await guidesForHub(hub);
    return {
      title: { absolute: hub.title },
      description: hub.description,
      alternates: { canonical: hub.path },
      // A hub with nothing on it is a real page with no content, which is
      // exactly what the empty-archive rule is for.
      robots: guides.length === 0 ? { index: false, follow: true } : undefined,
      openGraph: {
        title: hub.title,
        description: hub.description,
        url: absoluteUrl(hub.path),
        type: "website",
        images: guides.find((entry) => entry.heroImage)?.heroImage
          ? [absoluteUrl(guides.find((entry) => entry.heroImage)!.heroImage!)]
          : undefined,
      },
    };
  }

  return seoFor("guide", guide.id, {
    title: guide.title,
    description: guide.excerpt,
    path: routes.guide(guide.slug),
    image: heroFor(guide),
    type: "article",
    publishedAt: guide.publishedAt,
    modifiedAt: guide.reviewedAt ?? guide.updatedAt,
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await loadGuide(slug);

  if (!guide || guide.status !== "PUBLISHED") {
    const hub = await findGuideHub(slug);
    if (hub) return <GuideHub slug={slug} />;
    await redirectIfKnown(routes.guide(slug));
    notFound();
  }

  const related = await relatedForGuide({
    guideId: guide.id,
    categoryId: guide.categoryId,
    categoryName: guide.category?.name,
    categorySlug: guide.category?.slug,
  });

  const blocks = parseJson<GuideBlock[]>(guide.body, []);
  const illustrations = parseIllustrations(guide.illustrations);
  const hero = heroFor(guide);

  // Where this guide applies, most specific first. Almost every guide is
  // national and leaves all three null; the ones that are not say so on the
  // page and in the schema rather than only in the database.
  const place = guide.city
    ? { name: `${guide.city.name}, ${guide.region?.name ?? ""}`.replace(/, $/, ""), href: routes.city(guide.city.region.country.code, guide.city.region.slug, guide.city.slug) }
    : guide.region
      ? { name: guide.region.name, href: routes.region(guide.region.country.code, guide.region.slug) }
      : guide.country
        ? { name: guide.country.name, href: routes.country(guide.country.code) }
        : null;
  const takeaways = parseList(guide.keyTakeaways);
  const headings = blocks.filter(
    (block): block is Extract<GuideBlock, { kind: "heading" }> => block.kind === "heading",
  );
  const faqs = guide.faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }));
  const isCost = guide.type === "COST";
  const service = guide.category?.serviceName ?? "home services";

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Guides", href: routes.guidesIndex() },
    ...(guide.category
      ? [{ label: guide.category.serviceName, href: `${routes.guidesIndex()}${guide.category.slug}/` }]
      : []),
    { label: guide.title },
  ];

  /**
   * The article, said properly.
   *
   * The two things that make this worth more than a headline and a date: the
   * author and reviewer are linked to their own pages, so the byline is a claim
   * a reader can follow rather than a name; and the publisher points at the
   * sitewide node the root layout already publishes, so this article joins the
   * same entity rather than declaring a second organisation with the same name.
   *
   * `about` and `spatialCoverage` are the tagging. They say what trade this is
   * about and where it applies, which is the difference between a page an
   * assistant can place and one it can only read.
   */
  const wordCount = blocks.reduce((total, block) => {
    const text =
      block.kind === "paragraph"
        ? block.text
        : block.kind === "heading"
          ? block.text
          : block.kind === "list" || block.kind === "checklist" || block.kind === "flags"
            ? block.items.join(" ")
            : "";
    return total + text.split(/\s+/).filter(Boolean).length;
  }, 0);

  // The @id is the point: it resolves to the Person defined on that editor's
  // own page, so a byline here and a byline on a ranking are the same person
  // rather than two people who happen to share a name.
  const personNode = (person: { name: string; slug: string; role: string | null }) => ({
    "@type": "Person",
    "@id": personId(person.slug),
    name: person.name,
    url: absoluteUrl(routes.expert(person.slug)),
    ...(person.role ? { jobTitle: person.role } : {}),
  });

  const articleSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${absoluteUrl(routes.guide(guide.slug))}#article`,
    mainEntityOfPage: absoluteUrl(routes.guide(guide.slug)),
    headline: guide.title,
    description: guide.excerpt ?? undefined,
    // The answer-first paragraph, which is the part an assistant quotes.
    abstract: guide.shortAnswer ?? undefined,
    url: absoluteUrl(routes.guide(guide.slug)),
    inLanguage: "en",
    datePublished: guide.publishedAt?.toISOString(),
    dateModified: (guide.reviewedAt ?? guide.updatedAt).toISOString(),
    ...(hero ? { image: absoluteUrl(hero) } : {}),
    ...(wordCount > 0 ? { wordCount } : {}),
    timeRequired: `PT${Math.max(1, guide.readingMinutes)}M`,
    ...(guide.author ? { author: personNode(guide.author) } : {}),
    ...(guide.reviewer ? { reviewedBy: personNode(guide.reviewer) } : {}),
    publisher: { "@id": absoluteUrl("/#publisher") },
    isPartOf: { "@id": absoluteUrl("/#website") },
    ...(guide.category
      ? { about: { "@type": "Service", name: guide.category.serviceName, serviceType: guide.category.name } }
      : {}),
    ...(place
      ? {
          spatialCoverage: {
            "@type": "Place",
            name: place.name,
            url: absoluteUrl(place.href),
          },
        }
      : {}),
    ...(guide.sources.length > 0
      ? {
          citation: guide.sources
            .filter((source) => source.url)
            .map((source) => ({
              "@type": "CreativeWork",
              name: source.label,
              url: source.url,
            })),
        }
      : {}),
  };

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
    // A cost guide opens on its numbers, so the at-a-glance band leads the rail too.
    isCost ? { name: "Cost at a glance", href: "#summary" } : null,
    takeaways.length > 0 ? { name: "Key takeaways", href: "#takeaways" } : null,
    isCost && guide.unitLow && guide.unitHigh ? { name: "Estimate your cost", href: "#calculator" } : null,
    ...headings.map((heading) => ({ name: heading.text, href: `#${heading.id}` })),
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

  const coverAlt = coverOf(illustrations)?.alt ?? "";
  const typicalRange = guide.typicalLow || guide.typicalHigh ? priceRange(guide.typicalLow, guide.typicalHigh) : null;
  const showHeroAside = isCost && Boolean(hero);

  const bylineAuthor = guide.author ? (
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
  ) : null;
  const bylineReviewer = guide.reviewer ? (
    <span style={META_ITEM}>
      <Icon name="shield" size={16} color="#1F9D6B" strokeWidth={1.9} />
      Reviewed by{" "}
      <Link href={routes.expert(guide.reviewer.slug)} style={{ fontWeight: "600" }}>
        {guide.reviewer.name}
      </Link>
      , {guide.reviewer.role}
    </span>
  ) : null;
  const bylineUpdated = (
    <span style={META_ITEM}>
      <Icon name="refresh" size={16} color="#2D74D7" strokeWidth={1.9} />
      Updated {monthYear(guide.reviewedAt ?? guide.updatedAt)}
    </span>
  );
  const bylineRead = (
    <span style={META_ITEM}>
      <Icon name="clock" size={16} color="#2D74D7" strokeWidth={1.9} />
      {guide.readingMinutes} min read
    </span>
  );

  const heroText = (
    <>
      <p data-eyebrow="" data-in="1" style={{ marginBottom: "16px" }}>
        <span data-eyebrow-rule="" aria-hidden="true" />
        {isCost ? `${service} cost guide` : `${service} guide`}
        {place ? ` · ${place.name}` : ""}
      </p>
      <h1
        data-in="2"
        style={{
          fontSize: "clamp(36px, 5vw, 60px)",
          lineHeight: isCost ? "1.1" : "1.12",
          letterSpacing: "-0.04em",
          fontWeight: "800",
          textWrap: "balance",
        }}
      >
        <HeroTitle text={guide.title} />
      </h1>
      {guide.excerpt ? (
        <p
          data-in="3"
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
    </>
  );

  return (
    <SiteChrome active="guides" skin>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema(crumbs, absoluteUrl)} />
      <FaqJsonLd faqs={faqs} />

      <article data-guide={isCost ? "cost" : "editorial"}>
        <div
          data-hero=""
          style={{
            position: "relative",
            overflow: "hidden",
            borderBottom: "1px solid var(--border-subtle)",
            background:
              "linear-gradient(180deg, var(--blue-50) 0%, rgba(234,244,255,0.3) 70%, var(--surface-card) 100%)",
          }}
        >
          <HeroBackdrop />
          <div style={{ ...SHELL, position: "relative", padding: "20px 24px 44px" }}>
            {/* The same trail the BreadcrumbList publishes, from one array, so
                the two cannot drift. The trade step points at the guide hub
                rather than the service page: that is where the reader of a
                guide actually wants to go next. */}
            <div style={{ marginBottom: "24px" }}>
              <Crumbs items={crumbs} flush />
            </div>

            {showHeroAside ? (
              <div data-split="" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "56px", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  {heroText}
                  <div style={{ marginTop: "24px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 24px" }}>
                    {bylineUpdated}
                    {guide.author ? (
                      <span style={META_ITEM}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <path d="M9 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8" />
                        </svg>
                        Written by{" "}
                        <Link href={routes.expert(guide.author.slug)} style={{ fontWeight: "600" }}>
                          {guide.author.name}
                        </Link>
                        , {guide.author.role}
                      </span>
                    ) : null}
                    {bylineReviewer}
                    {bylineRead}
                    {editorialModal}
                  </div>
                </div>
                <div data-hero-aside="" style={{ position: "relative" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      right: "-14px",
                      bottom: "-14px",
                      width: "70%",
                      height: "70%",
                      borderRadius: "24px",
                      background: "var(--gold-soft)",
                      border: "1px solid rgba(231,184,99,0.45)",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "5 / 4",
                      borderRadius: "24px",
                      overflow: "hidden",
                      boxShadow: "0 24px 60px -24px rgba(16,31,61,0.35)",
                      background: "var(--surface-sunken)",
                    }}
                  >
                    <picture>
                      {srcSetFor(hero!, "avif") ? <source type="image/avif" srcSet={srcSetFor(hero!, "avif")!} sizes="(max-width: 980px) 100vw, 590px" /> : null}
                      {srcSetFor(hero!, "webp") ? <source type="image/webp" srcSet={srcSetFor(hero!, "webp")!} sizes="(max-width: 980px) 100vw, 590px" /> : null}
                      <img
                        src={hero!}
                        alt={coverAlt}
                        width={describeImage(hero!)?.width}
                        height={describeImage(hero!)?.height}
                        decoding="async"
                        fetchPriority="high"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </picture>
                  </div>
                  {typicalRange ? (
                    <div
                      style={{
                        position: "absolute",
                        left: "-22px",
                        bottom: "28px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        padding: "14px 18px",
                        borderRadius: "16px",
                        background: "var(--ink)",
                        color: "#fff",
                        boxShadow: "var(--shadow-md)",
                      }}
                    >
                      <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "var(--ls-wider)", textTransform: "uppercase", color: "var(--gold-ink)" }}>
                        Typical project
                      </span>
                      <span style={{ fontSize: "20px", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>{typicalRange}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <div style={{ maxWidth: "820px" }}>{heroText}</div>
                <div style={{ marginTop: "26px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px 26px" }}>
                  {bylineAuthor}
                  {bylineReviewer}
                  {bylineUpdated}
                  {bylineRead}
                  {editorialModal}
                </div>
              </>
            )}
          </div>
        </div>
        <span aria-hidden="true" style={{ position: "fixed", left: 0, right: 0, top: 0, height: "3px", zIndex: 300, pointerEvents: "none" }}>
          <span
            data-prog=""
            style={{
              display: "block",
              height: "100%",
              background: "linear-gradient(90deg, var(--gold-ink), var(--color-primary))",
              transform: "scaleX(0)",
              transformOrigin: "left",
            }}
          />
        </span>

        <div
          data-article-grid=""
          style={{
            ...SHELL,
            padding: isCost ? "56px 24px 96px" : "48px 24px 72px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 300px",
            gap: "56px",
            alignItems: "start",
          }}
        >
          <div data-prose="" style={{ maxWidth: isCost ? "780px" : "760px", display: "grid", gap: isCost ? "80px" : "44px" }}>
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
                  <span
                    data-fq-ico=""
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      border: "1px solid var(--border-strong)",
                      color: "var(--ink)",
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  </span>
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
                  <h2 data-reveal="" id="sa-h2" style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase" }}>
                    {tail("The short answer")}
                  </h2>
                </div>
                <div style={{ padding: "22px 24px 24px" }}>
                  <p>{guide.shortAnswer}</p>
                </div>
              </section>
            ) : null}

            {isCost ? (
              <section
                id="summary"
                aria-labelledby="sum-h2"
                style={{ ...GRID_BACKDROP, borderRadius: "24px", border: "1px solid var(--border-subtle)", padding: "36px 32px 32px" }}
              >
                <TenOutline width={220} height={156} style={{ right: "-40px", bottom: "-50px", opacity: 0.6 }} />
                <CostSummary guide={guide} title={guide.title} intro={guide.shortAnswer} />
              </section>
            ) : null}

            {takeaways.length > 0 ? (
              <section id="takeaways" aria-labelledby="kt-h2">
                <h2 data-reveal="" id="kt-h2" style={{ display: "flex", alignItems: "center", gap: "11px", fontSize: "26px", fontWeight: "700", marginBottom: "18px" }}>
                  <Tile icon="bulb" size={40} iconSize={20} tone="amber" />
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

            {isCost && guide.costs.length > 0 ? <CostTables rows={guide.costs} anchorPrefix="cost" /> : null}

            {isCost && guide.unitLow && guide.unitHigh ? (
              <CostEstimator
                title={guide.title}
                unitLow={guide.unitLow}
                unitHigh={guide.unitHigh}
                unitLabel={guide.unitLabel ?? "units"}
              />
            ) : null}

            <GuideBody blocks={blocks} images={imageMap(illustrations)} headSize={isCost ? 26 : 28} />

            {!isCost && guide.costs.length > 0 ? (
              <section id="cost" aria-labelledby="cost-h2">
                <h2 data-reveal="" id="cost-h2" style={{ fontSize: "28px", lineHeight: "1.25", fontWeight: "700", marginBottom: "8px" }}>
                  {tail(`What ${service.toLowerCase()} costs`)}
                </h2>
                {isCost && (guide.typicalLow || guide.typicalHigh) ? (
                  <p style={{ marginBottom: "20px" }}>
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
                  <ArrowLink href={routes.guidesIndex()}>View all cost guides</ArrowLink>
                </div>
              </section>
            ) : null}

            {faqs.length > 0 ? (
              <section id="faqs" aria-labelledby="faq-h2">
                <h2 data-reveal="" id="faq-h2" style={{ fontSize: isCost ? "26px" : "28px", lineHeight: "1.25", fontWeight: "700", marginBottom: "18px" }}>
                  {tail("Frequently asked questions")}
                </h2>
                <ul data-stagger="" style={{ display: "grid", gap: "12px" }}>
                  {faqs.map((faq) => (
                    <GuideFaq key={faq.id} question={faq.question} answer={faq.answer} />
                  ))}
                </ul>
              </section>
            ) : null}

            {guide.bottomLine ? (
              <section id="bottom-line" aria-labelledby="bl-h2" style={{ background: "var(--blue-900)", borderRadius: "20px", padding: "28px 30px" }}>
                <h2 data-reveal="" id="bl-h2" style={{ fontSize: "24px", fontWeight: "700", color: "#fff", marginBottom: "14px" }}>
                  {tail("Bottom line")}
                </h2>
                <p style={{ fontSize: "17px", lineHeight: "1.75", color: "rgba(232,237,245,0.9)" }}>{guide.bottomLine}</p>
              </section>
            ) : null}

            <section id="next" aria-labelledby="next-h2" style={{ border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "28px 30px" }}>
              <h2 data-reveal="" id="next-h2" style={{ fontSize: "22px", fontWeight: "700", marginBottom: "16px" }}>
                {tail(`Ready to compare ${service.toLowerCase()} companies?`)}
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
                  data-btn=""
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
                <ArrowLink href={routes.rankingsIndex()}>View {service.toLowerCase()} rankings</ArrowLink>
              </p>
            </section>

            {guide.sources.length > 0 ? (
              <section id="sources" aria-labelledby="src-h2">
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <h2 data-reveal="" id="src-h2" style={{ display: "flex", alignItems: "center", gap: "11px", fontSize: "24px", fontWeight: "700" }}>
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
                    <span>{tail("Sources and references")}</span>
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
                <ol data-stagger="" style={{ display: "grid", gap: "12px" }}>
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
                      <span style={{ display: "block", minWidth: 0 }}>
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
                <h2 data-reveal="" id="ag-h2" style={{ fontSize: "20px", fontWeight: "700", marginBottom: "18px" }}>
                  {tail("About this guide")}
                </h2>
                <dl data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "16px 28px", margin: "0" }}>
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
                      <h2 data-reveal="" style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "16px" }}>
                        {tail("About the author")}
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
                          <ArrowLink href={routes.expert(guide.author.slug)} size={14}>
                            View all articles
                          </ArrowLink>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {guide.reviewer ? (
                    <div style={{ background: "var(--surface-card)", border: "1px solid var(--green-100)", borderRadius: "20px", padding: "24px" }}>
                      <h2 data-reveal="" style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "#178054", marginBottom: "16px" }}>
                        <Icon name="shield" size={16} strokeWidth={2} />
                        <span>{tail("Expert review")}</span>
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
                          <ArrowLink href={routes.expert(guide.reviewer.slug)} size={14}>
                            View reviewer profile
                          </ArrowLink>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>

          <aside data-aside="" aria-label="Guide navigation" style={{ position: "sticky", top: "100px", display: "grid", gap: "16px" }}>
            {isCost && typicalRange ? (
              <div style={{ background: "var(--blue-900)", borderRadius: "18px", padding: "22px" }}>
                <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "#E8B551", marginBottom: "10px" }}>
                  Typical project
                </p>
                <p style={{ fontSize: "26px", fontWeight: "700", color: "#fff", fontVariantNumeric: "tabular-nums", marginBottom: "4px" }}>{typicalRange}</p>
                <p style={{ fontSize: "14px", color: "rgba(232,237,245,0.75)" }}>
                  What most homeowners end up paying once the job is scoped.
                </p>
              </div>
            ) : null}
            <nav data-toc="" aria-labelledby="toc-h2" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "22px" }}>
              <h2 data-reveal="" id="toc-h2" style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "12px" }}>
                {tail("In this guide")}
              </h2>
              <ul data-stagger="" style={{ display: "grid", gap: "2px" }}>
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
              <h2 data-reveal="" style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>
                {tail("Compare local companies")}
              </h2>
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "14px" }}>
                Researched top ten rankings for the markets we cover.
              </p>
              <Link
                data-btn=""
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
              <h2 data-reveal="" id="rank-h2" style={SECTION_H2}>
                {tail(`Compare top ${service.toLowerCase()} companies`)}
              </h2>
              <ArrowLink href={routes.rankingsIndex()}>All {service.toLowerCase()} rankings</ArrowLink>
            </div>
            <ul data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {relatedRankings.map((ranking) => (
                <li key={ranking.id} data-card="" style={{ ...CARD, borderRadius: "22px", display: "flex", gap: "16px" }}>
                  <Tile icon="pin" size={44} iconSize={21} stroke={1.75} tone="amber" flex />
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
                    <ArrowLink href={rankingUrl(ranking)} size={14}>
                      View top 10
                    </ArrowLink>
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
              <h2 data-reveal="" id="biz-h2" style={SECTION_H2}>
                {tail(`${service} companies you can research`)}
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
            <ul data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              {companies.map((entry) => (
                <li key={entry.id} data-card="" style={{ ...CARD, borderRadius: "22px", display: "flex", flexDirection: "column", gap: "10px" }}>
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
                  <ArrowLink href={routes.business(entry.business.slug)} size={14}>
                    View profile
                  </ArrowLink>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="rel-h2" style={{ background: "var(--surface-page)" }}>
        <div style={SECTION}>
          <h2 data-reveal="" id="rel-h2" style={{ ...SECTION_H2, marginBottom: "20px" }}>
            {tail("Related home services")}
          </h2>
          <ul data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px", marginBottom: "44px" }}>
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
                  <Tile
                    icon={hasIcon(category.iconKey) ? (category.iconKey as IconName) : "house"}
                    size={34}
                    iconSize={17}
                    stroke={1.8}
                    flex
                  />
                  {category.name}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginLeft: "auto" }}>
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>

          {relatedGuides.length > 0 ? (
            <>
              <h2 data-reveal="" style={{ fontSize: "clamp(22px, 2.4vw, 30px)", fontWeight: "700", marginBottom: "20px" }}>
                {tail("Related guides")}
              </h2>
              <ul data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "16px" }}>
                {relatedGuides.map((item) => (
                  <li key={item.id} data-card="" style={{ ...CARD, borderRadius: "22px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <Tile icon="book" size={40} iconSize={19} stroke={1.8} />
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

      <RelatedContent groups={related} title="Keep reading" />
    </SiteChrome>
  );
}
