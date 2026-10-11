import { notFound } from "next/navigation";
import { FinalSearch } from "@/components/site/blocks";
import { HubCardGrid, HubChips, HubGuideCard, HubHero, HubLinkGrid, HubSection, type HubCard } from "@/components/site/guides/HubParts";
import { RelatedContent } from "@/components/site/RelatedContent";
import { SiteChrome } from "@/components/site/SiteChrome";
import { JsonLd } from "@/components/ui/primitives";
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
  return `$${guide.typicalLow.toLocaleString()} to $${guide.typicalHigh.toLocaleString()}`;
}

function toCard(guide: HubGuide): HubCard {
  return {
    key: guide.id,
    href: routes.guide(guide.slug),
    title: guide.title,
    excerpt: guide.excerpt,
    eyebrow: guide.categoryName ?? "General",
    range: priceRange(guide),
    meta: byline(guide),
    image: guide.heroImage,
    cost: guide.type === "COST",
  };
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

  const crumbs = [{ label: "Home", href: "/" }, { label: "Guides", href: routes.guidesIndex() }, { label: hub.h1 }];

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
    <SiteChrome active="guides" skin>
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
      <HubHero
        crumbs={crumbs}
        eyebrow={hub.eyebrow}
        title={hub.h1}
        titleId="hub-h1"
        lead={hub.lead}
        chips={
          siblings.length > 0 ? (
            <HubChips
              label={hub.kind === "question" ? "Also ask:" : "Other trades:"}
              items={siblings.map((sibling) => ({
                href: sibling.path,
                label: sibling.kind === "trade" ? sibling.h1.replace(/ guides$/, "") : sibling.h1,
              }))}
            />
          ) : undefined
        }
        aside={
          /* What is actually here, in numbers. It fills the half of the hero
             that would otherwise be empty, and it says something a reader can
             check rather than something the page is claiming about itself. */
          glance.length > 0 ? (
            <dl
              data-hero-aside=""
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                margin: 0,
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "24px",
                boxShadow: "var(--shadow-lg)",
                overflow: "hidden",
              }}
            >
              {glance.map((fact, index) => (
                <div
                  key={fact.label}
                  style={{
                    padding: "26px 28px",
                    borderTop: index > 1 ? "1px solid var(--border-subtle)" : undefined,
                    borderRight: index % 2 === 0 ? "1px solid var(--border-subtle)" : undefined,
                  }}
                >
                  <dt
                    style={{
                      fontSize: "11.5px",
                      fontWeight: "700",
                      letterSpacing: "var(--ls-wider)",
                      textTransform: "uppercase",
                      color: "var(--text-secondary)",
                      marginBottom: "8px",
                    }}
                  >
                    {fact.label}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: "clamp(22px, 2.4vw, 28px)",
                      fontWeight: "800",
                      letterSpacing: "-0.03em",
                      lineHeight: "1.15",
                      color: "var(--blue-900)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : undefined
        }
      />

      {guides.length > 0 ? (
        <HubSection
          labelledBy="hub-guides-h2"
          title={guides.length === 1 ? "One guide so far" : `${guides.length} guides${hub.kind === "trade" ? "" : " across every trade"}`}
          lead={
            hub.kind === "trade"
              ? "Newest first. Every one names its author and the date it was last checked."
              : "Newest first. Each guide is written for one trade, and says which."
          }
        >
          {lead ? <HubGuideCard card={toCard(lead)} lead /> : null}
          {rest.length > 0 ? (
            <div style={{ marginTop: "22px" }}>
              <HubCardGrid cards={rest.map(toCard)} />
            </div>
          ) : null}
        </HubSection>
      ) : (
        // An honest empty state rather than a page pretending to be full. The
        // metadata keeps it out of the index until something lands here.
        <HubSection
          labelledBy="hub-empty-h2"
          title="Nothing published here yet"
          lead="This is where these guides will live. Until one is written, the sections below are where the rest of the research is."
        />
      )}

      {otherAxis.length > 0 ? (
        <HubSection tone="page" labelledBy="hub-other-h2" title={otherAxisTitle} lead={otherAxisLead} last>
          <HubLinkGrid
            icon={hub.kind === "question" ? "wrench" : "help"}
            items={otherAxis.map((other) => ({
              label: other.kind === "trade" ? other.h1.replace(/ guides$/, "") : other.h1,
              href: other.path,
            }))}
          />
        </HubSection>
      ) : null}

      <RelatedContent groups={related} title="Keep reading" />

      <FinalSearch title="Ready to find someone?" />
    </SiteChrome>
  );
}
