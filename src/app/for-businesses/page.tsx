import type { Metadata } from "next";
import Link from "next/link";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { InfoModal } from "@/components/site/InfoModal";
import { SiteChrome } from "@/components/site/SiteChrome";
import {
  Crumbs,
  Eyebrow,
  FaqItem,
  GRID_BACKDROP,
  SHELL,
  TenOutline,
} from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { JsonLd } from "@/components/ui/primitives";
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

const SECTION = { ...SHELL, padding: "60px 24px" };
const SECTION_H2 = { fontSize: "clamp(24px, 2.8vw, 34px)", fontWeight: "700" };
const CARD = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "18px",
  boxShadow: "var(--shadow-xs)",
  padding: "24px 22px",
};
const TILE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  background: "var(--blue-50)",
  color: "var(--color-primary)",
};
const BTN = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "48px",
  padding: "0 20px",
  borderRadius: "14px",
  fontSize: "15px",
  fontWeight: "600",
};

const PATHS: { title: string; price: string; priceNote: string; text: string; cta: string; href: string; icon: IconName; primary: boolean }[] = [
  {
    title: "Claim your business",
    price: "$29",
    priceNote: "/month per location",
    text: "Verify ownership and keep the factual parts of your profile right: hours, services, coverage and contact details.",
    cta: "Claim your profile",
    href: routes.claim(),
    icon: "store",
    primary: true,
  },
  {
    title: "Add a business",
    price: "$29",
    priceNote: "/month per location",
    text: "Submit a company we have not covered yet. Submission does not guarantee publication or a ranking position.",
    cta: "Submit a business",
    href: routes.addBusiness(),
    icon: "plus",
    primary: false,
  },
  {
    title: "Advertise with us",
    price: "Quoted",
    priceNote: "per market and category",
    text: "Clearly labelled placements, sold separately from editorial research and never mixed into a ranked list.",
    cta: "View advertising options",
    href: routes.advertise(),
    icon: "megaphone",
    primary: false,
  },
];

const TRUST: { label: string; icon: IconName; color: string }[] = [
  { label: "Editorial rankings stay independent", icon: "shield", color: "#178054" },
  { label: "Every paid placement is labelled", icon: "megaphone", color: "var(--color-primary)" },
  { label: "You control the factual fields", icon: "pencil", color: "var(--color-primary)" },
  { label: "Cancel any time", icon: "refresh", color: "var(--color-primary)" },
];

const CLAIM_STEPS: { n: string; title: string; text: string; icon: IconName }[] = [
  { n: "01", title: "Find your profile", text: "Search TenBestFind for your company by name, city or website.", icon: "search" },
  { n: "02", title: "Prove you own it", text: "A code to an address on your company domain, a phone callback, or a registration document.", icon: "shield" },
  { n: "03", title: "Choose a plan", text: "Charged at submission, and refunded if ownership cannot be verified.", icon: "card" },
  { n: "04", title: "Manage your details", text: "Factual fields update immediately. Anything editorial goes to review first.", icon: "pencil" },
];

