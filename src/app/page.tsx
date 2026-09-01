import type { Metadata } from "next";
import Link from "next/link";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SearchForm } from "@/components/site/SearchForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { ArrowRight, Check, ChevronRight, Icon } from "@/components/ui/Icon";
import {
  ArrowLink,
  JsonLd,
  Media,
  Section,
  SectionHead,
  TrustItem,
} from "@/components/ui/primitives";
import { monthYear, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import {
  getCountriesWithRegions,
  getFeaturedCategories,
  getGlobalFaqs,
  getPopularCities,
  getPublishedGuides,
  getPublishedRankings,
  getTrendingSubservices,
} from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

export const metadata: Metadata = {
  title: "TenBestFind — the ten best local businesses, researched",
  description:
    "We research local service companies one city at a time, then publish a short list of the ones worth calling. Independent research, never paid placement.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, trending, rankings, countries, guides, faqs, usCities, caCities] =
    await Promise.all([
      getFeaturedCategories(),
      getTrendingSubservices(),
      getPublishedRankings(8),
      getCountriesWithRegions(),
      getPublishedGuides(6),
      getGlobalFaqs(),
      getPopularCities("us"),
      getPopularCities("ca"),
    ]);

  const [leadRanking, ...restRankings] = rankings;
  const sideRankings = restRankings.slice(0, 3);
  const latest = rankings.slice(0, 6);
  const [leadGuide, ...sideGuides] = guides;

  return (
    <SiteChrome active="none">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "TenBestFind",
          url: absoluteUrl("/"),
          description:
            "Independent research on local service companies. We publish the shortlist and the reasoning behind it.",
        }}
      />
      <FaqJsonLd faqs={faqs} />

      {/* ------------------------------------------------------------- hero */}
      <section
        aria-labelledby="hero-h1"
        style={{
          background:
            "linear-gradient(180deg, var(--blue-50) 0%, rgba(234,244,255,0.32) 55%, var(--surface-card) 100%)",
        }}
      >
        <div
          className="shell split"
          style={{
            padding: "76px var(--gutter) 60px",
            display: "grid",
            gridTemplateColumns: "1.14fr 0.86fr",
            gap: 60,
            alignItems: "center",
          }}
        >
          <div>
            <p className="hero__badge">
              <span className="hero__badge-tick">
                <Check size={13} color="currentColor" strokeWidth={2.6} />
              </span>
              Independent research, never paid placement
            </p>
            <h1 id="hero-h1" className="hero__title">
              Find the ten best local businesses near you
            </h1>
            <p className="hero__lead">
              We research local service companies one city at a time, then publish a short list of
              the ones worth calling. You get a starting point instead of forty open tabs.
            </p>

            <div style={{ marginTop: 32 }}>
              <SearchForm
                idPrefix="hero"
                suggestions={[
                  {
                    title: "Services",
                    items: categories.slice(0, 3).map((category) => ({
                      name: category.name,
                      href: routes.category(category.slug),
                    })),
                  },
                  {
                    title: "Popular cities",
                    items: [...usCities.slice(0, 2), ...caCities.slice(0, 1)].map((city) => ({
                      name: `${city.name}, ${city.region.code.toUpperCase()}`,
                      href: routes.city(city.region.country.code, city.region.slug, city.slug),
                    })),
                  },
                  {
                    title: "Recent rankings",
                    items: rankings.slice(0, 2).map((ranking) => ({
                      name: ranking.title,
                      href: rankingUrl(ranking),
                    })),
                  },
                ]}
              />
            </div>

            <div className="hero__chips">
              <span>Popular:</span>
              {categories.slice(0, 5).map((category) => (
                <Link key={category.slug} className="chip" href={routes.category(category.slug)}>
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          {leadRanking ? (
            <aside aria-labelledby="hero-preview-h2" className="card card--lift hero__preview">
              <div className="thumb" style={{ height: 180 }}>
                <Media src={leadRanking.city?.heroImage} alt="" />
                <span className="thumb__tag">Sample ranking</span>
              </div>
              <div style={{ padding: "22px 24px 24px" }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>
                  {leadRanking.category.serviceName} · {leadRanking.city?.name},{" "}
                  {leadRanking.city?.region.code.toUpperCase()}
                </p>
                <h2 id="hero-preview-h2" style={{ fontSize: 21, lineHeight: 1.25, marginBottom: 18 }}>
                  <Link href={rankingUrl(leadRanking)} style={{ color: "var(--ink)" }}>
                    {leadRanking.title}
                  </Link>
                </h2>
                <ul style={{ display: "grid", gap: 11 }}>
                  {[
                    "License and insurance on file",
                    "Documented local project history",
                    "Warranty terms in writing",
                  ].map((item) => (
                    <li
                      key={item}
                      style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 15 }}
                    >
                      <Check />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="hero__preview-foot">
                  <span>Updated {monthYear(leadRanking.lastReviewedAt)}</span>
                  <ArrowLink href={rankingUrl(leadRanking)} style={{ fontSize: 14 }}>
                    View ranking
                  </ArrowLink>
                </div>
              </div>
            </aside>
          ) : null}
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <ul className="shell trust-strip">
            <TrustItem icon="shield" label="Independent research" />
            <TrustItem icon="eye" label="Published criteria" />
            <TrustItem icon="pin" label="City-level lists" />
            <TrustItem icon="clock" label="Reviewed on a schedule" />
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- categories */}
      <Section tone="page" ruleTop labelledBy="cats-h2">
        <SectionHead
          id="cats-h2"
          title="Browse home services"
          lead="Pick the trade you need. Each category opens the researched top ten for your area, plus what to check before you sign anything."
          linkHref={routes.servicesIndex()}
          linkLabel="View all 40+ services"
        />
        <ul className="cat-grid">
          {categories.map((category) => (
            <li
              key={category.slug}
              className="card card--lift cat-card"
              data-wide={category.wide ? "true" : undefined}
            >
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
              <h3 className="cat-card__name">
                <Link href={routes.category(category.slug)} style={{ color: "var(--ink)" }}>
                  {category.name}
                </Link>
              </h3>
              <p className="cat-card__sub">{category.tagline}</p>
            </li>
          ))}
        </ul>

        {trending.length > 0 ? (
          <div className="trend-rail">
            <span className="trend-rail__label">
              <Icon name="up" size={15} strokeWidth={2.2} color="var(--color-primary)" />
              Trending this week
            </span>
            {trending.map((item) => (
              <Link
                key={item.id}
                className="chip"
                href={routes.subservice(item.category.slug, item.slug)}
                style={{ fontWeight: 600, color: "var(--ink)" }}
              >
                {item.name}
              </Link>
            ))}
          </div>
        ) : null}
      </Section>

      {/* ------------------------------------------------ popular rankings */}
      {leadRanking ? (
        <Section labelledBy="feat-h2">
          <SectionHead
            id="feat-h2"
            title="Popular 10 best rankings"
            lead="The lists people open most this month."
            linkHref={routes.rankingsIndex()}
            linkLabel="View all rankings"
          />
          <div
            className="split"
            style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 28, alignItems: "start" }}
          >
            <article className="card card--lift" style={{ overflow: "hidden" }}>
              <div className="thumb" style={{ height: 320 }}>
                <Media src={leadRanking.city?.heroImage} alt="" />
                <span className="thumb__tag">
                  {leadRanking.category.serviceName} · {leadRanking.city?.name},{" "}
                  {leadRanking.city?.region.code.toUpperCase()}
                </span>
              </div>
              <div style={{ padding: 28 }}>
                <h3 style={{ fontSize: 27, lineHeight: 1.2, marginBottom: 12, textWrap: "balance" }}>
                  <Link href={rankingUrl(leadRanking)} style={{ color: "var(--ink)" }}>
                    {leadRanking.title}
                  </Link>
                </h3>
                <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--text-secondary)", marginBottom: 20 }}>
                  {leadRanking.summary}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 20 }}>
                  <span className="meta-tick">
                    <Check size={16} strokeWidth={2.2} />
                    Credentials verified
                  </span>
                  <span className="meta-tick">
                    <Check size={16} strokeWidth={2.2} />
                    Sources cited
                  </span>
                </div>
                <div className="card-foot">
                  <span>
                    Updated {monthYear(leadRanking.lastReviewedAt)}
                    {leadRanking.author ? (
                      <>
                        {" · By "}
                        <Link
                          href={routes.expert(leadRanking.author.slug)}
                          style={{ color: "var(--text-secondary)", textDecoration: "underline" }}
                        >
                          {leadRanking.author.name}
                        </Link>
                      </>
                    ) : null}
                  </span>
                  <ArrowLink href={rankingUrl(leadRanking)} style={{ fontSize: 14 }}>
                    View ranking
                  </ArrowLink>
                </div>
              </div>
            </article>

            <ul style={{ display: "grid", gap: 16 }}>
              {sideRankings.map((ranking) => (
                <li key={ranking.id} className="card card--lift side-card">
                  <span className="thumb side-card__thumb">
                    <Media src={ranking.city?.heroImage} alt="" />
                  </span>
                  <span className="side-card__body">
                    <span className="eyebrow">
                      {ranking.category.serviceName} · {ranking.city?.name},{" "}
                      {ranking.city?.region.code.toUpperCase()}
                    </span>
                    <h3 style={{ fontSize: 17, lineHeight: 1.3 }}>
                      <Link href={rankingUrl(ranking)} style={{ color: "var(--ink)" }}>
                        {ranking.title}
                      </Link>
                    </h3>
                    <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--text-secondary)" }}>
                      {ranking.summary}
                    </span>
                    <span style={{ marginTop: "auto", fontSize: 13, color: "var(--text-muted)" }}>
                      Updated {monthYear(ranking.lastReviewedAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* ---------------------------------------------------- country fork */}
      <Section labelledBy="country-h2">
        <div style={{ maxWidth: 640, marginBottom: 40 }}>
          <h2 id="country-h2" className="h2">
            Where are you looking?
          </h2>
          <p className="lead" style={{ marginTop: 14 }}>
            Lists are organized by country, then by state or province, then by city. Licensing rules
            and typical pricing change at every one of those levels, so the research does too.
          </p>
        </div>
        <div className="country-grid">
          {countries.map((country) => (
            <article key={country.code} className="card card--lift" style={{ overflow: "hidden" }}>
              <div className="thumb" style={{ height: 190 }}>
                <Media src={country.heroImage} alt="" />
              </div>
              <div style={{ padding: "26px 28px 28px" }}>
                <h3 style={{ fontSize: 22, marginBottom: 8 }}>
                  <Link href={routes.country(country.code)} style={{ color: "var(--ink)" }}>
                    {country.name}
                  </Link>
                </h3>
                <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: 20 }}>
                  {country.blurb}
                </p>
                <p className="eyebrow--muted" style={{ marginBottom: 10, textTransform: "uppercase" }}>
                  Popular {country.regionLabel}
                </p>
                <ul style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                  {country.regions.slice(0, 4).map((region) => (
                    <li key={region.id}>
                      <Link className="chip" href={routes.region(country.code, region.slug)}>
                        {region.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={routes.country(country.code)} className="btn btn--primary btn--sm">
                  Browse {country.name}
                  <ArrowRight />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------- how it works */}
      <Section tone="soft" labelledBy="how-h2">
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.82fr 1.18fr", gap: 56, alignItems: "start" }}
        >
          <div>
            <h2 id="how-h2" className="h2" style={{ marginBottom: 18, textWrap: "balance" }}>
              How a TenBestFind list gets made
            </h2>
            <p className="lead" style={{ marginBottom: 18 }}>
              TenBestFind is a small editorial team that researches local service companies. We look
              at licensing, how long a company has worked in the area, the range of jobs it takes
              on, and what its customers say in public.
            </p>
            <p className="lead" style={{ marginBottom: 28 }}>
              Then we publish ten names and the reasoning behind them. The three steps are the same
              for every list; the criteria change by trade.
            </p>
            <Link href={routes.howWeRank()} className="btn btn--primary">
              Read our full methodology
              <ArrowRight size={17} />
            </Link>
          </div>
          <ol style={{ display: "grid", gap: 14 }}>
            {[
              {
                title: "Research",
                body: "We build the list of companies that genuinely serve the area, then collect licence records, service range, years in business and public feedback.",
              },
              {
                title: "Evaluate",
                body: "Companies are compared on the things that actually decide a job: who is licensed for the work, who answers after hours, who puts warranty terms in writing.",
              },
              {
                title: "Publish",
                body: "Ten names go up with the criteria, the sources and the date. If we could not verify something, we say so rather than filling the gap.",
              },
            ].map((step, index) => (
              <li key={step.title} className="step-card">
                <span aria-hidden="true" className="step-card__num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span style={{ display: "block" }}>
                  <h3 style={{ fontSize: 20, marginBottom: 7 }}>{step.title}</h3>
                  <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--text-secondary)" }}>
                    {step.body}
                  </p>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ------------------------------------------------------------ E-E-A-T */}
      <Section tone="ink" labelledBy="eeat-h2" ruleBottom={false}>
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 56, alignItems: "start" }}
        >
          <div>
            <h2 id="eeat-h2" className="h2" style={{ marginBottom: 16, textWrap: "balance" }}>
              Who is behind the rankings
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(232,237,245,0.72)" }}>
              Who writes the lists, how the research works, how we make money, and how we fix
              mistakes. All of it is public.
            </p>
          </div>
          <ul className="ink-cards">
            {[
              {
                title: "Named editors",
                body: "Every list is written or reviewed by someone on the editorial team, and their name is on the page.",
                cta: "Meet the team",
                href: routes.editorialTeam(),
              },
              {
                title: "Published criteria",
                body: "We publish what we check for each trade, and where the limits of that checking are.",
                cta: "Our methodology",
                href: routes.howWeRank(),
              },
              {
                title: "How we make money",
                body: "Businesses can sponsor placements. Those are labeled, and they never change who makes an editorial list.",
                cta: "Advertising disclosure",
                href: routes.advertisingDisclosure(),
              },
              {
                title: "Fixing mistakes",
                body: "Lists are re-checked on a schedule, and anyone can flag something that is out of date.",
                cta: "Corrections policy",
                href: routes.corrections(),
              },
            ].map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <Link className="arrow-link" href={item.href} style={{ color: "var(--gold-ink)" }}>
                  {item.cta}
                  <ArrowRight size={15} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ------------------------------------------------------ city browser */}
      <Section tone="page" labelledBy="geo-h2">
        <SectionHead
          id="geo-h2"
          title="Browse popular cities"
          lead="Jump straight into the metros with the most published rankings."
          linkHref={routes.locationsIndex()}
          linkLabel="All locations"
        />
        <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {[
            { title: "United States", code: "us", cities: usCities },
            { title: "Canada", code: "ca", cities: caCities },
          ].map((block) => (
            <div key={block.code} className="card" style={{ padding: "26px 28px" }}>
              <div className="city-block__head">
                <h3 style={{ fontSize: 18 }}>{block.title}</h3>
                <ArrowLink href={routes.country(block.code)} style={{ fontSize: 14 }}>
                  All {block.title} cities
                </ArrowLink>
              </div>
              <ul className="city-block__list">
                {block.cities.map((city) => (
                  <li key={`${city.region.slug}-${city.slug}`}>
                    <Link
                      className="row-link"
                      href={routes.city(city.region.country.code, city.region.slug, city.slug)}
                    >
                      <span>
                        {city.name}, {city.region.code.toUpperCase()}
                      </span>
                      <ChevronRight />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* --------------------------------------------------- latest rankings */}
      {latest.length > 0 ? (
        <Section labelledBy="latest-h2">
          <SectionHead
            id="latest-h2"
            title="Latest rankings"
            lead="Newly published and recently re-checked lists."
            linkHref={routes.rankingsIndex()}
            linkLabel="Everything we've published"
          />
          <ul className="index-list">
            {latest.map((ranking) => (
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
                  <span className="index-row__meta">
                    Updated {shortMonthYear(ranking.lastReviewedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* -------------------------------------------------------------- guides */}
      {leadGuide ? (
        <Section tone="page" labelledBy="guides-h2">
          <SectionHead
            id="guides-h2"
            title="Know what to ask before you call"
            lead="Short guides on comparing quotes, spotting a licence that does not cover the work, and what a fair price looks like."
            linkHref={routes.guidesIndex()}
            linkLabel="All guides"
          />
          <div
            className="split"
            style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 28, alignItems: "start" }}
          >
            <article className="card card--lift" style={{ overflow: "hidden" }}>
              <div className="thumb" style={{ height: 220 }}>
                <Media src={leadGuide.heroImage} alt="" />
              </div>
              <div style={{ padding: "26px 28px 28px" }}>
                <p className="eyebrow" style={{ marginBottom: 10 }}>
                  {leadGuide.category?.serviceName ?? "Guide"}
                </p>
                <h3 style={{ fontSize: 24, lineHeight: 1.25, marginBottom: 10 }}>
                  <Link href={routes.guide(leadGuide.slug)} style={{ color: "var(--ink)" }}>
                    {leadGuide.title}
                  </Link>
                </h3>
                <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--text-secondary)", marginBottom: 16 }}>
                  {leadGuide.excerpt}
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  By {leadGuide.author?.name} · Updated {shortMonthYear(leadGuide.publishedAt)}
                </p>
              </div>
            </article>
            <ul style={{ display: "grid", gap: 12 }}>
              {sideGuides.map((guide) => (
                <li key={guide.id} className="card card--lift" style={{ padding: "20px 22px" }}>
                  <p className="eyebrow--muted" style={{ marginBottom: 6, textTransform: "uppercase" }}>
                    {guide.category?.serviceName ?? "Guide"}
                  </p>
                  <h3 style={{ fontSize: 18, lineHeight: 1.3, marginBottom: 6 }}>
                    <Link href={routes.guide(guide.slug)} style={{ color: "var(--ink)" }}>
                      {guide.title}
                    </Link>
                  </h3>
                  <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--text-secondary)", marginBottom: 8 }}>
                    {guide.excerpt}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    By {guide.author?.name} · Updated {shortMonthYear(guide.publishedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* ----------------------------------------------------------------- FAQ */}
      <Section labelledBy="faq-h2">
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 56, alignItems: "start" }}
        >
          <div className="toc">
            <h2 id="faq-h2" className="h2" style={{ marginBottom: 16, textWrap: "balance" }}>
              Common questions
            </h2>
            <p className="lead" style={{ marginBottom: 22 }}>
              The things people ask us most about how the lists work.
            </p>
            <ArrowLink href={routes.contact()}>Ask us something else</ArrowLink>
          </div>
          <FaqList faqs={faqs} />
        </div>
      </Section>

      {/* ------------------------------------------------------------ business */}
      <Section labelledBy="biz-h2">
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}
        >
          <div>
            <h2 id="biz-h2" className="h2" style={{ marginBottom: 16, textWrap: "balance" }}>
              Own a business people are comparing?
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.65, color: "var(--text-secondary)", marginBottom: 28, maxWidth: 500 }}>
              Get in front of homeowners at the point where they are already shortlisting companies
              like yours.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <Link href={routes.claim()} className="btn btn--primary">
                Claim your business
              </Link>
              <Link href={routes.addBusiness()} className="btn btn--secondary">
                Add a business
              </Link>
            </div>
            <p className="sponsor-note">
              <span className="sponsor-note__tag">Sponsored</span>
              Sponsorship buys visibility, not a spot on an editorial list. Paid placements are
              always labeled.
            </p>
          </div>
          <ul style={{ display: "grid", gap: 14 }}>
            {[
              {
                icon: "pin" as const,
                title: "Only where you work",
                body: "Appear in the cities and regions you actually cover, not a national blast.",
              },
              {
                icon: "store" as const,
                title: "A profile that answers questions",
                body: "Services, credentials, coverage area and contact details in one place.",
              },
              {
                icon: "grid" as const,
                title: "Next to the right category",
                body: "Placement beside the exact service people are comparing.",
              },
            ].map((item) => (
              <li key={item.title} className="benefit-card">
                <span aria-hidden="true" style={{ color: "var(--blue-700)", display: "inline-flex", paddingTop: 2 }}>
                  <Icon name={item.icon} size={22} strokeWidth={1.7} />
                </span>
                <span style={{ display: "block" }}>
                  <h3 style={{ fontSize: 17, marginBottom: 4 }}>{item.title}</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--text-secondary)" }}>
                    {item.body}
                  </p>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* --------------------------------------------------------- final search */}
      <section aria-labelledby="final-h2" style={{ background: "var(--ink)" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "88px var(--gutter)", textAlign: "center" }}>
          <h2 id="final-h2" className="h2" style={{ color: "#fff", marginBottom: 14, textWrap: "balance" }}>
            Start with the shortlist
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: "rgba(232,237,245,0.72)", marginBottom: 32 }}>
            Tell us the job and where you are. We will point you at the ten worth calling.
          </p>
          <div style={{ textAlign: "left" }}>
            <SearchForm
              idPrefix="final"
              showIcons={false}
              servicePlaceholder="What do you need done?"
              locationPlaceholder="City or postal code"
            />
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
