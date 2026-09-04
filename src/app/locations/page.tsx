import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar, FinalSearch, LinkGrid } from "@/components/site/blocks";
import { SearchForm } from "@/components/site/SearchForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { ChevronRight } from "@/components/ui/Icon";
import { JsonLd, Section, SectionHead } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { absoluteUrl, routes } from "@/lib/urls";
import { locationsCopy } from "@/lib/seo-copy";

export const revalidate = 60;

const copy = locationsCopy();

export const metadata: Metadata = {
  title: { absolute: copy.title },
  description: copy.description,
  alternates: { canonical: "/locations/" },
};

export default async function LocationsIndexPage() {
  const countries = await db.country.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
    include: {
      regions: {
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        include: {
          cities: { where: { published: true }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  return (
    <SiteChrome active="locations">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "All locations",
          url: absoluteUrl(routes.locationsIndex()),
        }}
      />
      <CrumbBar items={[{ label: "Home", href: "/" }, { label: "Locations" }]} />

      <section aria-labelledby="hero-h1" className="index-hero">
        <div className="shell" style={{ padding: "52px var(--gutter) 44px" }}>
          <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(32px, 3.8vw, 46px)" }}>
            {copy.h1}
          </h1>
          <p className="hero__lead" style={{ maxWidth: 660 }}>
            Research is organized by country, then by state or province, then by city. Licensing
            rules and typical pricing change at every one of those levels.
          </p>
          <div style={{ marginTop: 28, maxWidth: 720 }}>
            <SearchForm idPrefix="locations" />
          </div>
        </div>
      </section>

      {countries.map((country) => (
        <Section key={country.code} labelledBy={`c-${country.code}`}>
          <SectionHead
            id={`c-${country.code}`}
            title={country.name}
            lead={country.blurb ?? undefined}
            linkHref={routes.country(country.code)}
            linkLabel={`${country.name} hub`}
          />
          <div className="region-groups">
            {country.regions.map((region) => (
              <div key={region.id}>
                <h3 className="region-groups__title">
                  <Link href={routes.region(country.code, region.slug)}>{region.name}</Link>
                </h3>
                {region.cities.length > 0 ? (
                  <ul style={{ display: "grid", gap: 4 }}>
                    {region.cities.map((city) => (
                      <li key={city.id}>
                        <Link
                          className="row-link"
                          href={routes.city(country.code, region.slug, city.slug)}
                        >
                          <span>{city.name}</span>
                          <ChevronRight />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 14, color: "var(--text-muted)" }}>No city hubs yet.</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      ))}

      <Section tone="page" labelledBy="more-h2" ruleBottom={false}>
        <SectionHead
          id="more-h2"
          title="Not seeing your city?"
          lead="We add markets each month, working outward from the largest metros. Tell us where to look next."
        />
        <LinkGrid
          columns={2}
          items={[
            { label: "Request a market", href: routes.contact() },
            { label: "How we choose markets", href: routes.howWeRank() },
          ]}
        />
      </Section>

      <FinalSearch />
    </SiteChrome>
  );
}
