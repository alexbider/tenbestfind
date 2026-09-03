import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BusinessCta,
  CrumbBar,
  FinalSearch,
  GoogleRating,
  LinkGrid,
  TransparencyBlock,
} from "@/components/site/blocks";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { TrackClick, TrackView } from "@/components/site/Track";
import {
  BadgeDisclosure,
  BusinessProvidedDisclosure,
  CoverageDisclosure,
  CredentialDisclosure,
  GoogleReviewDisclosure,
} from "@/components/site/disclosures";
import { Check, Icon } from "@/components/ui/Icon";
import {
  ArrowLink,
  Badge,
  JsonLd,
  Monogram,
  Section,
  SectionHead,
  StatusPill,
} from "@/components/ui/primitives";
import { fullDate, monthYear } from "@/lib/format";
import { parseJson, parseList, type HoursRow } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { seoFor } from "@/lib/seo";
import { absoluteUrl, routes } from "@/lib/urls";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

async function loadBusiness(slug: string) {
  return db.business.findUnique({
    where: { slug },
    include: {
      category: true,
      city: { include: { region: { include: { country: true } } } },
      credentials: { orderBy: { sortOrder: "asc" } },
      photos: { orderBy: { sortOrder: "asc" } },
      reviews: { orderBy: { postedAt: "desc" }, take: 3 },
      services: { include: { subservice: true } },
      areas: { include: { city: { include: { region: true } } } },
      entries: {
        orderBy: { position: "asc" },
        include: {
          ranking: {
            include: { category: true, city: { include: { region: { include: { country: true } } } } },
          },
        },
      },
      placements: { where: { status: "ACTIVE" } },
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await loadBusiness(slug);
  if (!business) return {};
  const place = business.city ? `${business.city.name}, ${business.city.region.code.toUpperCase()}` : "";
  return seoFor("business", business.id, {
    title: `${business.name} — ${business.category.serviceName}${place ? ` in ${place}` : ""}`,
    description:
      business.description ??
      `Profile for ${business.name}: services, credentials, coverage area, contact details and our editorial take.`,
    path: routes.business(business.slug),
    image: business.logoUrl,
  });
}

export default async function BusinessProfilePage({ params }: Props) {
  const { slug } = await params;
  const business = await loadBusiness(slug);
  if (!business || business.status !== "PUBLISHED") {
    await redirectIfKnown(routes.business(slug));
    notFound();
  }

  const city = business.city;
  const region = city?.region;
  const country = region?.country;
  const strengths = parseList(business.strengths);
  const considerations = parseList(business.considerations);
  const hours = parseJson<HoursRow[]>(business.hours, []);
  const distribution = parseJson<Record<string, number>>(business.googleDistribution, {});
  const topEntry = business.entries[0];
  const isSponsored = business.placements.length > 0;
  const yearsInBusiness = business.yearFounded ? new Date().getFullYear() - business.yearFounded : null;

  const similar = city
    ? await db.business.findMany({
        where: {
          status: "PUBLISHED",
          cityId: city.id,
          categoryId: business.categoryId,
          NOT: { id: business.id },
        },
        orderBy: { googleRating: "desc" },
        take: 5,
        include: { entries: { select: { position: true }, take: 1, orderBy: { position: "asc" } } },
      })
    : [];

  const guides = await db.guide.findMany({
    where: { status: "PUBLISHED", categoryId: business.categoryId },
    orderBy: { publishedAt: "desc" },
    take: 4,
  });

  const totalReviews = Object.values(distribution).reduce((sum, value) => sum + value, 0);

  // Questions written for this company come first; the standing ones about how
  // the profile was built always follow, so the provenance is never dropped.
  const faqs = [
    ...business.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
    {
      question: `Is ${business.name} licensed and insured?`,
      answer: business.credentials.length
        ? `We checked ${business.credentials.filter((c) => c.status === "VERIFIED").length} of ${business.credentials.length} credentials against the issuing authority. Verified items carry the date we checked; reported items are what the business told us and we could not independently confirm.`
        : "We have no credential records on file for this company yet. Ask for the certificate directly from the insurer before booking work.",
    },
    {
      question: `What areas does ${business.name} serve?`,
      answer: business.areas.length
        ? `${business.areas.map((area) => area.city.name).join(", ")}. Coverage is as the business describes it, cross-checked against where its recent documented work is. Confirm your address before scheduling, particularly at the edge of a service area.`
        : "Service area is not confirmed on file. Ask the company directly whether it covers your address.",
    },
    {
      question: `Does ${business.name} offer emergency service?`,
      answer: business.emergency
        ? "Yes, the company lists emergency availability. Response time depends on demand, and after a storm every company in the market is stretched."
        : "Emergency availability is not listed for this company. If you need an urgent call-out, check the ranking for companies that do list it.",
    },
    {
      question: "What warranty do they offer?",
      answer: business.warrantyTerms
        ? `${business.warrantyTerms}. There are usually two warranties on a job: the manufacturer covers materials, the contractor covers workmanship. Get both in writing and check whether the workmanship coverage transfers if you sell.`
        : "Warranty terms are not on file. Ask for them in writing before work starts.",
    },
    {
      question: "How was this profile built?",
      answer:
        "Credentials come from issuing authorities, ratings from the company's Google Business Profile with the date we read them, and the editorial take from our own review of estimates, warranty documents and public feedback. Anything the business told us is labelled as reported.",
    },
    {
      question: "Can a business pay to improve its profile?",
      answer:
        "A business can subscribe to manage its own listing details, and it can buy a labelled sponsored placement. Neither changes a ranking position or the editorial assessment on this page.",
    },
  ];

  return (
    <SiteChrome active="rankings">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": absoluteUrl(`${routes.business(business.slug)}#business`),
          name: business.name,
          url: absoluteUrl(routes.business(business.slug)),
          description: business.tagline ?? undefined,
          telephone: business.phone ?? undefined,
          email: business.email ?? undefined,
          image: business.photos[0]?.url ?? business.logoUrl ?? undefined,
          logo: business.logoUrl ?? undefined,
          sameAs: business.website ? [business.website] : undefined,
          foundingDate: business.yearFounded ? String(business.yearFounded) : undefined,
          address:
            business.addressLine || business.city
              ? {
                  "@type": "PostalAddress",
                  streetAddress: business.addressLine ?? undefined,
                  addressLocality: business.city?.name,
                  addressRegion: business.city?.region.code.toUpperCase(),
                  postalCode: business.postalCode ?? undefined,
                  addressCountry: business.city?.region.country.code.toUpperCase(),
                }
              : undefined,
          geo:
            business.latitude && business.longitude
              ? { "@type": "GeoCoordinates", latitude: business.latitude, longitude: business.longitude }
              : undefined,
          areaServed: business.areas.length
            ? business.areas.map((area) => ({ "@type": "City", name: area.city.name }))
            : business.city
              ? [{ "@type": "City", name: business.city.name }]
              : undefined,
          openingHoursSpecification: hours.some((row) => row.opens && row.closes)
            ? hours
                .filter((row) => !row.closed && row.opens && row.closes)
                .map((row) => ({
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: row.day,
                  opens: row.opens,
                  closes: row.closes,
                }))
            : undefined,
          makesOffer: business.services.length
            ? business.services.map((entry) => ({
                "@type": "Offer",
                itemOffered: { "@type": "Service", name: entry.subservice.name },
              }))
            : undefined,
          aggregateRating:
            business.googleRating && business.googleReviewCount
              ? {
                  "@type": "AggregateRating",
                  ratingValue: business.googleRating,
                  reviewCount: business.googleReviewCount,
                  bestRating: 5,
                  worstRating: 1,
                }
              : undefined,
        }}
      />
      <FaqJsonLd faqs={faqs} />
      <TrackView type="PROFILE_VIEW" businessId={business.id} />

      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          ...(country && region && city
            ? [
                { label: country.name, href: routes.country(country.code) },
                { label: region.name, href: routes.region(country.code, region.slug) },
                { label: city.name, href: routes.city(country.code, region.slug, city.slug) },
              ]
            : []),
          { label: business.name },
        ]}
      />

      {/* ------------------------------------------------------------- hero */}
      <section
        aria-labelledby="biz-h1"
        style={{
          background:
            "linear-gradient(180deg, var(--blue-50) 0%, rgba(234,244,255,0.32) 60%, var(--surface-card) 100%)",
        }}
      >
        <div
          className="shell split"
          style={{
            padding: "48px var(--gutter) 44px",
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 40,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 20 }}>
              <Monogram name={business.name} size={72} radius={18} />
              <div style={{ minWidth: 0 }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>
                  {business.category.serviceName}
                  {city ? ` · ${city.name}, ${region!.code.toUpperCase()}` : ""}
                </p>
                <h1 id="biz-h1" style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.1, marginBottom: 12 }}>
                  {business.name}
                </h1>
                <div className="biz-hero__meta">
                  <GoogleRating rating={business.googleRating} count={business.googleReviewCount} />
                  {business.googleDataUpdated ? (
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      Read {monthYear(business.googleDataUpdated)}
                    </span>
                  ) : null}
                  <GoogleReviewDisclosure />
                </div>
                <div className="biz-hero__badges">
                  {business.verified ? (
                    <Badge tone="positive">
                      <Check size={13} />
                      Details verified
                    </Badge>
                  ) : null}
                  {topEntry ? (
                    <Badge tone="gold">Ranked #{topEntry.position} in {topEntry.ranking.city?.name}</Badge>
                  ) : null}
                  {business.claimed ? <Badge tone="brand">Claimed profile</Badge> : null}
                  {isSponsored ? <Badge tone="neutral">Featured partner</Badge> : null}
                  <BadgeDisclosure
                    verified={business.verified}
                    ranked={Boolean(topEntry)}
                    claimed={business.claimed}
                    sponsored={isSponsored}
                  />
                </div>
              </div>
            </div>

            {/* Answer-first overview, built only from verified fields on this page. */}
            <div className="overview-card">
              <div className="overview-card__head">
                <h2>Quick overview</h2>
                <BusinessProvidedDisclosure />
              </div>
              <p>
                {business.name} is {/^[aeiou]/i.test(business.category.singular) ? "an" : "a"}{" "}
                {business.category.singular.toLowerCase()}
                {city ? ` working in ${city.name} and the surrounding area` : ""}
                {yearsInBusiness ? `, ${yearsInBusiness} years in business` : ""}.{" "}
                {business.description ?? ""}{" "}
                {business.warrantyTerms ? `Workmanship is covered by a ${business.warrantyTerms.toLowerCase()}. ` : ""}
                {business.emergency ? "Emergency service is listed. " : ""}
                {business.googleRating
                  ? `On Google the company holds ${business.googleRating.toFixed(1)} from ${business.googleReviewCount?.toLocaleString()} reviews.`
                  : ""}
              </p>
              <ul className="overview-card__fit">
                {business.bestFor ? (
                  <li>
                    <Icon name="check" size={16} color="var(--color-success)" />
                    <span>
                      <strong>Best for</strong> {business.bestFor.toLowerCase()}
                    </span>
                  </li>
                ) : null}
                {strengths[0] ? (
                  <li>
                    <Icon name="up" size={16} color="var(--color-primary)" />
                    <span>
                      <strong>Strong fit</strong> {strengths[0].toLowerCase()}
                    </span>
                  </li>
                ) : null}
                {considerations[0] ? (
                  <li>
                    <Icon name="info" size={16} color="var(--amber-600)" />
                    <span>
                      <strong>Worth knowing</strong> {considerations[0].toLowerCase()}
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>

          <aside className="card contact-card">
            <h2 className="contact-card__title">Contact</h2>
            {business.website ? (
              <TrackClick type="WEBSITE_CLICK" businessId={business.id}>
                <a
                  href={business.website}
                  className="btn btn--primary btn--block"
                  rel="nofollow noopener"
                  target="_blank"
                >
                  Visit website
                </a>
              </TrackClick>
            ) : null}
            <TrackClick type="QUOTE_CLICK" businessId={business.id}>
              <Link href={routes.contact()} className="btn btn--secondary btn--block" style={{ marginTop: 10 }}>
                Request a quote
              </Link>
            </TrackClick>
            {business.phone ? (
              <TrackClick type="PHONE_CLICK" businessId={business.id}>
                <a
                  href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}
                  className="btn btn--ghost btn--block"
                  style={{ marginTop: 10 }}
                >
                  {business.phone}
                </a>
              </TrackClick>
            ) : null}

            <dl className="contact-card__facts">
              {business.addressLine ? (
                <div>
                  <dt>
                    <Icon name="pin" size={15} color="var(--gray-400)" />
                    Address
                  </dt>
                  <dd>{business.addressLine}</dd>
                </div>
              ) : null}
              {business.areas.length > 0 ? (
                <div>
                  <dt>
                    <Icon name="map" size={15} color="var(--gray-400)" />
                    Serves
                  </dt>
                  <dd>{business.areas.map((area) => area.city.name).join(", ")}</dd>
                </div>
              ) : null}
              <div>
                <dt>
                  <Icon name="clock" size={15} color="var(--gray-400)" />
                  Emergency
                </dt>
                <dd>{business.emergency ? "Available" : "Not listed"}</dd>
              </div>
            </dl>

            {hours.length > 0 ? (
              <details className="hours">
                <summary>Opening hours</summary>
                <ul>
                  {hours.map((row) => (
                    <li key={row.day}>
                      <span>{row.day}</span>
                      <span>{row.closed ? "Closed" : `${row.opens} – ${row.closes}`}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </aside>
        </div>
      </section>

      {/* -------------------------------------------------------- at a glance */}
      <Section tone="page" ruleTop labelledBy="glance-h2">
        <SectionHead id="glance-h2" title="At a glance" />
        <ul className="glance-grid">
          {[
            { icon: "award" as const, label: "Best for", value: business.bestFor },
            { icon: "history" as const, label: "Years in business", value: yearsInBusiness ? String(yearsInBusiness) : null },
            { icon: "house" as const, label: "Category", value: business.category.name },
            { icon: "pin" as const, label: "Based in", value: city ? `${city.name}, ${region!.code.toUpperCase()}` : null },
            { icon: "globe" as const, label: "Website", value: business.website ? "Listed" : null },
            { icon: "clock" as const, label: "Emergency service", value: business.emergency ? "Yes" : null },
            { icon: "star" as const, label: "Google rating", value: business.googleRating ? business.googleRating.toFixed(1) : null },
            { icon: "chat" as const, label: "Google reviews", value: business.googleReviewCount?.toLocaleString() ?? null },
            { icon: "doc" as const, label: "Free estimates", value: business.freeEstimates ? "Yes" : null },
            { icon: "card" as const, label: "Financing", value: business.financing ? "Available" : null },
            { icon: "shield" as const, label: "Warranty", value: business.warrantyTerms },
            { icon: "badge" as const, label: "Credentials verified", value: String(business.credentials.filter((c) => c.status === "VERIFIED").length) },
          ]
            .filter((item) => item.value)
            .map((item) => (
              <li key={item.label} className="card card--lift glance-tile">
                <span aria-hidden="true">
                  <Icon name={item.icon} size={20} strokeWidth={1.8} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                </span>
              </li>
            ))}
        </ul>
      </Section>

      {/* --------------------------------------------------------- our take */}
      {business.editorialTake || strengths.length > 0 ? (
        <Section labelledBy="take-h2">
          <SectionHead
            id="take-h2"
            title="Our take"
            lead="Editorial judgement, based on what we could verify. Separate from anything the business told us."
          />
          <div className="split" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40 }}>
            <div className="prose">
              {business.editorialTake ? <p>{business.editorialTake}</p> : null}
              {topEntry?.whyPicked ? <p>{topEntry.whyPicked}</p> : null}
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {strengths.length > 0 ? (
                <div className="card" style={{ padding: "22px 24px" }}>
                  <h3 className="related-heading">What we like</h3>
                  <ul style={{ display: "grid", gap: 10 }}>
                    {strengths.map((item) => (
                      <li key={item} style={{ display: "flex", gap: 10, fontSize: 15, lineHeight: 1.55 }}>
                        <Check size={16} />
                        <span style={{ color: "var(--text-secondary)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {considerations.length > 0 ? (
                <div className="card" style={{ padding: "22px 24px" }}>
                  <h3 className="related-heading">Things to consider</h3>
                  <ul style={{ display: "grid", gap: 10 }}>
                    {considerations.map((item) => (
                      <li key={item} style={{ display: "flex", gap: 10, fontSize: 15, lineHeight: 1.55 }}>
                        <Icon name="info" size={16} color="var(--amber-600)" />
                        <span style={{ color: "var(--text-secondary)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </Section>
      ) : null}

      {/* ---------------------------------------------------- google reviews */}
      {business.googleRating && totalReviews > 0 ? (
        <Section tone="page" labelledBy="rev-h2">
          <SectionHead
            id="rev-h2"
            title="Google reviews"
            lead="Google's numbers, shown with the date we read them. We do not blend them into a score of our own."
          />
          <div className="split" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 40 }}>
            <div className="card" style={{ padding: "26px 28px", textAlign: "center" }}>
              <p style={{ fontSize: 48, fontWeight: 700, color: "var(--ink)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {business.googleRating.toFixed(1)}
              </p>
              <p style={{ marginTop: 10, fontSize: 14, color: "var(--text-secondary)" }}>
                {business.googleReviewCount?.toLocaleString()} Google reviews
              </p>
              <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
                Updated {monthYear(business.googleDataUpdated)}
              </p>
              <div style={{ marginTop: 14 }}>
                <GoogleReviewDisclosure />
              </div>
            </div>
            <ul className="dist-bars">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = distribution[String(stars)] ?? 0;
                const percent = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
                return (
                  <li key={stars}>
                    <span className="dist-bars__label">{stars} star</span>
                    <span className="dist-bars__track">
                      <span className="dist-bars__fill" style={{ width: `${percent}%` }} />
                    </span>
                    <span className="dist-bars__count">
                      {count.toLocaleString()} ({percent}%)
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* ----------------------------------------------------- ranking status */}
      {business.entries.length > 0 ? (
        <Section tone="ink" labelledBy="rank-h2">
          <div className="split" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 48 }}>
            <div>
              <h2 id="rank-h2" className="h2" style={{ marginBottom: 16, textWrap: "balance" }}>
                Where this company ranks
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(232,237,245,0.72)" }}>
                Editorial positions, set against published criteria. They cannot be bought, and a
                sponsored placement never earns one.
              </p>
            </div>
            <ul style={{ display: "grid", gap: 12 }}>
              {business.entries.map((entry) => (
                <li key={entry.id} className="ranked-in">
                  <span className="ranked-in__pos" aria-hidden="true">
                    {String(entry.position).padStart(2, "0")}
                  </span>
                  <span>
                    <Link
                      href={routes.ranking(
                        entry.ranking.city!.region.country.code,
                        entry.ranking.city!.region.slug,
                        entry.ranking.city!.slug,
                        entry.ranking.category.slug,
                      )}
                    >
                      {entry.ranking.title}
                    </Link>
                    {entry.designation ? <span>{entry.designation}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* --------------------------------------------------- services, areas */}
      <Section labelledBy="svc-h2">
        <SectionHead id="svc-h2" title="Services and coverage" />
        <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          <div>
            <h3 className="related-heading">Services offered</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {business.services.length > 0 ? (
                business.services.map((link) => (
                  <Link
                    key={link.subserviceId}
                    className="chip"
                    href={routes.subservice(business.category.slug, link.subservice.slug)}
                  >
                    {link.subservice.name}
                  </Link>
                ))
              ) : (
                <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>
                  No service list on file. Ask the company directly what it covers.
                </p>
              )}
            </div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h3 className="related-heading">Areas served</h3>
              <CoverageDisclosure />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {business.areas.map((area) => (
                <Link
                  key={area.cityId}
                  className="chip"
                  href={routes.city(country!.code, area.city.region.slug, area.city.slug)}
                >
                  {area.city.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------------- credentials */}
      {business.credentials.length > 0 ? (
        <Section tone="page" labelledBy="rep-h2">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 32 }}>
            <div style={{ maxWidth: 640 }}>
              <h2 id="rep-h2" className="h2">
                Credentials
              </h2>
              <p className="lead" style={{ marginTop: 14 }}>
                Verified means we found it in the issuing authority&apos;s own register. Reported
                means the business told us and we could not confirm it independently.
              </p>
            </div>
            <CredentialDisclosure />
          </div>
          <ul className="credential-list">
            {business.credentials.map((credential) => (
              <li key={credential.id}>
                <span className="credential-list__icon" aria-hidden="true">
                  <Icon
                    name={credential.status === "VERIFIED" ? "badge" : credential.status === "EXPIRED" ? "alert" : "doc"}
                    size={20}
                    color={
                      credential.status === "VERIFIED"
                        ? "var(--green-600)"
                        : credential.status === "EXPIRED"
                          ? "var(--maple-600)"
                          : "var(--gray-400)"
                    }
                  />
                </span>
                <span>
                  <strong>{credential.label}</strong>
                  <span>
                    {credential.authority ?? "Authority not recorded"}
                    {credential.identifier ? ` · ${credential.identifier}` : ""}
                    {credential.checkedAt ? ` · Checked ${fullDate(credential.checkedAt)}` : ""}
                  </span>
                </span>
                <StatusPill status={credential.status} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ------------------------------------------------------------ similar */}
      {similar.length > 0 ? (
        <Section labelledBy="sim-h2">
          <SectionHead
            id="sim-h2"
            title={`Similar companies in ${city?.name}`}
            lead="Others we reviewed in the same trade and market."
          />
          <LinkGrid
            columns={2}
            items={similar.map((item) => ({
              label: item.name,
              href: routes.business(item.slug),
              meta: item.entries[0]
                ? `Ranked #${item.entries[0].position} · ${item.googleRating?.toFixed(1) ?? "—"} on Google`
                : `${item.googleRating?.toFixed(1) ?? "—"} on Google`,
            }))}
          />
        </Section>
      ) : null}

      {guides.length > 0 ? (
        <Section tone="page" labelledBy="rel-h2">
          <SectionHead id="rel-h2" title="Before you book" linkHref={routes.guidesIndex()} linkLabel="All guides" />
          <LinkGrid
            columns={2}
            items={guides.map((guide) => ({ label: guide.title, href: routes.guide(guide.slug) }))}
          />
        </Section>
      ) : null}

      <Section labelledBy="faq-h2">
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 56, alignItems: "start" }}
        >
          <div className="toc">
            <h2 id="faq-h2" className="h2" style={{ marginBottom: 16 }}>
              Common questions
            </h2>
            <ArrowLink href={routes.contact()}>Ask us something else</ArrowLink>
          </div>
          <FaqList faqs={faqs} />
        </div>
      </Section>

      <Section tone="page" labelledBy="meta-h2">
        <SectionHead id="meta-h2" title="About this profile" />
        <TransparencyBlock
          title={business.name}
          rows={[
            { label: "Profile published", value: fullDate(business.publishedAt) },
            { label: "Last updated", value: fullDate(business.updatedAt) },
            { label: "Google data read", value: fullDate(business.googleDataUpdated) },
            {
              label: "Credentials",
              value: `${business.credentials.filter((c) => c.status === "VERIFIED").length} verified of ${business.credentials.length}`,
            },
            { label: "Profile claimed", value: business.claimed ? "Yes, by the owner" : "Not claimed" },
            {
              label: "Commercial relationship",
              value: isSponsored ? "Holds a labelled sponsored placement" : "None",
            },
          ]}
        >
          <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={routes.claim()} className="btn btn--secondary btn--sm">
              Claim this business
            </Link>
            <Link href={routes.corrections()} className="btn btn--ghost btn--sm">
              Suggest an update
            </Link>
          </div>
        </TransparencyBlock>
      </Section>

      <Section labelledBy="biz-h2" ruleBottom={false}>
        <BusinessCta />
      </Section>

      <FinalSearch
        title={city ? `Compare more companies in ${city.name}` : "Compare more companies"}
        lockedLocation={
          city ? { label: `Searching in ${city.name}`, value: `${city.name}, ${region!.code.toUpperCase()}` } : undefined
        }
      />
    </SiteChrome>
  );
}
