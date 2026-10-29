import type { Metadata } from "next";
import { withSocial } from "@/lib/static-meta";
import { CentreHero, SearchBand } from "@/components/site/centre/parts";
import { Top10Form, type Top10Option } from "@/components/site/Top10Form";
import { SiteChrome } from "@/components/site/SiteChrome";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = withSocial({
  title: "Top 10 featured placement",
  description:
    "A labelled Featured Partner placement beside one city and trade ranking for $199 a month. It never changes the ten ranked positions.",
  alternates: { canonical: "/advertise/top10/" },
});

export default async function Top10Page() {
  const businesses = await db.business.findMany({
    where: { status: "PUBLISHED", claimed: true, cityId: { not: null } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, cityId: true, categoryId: true },
  });
  const cityIds = [...new Set(businesses.map((business) => business.cityId).filter((id): id is string => Boolean(id)))];
  const [cities, categories] = await Promise.all([
    db.city.findMany({ where: { id: { in: cityIds } }, include: { region: true }, orderBy: { name: "asc" } }),
    db.category.findMany({ where: { published: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const cityLabel = new Map(cities.map((city) => [city.id, `${city.name}, ${city.region.code.toUpperCase()}`]));
  const categoryLabel = new Map(categories.map((category) => [category.id, category.name]));

  const cityOptions: Top10Option[] = cities.map((city) => ({ value: city.id, label: `${city.name}, ${city.region.code.toUpperCase()}` }));
  const categoryOptions: Top10Option[] = categories.map((category) => ({ value: category.id, label: category.name }));
  const businessOptions = businesses
    .filter((business) => business.cityId && cityLabel.has(business.cityId))
    .map((business) => ({
      value: business.slug,
      label: `${business.name} · ${cityLabel.get(business.cityId!)} · ${categoryLabel.get(business.categoryId) ?? ""}`,
      cityId: business.cityId!,
      categoryId: business.categoryId,
    }));

  return (
    <SiteChrome active="business" skin>
      <div className="bc2">
        <CentreHero crumb="Top 10 placement" active="advertise">
          <div style={{ maxWidth: "820px" }}>
            <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "12px" }}>Sponsored</p>
            <h1 style={{ fontSize: "clamp(34px, 4.5vw, 52px)", lineHeight: "1.06", letterSpacing: "-0.04em" }}>
              A labelled slot beside <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: "400" }}>one</span> ranking
            </h1>
            <p style={{ marginTop: "18px", fontSize: "18px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
              Choose the city and trade. Payment never changes the ten ranked positions on that page.
            </p>
          </div>
        </CentreHero>
        <section style={{ padding: "64px 24px", maxWidth: "860px", margin: "0 auto" }}>
          <Top10Form cities={cityOptions} categories={categoryOptions} businesses={businessOptions} />
        </section>
        <SearchBand />
      </div>
    </SiteChrome>
  );
}
