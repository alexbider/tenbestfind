import type { Metadata } from "next";
import { AddBusinessFlow } from "@/components/site/AddBusinessFlow";
import { BILLING_FAQS } from "@/components/site/business-centre";
import { CentreFaq, CentreHero, FlowHeroBody, SearchBand } from "@/components/site/centre/parts";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add a business",
  description:
    "Submit a business we have not covered yet. Editorial review applies the same standards as everything else, and nothing is charged until the listing publishes.",
  alternates: { canonical: "/add-business/" },
};

export default async function AddBusinessPage() {
  const [categories, cities, plan] = await Promise.all([
    db.category.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    db.city.findMany({
      where: { published: true },
      orderBy: [{ topMetro: "desc" }, { name: "asc" }],
      include: { region: true },
    }),
    db.plan.findUnique({ where: { key: "listing" } }),
  ]);

  return (
    <SiteChrome active="business" skin>
      <FaqJsonLd faqs={BILLING_FAQS} />
      <div className="bc2">
        <CentreHero crumb="Add a business" active="add">
          <FlowHeroBody
            eyebrow="Directory Listing"
            h1a="Add a"
            h1b="business"
            lede="Submit a company we have not covered yet. It goes into the research pool for its city and trade, and an editor reviews it against the published standards."
            guardTitle="Submitting does not buy a place on a ranking"
            guardText="It makes sure we have your licensing, service area and coverage right when we next review that category. Editorial positions are set by the research alone."
          />
        </CentreHero>

        <section aria-labelledby="flow-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <AddBusinessFlow
            categories={categories.map((category) => ({ id: category.slug, label: category.name }))}
            cities={cities.map((city) => ({ id: city.id, label: `${city.name}, ${city.region.code.toUpperCase()}` }))}
            planPriceCents={plan?.priceCents ?? 2900}
          />
        </section>

        <CentreFaq a="Billing and" b="listing questions" intro="Straight answers on price, billing and what payment can and cannot do." faqs={BILLING_FAQS} />
        <SearchBand />
      </div>
    </SiteChrome>
  );
}
