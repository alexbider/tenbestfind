import type { Metadata } from "next";
import Link from "next/link";
import { AdvertiseForm } from "@/components/site/AdvertiseForm";
import { BILLING_FAQS, BusinessCentreNav } from "@/components/site/business-centre";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { InfoModal } from "@/components/site/InfoModal";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Crumbs, Eyebrow, FaqItem, GRID_BACKDROP, SHELL, TenOutline, initials } from "@/components/site/page-parts";
import { Icon, type IconName } from "@/components/ui/Icon";
import { money } from "@/lib/format";
import { parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Advertising",
  description:
    "Labelled featured placements beside the rankings people are reading. Advertising does not buy editorial rankings.",
  alternates: { canonical: "/advertise/" },
};

const SECTION = { ...SHELL, padding: "56px 24px" };
const SECTION_H2 = { fontSize: "clamp(24px, 2.8vw, 34px)", fontWeight: "700" };

const PRODUCTS: { title: string; text: string; placement: string; eligibility: string; icon: IconName }[] = [
  {
    title: "Featured partner",
    text: "Labelled partner visibility in eligible areas of TenBestFind, always marked as a commercial relationship.",
    placement: "Beside the editorial company list on eligible pages",
    eligibility: "Any verified business in a category we cover",
    icon: "megaphone",
  },
  {
    title: "Top ten featured placement",
    text: "A labelled slot beneath the ranked ten for one city and trade. The ten positions themselves stay editorial.",
    placement: "Below the ranked list on one city and trade page",
    eligibility: "A business genuinely serving that market",
    icon: "award",
  },
  {
    title: "Category placement",
    text: "A labelled presence beside the service being compared, in the markets you actually cover.",
    placement: "Category and city hub pages",
    eligibility: "Coverage of the category and the market",
    icon: "layers",
  },
  {
    title: "Multi-market campaign",
    text: "Several cities or trades at once, quoted against available inventory rather than a rate card.",
    placement: "Across the markets agreed in the campaign",
    eligibility: "Verified coverage in each market",
    icon: "map",
  },
];

const EXAMPLES = [
  {
    label: "Featured partner",
    context: "City hub",
    text: "Appears in the featured slot beneath the editorial company list, with the partner label attached.",
  },
  {
    label: "Sponsored",
    context: "Top ten ranking",
    text: "Sits below the ten ranked positions, separated by a rule and carrying its own disclosure.",
  },
  {
    label: "Sponsored",
    context: "Search results",
    text: "Shown among results with a label and a link explaining why it is there.",
  },
];

const BADGES: { label: string; text: string; tone: "amber" | "blue" | "green" | "plain" }[] = [
  { label: "Top 10 Winner", text: "Editorial ranking status. Earned through research, never purchased.", tone: "amber" },
  { label: "TenBestFind Reviewed", text: "Editorial research status. Our team researched and reviewed this business.", tone: "blue" },
  { label: "Verified Business", text: "Verification status. Key information was confirmed against a primary source.", tone: "green" },
  { label: "Featured Partner", text: "Commercial relationship only. It carries no editorial weight.", tone: "plain" },
];

const TONE = {
  amber: { bg: "var(--amber-50)", border: "#EBCE95", color: "#8A5F0B" },
  blue: { bg: "var(--blue-50)", border: "var(--blue-100)", color: "var(--blue-800)" },
  green: { bg: "var(--green-50)", border: "var(--green-100)", color: "#178054" },
  plain: { bg: "var(--surface-page)", border: "var(--border-strong)", color: "var(--text-secondary)" },
};

const ELIGIBILITY = [
  "A legitimate, actively trading business",
  "A service category we cover",
  "Genuine coverage in the markets you want to appear in",
  "Current liability insurance appropriate to the trade",
  "Licensing or registration where the jurisdiction requires it",
  "No unresolved pattern of serious complaints in public records",
  "Willingness to have the placement labelled clearly as sponsored",
];

