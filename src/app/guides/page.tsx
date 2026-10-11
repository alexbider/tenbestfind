import type { Metadata } from "next";
import { FinalSearch } from "@/components/site/blocks";
import { RelatedContent } from "@/components/site/RelatedContent";
import { SiteChrome } from "@/components/site/SiteChrome";
import { JsonLd } from "@/components/ui/primitives";
import { HubCardGrid, HubChips, HubHero, HubLinkGrid, HubSection, type HubCard } from "@/components/site/guides/HubParts";
import { monthYear } from "@/lib/format";
import { db } from "@/lib/db";
import { GUIDE_TYPES, GUIDE_TYPE_LABELS, guideTypeOf, type GuideType } from "@/lib/enums";
import { getGuideHubs } from "@/lib/guide-hubs";
import { relatedForGuideHub } from "@/lib/related";
import { absoluteUrl, routes } from "@/lib/urls";
import { guidesCopy } from "@/lib/seo-copy";

export const revalidate = 60;

const copy = guidesCopy();

export const metadata: Metadata = {
  title: { absolute: copy.title },
  description: copy.description,
  alternates: { canonical: "/guides/" },
};

/** How many cards one section shows before it sends the reader to the hub. */
const PREVIEW = 6;

const SECTION_LEAD: Record<GuideType, string> = {
  HOW_TO_CHOOSE: "Reading a quote, checking a licence, and the differences that actually predict whether a job goes well.",
  COST: "Sourced ranges with the reasoning behind them, and an honest note wherever we have no figure to publish.",
  QUESTIONS: "What to ask before anyone starts, and what a good answer to each one sounds like.",
  CHECKLIST: "What to confirm before the work starts, while it runs, and before the last invoice.",
};

export default async function GuidesIndexPage() {
  const related = await relatedForGuideHub({});

  const [guides, hubs] = await Promise.all([
    db.guide.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: {
        category: { select: { name: true, slug: true, serviceName: true } },
        author: { select: { name: true, slug: true } },
      },
    }),
    getGuideHubs(),
  ]);

  // Grouped once in memory rather than queried per section: there is one list
  // of published guides and four questions to ask of it.
  const byType = new Map<GuideType, typeof guides>();
  for (const guide of guides) {
    const type = guideTypeOf(guide.type);
    byType.set(type, [...(byType.get(type) ?? []), guide]);
  }

  const questionHubs = hubs.filter((hub) => hub.kind === "question");
  const tradeHubs = hubs.filter((hub) => hub.kind === "trade");

  const crumbs = [{ label: "Home", href: "/" }, { label: "Guides" }];

  return (
    <SiteChrome active="guides" skin>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Guides",
          url: absoluteUrl(routes.guidesIndex()),
        }}
      />

      <HubHero
        crumbs={crumbs}
        title={copy.h1}
        titleId="hero-h1"
        lead="Guides on comparing quotes, verifying a licence, and what a fair price looks like. Written by named editors, and reviewed by people who have done the work where the trade warrants it."
        chips={
          tradeHubs.length > 0 ? (
            <HubChips label="By trade:" items={tradeHubs.map((hub) => ({ href: hub.path, label: hub.h1.replace(/ guides$/, "") }))} />
          ) : undefined
        }
      />

      {GUIDE_TYPES.map((type, index) => {
        const list = byType.get(type) ?? [];
        if (list.length === 0) return null;
        const hub = questionHubs.find((candidate) => candidate.guideType === type);
        const cards: HubCard[] = list.slice(0, PREVIEW).map((guide) => ({
          key: guide.id,
          href: routes.guide(guide.slug),
          title: guide.title,
          excerpt: guide.excerpt,
          eyebrow: guide.category?.serviceName ?? "General",
          range:
            type === "COST" && guide.typicalLow && guide.typicalHigh
              ? `$${guide.typicalLow.toLocaleString()} to $${guide.typicalHigh.toLocaleString()}`
              : null,
          meta: `By ${guide.author?.name} · ${monthYear(guide.publishedAt)} · ${guide.readingMinutes} min`,
          image: guide.heroImage,
          cost: type === "COST",
        }));

        return (
          <HubSection
            key={type}
            tone={index % 2 === 1 ? "page" : "card"}
            labelledBy={`guides-${type}-h2`}
            eyebrow="By question"
            title={GUIDE_TYPE_LABELS[type]}
            lead={SECTION_LEAD[type]}
            linkHref={hub?.path}
            linkLabel={hub ? (list.length > PREVIEW ? `All ${list.length} guides` : "See the hub") : undefined}
          >
            <HubCardGrid cards={cards} two={type === "COST"} />
          </HubSection>
        );
      })}

      {tradeHubs.length > 0 ? (
        <HubSection
          tone="page"
          labelledBy="guides-trades-h2"
          eyebrow="By trade"
          title="Every guide for one kind of work"
          lead="The same research, sorted by the job rather than the question."
          last
        >
          <HubLinkGrid items={tradeHubs.map((hub) => ({ label: hub.h1.replace(/ guides$/, ""), href: hub.path }))} icon="wrench" />
        </HubSection>
      ) : null}

      <RelatedContent groups={related} title="Elsewhere on the site" />

      <FinalSearch title="Ready to find someone?" />
    </SiteChrome>
  );
}
