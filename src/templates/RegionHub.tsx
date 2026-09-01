import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCta, CostTable, CrumbBar, FinalSearch, LinkGrid } from "@/components/site/blocks";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SearchForm } from "@/components/site/SearchForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { ChevronRight, Icon } from "@/components/ui/Icon";
import { ArrowLink, Badge, JsonLd, Media, Section, SectionHead } from "@/components/ui/primitives";
import { compactNumber, monthYear, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { parseJson, type LicensingRow } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

export async function RegionHub({
  countryCode,
  regionSlug,
}: {
  countryCode: string;
  regionSlug: string;
}) {
  // A moved region keeps its inbound links: the redirect table is consulted
  // before this path is allowed to 404.
  const path = routes.region(countryCode, regionSlug);

  const country = await db.country.findUnique({ where: { code: countryCode } });
  if (!country) {
    await redirectIfKnown(path);
    notFound();
  }

  const region = await db.region.findUnique({
    where: { countryId_slug: { countryId: country.id, slug: regionSlug } },
    include: {
      country: true,
      cities: { where: { published: true }, orderBy: [{ topMetro: "desc" }, { sortOrder: "asc" }] },
    },
  });
  if (!region || !region.published) {
    await redirectIfKnown(path);
    notFound();
  }

  const [rankings, categories, costRows, guides, businessCount, siblingRegions] = await Promise.all([
    db.ranking.findMany({
      where: { status: "PUBLISHED", regionId: region.id },
      orderBy: { lastReviewedAt: "desc" },
      take: 8,
      select: rankingCardSelect,
    }),
    db.category.findMany({ where: { published: true, featured: true }, orderBy: { sortOrder: "asc" }, take: 10 }),
    db.costRow.findMany({
      where: { city: { regionId: region.id } },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 4,
      include: { category: { select: { serviceName: true } }, author: { select: { name: true } } },
    }),
    db.business.count({ where: { status: "PUBLISHED", city: { regionId: region.id } } }),
    db.region.findMany({
      where: { countryId: country.id, published: true, NOT: { id: region.id } },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
  ]);

  const licensing = parseJson<LicensingRow[]>(region.licensing, []);
  const unitLabel = country.regionLabel === "provinces" ? "province" : "state";
  const metros = region.cities.filter((city) => city.topMetro);
  const otherCities = region.cities.filter((city) => !city.topMetro);

  const faqs = [
    {
      question: `Which trades does ${region.name} license?`,
      answer:
        licensing.length > 0
          ? `${licensing
              .filter((row) => row.licensed)
              .map((row) => row.trade)
              .join(", ")} are licensed here. ${
              licensing.some((row) => !row.licensed)
                ? `${licensing
                    .filter((row) => !row.licensed)
                    .map((row) => row.trade)
                    .join(", ")} ${licensing.filter((row) => !row.licensed).length === 1 ? "is" : "are"} not licensed at ${unitLabel} level, so insurance certificates and manufacturer certification do that work instead.`
                : ""
            }`
          : `Licensing in ${region.name} varies by trade. Every ranking page lists which authority we checked for that trade, and what the licence actually covers.`,
    },
    {
      question: `How many cities in ${region.name} are covered?`,
      answer: `${region.cities.length} ${region.cities.length === 1 ? "city has" : "cities have"} a published hub, and we add more each month working outward from the largest metros. If yours is missing, tell us through the contact form and it goes on the list.`,
    },
    {
      question: "Do prices differ across the state?",
      answer:
        "Considerably. Labour rates, permit fees and material availability all change between metros, which is why cost figures are published per market rather than as a single statewide average.",
    },
  ];

  return (
    <SiteChrome active="locations">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Home services in ${region.name}`,
          url: absoluteUrl(routes.region(country.code, region.slug)),
        }}
      />
      <FaqJsonLd faqs={faqs} />

      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: country.name, href: routes.country(country.code) },
          { label: region.name },
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
              {country.name} · {region.name}
            </p>
            <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(34px, 4.2vw, 50px)" }}>
              The ten best local businesses in {region.name}
            </h1>
            <p className="hero__lead">
              {region.blurb ??
                `Published city rankings across ${region.name}, with licensing checked against the authority that actually issues it.`}
            </p>
            <div style={{ marginTop: 30 }}>
              <SearchForm idPrefix="region" locationPlaceholder={`City in ${region.name}`} />
            </div>
          </div>

          <aside className="card glance-card">
            <h2 className="glance-card__title">{region.name} at a glance</h2>
            <dl className="glance-card__grid">
              <div>
                <dt>City hubs</dt>
                <dd>{region.cities.length}</dd>
              </div>
              <div>
                <dt>Published rankings</dt>
                <dd>{rankings.length}</dd>
              </div>
              <div>
                <dt>Companies reviewed</dt>
                <dd>{compactNumber(businessCount)}</dd>
              </div>
              <div>
                <dt>Licensed trades</dt>
                <dd>{licensing.filter((row) => row.licensed).length || "—"}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      {/* ------------------------------------------------------------ cities */}
      <Section tone="page" ruleTop labelledBy="ci-h2">
        <SectionHead
          id="ci-h2"
          title={`Cities we cover in ${region.name}`}
          lead="Each city hub carries its own rankings, local conditions and cost research."
        />
        {metros.length > 0 ? (
          <div className="metro-grid">
            {metros.map((city) => (
              <article key={city.id} className="card card--lift" style={{ overflow: "hidden" }}>
                <div className="thumb" style={{ height: 150 }}>
                  <Media src={city.heroImage} alt="" />
                </div>
                <div style={{ padding: "20px 22px 22px" }}>
                  <h3 style={{ fontSize: 19, marginBottom: 6 }}>
                    <Link
                      href={routes.city(country.code, region.slug, city.slug)}
                      style={{ color: "var(--ink)" }}
                    >
                      {city.name}
                    </Link>
                  </h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
                    {city.blurb ?? `Local rankings and research for ${city.name}.`}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {otherCities.length > 0 ? (
          <div style={{ marginTop: metros.length > 0 ? 22 : 0 }}>
            <LinkGrid
              columns={3}
              items={otherCities.map((city) => ({
                label: city.name,
                href: routes.city(country.code, region.slug, city.slug),
                meta: city.county ?? undefined,
              }))}
            />
          </div>
        ) : null}
      </Section>

      {/* ---------------------------------------------------------- services */}
      <Section labelledBy="sv-h2">
        <SectionHead
          id="sv-h2"
          title={`Services across ${region.name}`}
          lead="Pick a trade to see which cities have a published top ten."
          linkHref={routes.servicesIndex()}
          linkLabel="All services"
        />
        <ul className="cat-grid">
          {categories.map((category) => (
            <li key={category.slug} className="card card--lift cat-card">
              <div className="cat-card__top">
                <span aria-hidden="true" style={{ color: "var(--blue-700)", display: "inline-flex" }}>
                  <Icon name={hasIcon(category.iconKey) ? category.iconKey : "house"} size={24} strokeWidth={1.7} />
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
      </Section>

      {/* --------------------------------------------------------- licensing */}
      {licensing.length > 0 ? (
        <Section tone="ink" labelledBy="li-h2">
          <div className="split" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 56 }}>
            <div>
              <h2 id="li-h2" className="h2" style={{ marginBottom: 16, textWrap: "balance" }}>
                Who licenses what in {region.name}
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(232,237,245,0.72)", marginBottom: 20 }}>
                This is the check that changes most between {unitLabel}s, and it is the reason a
                ranking cannot simply be copied from one market to another.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(232,237,245,0.72)" }}>
                Where a trade is not licensed, we fall back on business registration, insurance
                certificates and manufacturer certification, and we say so on the page.
              </p>
            </div>
            <ul className="licensing-list">
              {licensing.map((row) => (
                <li key={row.trade}>
                  <div className="licensing-list__head">
                    <h3>{row.trade}</h3>
                    <Badge tone={row.licensed ? "positive" : "warning"}>
                      {row.licensed ? "Licensed" : "Not licensed"}
                    </Badge>
                  </div>
                  <p className="licensing-list__authority">{row.authority}</p>
                  {row.note ? <p className="licensing-list__note">{row.note}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* ---------------------------------------------------------- rankings */}
      {rankings.length > 0 ? (
        <Section tone="page" labelledBy="ra-h2">
          <SectionHead
            id="ra-h2"
            title={`Recently reviewed in ${region.name}`}
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

      {/* -------------------------------------------------------------- cost */}
      {costRows.length > 0 ? (
        <Section labelledBy="cs-h2">
          <SectionHead
            id="cs-h2"
            title="What things cost here"
            lead={`Sourced figures from the ${region.name} markets we cover. Metros vary, so treat these as a starting point rather than a quote.`}
          />
          <CostTable
            caption={`Typical ${region.name} pricing`}
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

      {/* ------------------------------------------------------------ guides */}
      {guides.length > 0 ? (
        <Section tone="page" labelledBy="gu-h2">
          <SectionHead id="gu-h2" title="Guides" linkHref={routes.guidesIndex()} linkLabel="All guides" />
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

      {/* -------------------------------------------------------- neighbours */}
      {siblingRegions.length > 0 ? (
        <Section labelledBy="nb-h2">
          <SectionHead id="nb-h2" title={`Other ${country.regionLabel}`} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {siblingRegions.map((sibling) => (
              <Link key={sibling.id} className="chip" href={routes.region(country.code, sibling.slug)}>
                {sibling.name}
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {/* --------------------------------------------------------------- FAQ */}
      <Section tone="page" labelledBy="fq-h2">
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 56, alignItems: "start" }}
        >
          <div className="toc">
            <h2 id="fq-h2" className="h2" style={{ marginBottom: 16 }}>
              Questions about {region.name}
            </h2>
            <ArrowLink href={routes.contact()}>Ask us something else</ArrowLink>
          </div>
          <FaqList faqs={faqs} />
        </div>
      </Section>

      <Section labelledBy="tr-h2" ruleBottom={false}>
        <BusinessCta />
      </Section>

      <FinalSearch
        title={`Find a company in ${region.name}`}
        lead="Tell us the job and the city. We will point you at the ten worth calling."
      />
    </SiteChrome>
  );
}
