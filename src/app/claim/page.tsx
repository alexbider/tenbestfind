import type { Metadata } from "next";
import { CrumbBar, FinalSearch } from "@/components/site/blocks";
import { BusinessCentreNav, BILLING_FAQS } from "@/components/site/business-centre";
import { ClaimFlow } from "@/components/site/ClaimFlow";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Icon } from "@/components/ui/Icon";
import { ArrowLink, Section } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim your business",
  description:
    "Verify ownership and manage your listing details for $29 a month per location. Claiming never affects ranking position.",
  alternates: { canonical: "/claim/" },
};

export default async function ClaimPage() {
  const [businesses, plans] = await Promise.all([
    db.business.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { name: "asc" },
      include: {
        category: { select: { name: true } },
        city: { include: { region: true } },
      },
    }),
    db.plan.findMany({ where: { active: true, key: { in: ["claim", "top10"] } }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <SiteChrome active="business">
      <FaqJsonLd faqs={BILLING_FAQS} />
      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "For businesses", href: routes.forBusinesses() },
          { label: "Claim" },
        ]}
      />
      <BusinessCentreNav active="claim" />

      <section aria-labelledby="claim-h1" className="index-hero">
        <div className="shell" style={{ padding: "48px var(--gutter) 40px" }}>
          <h1 id="claim-h1" className="hero__title" style={{ fontSize: "clamp(30px, 3.6vw, 44px)" }}>
            Claim your business
          </h1>
          <p className="hero__lead" style={{ maxWidth: 640 }}>
            Verify that you own the listing, then keep its details current. $29 a month per
            location, cancel any time.
          </p>
          <div className="callout callout--brand" style={{ marginTop: 24, maxWidth: 720 }}>
            <Icon name="lock" size={20} color="var(--color-primary)" />
            <div>
              <p className="callout__title">Claiming does not affect your ranking</p>
              <p>
                Ranking position, Top 10 status and the editorial summary stay with the editorial
                team. A claim gives you control of your own details and nothing else.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Section ruleTop labelledBy="flow-h2">
        <h2 id="flow-h2" className="sr-only">
          Claim flow
        </h2>
        <ClaimFlow
          businesses={businesses.map((business) => ({
            id: business.id,
            name: business.name,
            slug: business.slug,
            category: business.category.name,
            place: business.city
              ? `${business.city.name}, ${business.city.region.code.toUpperCase()}`
              : "Location not set",
            claimed: business.claimed,
          }))}
          plans={plans.map((plan) => ({
            key: plan.key,
            name: plan.name,
            priceCents: plan.priceCents,
            unitLabel: plan.unitLabel,
            description: plan.description,
          }))}
        />
      </Section>

      <Section tone="page" labelledBy="faq-h2" ruleBottom={false}>
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 56, alignItems: "start" }}
        >
          <div className="toc">
            <h2 id="faq-h2" className="h2" style={{ marginBottom: 16 }}>
              Billing and claiming
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
