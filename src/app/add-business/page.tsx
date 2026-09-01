import type { Metadata } from "next";
import { AddBusinessFlow } from "@/components/site/AddBusinessFlow";
import { CrumbBar, FinalSearch } from "@/components/site/blocks";
import { BILLING_FAQS, BusinessCentreNav } from "@/components/site/business-centre";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Icon } from "@/components/ui/Icon";
import { ArrowLink, Section } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

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
    <SiteChrome active="business">
      <FaqJsonLd faqs={BILLING_FAQS} />
      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "For businesses", href: routes.forBusinesses() },
          { label: "Add a business" },
        ]}
      />
      <BusinessCentreNav active="add" />

      <section aria-labelledby="add-h1" className="index-hero">
        <div className="shell" style={{ padding: "48px var(--gutter) 40px" }}>
          <h1 id="add-h1" className="hero__title" style={{ fontSize: "clamp(30px, 3.6vw, 44px)" }}>
            Add a business
          </h1>
          <p className="hero__lead" style={{ maxWidth: 640 }}>
            Submit a company we have not covered yet. It goes into the research pool for its city and
            trade, and an editor reviews it against the published standards.
          </p>
          <div className="callout callout--note" style={{ marginTop: 24, maxWidth: 720 }}>
            <Icon name="info" size={20} color="var(--amber-600)" />
            <div>
              <p className="callout__title">Submitting does not buy a place on a ranking</p>
              <p>
                It makes sure we have your licensing, service area and coverage right when we next
                review that category. Editorial positions are set by the research alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Section ruleTop labelledBy="flow-h2">
        <h2 id="flow-h2" className="sr-only">
          Submission flow
        </h2>
        <AddBusinessFlow
          categories={categories.map((category) => ({ id: category.slug, label: category.name }))}
          cities={cities.map((city) => ({
            id: city.id,
            label: `${city.name}, ${city.region.code.toUpperCase()}`,
          }))}
          planPriceCents={plan?.priceCents ?? 2900}
        />
      </Section>

      <Section tone="page" labelledBy="faq-h2" ruleBottom={false}>
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 56, alignItems: "start" }}
        >
          <div className="toc">
            <h2 id="faq-h2" className="h2" style={{ marginBottom: 16 }}>
              Billing and listing questions
            </h2>
            <ArrowLink href={routes.contact()}>Talk to business support</ArrowLink>
          </div>
          <FaqList faqs={BILLING_FAQS} />
        </div>
      </Section>

      <FinalSearch title="See what homeowners see" lead="Search the way your customers do." />
    </SiteChrome>
  );
}
