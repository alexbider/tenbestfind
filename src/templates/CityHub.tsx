import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCta, CostTable, CrumbBar, FinalSearch, LinkGrid } from "@/components/site/blocks";
import { GoogleRating } from "@/components/site/blocks";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SearchForm } from "@/components/site/SearchForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { GoogleReviewDisclosure, MethodologyDisclosure } from "@/components/site/disclosures";
import { ChevronRight, Icon } from "@/components/ui/Icon";
import {
  ArrowLink,
  JsonLd,
  Monogram,
  Section,
  SectionHead,
  TrustItem,
} from "@/components/ui/primitives";
import { compactNumber, monthYear, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { parseJson, type ConditionRow } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

const SEASONS = [
  { title: "Spring", body: "Storm damage, roof inspections and exterior projects booked before summer." },
  { title: "Summer", body: "Cooling failures, emergency HVAC and the longest lead times of the year." },
  { title: "Autumn", body: "Chimney inspections, gutter work and heating tune-ups before the first cold snap." },
  { title: "Winter", body: "Heating repair, frozen pipe calls and quieter scheduling for interior work." },
];

export async function CityHub({
  countryCode,
  regionSlug,
  citySlug,
}: {
  countryCode: string;
  regionSlug: string;
  citySlug: string;
}) {
  // A moved city keeps its inbound links: the redirect table is consulted
  // before any of these paths is allowed to 404.
  const path = routes.city(countryCode, regionSlug, citySlug);

  const country = await db.country.findUnique({ where: { code: countryCode } });
  if (!country) {
    await redirectIfKnown(path);
    notFound();
  }

  const region = await db.region.findUnique({
    where: { countryId_slug: { countryId: country.id, slug: regionSlug } },
  });
  if (!region) {
    await redirectIfKnown(path);
    notFound();
  }

  const city = await db.city.findUnique({
    where: { regionId_slug: { regionId: region.id, slug: citySlug } },
  });
  if (!city || !city.published) {
    await redirectIfKnown(path);
    notFound();
  }

  const [rankings, businesses, costRows, categories, guides, nearbyCities, placements] =
    await Promise.all([
      db.ranking.findMany({
        where: { status: "PUBLISHED", cityId: city.id },
        orderBy: { lastReviewedAt: "desc" },
        select: rankingCardSelect,
      }),
      db.business.findMany({
        where: { status: "PUBLISHED", cityId: city.id },
        orderBy: [{ googleRating: "desc" }],
        take: 6,
        include: {
          category: { select: { name: true, slug: true, serviceName: true, iconKey: true } },
          entries: { select: { position: true }, orderBy: { position: "asc" }, take: 1 },
        },
      }),
      db.costRow.findMany({ where: { cityId: city.id }, orderBy: { sortOrder: "asc" } }),
      db.category.findMany({ where: { published: true, featured: true }, orderBy: { sortOrder: "asc" } }),
      db.guide.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 6,
        include: { category: { select: { serviceName: true } }, author: { select: { name: true } } },
      }),
      db.city.findMany({
        where: { published: true, regionId: region.id, NOT: { id: city.id } },
        orderBy: { population: "desc" },
        take: 6,
      }),
      db.sponsoredPlacement.findMany({
        where: { status: "ACTIVE", cityId: city.id },
        include: {
          business: {
            include: { category: { select: { name: true, serviceName: true } } },
          },
        },
        take: 1,
      }),
    ]);

  const conditions = parseJson<ConditionRow[]>(city.conditions, []);
  const neighborhoods = parseJson<string[]>(city.neighborhoods, []);
  const businessCount = await db.business.count({ where: { status: "PUBLISHED", cityId: city.id } });
  const partner = placements[0];
  const cityLabel = `${city.name}, ${region.code.toUpperCase()}`;

  const faqs = [
    {
      question: `How do you decide which ${city.name} companies make a list?`,
      answer: `We start with every company that genuinely serves ${city.name}, then check licensing or registration with the issuing authority, years working in the market, the range of work actually performed, and patterns in public feedback. The criteria for each trade are published on the ranking itself.`,
    },
    {
      question: `Do you cover the suburbs around ${city.name}?`,
      answer:
        "Company service areas often extend past the city line, and coverage is listed on each profile. Where a neighbouring city has enough demand to justify its own research, it gets its own hub rather than being folded into this one.",
    },
    {
      question: "Are the prices on this page quotes?",
      answer:
        "No. They are sourced ranges for this market, published so you can tell whether a quote is in the normal band. A real quote depends on your property, and every contractor prices it differently.",
    },
    {
      question: "Can a company pay to appear here?",
      answer:
        "A company can buy a labelled sponsored placement, which sits outside the ranked list and carries a Sponsored label. It cannot buy a ranking position, and sponsors do not see a ranking before it publishes.",
    },
    {
      question: "How often is this page updated?",
      answer: `Rankings for ${city.name} are re-checked on a schedule, and sooner when something significant changes such as a licence lapsing or a company closing. Each ranking shows the date an editor last reviewed it.`,
    },
  ];

  return (
    <SiteChrome active="locations">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Home services in ${cityLabel}`,
          url: absoluteUrl(routes.city(country.code, region.slug, city.slug)),
        }}
      />
      <FaqJsonLd faqs={faqs} />

      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: country.name, href: routes.country(country.code) },
          { label: region.name, href: routes.region(country.code, region.slug) },
          { label: city.name },
        ]}
      />

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
            padding: "60px var(--gutter) 48px",
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: 14 }}>
              {region.name} · {country.name}
            </p>
            <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(34px, 4.2vw, 50px)" }}>
              The ten best local businesses in {city.name}
            </h1>
            <p className="hero__lead">
              {city.blurb ??
                `Researched shortlists for ${city.name}, with licensing checked, sources cited and every ranking reviewed on a schedule.`}
            </p>
            <div style={{ marginTop: 30 }}>
              <SearchForm
                idPrefix="city"
                lockedLocation={{ label: `Searching in ${cityLabel}`, value: cityLabel }}
                servicePlaceholder={`What do you need in ${city.name}?`}
              />
            </div>
          </div>

          <aside className="card glance-card" aria-labelledby="glance-h2">
            <h2 id="glance-h2" className="glance-card__title">
              {city.name} at a glance
            </h2>
            <dl className="glance-card__grid">
              <div>
                <dt>Published rankings</dt>
                <dd>{rankings.length}</dd>
              </div>
              <div>
                <dt>Companies reviewed</dt>
                <dd>{compactNumber(businessCount)}</dd>
              </div>
              <div>
                <dt>County</dt>
                <dd style={{ fontSize: 17 }}>{city.county ?? region.name}</dd>
              </div>
              <div>
                <dt>Population</dt>
                <dd style={{ fontSize: 17 }}>
                  {city.population ? compactNumber(city.population) : "—"}
                </dd>
              </div>
            </dl>
          </aside>
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <ul className="shell trust-strip">
            <TrustItem icon="badge" label="Credentials checked" />
            <TrustItem icon="star" label="Google review data" />
            <TrustItem icon="pin" label="Local market research" />
            <TrustItem icon="clock" label="Reviewed on a schedule" />
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- services */}
      <Section tone="page" ruleTop labelledBy="svc-h2">
        <SectionHead
          id="svc-h2"
          title={`Popular services in ${city.name}`}
          lead="Pick a trade to open the researched top ten for this market."
          linkHref={routes.servicesIndex()}
          linkLabel="All services"
        />
        <ul className="cat-grid">
          {categories.map((category) => {
            const ranking = rankings.find((item) => item.category.slug === category.slug);
            return (
              <li key={category.slug} className="card card--lift cat-card">
                <div className="cat-card__top">
                  <span aria-hidden="true" style={{ color: "var(--blue-700)", display: "inline-flex" }}>
                    <Icon name={hasIcon(category.iconKey) ? category.iconKey : "house"} size={24} strokeWidth={1.7} />
                  </span>
                  <ChevronRight size={16} color="var(--gray-300)" />
                </div>
                <h3 className="cat-card__name">
                  <Link
                    href={
                      ranking
                        ? routes.ranking(country.code, region.slug, city.slug, category.slug)
                        : routes.category(category.slug)
                    }
                    style={{ color: "var(--ink)" }}
                  >
                    {category.name} in {city.name}
                  </Link>
                </h3>
                <p className="cat-card__sub">
                  {ranking ? `Top ten published · updated ${shortMonthYear(ranking.lastReviewedAt)}` : category.tagline}
                </p>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* --------------------------------------------------------- rankings */}
      {rankings.length > 0 ? (
        <Section labelledBy="rank-h2">
          <SectionHead
            id="rank-h2"
            title={`Published rankings for ${city.name}`}
            lead="Each list carries the criteria, the sources and the date it was last reviewed."
          />
          <ul className="index-list">
            {rankings.map((ranking) => (
              <li key={ranking.id}>
                <Link className="index-row" href={rankingUrl(ranking)}>
                  <span aria-hidden="true" className="rank-mark">
                    10
                  </span>
                  <span className="eyebrow">{ranking.category.serviceName}</span>
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

      {/* -------------------------------------------------------- businesses */}
      {businesses.length > 0 ? (
        <Section tone="page" labelledBy="biz-h2">
          <SectionHead
            id="biz-h2"
            title={`Businesses we have reviewed in ${city.name}`}
            lead="Profiles carry credentials, coverage, contact details and our editorial take."
          />
          <ul className="biz-grid">
            {businesses.map((business) => (
              <li key={business.id} className="card card--lift biz-card">
                <div className="biz-card__head">
                  <Monogram name={business.name} size={48} radius={12} />
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: 17, lineHeight: 1.3 }}>
                      <Link href={routes.business(business.slug)} style={{ color: "var(--ink)" }}>
                        {business.name}
                      </Link>
                    </h3>
                    <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 3 }}>
                      {business.category.name}
                      {business.entries[0] ? ` · Ranked #${business.entries[0].position}` : ""}
                    </p>
                  </div>
                </div>
                <div className="biz-card__meta">
                  <GoogleRating rating={business.googleRating} count={business.googleReviewCount} size="sm" />
                  <GoogleReviewDisclosure />
                </div>
                {business.addressLine ? (
                  <p className="biz-card__address">
                    <Icon name="pin" size={14} color="var(--gray-400)" />
                    {business.addressLine}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          {partner ? (
            <div className="partner-box" style={{ marginTop: 24 }}>
              <div className="partner-box__band">
                <span>Featured partner</span>
                <span className="sponsored-label">Sponsored</span>
              </div>
              <div className="partner-box__body">
                <Monogram name={partner.business.name} size={56} radius={14} />
                <div>
                  <h3 style={{ fontSize: 19, marginBottom: 4 }}>{partner.business.name}</h3>
                  <p style={{ fontSize: 14.5, color: "var(--text-secondary)", marginBottom: 12 }}>
                    {partner.business.category.serviceName} in {city.name}
                    {partner.business.bestFor ? ` · ${partner.business.bestFor}` : ""}
                  </p>
                  <Link href={routes.business(partner.business.slug)} className="btn btn--primary btn--sm">
                    View profile
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* ------------------------------------------------------------- cost */}
      {costRows.length > 0 ? (
        <Section labelledBy="cost-h2">
          <SectionHead
            id="cost-h2"
            title={`What things cost in ${city.name}`}
            lead="Sourced figures for this market, published so you can tell whether a quote sits in the normal band."
          />
          <CostTable
            caption={`Typical ${city.name} pricing`}
            currency={country.currency}
            rows={costRows.map((row) => ({
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
        </Section>
      ) : null}

      {/* ------------------------------------------------------ local context */}
      {conditions.length > 0 ? (
        <Section tone="page" labelledBy="local-h2">
          <SectionHead
            id="local-h2"
            title={`What makes ${city.name} different`}
            lead="The conditions that actually change how work is scoped and priced here."
          />
          <ul className="conditions-grid">
            {conditions.map((condition) => (
              <li key={condition.title}>
                <span className="conditions-grid__icon" aria-hidden="true">
                  <Icon
                    name={condition.iconKey && hasIcon(condition.iconKey) ? condition.iconKey : "house"}
                    size={22}
                    strokeWidth={1.8}
                  />
                </span>
                <h3>{condition.title}</h3>
                <p>{condition.body}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ---------------------------------------------------------- seasons */}
      <Section tone="ink" labelledBy="season-h2">
        <SectionHead id="season-h2" title={`The ${city.name} year`} />
        <ul className="seasons">
          {SEASONS.map((season) => (
            <li key={season.title}>
              <h3>{season.title}</h3>
              <p>{season.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ------------------------------------------------------ neighborhoods */}
      {neighborhoods.length > 0 ? (
        <Section labelledBy="areas-h2">
          <SectionHead
            id="areas-h2"
            title={`Areas of ${city.name}`}
            lead="Companies on our lists work across the city. Neighbourhoods are listed for context; only cities with their own published research are linked."
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {neighborhoods.map((name) => (
              <span key={name} className="chip" style={{ cursor: "default" }}>
                {name}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ------------------------------------------------------- methodology */}
      <Section tone="page" labelledBy="method-h2">
        <div className="split" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 56 }}>
          <div>
            <h2 id="method-h2" className="h2" style={{ marginBottom: 18, textWrap: "balance" }}>
              How we research {city.name}
            </h2>
            <p className="lead" style={{ marginBottom: 18 }}>
              Every company that genuinely serves the market goes into the research pool. From there
              we check credentials against the issuing authority, read patterns in public feedback,
              and compare what companies actually take on rather than what they list.
            </p>
            <MethodologyDisclosure />
          </div>
          <ol style={{ display: "grid", gap: 14 }}>
            {[
              { title: "Build the pool", body: `Every company documented as working in ${city.name}, not just the ones that advertise.` },
              { title: "Check the record", body: "Licensing, registration and insurance, checked with the body that issues it." },
              { title: "Compare the work", body: "Service range, warranty terms, response times and documented local projects." },
              { title: "Publish and re-check", body: "Ten names with the criteria and sources, then reviewed again on a schedule." },
            ].map((step, index) => (
              <li key={step.title} className="step-card">
                <span aria-hidden="true" className="step-card__num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span style={{ display: "block" }}>
                  <h3 style={{ fontSize: 18, marginBottom: 6 }}>{step.title}</h3>
                  <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--text-secondary)" }}>{step.body}</p>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ----------------------------------------------------------- guides */}
      {guides.length > 0 ? (
        <Section labelledBy="guides-h2">
          <SectionHead id="guides-h2" title="Guides" linkHref={routes.guidesIndex()} linkLabel="All guides" />
          <LinkGrid
            columns={2}
            items={guides.map((guide) => ({
              label: guide.title,
              href: routes.guide(guide.slug),
              meta: `${guide.category?.serviceName ?? "Guide"} · Updated ${monthYear(guide.publishedAt)}`,
            }))}
          />
        </Section>
      ) : null}

      {/* ----------------------------------------------------- nearby cities */}
      {nearbyCities.length > 0 ? (
        <Section tone="page" labelledBy="near-h2">
          <SectionHead id="near-h2" title={`Nearby cities in ${region.name}`} />
          <LinkGrid
            columns={3}
            items={nearbyCities.map((nearby) => ({
              label: nearby.name,
              href: routes.city(country.code, region.slug, nearby.slug),
              meta: nearby.county ?? undefined,
            }))}
          />
        </Section>
      ) : null}

      {/* -------------------------------------------------------------- FAQ */}
      <Section labelledBy="faq-h2">
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 56, alignItems: "start" }}
        >
          <div className="toc">
            <h2 id="faq-h2" className="h2" style={{ marginBottom: 16 }}>
              Questions about {city.name}
            </h2>
            <ArrowLink href={routes.contact()}>Ask us something else</ArrowLink>
          </div>
          <FaqList faqs={faqs} />
        </div>
      </Section>

      <Section tone="page" labelledBy="trans-h2" ruleBottom={false}>
        <BusinessCta />
      </Section>

      <FinalSearch
        title={`Find a company in ${city.name}`}
        lockedLocation={{ label: `Searching in ${cityLabel}`, value: cityLabel }}
      />
    </SiteChrome>
  );
}
