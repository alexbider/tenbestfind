import Link from "next/link";
import { notFound } from "next/navigation";
import { CrumbBar, FinalSearch, LinkGrid } from "@/components/site/blocks";
import { RelatedContent } from "@/components/site/RelatedContent";
import { SiteChrome } from "@/components/site/SiteChrome";
import { JsonLd, Media, Section, SectionHead } from "@/components/ui/primitives";
import { breadcrumbSchema } from "@/lib/breadcrumbs";
import { db } from "@/lib/db";
import { getGuideHubs, guidesForHub, type GuideHub as Hub, type HubGuide } from "@/lib/guide-hubs";
import { monthYear } from "@/lib/format";
import { relatedForGuideHub } from "@/lib/related";
import { absoluteUrl, routes } from "@/lib/urls";

/**
 * One hub of the guides section: a question, or a trade.
 *
 * The two kinds share a template on purpose. They are the same page with a
 * different filter, and giving them one shape means a reader who arrives at
 * "What things cost" and one who arrives at "Roofing guides" learn the same
 * layout once. What differs is only what is being collected, and the row of
 * links at the bottom, which always points at the other axis: a reader on a
 * question hub is offered the trades, and a reader on a trade hub is offered
 * the questions. That is the whole navigation of the section in one component.
 */

const CARD_META = { fontSize: 13, color: "var(--text-muted)" } as const;

function byline(guide: HubGuide): string {
  const parts = [
    guide.authorName ? `By ${guide.authorName}` : null,
    monthYear(guide.reviewedAt ?? guide.publishedAt),
    `${guide.readingMinutes} min`,
  ].filter(Boolean);
  return parts.join(" · ");
}

function priceRange(guide: HubGuide): string | null {
  if (guide.type !== "COST" || !guide.typicalLow || !guide.typicalHigh) return null;
  return `$${guide.typicalLow.toLocaleString()}–$${guide.typicalHigh.toLocaleString()}`;
}

/**
 * The newest guide on the hub, given the width of the page.
 *
 * Two columns when there is a photograph and one when there is not, rather
 * than a fixed split with an empty half: a lead card with nothing in the
 * picture slot reads as a page that failed to load.
 */
function LeadCard({ guide }: { guide: HubGuide }) {
  const range = priceRange(guide);
  return (
    <article
      className="card card--lift"
      style={{
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: guide.heroImage
          ? "repeat(auto-fit, minmax(min(100%, 300px), 1fr))"
          : "minmax(0, 1fr)",
        alignItems: "stretch",
      }}
      data-guide-lead=""
    >
      {guide.heroImage ? (
        <div className="thumb" style={{ minHeight: "clamp(200px, 24vw, 280px)" }}>
          <Media
            src={guide.heroImage}
            alt={guide.categoryName ? `${guide.categoryName} work` : ""}
            sizes="(max-width: 900px) 100vw, 560px"
          />
        </div>
      ) : null}
      <div
        style={{
          padding: "26px 28px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "var(--ls-wide)",
            textTransform: "uppercase",
            color: "var(--color-primary)",
            background: "var(--blue-50)",
            borderRadius: 999,
            padding: "5px 11px",
            marginBottom: 14,
          }}
        >
          Start here
        </p>
        <p className="eyebrow" style={{ marginBottom: 10 }}>
          {guide.categoryName ?? "General"}
        </p>
        <h3 style={{ fontSize: "clamp(21px, 2.4vw, 27px)", lineHeight: 1.25, marginBottom: 10 }}>
          <Link href={routes.guide(guide.slug)} style={{ color: "var(--ink)" }}>
            {guide.title}
          </Link>
        </h3>
        {guide.excerpt ? (
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.62,
              color: "var(--text-secondary)",
              marginBottom: range ? 14 : 12,
              maxWidth: "60ch",
            }}
          >
            {guide.excerpt}
          </p>
        ) : null}
        {range ? (
          <p
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--ink)",
              fontVariantNumeric: "tabular-nums",
              marginBottom: 12,
            }}
          >
            {range}
          </p>
        ) : null}
        <p style={CARD_META}>{byline(guide)}</p>
      </div>
    </article>
  );
}

function GuideCard({ guide }: { guide: HubGuide }) {
  const range = priceRange(guide);
  return (
    <article className="card card--lift" style={{ overflow: "hidden" }}>
      {guide.heroImage ? (
        <div className="thumb" style={{ height: 150 }}>
          <Media
            src={guide.heroImage}
            alt=""
            sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 380px"
          />
        </div>
      ) : null}
      <div style={{ padding: "20px 22px 22px" }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>
          {guide.categoryName ?? "General"}
        </p>
        <h3 style={{ fontSize: 18, lineHeight: 1.3, marginBottom: 8 }}>
          <Link href={routes.guide(guide.slug)} style={{ color: "var(--ink)" }}>
            {guide.title}
          </Link>
        </h3>
        {guide.excerpt ? (
          <p
            style={{
              fontSize: 14.5,
              lineHeight: 1.55,
              color: "var(--text-secondary)",
              marginBottom: 10,
            }}
          >
            {guide.excerpt}
          </p>
        ) : null}
        {range ? (
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--ink)",
              fontVariantNumeric: "tabular-nums",
              marginBottom: 10,
            }}
          >
            {range}
          </p>
        ) : null}
        <p style={CARD_META}>{byline(guide)}</p>
      </div>
    </article>
  );
}

