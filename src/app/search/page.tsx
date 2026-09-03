import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar, GoogleRating, LinkGrid } from "@/components/site/blocks";
import { GoogleReviewDisclosure, MethodologyDisclosure } from "@/components/site/disclosures";
import { SearchForm } from "@/components/site/SearchForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { ResultsFilter } from "@/components/site/ResultsFilter";
import { Icon } from "@/components/ui/Icon";
import { ArrowLink, Badge, Section, SectionHead } from "@/components/ui/primitives";
import { BusinessLogo } from "@/components/site/BusinessLogo";
import { shortMonthYear } from "@/lib/format";
import { db } from "@/lib/db";
import { rankingCardSelect } from "@/lib/queries";
import { loadSeoSettings } from "@/lib/seo-settings";
import { rankingUrl, routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

// Search result pages are thin and effectively infinite, so they are kept out
// of the index by default. The switch is at /admin/seo.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSeoSettings();
  const indexable =
    settings.bool("seo.searchEngineVisible") && !settings.bool("seo.noindexSearch");

  return {
    title: "Search",
    description: "Search researched rankings, business profiles and guides.",
    robots: { index: indexable, follow: true },
  };
}

type Props = {
  searchParams: Promise<{ service?: string; location?: string; rating?: string; verified?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const service = params.service?.trim() ?? "";
  const location = params.location?.trim() ?? "";
  const minRating = params.rating === "4.5" ? 4.5 : params.rating === "4.0" ? 4 : 0;
  const verifiedOnly = params.verified === "1";

  const serviceTerm = service.toLowerCase();
  const locationTerm = location.split(",")[0]?.trim().toLowerCase() ?? "";

  const [categories, cities] = await Promise.all([
    db.category.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    db.city.findMany({
      where: { published: true },
      include: { region: { include: { country: true } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const matchedCategory = serviceTerm
    ? categories.find(
        (category) =>
          category.slug === serviceTerm ||
          category.name.toLowerCase().includes(serviceTerm) ||
          category.serviceName.toLowerCase().includes(serviceTerm) ||
          category.singular.toLowerCase().includes(serviceTerm),
      )
    : undefined;

  const matchedCity = locationTerm
    ? cities.find(
        (city) => city.slug === locationTerm || city.name.toLowerCase() === locationTerm,
      ) ?? cities.find((city) => city.name.toLowerCase().includes(locationTerm))
    : undefined;

  const [rankings, businesses, guides] = await Promise.all([
    db.ranking.findMany({
      where: {
        status: "PUBLISHED",
        ...(matchedCategory ? { categoryId: matchedCategory.id } : {}),
        ...(matchedCity ? { cityId: matchedCity.id } : {}),
      },
      orderBy: { lastReviewedAt: "desc" },
      take: 8,
      select: rankingCardSelect,
    }),
    db.business.findMany({
      where: {
        status: "PUBLISHED",
        ...(matchedCategory ? { categoryId: matchedCategory.id } : {}),
        ...(matchedCity ? { cityId: matchedCity.id } : {}),
        ...(minRating ? { googleRating: { gte: minRating } } : {}),
        ...(verifiedOnly ? { verified: true } : {}),
      },
      orderBy: [{ googleRating: "desc" }],
      take: 24,
      include: {
        category: { select: { name: true, serviceName: true, slug: true } },
        city: { include: { region: { include: { country: true } } } },
        entries: { select: { position: true }, orderBy: { position: "asc" }, take: 1 },
        placements: { where: { status: "ACTIVE" }, select: { id: true } },
      },
    }),
    db.guide.findMany({
      where: {
        status: "PUBLISHED",
        ...(matchedCategory ? { categoryId: matchedCategory.id } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 6,
      include: { category: { select: { serviceName: true } } },
    }),
  ]);

  const bestMatch = rankings[0];
  const heading = matchedCategory
    ? `${matchedCategory.name}${matchedCity ? ` in ${matchedCity.name}, ${matchedCity.region.code.toUpperCase()}` : ""}`
    : service || location
      ? `Results for ${[service, location].filter(Boolean).join(" in ")}`
      : "Search";

  return (
    <SiteChrome active="none">
      <CrumbBar items={[{ label: "Home", href: "/" }, { label: "Search" }]} />

      <section aria-labelledby="search-h1" className="index-hero">
        <div className="shell" style={{ padding: "40px var(--gutter) 36px" }}>
          <h1 id="search-h1" style={{ fontSize: "clamp(26px, 3vw, 36px)", lineHeight: 1.15, marginBottom: 8 }}>
            {heading}
          </h1>
          <p style={{ fontSize: 15.5, color: "var(--text-secondary)", marginBottom: 24 }}>
            {rankings.length + businesses.length + guides.length} results
            {matchedCategory && !service.toLowerCase().startsWith(matchedCategory.name.toLowerCase())
              ? ` · showing results for ${matchedCategory.name}`
              : ""}
          </p>
          <SearchForm
            idPrefix="results"
            servicePlaceholder={service || "What service do you need?"}
            locationPlaceholder={location || "City or postal code"}
          />
        </div>
      </section>

      <Section labelledBy="results-h2" ruleBottom={false}>
        <h2 id="results-h2" className="sr-only">
          Results
        </h2>
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: 40, alignItems: "start" }}
        >
          <ResultsFilter
            service={service}
            location={location}
            rating={params.rating ?? "any"}
            verified={verifiedOnly}
          />

          <div>
            {bestMatch ? (
              <article className="best-match">
                <div className="best-match__label">
                  <Icon name="award" size={16} color="#fff" />
                  Best match
                </div>
                <h3>
                  <Link href={rankingUrl(bestMatch)}>{bestMatch.title}</Link>
                </h3>
                <p>{bestMatch.summary}</p>
                <div className="best-match__meta">
                  <span>{bestMatch.companiesReviewed} companies reviewed</span>
                  <span>Updated {shortMonthYear(bestMatch.lastReviewedAt)}</span>
                  <MethodologyDisclosure />
                </div>
              </article>
            ) : null}

            {businesses.length > 0 ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, margin: "32px 0 16px" }}>
                  <h3 style={{ fontSize: 18 }}>
                    {businesses.length} {businesses.length === 1 ? "business" : "businesses"}
                  </h3>
                  <GoogleReviewDisclosure />
                </div>
                <ul style={{ display: "grid", gap: 14 }}>
                  {businesses.map((business) => (
                    <li key={business.id} className="card card--lift result-card">
                      <BusinessLogo name={business.name} url={business.logoUrl} size={56} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <h4 style={{ fontSize: 18 }}>
                            <Link href={routes.business(business.slug)} style={{ color: "var(--ink)" }}>
                              {business.name}
                            </Link>
                          </h4>
                          {business.entries[0] ? (
                            <Badge tone="gold">Ranked #{business.entries[0].position}</Badge>
                          ) : null}
                          {business.verified ? <Badge tone="positive">Verified</Badge> : null}
                          {business.placements.length > 0 ? (
                            <span className="sponsored-label">Sponsored</span>
                          ) : null}
                        </div>
                        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "5px 0 10px" }}>
                          {business.category.name}
                          {business.city
                            ? ` · ${business.city.name}, ${business.city.region.code.toUpperCase()}`
                            : ""}
                          {business.bestFor ? ` · ${business.bestFor}` : ""}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                          <GoogleRating
                            rating={business.googleRating}
                            count={business.googleReviewCount}
                            size="sm"
                          />
                          {business.emergency ? (
                            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                              Emergency service
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                        <Link href={routes.business(business.slug)} className="btn btn--primary btn--sm">
                          View profile
                        </Link>
                        {business.website ? (
                          <a
                            href={business.website}
                            className="btn btn--secondary btn--sm"
                            rel="nofollow noopener"
                            target="_blank"
                          >
                            Website
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="callout callout--brand" style={{ marginTop: 24 }}>
                <Icon name="info" size={20} color="var(--color-primary)" />
                <div>
                  <p className="callout__title">Nothing matched that search</p>
                  <p>
                    We may not cover that market yet. Try a nearby city, or browse{" "}
                    <Link href={routes.locationsIndex()}>every market we cover</Link>.
                  </p>
                </div>
              </div>
            )}

            {rankings.length > 1 ? (
              <div style={{ marginTop: 40 }}>
                <h3 style={{ fontSize: 18, marginBottom: 16 }}>Related rankings</h3>
                <LinkGrid
                  columns={1}
                  items={rankings.slice(1).map((ranking) => ({
                    label: ranking.title,
                    href: rankingUrl(ranking),
                    meta: `Updated ${shortMonthYear(ranking.lastReviewedAt)}`,
                  }))}
                />
              </div>
            ) : null}

            {guides.length > 0 ? (
              <div style={{ marginTop: 40 }}>
                <h3 style={{ fontSize: 18, marginBottom: 16 }}>Guides</h3>
                <LinkGrid
                  columns={1}
                  items={guides.map((guide) => ({
                    label: guide.title,
                    href: routes.guide(guide.slug),
                    meta: guide.category?.serviceName,
                  }))}
                />
              </div>
            ) : null}

            <p className="search-note">
              <Icon name="info" size={15} color="var(--gray-400)" />
              Filtered searches are not published as their own pages. Everything here also lives on a
              permanent city, service or company page.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="page" labelledBy="cover-h2" ruleBottom={false}>
        <SectionHead
          id="cover-h2"
          title="Not finding your market?"
          lead="We add cities each month, working outward from the largest metros."
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={routes.contact()} className="btn btn--primary">
            Request a ranking
          </Link>
          <Link href={routes.locationsIndex()} className="btn btn--secondary">
            Browse all locations
          </Link>
        </div>
        <div style={{ marginTop: 24 }}>
          <ArrowLink href={routes.howWeRank()}>How our rankings are made</ArrowLink>
        </div>
      </Section>
    </SiteChrome>
  );
}
