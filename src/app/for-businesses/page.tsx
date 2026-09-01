import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar, FinalSearch, LinkGrid } from "@/components/site/blocks";
import { FaqJsonLd, FaqList } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { BadgeDisclosure, SponsoredDisclosure } from "@/components/site/disclosures";
import { Check, Icon } from "@/components/ui/Icon";
import { ArrowLink, Badge, JsonLd, Section, SectionHead } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import { parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { absoluteUrl, routes } from "@/lib/urls";
import { BILLING_FAQS, BusinessCentreNav, EDITORIAL_FIELDS, OWNER_FIELDS } from "@/components/site/business-centre";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "For businesses — claim, add or advertise",
  description:
    "Claim your listing or add a business for $29 a month per location. Top 10 featured placement is $199 a month per city and trade. None of it buys a ranking position.",
  alternates: { canonical: "/for-businesses/" },
};

const STEPS = [
  { title: "Find your business", body: "Search the directory. If we have you, claim the existing listing rather than creating a duplicate." },
  { title: "Prove you own it", body: "Domain email, a phone callback, a token on your website, or a registration document." },
  { title: "Choose a plan", body: "$29 a month per location. Charged at submission for a claim, refunded if ownership cannot be verified." },
  { title: "Manage your details", body: "Hours, services, coverage and contact details update immediately. Anything editorial goes to review." },
];

