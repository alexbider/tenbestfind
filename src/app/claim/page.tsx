import type { Metadata } from "next";
import { withSocial } from "@/lib/static-meta";
import { BILLING_FAQS } from "@/components/site/business-centre";
import { CentreFaq, CentreHero, FlowHeroBody, SearchBand } from "@/components/site/centre/parts";
import { ClaimFlow } from "@/components/site/ClaimFlow";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = withSocial({
  title: "Claim your business",
  description:
    "Verify ownership and manage your listing details for $29 a month per location. Claiming never affects ranking position.",
  alternates: { canonical: "/claim/" },
});

export default async function ClaimPage() {
  const [businesses, plans] = await Promise.all([
    db.business.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { name: "asc" },
      include: {
        category: { select: { name: true } },
        city: { include: { region: true } },
        entries: { where: { position: { lte: 10 }, ranking: { status: "PUBLISHED" } }, select: { id: true }, take: 1 },
      },
    }),
    db.plan.findMany({ where: { active: true, key: { in: ["claim", "top10"] } }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <SiteChrome active="business" skin>
      <FaqJsonLd faqs={BILLING_FAQS} />
      <div className="bc2">
        <CentreHero crumb="Claim" active="claim">
          <FlowHeroBody
            eyebrow="Claim & Manage"
            h1a="Claim your"
            h1b="business"
            lede="Verify that you own the listing, then keep its details current. $29 a month per location, cancel any time."
            guardTitle="Claiming does not affect your ranking"
            guardText="Ranking position, Top 10 status and the editorial summary stay with the editorial team. A claim gives you control of your own details and nothing else."
          />
        </CentreHero>

        <section aria-labelledby="flow-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <ClaimFlow
            businesses={businesses.map((business) => ({
              id: business.id,
              name: business.name,
              slug: business.slug,
              category: business.category.name,
              place: business.city ? `${business.city.name}, ${business.city.region.code.toUpperCase()}` : "Location not set",
              claimed: business.claimed,
              topTen: business.entries.length > 0,
            }))}
            plans={plans.map((plan) => ({
              key: plan.key,
              name: plan.name,
              priceCents: plan.priceCents,
              unitLabel: plan.unitLabel,
              description: plan.description,
            }))}
          />
        </section>

        <CentreFaq a="Billing and" b="claiming" intro="Straight answers on price, billing and what payment can and cannot do." faqs={BILLING_FAQS} />
        <SearchBand />
      </div>
    </SiteChrome>
  );
}
