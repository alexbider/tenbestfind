import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCta, CrumbBar, FinalSearch, LinkGrid } from "@/components/site/blocks";
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
import { compactNumber, monthYear, shortMonthYear } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import { parseJson, type LicensingRow } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { rankingCardSelect } from "@/lib/queries";
import { absoluteUrl, rankingUrl, routes } from "@/lib/urls";

export async function CountryHub({ countryCode }: { countryCode: string }) {
  const country = await db.country.findUnique({
    where: { code: countryCode },
    include: {
      regions: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        include: {
          cities: { where: { published: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!country || !country.published) {
    await redirectIfKnown(routes.country(countryCode));
    notFound();
  }

  const [categories, rankings, guides, businessCount, licensingRegions] = await Promise.all([
    db.category.findMany({ where: { published: true, featured: true }, orderBy: { sortOrder: "asc" } }),
    db.ranking.findMany({
      where: { status: "PUBLISHED", countryId: country.id },
      orderBy: [{ lastReviewedAt: "desc" }],
      take: 8,
      select: rankingCardSelect,
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 4,
      include: { category: { select: { serviceName: true } }, author: { select: { name: true } } },
    }),
    db.business.count({ where: { status: "PUBLISHED", city: { region: { countryId: country.id } } } }),
    db.region.findMany({
      where: { countryId: country.id, licensing: { not: null } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const cities = country.regions.flatMap((region) =>
    region.cities.map((city) => ({ ...city, region })),
  );
  const metros = cities.filter((city) => city.topMetro).slice(0, 6);
  const otherCities = cities.filter((city) => !city.topMetro).slice(0, 8);
  const rankingCount = rankings.length;

  // Region groups mirror the header's Northeast / South / Central split.
  const groups = new Map<string, typeof country.regions>();
  for (const region of country.regions) {
    const key = region.groupName ?? "Regions";
    groups.set(key, [...(groups.get(key) ?? []), region]);
  }

  const isUs = country.code === "us";
  const licensingCopy = isUs
    ? "Licensing is set state by state. Plumbing, electrical and HVAC are licensed almost everywhere, but roofing and general contracting are not, and the boards that issue those licences differ in every state."
    : "Licensing is set province by province. Electrical and gas work run through provincial safety authorities, and workers compensation coverage is a separate check that matters as much as the licence itself.";

  const otherCountries = await db.country.findMany({
    where: { published: true, NOT: { id: country.id } },
    orderBy: { sortOrder: "asc" },
  });

  const faqs = country.faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }));

  return (
    <SiteChrome active="locations">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Home services in the ${country.name}`,
          url: absoluteUrl(routes.country(country.code)),
        }}
      />
      <FaqJsonLd faqs={faqs} />

      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "Locations", href: routes.locationsIndex() },
          { label: country.name },
        ]}
      />

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
            padding: "64px var(--gutter) 52px",
            display: "grid",
            gridTemplateColumns: "1.14fr 0.86fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: 14 }}>
              {country.name}
            </p>
            <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(36px, 4.4vw, 54px)" }}>
              The ten best local businesses across {country.name}
            </h1>
            <p className="hero__lead">
              {country.blurb}
            </p>
            <div style={{ marginTop: 30 }}>
              <SearchForm
                idPrefix="country"
                locationPlaceholder={isUs ? "City or ZIP code" : "City or postal code"}
              />
            </div>
          </div>

          <aside className="card glance-card">
            <h2 className="glance-card__title">{country.name} coverage</h2>
            <dl className="glance-card__grid">
              <div>
                <dt>{isUs ? "States" : "Provinces"}</dt>
                <dd>{country.regions.length}</dd>
              </div>
              <div>
                <dt>City hubs</dt>
                <dd>{cities.length}</dd>
              </div>
              <div>
                <dt>Published rankings</dt>
                <dd>{rankingCount}</dd>
              </div>
              <div>
                <dt>Companies reviewed</dt>
                <dd>{compactNumber(businessCount)}</dd>
              </div>
            </dl>
            <ul style={{ display: "grid", gap: 10, marginTop: 20 }}>
              {[
                "Licensing checked against the issuing authority",
                "Ratings shown with their source and date",
                "Sponsored placements always labelled",
              ].map((item) => (
                <li key={item} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14.5 }}>
                  <Check size={16} />
                  <span style={{ color: "var(--text-secondary)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <ul className="shell trust-strip">
            <TrustItem icon="badge" label={isUs ? "State licensing checked" : "Provincial licensing checked"} />
            <TrustItem icon="pin" label="City-level research" />
            <TrustItem icon="eye" label="Published criteria" />
            <TrustItem icon="clock" label="Reviewed on a schedule" />
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- categories */}
      <Section tone="page" ruleTop labelledBy="cats-h2">
        <SectionHead
          id="cats-h2"
          title={`Home services across ${country.name}`}
          lead="Pick a trade to see the cities with a published top ten, and what to check before you hire."
          linkHref={routes.servicesIndex()}
          linkLabel="View all services"
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

      {/* ---------------------------------------------------------- regions */}
      <Section labelledBy="regions-h2">
        <SectionHead
          id="regions-h2"
          title={`Browse by ${isUs ? "state" : "province"}`}
          lead={licensingCopy}
        />
        <div className="region-groups">
          {[...groups.entries()].map(([groupName, regions]) => (
            <div key={groupName}>
              <h3 className="region-groups__title">{groupName}</h3>
              <ul style={{ display: "grid", gap: 10 }}>
                {regions.map((region) => (
                  <li key={region.id}>
                    <Link href={routes.region(country.code, region.slug)} className="region-card">
                      <span className="region-card__code" aria-hidden="true">
                        {region.code.toUpperCase()}
                      </span>
                      <span>
                        <strong>{region.name}</strong>
                        <span>
                          {region.cities.length} {region.cities.length === 1 ? "city" : "cities"}
                        </span>
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

      {/* ----------------------------------------------------------- metros */}
      {metros.length > 0 ? (
        <Section tone="page" labelledBy="metros-h2">
          <SectionHead
            id="metros-h2"
            title="Popular metros"
            lead="The markets with the most published research."
            linkHref={routes.locationsIndex()}
            linkLabel="All locations"
          />
          <div className="metro-grid">
            {metros.map((city) => (
              <article key={city.id} className="card card--lift" style={{ overflow: "hidden" }}>
                <div className="thumb" style={{ height: 160 }}>
                  <Media src={city.heroImage} alt="" />
                </div>
                <div style={{ padding: "20px 22px 22px" }}>
                  <h3 style={{ fontSize: 19, marginBottom: 6 }}>
                    <Link
                      href={routes.city(country.code, city.region.slug, city.slug)}
                      style={{ color: "var(--ink)" }}
                    >
                      {city.name}, {city.region.code.toUpperCase()}
                    </Link>
                  </h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
                    {city.blurb ?? `Published rankings and local research for ${city.name}.`}
                  </p>
                </div>
              </article>
            ))}
          </div>
          {otherCities.length > 0 ? (
            <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "var(--text-secondary)", marginRight: 4 }}>Also covered:</span>
              {otherCities.map((city) => (
                <Link
                  key={city.id}
                  className="chip"
                  href={routes.city(country.code, city.region.slug, city.slug)}
                >
                  {city.name}, {city.region.code.toUpperCase()}
                </Link>
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* --------------------------------------------------------- rankings */}
      {rankings.length > 0 ? (
        <Section labelledBy="feat-h2">
          <SectionHead
            id="feat-h2"
            title={`Popular rankings in ${country.name}`}
            lead="Newly published and recently re-checked lists."
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
                    {ranking.category.serviceName} · {ranking.city?.name},{" "}
                    {ranking.city?.region.code.toUpperCase()}
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

      {/* ------------------------------------------------------- how it works */}
      <Section tone="soft" labelledBy="how-h2">
        <div className="split" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 56 }}>
          <div>
            <h2 id="how-h2" className="h2" style={{ marginBottom: 18, textWrap: "balance" }}>
              How a list gets made in {country.name}
            </h2>
            <p className="lead" style={{ marginBottom: 18 }}>
              {licensingCopy}
            </p>
            <p className="lead" style={{ marginBottom: 28 }}>
              That is why research happens city by city rather than nationally. The criteria are
              published, and the sources we checked are listed on every page.
            </p>
            <Link href={routes.howWeRank()} className="btn btn--primary">
              Read our full methodology
              <ArrowRight size={17} />
            </Link>
          </div>
          {licensingRegions.length > 0 ? (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="cost-table__band">
                <Icon name="badge" size={18} color="var(--color-primary)" />
                <span>Who licenses what, by {isUs ? "state" : "province"}</span>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">{isUs ? "State" : "Province"}</th>
                      <th scope="col">Trade</th>
                      <th scope="col">Authority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licensingRegions.flatMap((region) =>
                      parseJson<LicensingRow[]>(region.licensing, [])
                        .slice(0, 3)
                        .map((row) => (
                          <tr key={`${region.id}-${row.trade}`}>
                            <td data-label={isUs ? "State" : "Province"}>
                              <Link href={routes.region(country.code, region.slug)}>{region.name}</Link>
                            </td>
                            <td data-label="Trade" style={{ fontWeight: 600, color: "var(--ink)" }}>
                              {row.trade}
                            </td>
                            <td data-label="Authority" style={{ color: "var(--text-secondary)" }}>
                              {row.licensed ? row.authority : "Not licensed at this level"}
                            </td>
                          </tr>
                        )),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </Section>

      {/* ---------------------------------------------------------- guides */}
      {guides.length > 0 ? (
        <Section tone="page" labelledBy="guides-h2">
          <SectionHead
            id="guides-h2"
            title="Guides worth reading first"
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

      {/* -------------------------------------------------------------- FAQ */}
      {faqs.length > 0 ? (
        <Section labelledBy="faq-h2">
          <div
            className="split"
            style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 56, alignItems: "start" }}
          >
            <div className="toc">
              <h2 id="faq-h2" className="h2" style={{ marginBottom: 16 }}>
                Questions about {country.name} coverage
              </h2>
              <ArrowLink href={routes.contact()}>Ask us something else</ArrowLink>
            </div>
            <FaqList faqs={faqs} />
          </div>
        </Section>
      ) : null}

      {/* ------------------------------------------------------ country switch */}
      {otherCountries.length > 0 ? (
        <Section tone="page" labelledBy="switch-h2">
          <SectionHead id="switch-h2" title="Looking somewhere else?" />
          <LinkGrid
            columns={otherCountries.length > 1 ? 2 : 1}
            items={otherCountries.map((other) => ({
              label: other.name,
              href: routes.country(other.code),
              meta: other.blurb ?? undefined,
            }))}
          />
        </Section>
      ) : null}

      <Section labelledBy="biz-h2" ruleBottom={false}>
        <BusinessCta />
      </Section>

      <FinalSearch
        title={`Start with the shortlist in ${country.name}`}
        lead="Tell us the job and where you are. We will point you at the ten worth calling."
      />
    </SiteChrome>
  );
}