export default async function ForBusinessesPage() {
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });

  return (
    <SiteChrome active="business">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "For businesses",
          url: absoluteUrl(routes.forBusinesses()),
        }}
      />
      <FaqJsonLd faqs={BILLING_FAQS} />

      <CrumbBar items={[{ label: "Home", href: "/" }, { label: "For businesses" }]} />
      <BusinessCentreNav active="landing" />

      <section aria-labelledby="hero-h1" className="index-hero">
        <div className="shell" style={{ padding: "52px var(--gutter) 44px" }}>
          <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(32px, 3.8vw, 46px)" }}>
            Get in front of homeowners who are already comparing
          </h1>
          <p className="hero__lead" style={{ maxWidth: 660 }}>
            Claim your listing, add a business we have not covered yet, or buy a labelled featured
            placement. What none of it does is move you into the ranked ten. That stays editorial.
          </p>
          <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={routes.claim()} className="btn btn--primary">
              Claim your business
            </Link>
            <Link href={routes.addBusiness()} className="btn btn--secondary">
              Add a business
            </Link>
            <Link href={routes.advertise()} className="btn btn--ghost">
              Advertising
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- paths */}
      <Section ruleTop labelledBy="paths-h2">
        <SectionHead
          id="paths-h2"
          title="Three ways in"
          lead="Pick the one that matches where you are."
        />
        <div className="card-grid">
          {[
            {
              icon: "key" as const,
              title: "Claim & Manage",
              price: 2900,
              unit: "per location, per month",
              body: "Your business is already in the directory. Verify ownership and keep its details current.",
              href: routes.claim(),
              cta: "Claim your listing",
            },
            {
              icon: "plus" as const,
              title: "Directory Listing",
              price: 2900,
              unit: "per published location, per month",
              body: "We have not covered you yet. Submit for editorial review; nothing is charged until it publishes.",
              href: routes.addBusiness(),
              cta: "Add your business",
            },
            {
              icon: "megaphone" as const,
              title: "Top 10 Listing",
              price: 19900,
              unit: "per city and trade, per month",
              body: "A labelled featured placement beside the ranking people are reading. Never a ranked position.",
              href: routes.advertise(),
              cta: "See placements",
            },
          ].map((path) => (
            <article key={path.title} className="card card--lift path-card">
              <span className="path-card__icon" aria-hidden="true">
                <Icon name={path.icon} size={24} strokeWidth={1.8} />
              </span>
              <h3>{path.title}</h3>
              <p className="path-card__price">
                {money(path.price)}
                <span>{path.unit}</span>
              </p>
              <p>{path.body}</p>
              <Link href={path.href} className="btn btn--secondary btn--sm btn--block" style={{ marginTop: 18 }}>
                {path.cta}
              </Link>
            </article>
          ))}
        </div>
      </Section>

      {/* -------------------------------------------------------- separation */}
      <Section tone="page" labelledBy="control-h2">
        <SectionHead
          id="control-h2"
          title="What you control, and what stays editorial"
          lead="This split is the whole basis of the product, so it is worth being blunt about."
        />
        <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div className="card" style={{ padding: "26px 28px" }}>
            <h3 className="related-heading">You control</h3>
            <ul style={{ display: "grid", gap: 11 }}>
              {OWNER_FIELDS.map((field) => (
                <li key={field} style={{ display: "flex", gap: 11, fontSize: 15.5, lineHeight: 1.6 }}>
                  <Check size={17} />
                  <span style={{ color: "var(--text-secondary)" }}>{field}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card control-card--ink">
            <h3 className="related-heading" style={{ color: "rgba(232,237,245,0.6)" }}>
              Managed by TenBestFind editorial
            </h3>
            <ul style={{ display: "grid", gap: 11 }}>
              {EDITORIAL_FIELDS.map((field) => (
                <li key={field} style={{ display: "flex", gap: 11, fontSize: 15.5, lineHeight: 1.6 }}>
                  <Icon name="lock" size={17} color="var(--gold-ink)" />
                  <span style={{ color: "rgba(232,237,245,0.78)" }}>{field}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------ pricing */}
      <Section labelledBy="pricing-h2">
        <SectionHead
          id="pricing-h2"
          title="Plans and pricing"
          lead="Monthly, per location, cancel any time. No setup fees and no contracts."
        />
        <div className="card-grid card-grid--2">
          {plans.map((plan) => (
            <article key={plan.id} className="card plan-card">
              <div className="plan-card__head">
                <h3>{plan.name}</h3>
                {plan.editorial ? <Badge tone="gold">Labelled placement</Badge> : null}
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
              <Link
                href={plan.key === "claim" ? routes.claim() : plan.key === "listing" ? routes.addBusiness() : routes.advertise()}
                className="btn btn--primary btn--sm btn--block"
                style={{ marginTop: 22 }}
              >
                {plan.interval === "quote" ? "Request a quote" : "Get started"}
              </Link>
            </article>
          ))}
        </div>
        <p className="sponsor-note" style={{ marginTop: 24, maxWidth: "none" }}>
          <span className="sponsor-note__tag">Important</span>
          A subscription buys profile management and listing maintenance. It never buys a ranking
          position, and the editorial team is not told which companies subscribe.
          <SponsoredDisclosure />
        </p>
      </Section>

      {/* ------------------------------------------------------------- steps */}
      <Section tone="page" labelledBy="how-h2">
        <SectionHead id="how-h2" title="How claiming works" />
        <ol className="numbered-steps" style={{ marginTop: 0 }}>
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="numbered-steps__num" aria-hidden="true">
                {index + 1}
              </span>
              <span>
                <strong>{step.title}</strong>
                <span>{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <div style={{ marginTop: 24 }}>
          <BadgeDisclosure />
        </div>
      </Section>

      <Section labelledBy="faq-h2">
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

      <Section tone="page" labelledBy="trust-h2" ruleBottom={false}>
        <SectionHead id="trust-h2" title="Before you sign up" />
        <LinkGrid
          columns={3}
          items={[
            { label: "How we rank", href: routes.howWeRank(), meta: "The criteria behind every list." },
            {
              label: "Advertising disclosure",
              href: routes.advertisingDisclosure(),
              meta: "What sponsorship buys, and what it never buys.",
            },
            { label: "Terms of use", href: "/terms/", meta: "Subscription terms and cancellation." },
          ]}
        />
      </Section>

      <FinalSearch title="See what homeowners see" lead="Search the way your customers do." />
    </SiteChrome>
  );
}
