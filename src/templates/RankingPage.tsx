import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BusinessCta,
  CostTable,
  CriteriaGrid,
  CrumbBar,
  FinalSearch,
  GoogleRating,
  LinkGrid,
  SourceList,
  TransparencyBlock,
} from "@/components/site/blocks";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { TrackView } from "@/components/site/Track";
import {
  CredentialDisclosure,
  GoogleReviewDisclosure,
  MethodologyDisclosure,
  SponsoredDisclosure,
} from "@/components/site/disclosures";
import { ArrowRight, Check, Icon } from "@/components/ui/Icon";
import { ArrowLink, Badge, JsonLd, Monogram, Section, SectionHead } from "@/components/ui/primitives";
import { fullDate, monthYear } from "@/lib/format";
import { parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { absoluteUrl, routes } from "@/lib/urls";

const HIRING_STEPS = [
  { title: "Shortlist three", body: "Pick three companies from this list whose coverage and specialisms match your job." },
  { title: "Book inspections", body: "Ask each to inspect in person. A quote given without seeing the work is a guess." },
  { title: "Compare like for like", body: "Put the quotes on one sheet and line up scope, materials and warranty terms." },
  { title: "Verify the paperwork", body: "Insurance certificate direct from the insurer, plus registration or licence where the trade requires one." },
  { title: "Agree the change orders", body: "Settle in writing how surprises are priced and approved before work starts." },
];

const RED_FLAGS = [
  "No verifiable local business address or registration",
  "Pressure to sign on the first visit",
  "A demand for full payment up front",
  "An offer to cover or waive your insurance deductible",
  "Refusal to put warranty terms in writing",
  "A quote that will not itemize scope",
];

export async function RankingPage({
  countryCode,
  regionSlug,
  citySlug,
  categorySlug,
}: {
  countryCode: string;
  regionSlug: string;
  citySlug: string;
  categorySlug: string;
}) {
  // A list whose city or service was renamed keeps its inbound links: the
  // redirect table is consulted before any of these paths is allowed to 404.
  const path = routes.ranking(countryCode, regionSlug, citySlug, categorySlug);

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
  if (!city) {
    await redirectIfKnown(path);
    notFound();
  }
  const category = await db.category.findUnique({ where: { slug: categorySlug } });
  if (!category) {
    await redirectIfKnown(path);
    notFound();
  }

  const ranking = await db.ranking.findUnique({
    where: { categoryId_cityId: { categoryId: category.id, cityId: city.id } },
    include: {
      category: true,
      city: { include: { region: { include: { country: true } } } },
      author: true,
      reviewer: true,
      criteria: { orderBy: { sortOrder: "asc" } },
      costs: { orderBy: { sortOrder: "asc" } },
      sources: { orderBy: { sortOrder: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
      entries: {
        // A suspended or archived company drops off the list while it is out.
        // The numbers on screen come from the surviving order, so the list still
        // reads 01, 02, 03 with nothing missing in between.
        where: { business: { status: "PUBLISHED" } },
        orderBy: { position: "asc" },
        include: {
          business: {
            include: {
              credentials: { orderBy: { sortOrder: "asc" } },
              category: true,
            },
          },
        },
      },
    },
  });
  if (!ranking || ranking.status !== "PUBLISHED") {
    await redirectIfKnown(path);
    notFound();
  }

  const [placement, relatedRankings, guides, nearbyRankings] = await Promise.all([
    db.sponsoredPlacement.findFirst({
      where: { status: "ACTIVE", cityId: city.id, categoryId: category.id },
      include: { business: { include: { category: true } } },
    }),
    db.ranking.findMany({
      where: { status: "PUBLISHED", cityId: city.id, NOT: { id: ranking.id } },
      include: { category: true },
      take: 6,
    }),
    db.guide.findMany({
      where: { status: "PUBLISHED", categoryId: category.id },
      orderBy: { publishedAt: "desc" },
      take: 4,
      include: { author: { select: { name: true } } },
    }),
    db.ranking.findMany({
      where: {
        status: "PUBLISHED",
        categoryId: category.id,
        city: { regionId: region.id },
        NOT: { id: ranking.id },
      },
      include: { city: true },
      take: 6,
    }),
  ]);

  const faqs = ranking.faqs.map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }));
  const cityLabel = `${city.name}, ${region.code.toUpperCase()}`;

  return (
    <SiteChrome active="rankings">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: ranking.title,
          url: absoluteUrl(routes.ranking(country.code, region.slug, city.slug, category.slug)),
          numberOfItems: ranking.entries.length,
          itemListElement: ranking.entries.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: entry.business.name,
            url: absoluteUrl(routes.business(entry.business.slug)),
          })),
        }}
      />
      <FaqJsonLd faqs={faqs} />
      <TrackView type="RANKING_VIEW" rankingId={ranking.id} />

      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: country.name, href: routes.country(country.code) },
          { label: region.name, href: routes.region(country.code, region.slug) },
          { label: city.name, href: routes.city(country.code, region.slug, city.slug) },
          { label: category.name },
        ]}
      />

      {/* ------------------------------------------------------------- hero */}
      <section
        aria-labelledby="hero-h1"
        style={{
          background:
            "linear-gradient(180deg, var(--blue-50) 0%, rgba(234,244,255,0.32) 60%, var(--surface-card) 100%)",
        }}
      >
        <div
          className="shell split"
          style={{
            padding: "56px var(--gutter) 48px",
            display: "grid",
            gridTemplateColumns: placement ? "1.1fr 0.9fr" : "1fr",
            gap: 48,
            alignItems: "start",
          }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: 14 }}>
              {category.serviceName} · {cityLabel}
            </p>
            <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
              {ranking.title}
            </h1>
            <p className="hero__lead" style={{ maxWidth: 640 }}>
              {ranking.summary}
            </p>

            <ul className="hero-meta">
              <li>
                <Icon name="calendar" size={16} color="var(--gray-400)" />
                Last reviewed {monthYear(ranking.lastReviewedAt)}
              </li>
              {ranking.reviewer ? (
                <li>
                  <Icon name="usercheck" size={16} color="var(--gray-400)" />
                  Reviewed by{" "}
                  <Link href={routes.expert(ranking.reviewer.slug)}>{ranking.reviewer.name}</Link>
                </li>
              ) : null}
              <li>
                <Icon name="search" size={16} color="var(--gray-400)" />
                {ranking.companiesReviewed} companies reviewed
              </li>
              <li>
                <MethodologyDisclosure />
              </li>
            </ul>

            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="#rank-h2" className="btn btn--primary">
                See the top {ranking.entries.length}
                <ArrowRight size={17} />
              </Link>
              <Link href="#method-h2" className="btn btn--secondary">
                How we chose
              </Link>
            </div>
          </div>

          {placement ? (
            <aside className="partner-box partner-box--hero" aria-labelledby="partner-h2">
              <div className="partner-box__band">
                <span id="partner-h2">Featured partner</span>
                <span className="sponsored-label">Sponsored</span>
              </div>
              <div className="partner-box__body">
                <Monogram name={placement.business.name} size={56} radius={14} />
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: 20, marginBottom: 4 }}>{placement.business.name}</h3>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                    {placement.business.category.serviceName} in {city.name}
                  </p>
                </div>
              </div>
              <p className="partner-box__desc">
                {placement.business.bestFor
                  ? `Best for ${placement.business.bestFor.toLowerCase()}.`
                  : placement.business.description}
              </p>
              <ul className="partner-box__chips">
                {parseList(placement.business.strengths)
                  .slice(0, 3)
                  .map((item) => (
                    <li key={item}>{item}</li>
                  ))}
              </ul>
              <div className="partner-box__foot">
                <SponsoredDisclosure />
                <Link href={routes.business(placement.business.slug)} className="btn btn--primary btn--block">
                  Visit partner
                </Link>
              </div>
            </aside>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------------- the top ten */}
      <Section tone="page" ruleTop labelledBy="rank-h2" id="rank">
        <SectionHead
          id="rank-h2"
          title={`Our top ${ranking.entries.length} ${category.serviceName.toLowerCase()} companies in ${city.name}`}
          lead={ranking.intro ?? undefined}
        />
        <ol className="rank-list">
          {ranking.entries.map((entry, index) => {
            const business = entry.business;
            const likes = parseList(entry.likes);
            const concerns = parseList(entry.concerns);
            return (
              <li key={entry.id} className="rank-card">
                <div className="rank-card__hairline" aria-hidden="true" />
                <div className="rank-card__head">
                  <Monogram name={business.name} size={64} />
                  <div className="rank-card__identity">
                    <h3>
                      <Link href={routes.business(business.slug)}>{business.name}</Link>
                    </h3>
                    {entry.designation ? (
                      <p className="rank-card__designation">{entry.designation}</p>
                    ) : null}
                    <div className="rank-card__meta">
                      <GoogleRating rating={business.googleRating} count={business.googleReviewCount} size="sm" />
                      {business.addressLine ? (
                        <span className="rank-card__address">
                          <Icon name="pin" size={14} color="var(--gray-400)" />
                          {business.addressLine}
                        </span>
                      ) : null}
                      {business.verified ? (
                        <span className="rank-card__verified">
                          <Check size={14} />
                          Details verified
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="rank-card__mark" aria-hidden="true">
                    <span>Rank</span>
                    <strong>{String(index + 1).padStart(2, "0")}</strong>
                  </div>
                </div>

                {entry.whyPicked ? (
                  <div className="rank-card__why">
                    <h4>Why we picked them</h4>
                    <p>{entry.whyPicked}</p>
                  </div>
                ) : null}

                <div className="rank-card__pros">
                  {likes.length > 0 ? (
                    <div>
                      <h4>What we like</h4>
                      <ul>
                        {likes.map((item) => (
                          <li key={item}>
                            <Check size={15} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {concerns.length > 0 ? (
                    <div>
                      <h4>Things to consider</h4>
                      <ul>
                        {concerns.map((item) => (
                          <li key={item}>
                            <Icon name="info" size={15} color="var(--amber-600)" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <dl className="rank-card__details">
                  {business.bestFor ? (
                    <div>
                      <dt>Best for</dt>
                      <dd>{business.bestFor}</dd>
                    </div>
                  ) : null}
                  {business.yearFounded ? (
                    <div>
                      <dt>Years in business</dt>
                      <dd>{new Date().getFullYear() - business.yearFounded}</dd>
                    </div>
                  ) : null}
                  {business.warrantyTerms ? (
                    <div>
                      <dt>Warranty</dt>
                      <dd>{business.warrantyTerms}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Emergency service</dt>
                    <dd>{business.emergency ? "Yes" : "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Financing</dt>
                    <dd>{business.financing ? "Available" : "Not listed"}</dd>
                  </div>
                  {business.credentials.length > 0 ? (
                    <div>
                      <dt>Credentials</dt>
                      <dd>
                        {business.credentials
                          .filter((credential) => credential.status === "VERIFIED")
                          .map((credential) => credential.label)
                          .slice(0, 2)
                          .join(", ") || "Reported only"}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="rank-card__foot">
                  <Link href={routes.business(business.slug)} className="btn btn--primary btn--sm">
                    View full profile
                  </Link>
                  {business.website ? (
                    <a
                      href={business.website}
                      className="btn btn--secondary btn--sm"
                      rel="nofollow noopener"
                      target="_blank"
                    >
                      Visit website
                    </a>
                  ) : null}
                  <span style={{ marginLeft: "auto" }}>
                    <CredentialDisclosure />
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* --------------------------------------------------- comparison table */}
      <Section labelledBy="cmp-h2">
        <SectionHead
          id="cmp-h2"
          title="Compare them side by side"
          lead="The same fields for every company, so you can scan rather than read."
        />
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Company</th>
                  <th scope="col">Best for</th>
                  <th scope="col">Google rating</th>
                  <th scope="col">Warranty</th>
                  <th scope="col">Emergency</th>
                </tr>
              </thead>
              <tbody>
                {ranking.entries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td data-label="Rank" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--gold)" }}>
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td data-label="Company" style={{ fontWeight: 600 }}>
                      <Link href={routes.business(entry.business.slug)}>{entry.business.name}</Link>
                    </td>
                    <td data-label="Best for" style={{ color: "var(--text-secondary)" }}>
                      {entry.business.bestFor ?? "—"}
                    </td>
                    <td data-label="Google rating" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {entry.business.googleRating
                        ? `${entry.business.googleRating.toFixed(1)} (${entry.business.googleReviewCount?.toLocaleString()})`
                        : "—"}
                    </td>
                    <td data-label="Warranty" style={{ color: "var(--text-secondary)" }}>
                      {entry.business.warrantyTerms ?? "—"}
                    </td>
                    <td data-label="Emergency">{entry.business.emergency ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="table-note">
          Ratings and review counts come from Google Business Profiles, read {monthYear(ranking.lastReviewedAt)}.
          <GoogleReviewDisclosure />
        </p>
      </Section>

      {/* ------------------------------------------------------- methodology */}
      {ranking.criteria.length > 0 ? (
        <Section tone="ink" labelledBy="method-h2" id="method">
          <div style={{ maxWidth: 720, marginBottom: 40 }}>
            <h2 id="method-h2" className="h2" style={{ marginBottom: 16, textWrap: "balance" }}>
              How we chose these {ranking.entries.length}
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(232,237,245,0.72)" }}>
              We reviewed {ranking.companiesReviewed} companies serving {cityLabel} against these
              criteria. Businesses never need to pay to be considered, and no position is set by an
              automated system.
            </p>
          </div>
          <CriteriaGrid
            onInk
            criteria={ranking.criteria.map((criterion) => ({
              id: criterion.id,
              title: criterion.title,
              body: criterion.body,
              importance: criterion.importance,
              iconKey: criterion.iconKey,
            }))}
          />
        </Section>
      ) : null}

      {/* ------------------------------------------------------------- costs */}
      {ranking.costs.length > 0 ? (
        <Section labelledBy="cost-h2">
          <SectionHead
            id="cost-h2"
            title={`Typical ${city.name} ${category.serviceName.toLowerCase()} costs`}
            lead="Sourced figures for this market. Use them to tell whether a quote is in the normal band, not as a quote itself."
          />
          <CostTable
            caption={`${city.name} pricing, ${new Date().getFullYear()}`}
            currency={country.currency}
            rows={ranking.costs.map((row) => ({
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

      {/* -------------------------------------------------------- how to hire */}
      <Section tone="page" labelledBy="hire-h2">
        <div className="split" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 48 }}>
          <div>
            <h2 id="hire-h2" className="h2" style={{ marginBottom: 18, textWrap: "balance" }}>
              How to hire from this list
            </h2>
            <ol className="numbered-steps" style={{ marginTop: 0 }}>
              {HIRING_STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="numbered-steps__num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>
                    <strong>{step.title}</strong>
                    <span>{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="callout callout--alert" style={{ alignItems: "flex-start", alignSelf: "start" }}>
            <Icon name="alert" size={22} color="var(--maple-600)" />
            <div>
              <p className="callout__title">Red flags worth walking away from</p>
              <ul style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {RED_FLAGS.map((flag) => (
                  <li
                    key={flag}
                    style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, lineHeight: 1.55 }}
                  >
                    <span style={{ color: "var(--maple-600)", fontWeight: 700 }}>·</span>
                    <span style={{ color: "var(--text-secondary)" }}>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------ related */}
      {(relatedRankings.length > 0 || nearbyRankings.length > 0 || guides.length > 0) ? (
        <Section labelledBy="rel-h2">
          <SectionHead id="rel-h2" title="Related research" />
          <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {relatedRankings.length > 0 ? (
              <div>
                <h3 className="related-heading">Other services in {city.name}</h3>
                <LinkGrid
                  columns={1}
                  items={relatedRankings.map((item) => ({
                    label: `${item.category.name} in ${city.name}`,
                    href: routes.ranking(country.code, region.slug, city.slug, item.category.slug),
                  }))}
                />
              </div>
            ) : null}
            {nearbyRankings.length > 0 ? (
              <div>
                <h3 className="related-heading">
                  {category.name} elsewhere in {region.name}
                </h3>
                <LinkGrid
                  columns={1}
                  items={nearbyRankings.map((item) => ({
                    label: `${category.name} in ${item.city!.name}`,
                    href: routes.ranking(country.code, region.slug, item.city!.slug, category.slug),
                  }))}
                />
              </div>
            ) : null}
            {guides.length > 0 ? (
              <div>
                <h3 className="related-heading">{category.serviceName} guides</h3>
                <LinkGrid
                  columns={1}
                  items={guides.map((guide) => ({
                    label: guide.title,
                    href: routes.guide(guide.slug),
                    meta: `By ${guide.author?.name}`,
                  }))}
                />
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* --------------------------------------------------------------- FAQ */}
      {faqs.length > 0 ? (
        <Section tone="page" labelledBy="faqs-h2">
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
      ) : null}

      {/* ---------------------------------------------------------- about it */}
      <Section labelledBy="about-h2">
        <SectionHead id="about-h2" title="About this ranking" />
        <TransparencyBlock
          title={ranking.title}
          rows={[
            { label: "Published", value: fullDate(ranking.publishedAt) },
            { label: "Last reviewed", value: fullDate(ranking.lastReviewedAt) },
            {
              label: "Written by",
              value: ranking.author ? (
                <Link href={routes.expert(ranking.author.slug)}>{ranking.author.name}</Link>
              ) : (
                "TenBestFind editorial"
              ),
            },
            {
              label: "Expert review",
              value: ranking.reviewer ? (
                <Link href={routes.expert(ranking.reviewer.slug)}>{ranking.reviewer.name}</Link>
              ) : (
                "Not required for this trade"
              ),
            },
            { label: "Companies reviewed", value: String(ranking.companiesReviewed) },
            {
              label: "Sponsorship",
              value: placement ? (
                <>
                  One labelled Featured Partner <Badge tone="gold">Sponsored</Badge>
                </>
              ) : (
                "No sponsored placement on this page"
              ),
            },
          ]}
        >
          {ranking.sources.length > 0 ? (
            <div style={{ marginTop: 26 }}>
              <h3 style={{ fontSize: 15, marginBottom: 14 }}>Sources checked</h3>
              <SourceList
                sources={ranking.sources.map((source) => ({
                  id: source.id,
                  label: source.label,
                  publisher: source.publisher,
                  url: source.url,
                  tier: source.tier,
                  accessedAt: source.accessedAt,
                }))}
              />
            </div>
          ) : null}
        </TransparencyBlock>
      </Section>

      <Section labelledBy="biz-h2" ruleBottom={false}>
        <BusinessCta />
      </Section>

      <FinalSearch
        title={`Looking for something else in ${city.name}?`}
        lockedLocation={{ label: `Searching in ${cityLabel}`, value: cityLabel }}
      />
    </SiteChrome>
  );
}