export default async function AdvertisePage() {
  const plans = await db.plan.findMany({
    where: { active: true, editorial: false },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <SiteChrome active="business">
      <FaqJsonLd faqs={BILLING_FAQS} />

      {/* ------------------------------------------------------------- hero */}
      <section style={{ ...GRID_BACKDROP, borderBottom: "1px solid var(--border-subtle)" }}>
        <TenOutline style={{ right: "-30px", top: "-40px" }} />
        <div style={{ ...SHELL, padding: "20px 24px 44px" }}>
          <Crumbs
            items={[
              { label: "Home", href: "/" },
              { label: "For businesses", href: routes.forBusinesses() },
              { label: "Advertising" },
            ]}
          />
          <div style={{ maxWidth: "760px" }}>
            <Eyebrow heroIn="1" gap="14px">
              Advertising
            </Eyebrow>
            <h1
              data-hero-in="2"
              style={{ fontSize: "clamp(30px, 3.8vw, 44px)", lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "800", textWrap: "balance" }}
            >
              Labelled placements beside the research people are reading
            </h1>
            <p data-hero-in="3" style={{ marginTop: "18px", fontSize: "18px", lineHeight: "1.75", color: "var(--text-secondary)", textWrap: "pretty" }}>
              Paid visibility on TenBestFind is sold separately from editorial research, labelled
              everywhere it appears, and never mixed into a ranked list.
            </p>
          </div>
          {plans.length > 0 ? (
            <ul style={{ marginTop: "28px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {plans.map((plan) => (
                <li
                  key={plan.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "baseline",
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "999px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <strong style={{ fontSize: "16px", fontWeight: "700", color: "var(--blue-900)" }}>{plan.name}</strong>
                  {money(plan.priceCents, plan.currency)} {plan.unitLabel}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <BusinessCentreNav active="advertise" />

      {/* --------------------------------------------------------- products */}
      <section aria-labelledby="pr-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <h2 id="pr-h2" style={{ ...SECTION_H2, marginBottom: "24px" }}>
            Advertising products
          </h2>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {PRODUCTS.map((product) => (
              <li
                key={product.title}
                data-card=""
                style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", boxShadow: "var(--shadow-sm)", padding: "24px", display: "flex", flexDirection: "column", gap: "10px" }}
              >
                <span
                  aria-hidden="true"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", borderRadius: "12px", background: "var(--amber-50)", color: "#8A5F0B" }}
                >
                  <Icon name={product.icon} size={21} strokeWidth={1.8} />
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "700" }}>{product.title}</h3>
                <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--text-secondary)" }}>{product.text}</p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--blue-900)" }}>Appears:</strong> {product.placement}
                </p>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--blue-900)" }}>Eligibility:</strong> {product.eligibility}
                </p>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: "18px", fontSize: "15px", color: "var(--text-secondary)" }}>
            Pricing is quoted per market and category against available inventory.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------- examples */}
      <section aria-labelledby="ex-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={SECTION}>
          <h2 id="ex-h2" style={{ ...SECTION_H2, marginBottom: "8px" }}>
            What a sponsored placement looks like
          </h2>
          <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)", maxWidth: "720px", marginBottom: "24px" }}>
            Every example below carries its label in the live product. We never show an unlabelled
            placement.
          </p>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            {EXAMPLES.map((example) => (
              <li key={example.context} style={{ background: "var(--surface-card)", border: "1px solid #EBCE95", borderRadius: "18px", overflow: "hidden" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    padding: "12px 18px",
                    background: "var(--amber-50)",
                    borderBottom: "1px solid #EBCE95",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "#8A5F0B" }}>
                    {example.label}
                  </span>
                  <span style={{ fontSize: "12px", color: "#6E4B08" }}>{example.context}</span>
                </div>
                <div style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "40px",
                        height: "40px",
                        borderRadius: "11px",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "var(--blue-900)",
                      }}
                    >
                      {initials("Your Company")}
                    </span>
                    <span>
                      <span style={{ display: "block", fontSize: "16px", fontWeight: "700", color: "var(--blue-900)" }}>Your company</span>
                      <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>Your trade · your market</span>
                    </span>
                  </div>
                  <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{example.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            {BADGES.map((badge) => (
              <li key={badge.label} style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "20px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "5px 11px",
                    borderRadius: "999px",
                    background: TONE[badge.tone].bg,
                    border: `1px solid ${TONE[badge.tone].border}`,
                    fontSize: "12px",
                    fontWeight: "700",
                    color: TONE[badge.tone].color,
                    marginBottom: "12px",
                  }}
                >
                  {badge.label}
                </span>
                <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{badge.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------- independence */}
      <section aria-labelledby="ind-h2" style={{ background: "var(--blue-900)", color: "var(--text-on-ink)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "40px", alignItems: "center" }}>
          <div>
            <h2 id="ind-h2" style={{ ...SECTION_H2, lineHeight: "1.2", color: "#fff", marginBottom: "14px" }}>
              Advertising does not buy editorial rankings
            </h2>
            <p style={{ fontSize: "17px", lineHeight: "1.75", color: "rgba(232,237,245,0.82)" }}>
              We separate paid visibility from ranking decisions. A sponsor may receive clearly
              labelled exposure, but payment alone never grants inclusion or a position in a
              TenBestFind top ten, and never changes a best-for designation.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link
              href={routes.howWeRank()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "48px",
                padding: "0 22px",
                borderRadius: "14px",
                background: "#fff",
                color: "var(--blue-900)",
                fontSize: "15px",
                fontWeight: "600",
              }}
            >
              Read how we rank
            </Link>
            <InfoModal
              label="Editorial independence"
              title="Editorial independence"
              points={[
                "Editorial positions are never sold, and payment cannot change one",
                "Sponsorship is sold by a separate team and always labelled",
                "An editor is named on every ranking and is accountable for it",
                "Ending a placement never changes an editorial decision",
              ]}
              link={{ href: routes.advertisingDisclosure(), label: "Advertising disclosure" }}
            >
              Paid visibility and editorial research never touch.
            </InfoModal>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- enquiry */}
      <section aria-labelledby="inq-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div data-split="" style={{ ...SECTION, display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: "40px", alignItems: "start" }}>
          <div>
            <h2 id="inq-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", lineHeight: "1.2", fontWeight: "700", marginBottom: "14px" }}>
              Who can advertise?
            </h2>
            <ul style={{ display: "grid", gap: "10px" }}>
              {ELIGIBILITY.map((item) => (
                <li key={item} style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.65", color: "var(--text-primary)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: "14px", fontSize: "14px", color: "var(--text-secondary)" }}>
              We do not accept every advertiser, and some categories are restricted.
            </p>
          </div>
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", boxShadow: "var(--shadow-sm)", padding: "26px" }}>
            <AdvertiseForm />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- faqs */}
      <section aria-labelledby="faq-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div data-split="" style={{ ...SHELL, padding: "64px 24px", display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "48px", alignItems: "start" }}>
          <h2 id="faq-h2" style={{ fontSize: "clamp(24px, 2.8vw, 34px)", lineHeight: "1.2", fontWeight: "700" }}>
            Advertising questions
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