export async function GuideHub({ slug }: { slug: string }) {
  const hubs = await getGuideHubs();
  const hub = hubs.find((candidate) => candidate.slug === slug);
  if (!hub) notFound();

  const guides = await guidesForHub(hub);
  const [lead, ...rest] = guides;

  const category = hub.categoryId
    ? await db.category.findUnique({ where: { id: hub.categoryId }, select: { name: true, slug: true } })
    : null;
  const related = await relatedForGuideHub({
    categoryId: hub.categoryId,
    categoryName: category?.name,
    categorySlug: category?.slug,
  });

  const siblings = hubs.filter((other) => other.kind === hub.kind && other.slug !== hub.slug);
  const otherAxis = hubs.filter((other) => other.kind !== hub.kind);
  const otherAxisTitle = hub.kind === "question" ? "Browse by trade" : "Browse by question";
  const otherAxisLead =
    hub.kind === "question"
      ? "The same guides, sorted by the work rather than the question."
      : "The same guides, sorted by what you are trying to find out.";

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Guides", href: routes.guidesIndex() },
    { label: hub.h1 },
  ];

  const minutes = guides.reduce((total, guide) => total + guide.readingMinutes, 0);
  const reviewed = guides
    .map((guide) => guide.reviewedAt ?? guide.publishedAt)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const spread =
    hub.kind === "question"
      ? new Set(guides.map((guide) => guide.categorySlug ?? "general")).size
      : new Set(guides.map((guide) => guide.type)).size;

  const glance =
    guides.length === 0
      ? []
      : [
          { label: "Guides here", value: String(guides.length) },
          {
            label: hub.kind === "question" ? "Trades covered" : "Questions answered",
            value: String(spread),
          },
          { label: "Reading time", value: `${minutes} min` },
          { label: "Last reviewed", value: reviewed ? monthYear(reviewed) : "Unpublished" },
        ];

  return (
    <SiteChrome active="guides">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: hub.h1,
          description: hub.description,
          url: absoluteUrl(hub.path),
          ...(guides.length > 0
            ? {
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: guides.length,
                  itemListElement: guides.map((guide, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: guide.title,
                    url: absoluteUrl(routes.guide(guide.slug)),
                  })),
                },
              }
            : {}),
        }}
      />
      <JsonLd data={breadcrumbSchema(crumbs, absoluteUrl)} />
      <CrumbBar items={crumbs} />

      <section aria-labelledby="hub-h1" className="index-hero">
        <div
          className="shell"
          style={{
            padding: "52px var(--gutter) 44px",
            display: "grid",
            gridTemplateColumns: glance.length > 0 ? "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" : "1fr",
            gap: 34,
            alignItems: "center",
          }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: 12 }}>
              {hub.eyebrow}
            </p>
            <h1 id="hub-h1" className="hero__title" style={{ fontSize: "clamp(32px, 3.8vw, 46px)" }}>
              {hub.h1}
            </h1>
            <p className="hero__lead" style={{ maxWidth: 620 }}>
              {hub.lead}
            </p>
            {siblings.length > 0 ? (
              <div className="filter-bar">
                <span style={{ fontSize: 14, color: "var(--text-secondary)", marginRight: 4 }}>
                  {hub.kind === "question" ? "Also ask:" : "Other trades:"}
                </span>
                {siblings.map((sibling) => (
                  <Link key={sibling.slug} className="chip" href={sibling.path}>
                    {sibling.kind === "trade" ? sibling.h1.replace(/ guides$/, "") : sibling.h1}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {/* What is actually here, in numbers. It fills the half of the hero
              that would otherwise be empty, and it says something a reader can
              check rather than something the page is claiming about itself. */}
          {glance.length > 0 ? (
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                margin: 0,
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 20,
                boxShadow: "var(--shadow-sm)",
                overflow: "hidden",
              }}
            >
              {glance.map((fact, index) => (
                <div
                  key={fact.label}
                  style={{
                    padding: "18px 20px",
                    borderTop: index > 1 ? "1px solid var(--border-subtle)" : undefined,
                    borderRight: index % 2 === 0 ? "1px solid var(--border-subtle)" : undefined,
                  }}
                >
                  <dt
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "var(--ls-wide)",
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    {fact.label}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: 19,
                      fontWeight: 700,
                      lineHeight: 1.25,
                      color: "var(--blue-900)",
                    }}
                  >
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      {guides.length > 0 ? (
        <Section labelledBy="hub-guides-h2">
          <SectionHead
            id="hub-guides-h2"
            title={
              guides.length === 1
                ? "One guide so far"
                : `${guides.length} guides${hub.kind === "trade" ? "" : " across every trade"}`
            }
            lead={
              hub.kind === "trade"
                ? "Newest first. Every one names its author and the date it was last checked."
                : "Newest first. Each guide is written for one trade, and says which."
            }
          />
          {lead ? <LeadCard guide={lead} /> : null}
          {rest.length > 0 ? (
            <div className="card-grid" style={{ marginTop: 22 }}>
              {rest.map((guide) => (
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          ) : null}
        </Section>
      ) : (
        // An honest empty state rather than a page pretending to be full. The
        // metadata keeps it out of the index until something lands here.
        <Section labelledBy="hub-empty-h2">
          <SectionHead
            id="hub-empty-h2"
            title="Nothing published here yet"
            lead="This is where these guides will live. Until one is written, the sections below are where the rest of the research is."
          />
        </Section>
      )}

      {otherAxis.length > 0 ? (
        <Section tone="page" labelledBy="hub-other-h2" ruleBottom={false}>
          <SectionHead id="hub-other-h2" title={otherAxisTitle} lead={otherAxisLead} />
          <LinkGrid
            items={otherAxis.map((other) => ({
              label: other.kind === "trade" ? other.h1.replace(/ guides$/, "") : other.h1,
              href: other.path,
            }))}
          />
        </Section>
      ) : null}

      <RelatedContent groups={related} title="Keep reading" />

      <FinalSearch title="Ready to find someone?" />
    </SiteChrome>
  );
}
