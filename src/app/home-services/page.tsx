import type { Metadata } from "next";
import Link from "next/link";
import { PROJECT_GROUPS, CATEGORY_BANDS } from "../../../prisma/data/taxonomy";
import { BusinessCta, CheckList, CrumbBar, FinalSearch, LinkGrid } from "@/components/site/blocks";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SearchForm } from "@/components/site/SearchForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { ChevronRight, Icon } from "@/components/ui/Icon";
import { ArrowLink, JsonLd, Section, SectionHead, TrustItem } from "@/components/ui/primitives";
import { monthYear, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { db } from "@/lib/db";
import { getGlobalFaqs, rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Home services — every trade we research",
  description:
    "The full home services taxonomy, from plumbing and roofing to moving and restoration. Pick a trade to see the researched top ten for your city.",
  alternates: { canonical: "/home-services/" },
};

const HIRING_CHECKS = [
  "Verify the licence with the issuing agency, not the company website",
  "Look for liability coverage appropriate to the service, plus workers compensation when crews are involved",
  "Weigh experience with your exact type of project, not the trade in general",
  "Look for patterns in customer feedback rather than reacting to single reviews",
  "Understand scope, labour, materials and exclusions before approving anything",
  "Ask what the warranty covers, for how long, and whether labour and parts are separate",
  "Confirm who is responsible for pulling permits and booking inspections",
  "Get a written agreement covering payment schedule, timeline and change orders",
];

export default async function ServicesIndexPage() {
  const [categories, rankings, guides, faqs] = await Promise.all([
    db.category.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { rankings: true } } },
    }),
    db.ranking.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { lastReviewedAt: "desc" },
      take: 8,
      select: rankingCardSelect,
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 8,
      include: { category: { select: { serviceName: true } }, author: { select: { name: true } } },
    }),
    getGlobalFaqs(),
  ]);

  const bands = CATEGORY_BANDS.map((band) => ({
    ...band,
    items: categories.filter((category) => category.groupName === band.title),
  })).filter((band) => band.items.length > 0);

  return (
    <SiteChrome active="services">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Home services",
          url: absoluteUrl(routes.servicesIndex()),
        }}
      />
      <FaqJsonLd faqs={faqs} />

      <CrumbBar items={[{ label: "Home", href: "/" }, { label: "Home services" }]} />

      <section
        aria-labelledby="hero-h1"
        style={{
          background:
            "linear-gradient(180deg, var(--blue-50) 0%, rgba(234,244,255,0.32) 55%, var(--surface-card) 100%)",
        }}
      >
        <div className="shell" style={{ padding: "60px var(--gutter) 48px" }}>
          <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(34px, 4.2vw, 52px)", maxWidth: 860 }}>
            Every home service we research
          </h1>
          <p className="hero__lead" style={{ maxWidth: 660 }}>
            {categories.length} trades, organized the way a project actually starts. Pick the work
            you need doing and we will show you the researched shortlist for your city.
          </p>
          <div style={{ marginTop: 30, maxWidth: 760 }}>
            <SearchForm idPrefix="services" />
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <ul className="shell trust-strip">
            <TrustItem icon="shield" label="Independent research" />
            <TrustItem icon="badge" label="Credentials checked" />
            <TrustItem icon="eye" label="Criteria published" />
            <TrustItem icon="clock" label="Reviewed on a schedule" />
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------- the taxonomy */}
      <Section tone="page" ruleTop labelledBy="cats-h2">
        <SectionHead
          id="cats-h2"
          title="Browse by trade"
          lead="Grouped by the kind of work rather than alphabetically, because that is how people arrive."
        />
        <div style={{ display: "grid", gap: 48 }}>
          {bands.map((band) => (
            <div key={band.title}>
              <div className="band-head">
                <h3>{band.title}</h3>
                <p>{band.note}</p>
              </div>
              <ul className="cat-grid">
                {band.items.map((category) => (
                  <li key={category.slug} className="card card--lift cat-card">
                    <div className="cat-card__top">
                      <span aria-hidden="true" style={{ color: "var(--blue-700)", display: "inline-flex" }}>
                        <Icon
                          name={hasIcon(category.iconKey) ? category.iconKey : "house"}
                          size={24}
                          strokeWidth={1.7}
                        />
                      </span>
                      <ChevronRight size={16} color="var(--gray-300)" />
                    </div>
                    <h4 className="cat-card__name">
                      <Link href={routes.category(category.slug)} style={{ color: "var(--ink)" }}>
                        {category.name}
                      </Link>
                    </h4>
                    <p className="cat-card__sub">{category.tagline}</p>
                    {category._count.rankings > 0 ? (
                      <p className="cat-card__count">
                        {category._count.rankings} published{" "}
                        {category._count.rankings === 1 ? "ranking" : "rankings"}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------------ projects */}
      <Section labelledBy="proj-h2">
        <SectionHead
          id="proj-h2"
          title="What are you working on?"
          lead="Start from the job rather than the trade."
        />
        <div className="project-grid">
          {PROJECT_GROUPS.map((group) => (
            <div key={group.title} className="card project-card">
              <span className="project-card__icon" aria-hidden="true">
                <Icon name={hasIcon(group.iconKey) ? group.iconKey : "wrench"} size={22} strokeWidth={1.8} />
              </span>
              <h3>{group.title}</h3>
              <ul>
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link className="row-link" href={href}>
                      <span>{label}</span>
                      <ChevronRight />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------------ rankings */}
      {rankings.length > 0 ? (
        <Section tone="page" labelledBy="rank-h2">
          <SectionHead
            id="rank-h2"
            title="Recently published rankings"
            linkHref={routes.rankingsIndex()}
            linkLabel="All rankings"
          />
          <ul className="index-list">
            {rankings.map((ranking) => (
              <li key={ranking.id}>
                <Link className="index-row" href={rankingUrl(ranking)}>
                  <span aria-hidden="true" className="rank-mark">
                    10
                  </span>
                  <span className="eyebrow">
                    {ranking.category.serviceName} · {ranking.city?.name}
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
        </Section>
      ) : null}

      {/* -------------------------------------------------------- how to choose */}
      <Section labelledBy="choose-h2">
        <div className="split" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 48 }}>
          <div className="toc">
            <h2 id="choose-h2" className="h2" style={{ marginBottom: 18, textWrap: "balance" }}>
              How to choose any home service company
            </h2>
            <p className="lead" style={{ marginBottom: 20 }}>
              The specifics change by trade, but these eight checks apply to every job worth more
              than a service call.
            </p>
            <ArrowLink href={routes.howWeRank()}>Read our full methodology</ArrowLink>
          </div>
          <div className="card" style={{ padding: "28px 30px" }}>
            <CheckList items={HIRING_CHECKS} />
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------------- guides */}
      {guides.length > 0 ? (
        <Section tone="page" labelledBy="guides-h2">
          <SectionHead
            id="guides-h2"
            title="Guides"
            lead="What to ask, what to check and what a fair price looks like."
            linkHref={routes.guidesIndex()}
            linkLabel="All guides"
          />
          <LinkGrid
            columns={2}
            items={guides.map((guide) => ({
              label: guide.title,
              href: routes.guide(guide.slug),
              meta: `${guide.category?.serviceName ?? "Guide"} · By ${guide.author?.name} · ${monthYear(guide.publishedAt)}`,
            }))}
          />
        </Section>
      ) : null}

      <Section labelledBy="faqs-h2">
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 56, alignItems: "start" }}
        >
          <div className="toc">
            <h2 id="faqs-h2" className="h2" style={{ marginBottom: 16 }}>
              Common questions
            </h2>
            <ArrowLink href={routes.contact()}>Ask us something else</ArrowLink>
          </div>
          <FaqList faqs={faqs} />
        </div>
      </Section>

      <Section tone="page" labelledBy="biz-h2" ruleBottom={false}>
        <BusinessCta />
      </Section>

      <FinalSearch />
    </SiteChrome>
  );
}
