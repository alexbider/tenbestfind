import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar, FinalSearch, LinkGrid } from "@/components/site/blocks";
import { SiteChrome } from "@/components/site/SiteChrome";
import { JsonLd, Media, Section, SectionHead } from "@/components/ui/primitives";
import { monthYear } from "@/lib/format";
import { db } from "@/lib/db";
import { GUIDE_TYPES, GUIDE_TYPE_LABELS, guideTypeOf, type GuideType } from "@/lib/enums";
import { getGuideHubs } from "@/lib/guide-hubs";
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
  HOW_TO_CHOOSE:
    "Reading a quote, checking a licence, and the differences that actually predict whether a job goes well.",
  COST: "Sourced ranges with the reasoning behind them, and an honest note wherever we have no figure to publish.",
  QUESTIONS:
    "What to ask before anyone starts, and what a good answer to each one sounds like.",
  CHECKLIST: "What to confirm before the work starts, while it runs, and before the last invoice.",
};

export default async function GuidesIndexPage() {
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
          {tradeHubs.length > 0 ? (
            <div className="filter-bar">
              <span style={{ fontSize: 14, color: "var(--text-secondary)", marginRight: 4 }}>
                By trade:
              </span>
              {tradeHubs.map((hub) => (
                <Link key={hub.slug} className="chip" href={hub.path}>
                  {hub.h1.replace(/ guides$/, "")}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {GUIDE_TYPES.map((type, index) => {
        const list = byType.get(type) ?? [];
        if (list.length === 0) return null;
        const hub = questionHubs.find((candidate) => candidate.guideType === type);
        const shown = list.slice(0, PREVIEW);

        return (
          <Section
            key={type}
            tone={index % 2 === 1 ? "page" : "card"}
            labelledBy={`guides-${type}-h2`}
          >
            <SectionHead
              id={`guides-${type}-h2`}
              eyebrow="By question"
              title={GUIDE_TYPE_LABELS[type]}
              lead={SECTION_LEAD[type]}
              linkHref={hub?.path}
              linkLabel={
                hub ? (list.length > PREVIEW ? `All ${list.length} guides` : "See the hub") : undefined
              }
            />
            <div className={type === "COST" ? "card-grid card-grid--2" : "card-grid"}>
              {shown.map((guide) => (
                <article key={guide.id} className="card card--lift" style={{ overflow: "hidden" }}>
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
                      {guide.category?.serviceName ?? "General"}
                    </p>
                    <h3 style={{ fontSize: 18, lineHeight: 1.3, marginBottom: 8 }}>
                      <Link href={routes.guide(guide.slug)} style={{ color: "var(--ink)" }}>
                        {guide.title}
                      </Link>
                    </h3>
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
                    {type === "COST" && guide.typicalLow && guide.typicalHigh ? (
                      <p
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "var(--ink)",
                          fontVariantNumeric: "tabular-nums",
                          marginBottom: 10,
                        }}
                      >
                        ${guide.typicalLow.toLocaleString()}–${guide.typicalHigh.toLocaleString()}
                      </p>
                    ) : null}
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      By {guide.author?.name} · {monthYear(guide.publishedAt)} ·{" "}
                      {guide.readingMinutes} min
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </Section>
        );
      })}

      {tradeHubs.length > 0 ? (
        <Section tone="soft" labelledBy="guides-trades-h2" ruleBottom={false}>
          <SectionHead
            id="guides-trades-h2"
            eyebrow="By trade"
            title="Every guide for one kind of work"
            lead="The same research, sorted by the job rather than the question."
          />
          <LinkGrid
            items={tradeHubs.map((hub) => ({
              label: hub.h1.replace(/ guides$/, ""),
              href: hub.path,
            }))}
          />
        </Section>
      ) : null}

      <FinalSearch title="Ready to find someone?" />
    </SiteChrome>
  );
}