const PRODUCTS_SHORT: { title: string; text: string; icon: IconName }[] = [
  { title: "Featured partner", text: "Labelled visibility in eligible areas of the site.", icon: "megaphone" },
  { title: "Top 10 featured placement", text: "A labelled slot beneath the editorial list for a city and trade.", icon: "award" },
  { title: "Category sponsorship", text: "A labelled presence across a trade you actually serve.", icon: "layers" },
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

      {/* ------------------------------------------------------------- hero */}
      <section style={{ ...GRID_BACKDROP, borderBottom: "1px solid var(--border-subtle)" }}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 44px" }}>
          <Crumbs items={[{ label: "Home", href: "/" }, { label: "For businesses" }]} />
          <div style={{ maxWidth: "760px" }}>
            <Eyebrow heroIn="1" gap="14px">
              For business owners
            </Eyebrow>
            <h1
              data-hero-in="2"
              style={{ fontSize: "clamp(32px, 4.2vw, 48px)", lineHeight: "1.08", letterSpacing: "-0.04em", fontWeight: "800", textWrap: "balance" }}
            >
              Homeowners are already comparing you. Get the facts right.
            </h1>
            <p data-hero-in="3" style={{ marginTop: "18px", fontSize: "18px", lineHeight: "1.75", color: "var(--text-secondary)", textWrap: "pretty" }}>
              Claim and update your business profile, submit a company that is missing, or explore
              clearly labelled advertising. Editorial rankings stay independent of every commercial
              option here.
            </p>
          </div>

          <ul style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "16px" }}>
            {PATHS.map((path) => (
              <li
                key={path.title}
                data-card=""
                style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", boxShadow: "var(--shadow-sm)", padding: "26px", display: "flex", flexDirection: "column", gap: "12px" }}
              >
                <span aria-hidden="true" style={{ ...TILE, width: "46px", height: "46px", borderRadius: "13px" }}>
                  <Icon name={path.icon} size={22} strokeWidth={1.8} />
                </span>
                <h2 style={{ fontSize: "20px", fontWeight: "700" }}>{path.title}</h2>
                <p style={{ display: "flex", alignItems: "baseline", gap: "7px" }}>
                  <span style={{ fontSize: "26px", fontWeight: "700", color: "var(--blue-900)", letterSpacing: "var(--ls-tight)" }}>{path.price}</span>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>{path.priceNote}</span>
                </p>
                <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{path.text}</p>
                <Link
                  href={path.href}
                  style={{
                    ...BTN,
                    marginTop: "auto",
                    border: `1.5px solid ${path.primary ? "var(--color-primary)" : "var(--border-strong)"}`,
                    background: path.primary ? "var(--color-primary)" : "var(--surface-card)",
                    color: path.primary ? "#fff" : "var(--blue-900)",
                  }}
                >
                  {path.cta}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <div style={{ ...SHELL, padding: "0 24px" }}>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0" }}>
              {TRUST.map((item) => (
                <li key={item.label} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "18px 22px 18px 0" }}>
                  <span aria-hidden="true" style={{ flexShrink: 0, display: "inline-flex", color: item.color }}>
                    <Icon name={item.icon} size={20} strokeWidth={1.8} />
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--blue-900)" }}>{item.label}</span>
                </li>
              ))}
            </ul>
            <div style={{ paddingBottom: "12px" }}>
              <InfoModal
                label="How editorial independence works"
                title="How editorial independence works"
                points={[
                  "Editorial positions are never sold, and payment cannot change one",
                  "Sponsorship is sold separately and always labelled",
                  "Claiming a profile does not affect a ranking position",
                  "Ending a subscription never changes an editorial decision",
                ]}
                link={{ href: routes.howWeRank(), label: "How we rank" }}
              >
                Everything commercial on this page is separate from what an editor decides.
              </InfoModal>
            </div>
          </div>
        </div>
      </section>

      <BusinessCentreNav active="landing" />

      {/* ------------------------------------------------------- claim flow */}
      <section aria-labelledby="hc-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <h2 id="hc-h2" style={{ ...SECTION_H2, marginBottom: "24px" }}>
            How claiming works
          </h2>
          <ol style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px" }}>
            {CLAIM_STEPS.map((step) => (
              <li key={step.n} style={CARD}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
                  <span aria-hidden="true" style={{ ...TILE, width: "42px", height: "42px" }}>
                    <Icon name={step.icon} size={20} strokeWidth={1.8} />
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#8A5F0B" }}>{step.n}</span>
                </span>
                <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "6px" }}>{step.title}</h3>
                <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ plans */}
      {plans.length > 0 ? (
        <section aria-labelledby="pl-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={SECTION}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "8px" }}>
              <h2 id="pl-h2" style={SECTION_H2}>
                Plans and pricing
              </h2>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 14px",
                  borderRadius: "999px",
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--text-secondary)",
                }}
              >
                <Icon name="refresh" size={15} color="var(--color-primary)" strokeWidth={2} />
                Billed monthly · Cancel any time
              </span>
            </div>
            <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)", maxWidth: "720px", marginBottom: "26px" }}>
              Claiming a profile and adding a new business cost the same per location. A featured
              placement adds labelled visibility on the top ten page for your city and trade; the ten
              ranked positions themselves stay editorial.
            </p>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {plans.map((plan) => {
                const features = parseList(plan.features);
                const featured = !plan.editorial;
                return (
                  <li
                    key={plan.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      background: "var(--surface-card)",
                      border: `1px solid ${featured ? "#EBCE95" : "var(--border-subtle)"}`,
                      borderRadius: "20px",
                      boxShadow: "var(--shadow-sm)",
                      padding: "26px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "12px" }}>
                      <h3 style={{ fontSize: "18px", fontWeight: "700" }}>{plan.name}</h3>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "5px 11px",
                          borderRadius: "999px",
                          background: featured ? "var(--amber-50)" : "var(--blue-50)",
                          border: `1px solid ${featured ? "#EBCE95" : "var(--blue-100)"}`,
                          fontSize: "12px",
                          fontWeight: "700",
                          color: featured ? "#8A5F0B" : "var(--blue-800)",
                        }}
                      >
                        {featured ? "Advertising" : "Standard"}
                      </span>
                    </div>
                    <p style={{ display: "flex", alignItems: "baseline", gap: "7px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "34px", fontWeight: "700", color: "var(--blue-900)", letterSpacing: "var(--ls-tighter)" }}>
                        {money(plan.priceCents, plan.currency)}
                      </span>
                      <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-secondary)" }}>/month</span>
                    </p>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "18px" }}>{plan.unitLabel}</p>
                    {features.length > 0 ? (
                      <ul style={{ display: "grid", gap: "10px", marginBottom: "22px" }}>
                        {features.map((feature) => (
                          <li key={feature} style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.6", color: "var(--text-primary)" }}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <Link
                      href={featured ? routes.advertise() : routes.claim()}
                      style={{
                        ...BTN,
                        marginTop: "auto",
                        border: `1.5px solid ${featured ? "var(--border-strong)" : "var(--color-primary)"}`,
                        background: featured ? "var(--surface-card)" : "var(--color-primary)",
                        color: featured ? "var(--blue-900)" : "#fff",
                      }}
                    >
                      {featured ? "Talk to us" : "Get started"}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div
              style={{
                marginTop: "18px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                flexWrap: "wrap",
                padding: "14px 18px",
                background: "var(--surface-card)",
                border: "1px solid var(--blue-100)",
                borderRadius: "14px",
              }}
            >
              <Icon name="shield" size={20} color="var(--color-primary)" strokeWidth={1.9} />
              <p style={{ flex: "1", minWidth: "260px", fontSize: "15px", lineHeight: "1.6", color: "var(--blue-900)", fontWeight: "600" }}>
                No subscription creates, improves or protects one of the ten editorial positions.
                Featured placements are always labelled as paid.
              </p>
              <InfoModal
                label="How billing works"
                title="How billing works"
                points={[
                  "Charged monthly per location, cancel any time",
                  "A claim is charged at submission and refunded if ownership cannot be verified",
                  "Cancelling removes the subscription, never an editorial decision",
                  "Receipts and invoices are in your dashboard",
                ]}
                link={{ href: routes.contact(), label: "Ask a billing question" }}
              >
                What you are paying for, and what money cannot buy here.
              </InfoModal>
            </div>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------- who controls */}
      <section aria-labelledby="own-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "26px" }}>
            <h2 id="own-h2" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>
              <Icon name="pencil" size={20} color="var(--color-primary)" strokeWidth={1.9} />
              You control this information
            </h2>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "9px 20px" }}>
              {OWNER_FIELDS.map((field) => (
                <li key={field} style={{ display: "flex", gap: "9px", fontSize: "15px", color: "var(--text-primary)" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {field}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: "var(--blue-900)", borderRadius: "20px", padding: "26px" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "16px" }}>
              <Icon name="shield" size={20} color="#E8B551" strokeWidth={1.9} />
              Managed by TenBestFind editorial
            </h2>
            <ul style={{ display: "grid", gap: "10px" }}>
              {EDITORIAL_FIELDS.map((field) => (
                <li key={field} style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.6", color: "rgba(232,237,245,0.88)" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E8B551" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {field}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- advertise */}
      <section aria-labelledby="ad-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
            <h2 id="ad-h2" style={SECTION_H2}>
              Advertising opportunities
            </h2>
            <Link href={routes.advertise()} style={{ fontSize: "15px", fontWeight: "600" }}>
              View advertising options →
            </Link>
          </div>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
            {PRODUCTS_SHORT.map((product) => (
              <li key={product.title} style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "22px" }}>
                <span
                  aria-hidden="true"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "42px", height: "42px", borderRadius: "12px", background: "var(--amber-50)", color: "#8A5F0B", marginBottom: "12px" }}
                >
                  <Icon name={product.icon} size={20} strokeWidth={1.8} />
                </span>
                <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "6px" }}>{product.title}</h3>
                <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{product.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------- faqs */}
      <section aria-labelledby="faq-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div data-split="" style={{ ...SHELL, padding: "64px 24px", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "48px", alignItems: "start" }}>
          <h2 id="faq-h2" style={{ fontSize: "clamp(24px, 2.8vw, 34px)", lineHeight: "1.2", fontWeight: "700" }}>
            Questions from business owners
          </h2>
          <ul style={{ display: "grid", gap: "12px" }}>
            {BILLING_FAQS.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </ul>
        </div>
      </section>
    </SiteChrome>
  );
}
