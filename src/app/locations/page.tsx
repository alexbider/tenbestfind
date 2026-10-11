import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar, FinalSearch } from "@/components/site/blocks";
import { SearchForm } from "@/components/site/SearchForm";
import { SiteChrome } from "@/components/site/SiteChrome";
import { SHELL } from "@/components/site/page-parts";
import { ArrowLink, HeroBackdrop, LinkRow, autoGrid, heroAccentTail } from "@/components/site/trust/parts";
import { accentTail } from "@/components/ui/Accent";
import { ChevronRight } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
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
    <SiteChrome active="locations" skin>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "All locations",
          url: absoluteUrl(routes.locationsIndex()),
        }}
      />
      <CrumbBar items={[{ label: "Home", href: "/" }, { label: "Locations" }]} />

      <div className="tr2 ut2">
        <section aria-labelledby="hero-h1" data-hero="" style={{ position: "relative", overflow: "hidden", background: "var(--paper)", borderBottom: "1px solid var(--border-subtle)" }}>
          <HeroBackdrop />
          <div style={{ ...SHELL, position: "relative", padding: "52px 24px 44px" }}>
            <h1
              id="hero-h1"
              data-in="2"
              style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: "1.08", letterSpacing: "-0.04em", fontWeight: "800", maxWidth: "840px", textWrap: "balance" }}
            >
              {heroAccentTail(copy.h1, 2)}
            </h1>
            <p data-in="3" style={{ marginTop: "18px", maxWidth: "660px", fontSize: "18px", lineHeight: "1.75", color: "var(--text-secondary)", textWrap: "pretty" }}>
              Research is organized by country, then by state or province, then by city. Licensing
              rules and typical pricing change at every one of those levels.
            </p>
            <div style={{ marginTop: "28px", maxWidth: "720px" }}>
              <SearchForm idPrefix="locations" />
            </div>
          </div>
        </section>

        {countries.map((country, index) => (
          <section
            key={country.code}
            aria-labelledby={`c-${country.code}`}
            style={{ background: index % 2 === 1 ? "var(--surface-page)" : undefined, borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div style={{ ...SHELL, padding: "56px 24px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "28px" }}>
                <div style={{ maxWidth: "720px" }}>
                  <h2
                    data-reveal=""
                    id={`c-${country.code}`}
                    style={{ fontSize: "clamp(26px, 3vw, 36px)", lineHeight: "1.08", fontWeight: "800", letterSpacing: "-0.035em" }}
                  >
                    {accentTail(country.name, 1)}
                  </h2>
                  {country.blurb ? (
                    <p style={{ marginTop: "10px", fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)" }}>{country.blurb}</p>
                  ) : null}
                </div>
                <ArrowLink href={routes.country(country.code)} style={{ fontSize: "15px", fontWeight: "600" }}>
                  {`${country.name} hub`}
                </ArrowLink>
              </div>
              <div data-stagger="" data-ag="auto" data-regions="" style={autoGrid(260, "20px")}>
                {country.regions.map((region) => (
                  <div
                    key={region.id}
                    style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "22px" }}
                  >
                    <h3 style={{ fontSize: "17px", fontWeight: "700", paddingBottom: "12px", marginBottom: "8px", borderBottom: "1px solid var(--border-subtle)" }}>
                      <Link href={routes.region(country.code, region.slug)} style={{ color: "var(--blue-900)" }}>
                        {region.name}
                      </Link>
                    </h3>
                    {region.cities.length > 0 ? (
                      <ul style={{ display: "grid", gap: "2px" }}>
                        {region.cities.map((city) => (
                          <li key={city.id}>
                            <Link
                              data-row=""
                              href={routes.city(country.code, region.slug, city.slug)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "10px",
                                padding: "9px 12px",
                                margin: "0 -12px",
                                borderRadius: "10px",
                                fontSize: "15px",
                                fontWeight: "600",
                                color: "var(--text-primary)",
                                textDecoration: "none",
                              }}
                            >
                              <span>{city.name}</span>
                              <ChevronRight />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No city hubs yet.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section aria-labelledby="more-h2" style={{ background: "var(--surface-page)" }}>
          <div style={{ ...SHELL, padding: "56px 24px" }}>
            <h2
              data-reveal=""
              id="more-h2"
              style={{ fontSize: "clamp(26px, 3vw, 36px)", lineHeight: "1.08", fontWeight: "800", letterSpacing: "-0.035em", marginBottom: "10px" }}
            >
              {accentTail("Not seeing your city?", 2)}
            </h2>
            <p style={{ maxWidth: "720px", marginBottom: "24px", fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)" }}>
              We add markets each month, working outward from the largest metros. Tell us where to look next.
            </p>
            <ul data-ag="auto" style={autoGrid(280, "12px")}>
              <LinkRow href={routes.contact()} label="Request a market" icon="plus" />
              <LinkRow href={routes.howWeRank()} label="How we choose markets" icon="scale" />
            </ul>
          </div>
        </section>
      </div>

      <FinalSearch />
    </SiteChrome>
  );
}
