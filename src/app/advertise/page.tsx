import type { Metadata } from "next";
import { AdvertiseForm } from "@/components/site/AdvertiseForm";
import { CrumbBar, FinalSearch } from "@/components/site/blocks";
import { BILLING_FAQS, BusinessCentreNav } from "@/components/site/business-centre";
import { SponsoredDisclosure } from "@/components/site/disclosures";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Check, Icon } from "@/components/ui/Icon";
import { ArrowLink, Badge, Section, SectionHead } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import { parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Advertising",
  description:
    "Labelled featured placements beside the rankings people are reading. $199 a month per city and trade. Advertising does not buy editorial rankings.",
  alternates: { canonical: "/advertise/" },
};

const PLACEMENTS = [
  {
    title: "Featured Partner on a ranking",
    body: "A bordered box beside the ranked ten on one city and trade page, labelled Sponsored with a disclosure explaining what it is.",
    icon: "award" as const,
  },
  {
    title: "Category placement",
    body: "Beside the service being compared on a category or city hub, in the market you actually cover.",
    icon: "grid" as const,
  },
  {
    title: "Multi-market campaign",
    body: "Several cities or trades at once, quoted against available inventory rather than a rate card.",
    icon: "map" as const,
  },
];

const ELIGIBILITY = [
  "A verifiable business presence in the market being advertised",
  "Current liability insurance appropriate to the trade",
  "Licensing or registration where the jurisdiction requires it",
  "No unresolved pattern of serious complaints in public records",
  "Willingness to have the placement labelled clearly as sponsored",
];

export default async function AdvertisePage() {
  const plans = await db.plan.findMany({
    where: { active: true, editorial: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <SiteChrome active="business">
      <FaqJsonLd faqs={BILLING_FAQS} />
      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "For businesses", href: routes.forBusinesses() },
          { label: "Advertise" },
        ]}
      />
      <BusinessCentreNav active="advertise" />

      <section aria-labelledby="ad-h1" className="index-hero">
        <div className="shell" style={{ padding: "48px var(--gutter) 40px" }}>
          <h1 id="ad-h1" className="hero__title" style={{ fontSize: "clamp(30px, 3.6vw, 44px)" }}>
            Labelled placements, beside the research
          </h1>
          <p className="hero__lead" style={{ maxWidth: 660 }}>
            Reach homeowners at the point where they are already shortlisting. Every placement is
            labelled, sits outside the ranked ten, and carries a disclosure explaining exactly what
            it is.
          </p>
        </div>
      </section>

      <Section ruleTop labelledBy="place-h2">
        <SectionHead
          id="place-h2"
          title="Where placements appear"
          lead="Only in markets you actually serve. We do not sell national blasts."
        />
        <div className="card-grid">
          {PLACEMENTS.map((placement) => (
            <article key={placement.title} className="card path-card">
              <span className="path-card__icon" aria-hidden="true">
                <Icon name={placement.icon} size={24} strokeWidth={1.8} />
              </span>
              <h3>{placement.title}</h3>
              <p>{placement.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="page" labelledBy="price-h2">
        <SectionHead id="price-h2" title="Pricing" />
        <div className="card-grid card-grid--2">
          {plans.map((plan) => (
            <article key={plan.id} className="card plan-card">
              <div className="plan-card__head">
                <h3>{plan.name}</h3>
                <Badge tone="gold">Labelled placement</Badge>
              </div>
              <p className="plan-card__price">
                {plan.interval === "quote" ? (
                  "Custom quote"
                ) : (
                  <>
                    {money(plan.priceCents, plan.currency)}
                    <span>/month {plan.unitLabel}</span>
                  </>
                )}
              </p>
              <p className="plan-card__desc">{plan.description}</p>
              <ul style={{ display: "grid", gap: 10, marginTop: 18 }}>
                {parseList(plan.features).map((feature) => (
                  <li key={feature} style={{ display: "flex", gap: 10, fontSize: 15, lineHeight: 1.55 }}>
                    <Check size={16} />
                    <span style={{ color: "var(--text-secondary)" }}>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="ink" labelledBy="indep-h2">
        <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          <div>
            <h2 id="indep-h2" className="h2" style={{ marginBottom: 16, textWrap: "balance" }}>
              Advertising does not buy editorial rankings
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(232,237,245,0.72)", marginBottom: 18 }}>
              There is no price at which a ranked position is for sale. Sponsors do not see a ranking
              before it publishes, do not influence the criteria, and cannot have a competitor
              removed.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(232,237,245,0.72)" }}>
              The editorial team is not told which companies are advertisers when a ranking is
              finalized. That separation is the only reason the ranking is worth advertising beside.
            </p>
            <div style={{ marginTop: 20 }}>
              <SponsoredDisclosure />
            </div>
          </div>
          <div>
            <h3 className="related-heading" style={{ color: "rgba(232,237,245,0.6)" }}>
              Eligibility
            </h3>
            <ul style={{ display: "grid", gap: 11 }}>
              {ELIGIBILITY.map((item) => (
                <li key={item} style={{ display: "flex", gap: 11, fontSize: 15.5, lineHeight: 1.6 }}>
                  <Check size={17} color="var(--gold-ink)" />
                  <span style={{ color: "rgba(232,237,245,0.78)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section labelledBy="enq-h2">
        <SectionHead
          id="enq-h2"
          title="Enquire about a placement"
          lead="Tell us the markets and we will come back with what is available."
        />
        <AdvertiseForm />
      </Section>

      <Section tone="page" labelledBy="faq-h2" ruleBottom={false}>
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "0.72fr 1.28fr", gap: 56, alignItems: "start" }}
        >
          <div className="toc">
            <h2 id="faq-h2" className="h2" style={{ marginBottom: 16 }}>
              Common questions
            </h2>
            <ArrowLink href={routes.advertisingDisclosure()}>Full advertising disclosure</ArrowLink>
          </div>
          <FaqList faqs={BILLING_FAQS} />
        </div>
      </Section>

      <FinalSearch title="See what homeowners see" lead="Search the way your customers do." />
    </SiteChrome>
  );
}
