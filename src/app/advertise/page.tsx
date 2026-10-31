import type { Metadata } from "next";
import { withSocial } from "@/lib/static-meta";
import Link from "next/link";
import { AdvertiseForm } from "@/components/site/AdvertiseForm";
import { BILLING_FAQS } from "@/components/site/business-centre";
import { CentreFaq, CentreHero, Eyebrow, SHELL_1240, Serif } from "@/components/site/centre/parts";
import { FaqJsonLd } from "@/components/site/FaqSection";
import { SiteChrome } from "@/components/site/SiteChrome";
import { money } from "@/lib/format";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const revalidate = 60;

export const metadata: Metadata = withSocial({
  title: "Advertising",
  description:
    "Labelled featured placements beside the rankings people are reading. Advertising does not buy editorial rankings.",
  alternates: { canonical: "/advertise/" },
});

const PRODUCTS = [
  {
    title: "Featured partner",
    text: "Labelled partner visibility in eligible areas of TenBestFind, always marked as a commercial relationship.",
    appears: "Beside the editorial company list on eligible pages",
    eligibility: "Any verified business in a category we cover",
  },
  {
    title: "Top ten featured placement",
    text: "A labelled slot beneath the ranked ten for one city and trade. The ten positions themselves stay editorial.",
    appears: "Below the ranked list on one city and trade page",
    eligibility: "A business genuinely serving that market",
  },
  {
    title: "Category placement",
    text: "A labelled presence beside the service being compared, in the markets you actually cover.",
    appears: "Category and city hub pages",
    eligibility: "Coverage of the category and the market",
  },
  {
    title: "Multi-market campaign",
    text: "Several cities or trades at once, quoted against available inventory rather than a rate card.",
    appears: "Across the markets agreed in the campaign",
    eligibility: "Verified coverage in each market",
  },
];

const BADGES = [
  { name: "Top 10 Winner", kind: "Editorial ranking status", text: "Earned through research, never purchased.", bg: "#101F3D", fg: "#E7B863", kindColor: "#2D74D7" },
  { name: "TenBestFind Reviewed", kind: "Editorial research status", text: "Our team researched and reviewed this business.", bg: "#EAF2FC", fg: "#101F3D", kindColor: "#2D74D7" },
  { name: "Verified Business", kind: "Verification status", text: "Key information was confirmed against a primary source.", bg: "#E7F6EE", fg: "#14653F", kindColor: "#2D74D7" },
  { name: "Featured Partner", kind: "Commercial relationship", text: "Commercial relationship only. It carries no editorial weight.", bg: "#FBF4E6", fg: "#8A5F0B", kindColor: "#8A5F0B" },
];

const RULES = [
  "Editorial positions are never sold, and payment cannot change one",
  "Sponsorship is sold by a separate team and always labelled",
  "An editor is named on every ranking and is accountable for it",
  "Ending a placement never changes an editorial decision",
];

const ELIGIBILITY = [
  "A legitimate, actively trading business",
  "A service category we cover",
  "Genuine coverage in the markets you want to appear in",
  "Current liability insurance appropriate to the trade",
  "Licensing or registration where the jurisdiction requires it",
  "No unresolved pattern of serious complaints in public records",
  "Willingness to have the placement labelled clearly as sponsored",
];

/** The price strip's three plans, in this order, with the strip's own labels. */
const STRIP = [
  { key: "claim", label: "Claim & Manage" },
  { key: "listing", label: "Directory Listing" },
  { key: "top10", label: "Top 10 featured placement" },
];

const H2 = { fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: "1.1" } as const;

/** A sponsored card as it appears in the product. */
function SponsoredCard({ tag, why = false }: { tag: string; why?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr)", gap: "12px", alignItems: "center", padding: "12px", borderRadius: "12px", border: "1.5px solid #EBCE95", background: "var(--gold-soft)" }}>
      <span aria-hidden="true" style={{ width: "40px", height: "40px", borderRadius: "11px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--ink)", color: "var(--gold-ink)", fontSize: "13px", fontWeight: "800" }}>
        YC
      </span>
      <span style={{ display: "grid", gap: "2px", minWidth: "0" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>
          Your company
          <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 7px", borderRadius: "6px", background: "var(--ink)", color: "var(--gold-ink)" }}>{tag}</span>
        </span>
        <span style={{ fontSize: "13px", color: "#5B4310" }}>
          Your trade · your market
          {why ? (
            <>
              {" · "}
              <u>Why am I seeing this?</u>
            </>
          ) : null}
        </span>
      </span>
    </div>
  );
}

const ghostRow = { height: "40px", borderRadius: "10px", background: "var(--paper)", border: "1px solid var(--border-subtle)" } as const;
const previewCard = {
  padding: "18px",
  borderRadius: "20px",
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  boxShadow: "var(--shadow-sm)",
  display: "grid",
  gap: "8px",
} as const;
const previewLabel = { fontSize: "11px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", padding: "2px 4px 6px" } as const;

export default async function AdvertisePage() {
  const plans = await db.plan.findMany({ where: { active: true, key: { in: STRIP.map((item) => item.key) } } });
  const strip = STRIP.map((item) => ({ ...item, plan: plans.find((plan) => plan.key === item.key) })).filter((item) => item.plan);

  return (
    <SiteChrome active="business" skin>
      <FaqJsonLd faqs={BILLING_FAQS} />
      <div className="bc2">
        {/* ------------------------------------------------------------ hero */}
        <CentreHero crumb="Advertising" active="advertise" padBottom="64px" blob="rgba(45,116,215,0.16)" blobSize="640px">
          <div style={{ maxWidth: "900px" }}>
            <Eyebrow>Advertising</Eyebrow>
            <h1 style={{ fontSize: "clamp(38px, 5vw, 62px)", lineHeight: "1.03", letterSpacing: "-0.045em", textWrap: "balance" }}>
              Labelled placements beside the research{" "}
              <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: "400", letterSpacing: "-0.02em" }}>people are reading</span>
            </h1>
            <p style={{ marginTop: "20px", fontSize: "19px", lineHeight: "1.6", color: "var(--text-secondary)", maxWidth: "680px", textWrap: "pretty" }}>
              Paid visibility on TenBestFind is sold separately from editorial research, labelled everywhere it appears, and never mixed into a ranked list.
            </p>
            <div style={{ marginTop: "30px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <a
                data-btnp=""
                href="#quote"
                style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flexShrink: 0, height: "52px", padding: "0 26px", borderRadius: "14px", background: "var(--color-primary)", color: "#fff", fontSize: "16px", fontWeight: "600", boxShadow: "var(--shadow-primary)" }}
              >
                Request a quote
              </a>
              <a
                href="#examples"
                style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flexShrink: 0, height: "52px", padding: "0 24px", borderRadius: "14px", border: "1.5px solid var(--border-strong)", background: "var(--surface-card)", color: "var(--blue-900)", fontSize: "16px", fontWeight: "600" }}
              >
                See how placements look
              </a>
              <a
                href={routes.top10()}
                style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flexShrink: 0, height: "52px", padding: "0 24px", borderRadius: "14px", border: "1.5px solid var(--border-strong)", background: "var(--surface-card)", color: "var(--blue-900)", fontSize: "16px", fontWeight: "600" }}
              >
                Buy a Top 10 placement
              </a>
              <a
                href={routes.guestPost()}
                style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", flexShrink: 0, height: "52px", padding: "0 24px", borderRadius: "14px", border: "1.5px solid var(--border-strong)", background: "var(--surface-card)", color: "var(--blue-900)", fontSize: "16px", fontWeight: "600" }}
              >
                Order a guest post
              </a>
            </div>
          </div>

          {strip.length > 0 ? (
            <ul data-strip="" style={{ marginTop: "48px", display: "grid", border: "1px solid var(--border-subtle)", borderRadius: "18px", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
              {strip.map(({ key, label, plan }) => {
                const gold = key === "top10";
                return (
                  <li key={key} style={{ padding: "22px 24px", background: gold ? "var(--gold-soft)" : undefined }}>
                    <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: gold ? "var(--gold)" : "var(--text-secondary)", marginBottom: "8px" }}>{label}</p>
                    <p style={{ fontSize: "30px", fontWeight: "800", letterSpacing: "-0.04em", color: "var(--ink)" }}>
                      {money(plan!.priceCents, plan!.currency)}
                      <span style={{ fontSize: "14px", fontWeight: "600", letterSpacing: "0", color: gold ? "#5B4310" : "var(--text-secondary)", marginLeft: "6px" }}>
                        {plan!.unitLabel} / mo
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </CentreHero>

        {/* -------------------------------------------------------- products */}
        <section aria-labelledby="prod-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL_1240, padding: "88px 24px" }}>
            <Eyebrow mb="14px">Advertising products</Eyebrow>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "36px" }}>
              <h2 id="prod-h2" style={H2}>
                Four ways to be seen, <Serif>all labelled</Serif>
              </h2>
              <p style={{ fontSize: "15px", color: "var(--text-secondary)", maxWidth: "380px" }}>Pricing is quoted per market and category against available inventory.</p>
            </div>
            <ul data-bc-grid="" data-cols="260" style={{ display: "grid", gap: "16px" }}>
              {PRODUCTS.map((product, index) => (
                <li key={product.title} data-adcard="" style={{ display: "flex", flexDirection: "column", padding: "26px 24px 22px", borderRadius: "20px", border: "1px solid var(--border-subtle)", background: "var(--surface-card)", boxShadow: "var(--shadow-sm)" }}>
                  <span aria-hidden="true" style={{ fontSize: "40px", fontWeight: "800", letterSpacing: "-0.06em", lineHeight: "1", color: "var(--gold-ink)", marginBottom: "18px" }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 style={{ fontSize: "19px", fontWeight: "700", letterSpacing: "-0.02em", marginBottom: "8px" }}>{product.title}</h3>
                  <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "20px" }}>{product.text}</p>
                  <dl style={{ margin: "auto 0 0", display: "grid", gap: "12px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
                    <div>
                      <dt style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: "3px" }}>Appears</dt>
                      <dd style={{ margin: "0", fontSize: "14px", lineHeight: "1.5", color: "var(--ink)" }}>{product.appears}</dd>
                    </div>
                    <div>
                      <dt style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: "3px" }}>Eligibility</dt>
                      <dd style={{ margin: "0", fontSize: "14px", lineHeight: "1.5", color: "var(--ink)" }}>{product.eligibility}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* -------------------------------------------------------- examples */}
        <section id="examples" aria-labelledby="ex-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ ...SHELL_1240, padding: "88px 24px" }}>
            <Eyebrow mb="14px">In the product</Eyebrow>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", marginBottom: "36px" }}>
              <h2 id="ex-h2" style={H2}>
                What a sponsored placement <Serif>looks like</Serif>
              </h2>
              <p style={{ fontSize: "15px", color: "var(--text-secondary)", maxWidth: "420px" }}>Every example carries its label in the live product. We never show an unlabelled placement.</p>
            </div>

            <ul data-bc-grid="" data-cols="320" style={{ display: "grid", gap: "18px", marginBottom: "56px" }}>
              <li style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div aria-hidden="true" style={previewCard}>
                  <p style={previewLabel}>City hub · company list</p>
                  <div style={ghostRow} />
                  <div style={ghostRow} />
                  <SponsoredCard tag="Featured partner" />
                </div>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "4px" }}>Featured partner</h3>
                  <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)" }}>Appears in the featured slot beneath the editorial company list, with the partner label attached.</p>
                </div>
              </li>
              <li style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div aria-hidden="true" style={previewCard}>
                  <p style={previewLabel}>Top ten ranking</p>
                  {["9", "10"].map((rank) => (
                    <div key={rank} style={{ display: "grid", gridTemplateColumns: "30px minmax(0,1fr)", gap: "12px", alignItems: "center", padding: "8px 10px", borderRadius: "10px", background: "var(--paper)" }}>
                      <span style={{ fontSize: "15px", fontWeight: "800", color: "var(--ink)", textAlign: "center" }}>{rank}</span>
                      <span style={{ height: "10px", borderRadius: "99px", background: "var(--border-subtle)" }} />
                    </div>
                  ))}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "6px 0 2px" }}>
                    <span style={{ flex: "1", height: "1px", background: "var(--border-strong)" }} />
                    <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>End of ranked ten</span>
                    <span style={{ flex: "1", height: "1px", background: "var(--border-strong)" }} />
                  </div>
                  <SponsoredCard tag="Sponsored" />
                </div>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "4px" }}>Top ten featured placement</h3>
                  <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)" }}>Sits below the ranked positions, separated by a rule and carrying its own disclosure.</p>
                </div>
              </li>
              <li style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div aria-hidden="true" style={previewCard}>
                  <p style={previewLabel}>Search results</p>
                  <SponsoredCard tag="Sponsored" why />
                  <div style={ghostRow} />
                  <div style={ghostRow} />
                </div>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "4px" }}>Search results</h3>
                  <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)" }}>Shown among results with a label and a link explaining why it is there.</p>
                </div>
              </li>
            </ul>

            <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Every badge, and what it means</h3>
            <ul data-bc-grid="" data-cols="250" style={{ display: "grid", gap: "12px" }}>
              {BADGES.map((badge) => (
                <li key={badge.name} style={{ padding: "20px", borderRadius: "16px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", display: "grid", gap: "10px", alignContent: "start" }}>
                  <span style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: "7px", height: "30px", padding: "0 12px", borderRadius: "999px", fontSize: "13px", fontWeight: "700", background: badge.bg, color: badge.fg }}>
                    {badge.name}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.1em", textTransform: "uppercase", color: badge.kindColor }}>{badge.kind}</span>
                  <span style={{ fontSize: "14px", lineHeight: "1.55", color: "var(--text-secondary)" }}>{badge.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------- independence */}
        <section aria-labelledby="ind-h2" style={{ position: "relative", overflow: "hidden", background: "var(--ink)" }}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0",
              backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              pointerEvents: "none",
            }}
          />
          <div aria-hidden="true" style={{ position: "absolute", right: "-10%", top: "-30%", width: "680px", height: "680px", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(45,116,215,0.28), transparent)", pointerEvents: "none" }} />
          <div data-split="" style={{ ...SHELL_1240, position: "relative", padding: "88px 24px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "56px", alignItems: "start" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold-ink)", marginBottom: "14px" }}>Editorial independence</p>
              <h2 id="ind-h2" style={{ fontSize: "clamp(30px, 3.6vw, 46px)", lineHeight: "1.04", color: "#fff", textWrap: "balance" }}>
                Advertising does not buy <Serif gold>editorial rankings</Serif>
              </h2>
              <p style={{ marginTop: "18px", fontSize: "17px", lineHeight: "1.7", color: "rgba(232,237,245,0.8)", maxWidth: "520px" }}>
                We separate paid visibility from ranking decisions. A sponsor may receive clearly labelled exposure, but payment alone never grants inclusion or a position in a TenBestFind top ten, and never changes a best-for designation.
              </p>
              <div style={{ marginTop: "26px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
                <Link href={routes.howWeRank()} style={{ fontSize: "15px", fontWeight: "600", color: "var(--gold-ink)" }}>
                  Read how we rank →
                </Link>
                <Link href={routes.advertisingDisclosure()} style={{ fontSize: "15px", fontWeight: "600", color: "var(--gold-ink)" }}>
                  Advertising disclosure →
                </Link>
              </div>
            </div>
            <ul style={{ display: "grid", gap: "12px" }}>
              {RULES.map((rule) => (
                <li key={rule} style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "20px 22px", borderRadius: "16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }}>
                  <span aria-hidden="true" style={{ flex: "0 0 28px", width: "28px", height: "28px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--gold-ink)", color: "var(--ink)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span style={{ fontSize: "16px", lineHeight: "1.55", color: "#fff", fontWeight: "600" }}>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------- eligibility + quote */}
        <section id="quote" aria-labelledby="who-h2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div data-split="" style={{ ...SHELL_1240, padding: "88px 24px", display: "grid", gridTemplateColumns: "minmax(0,0.9fr) minmax(0,1.1fr)", gap: "56px", alignItems: "start" }}>
            <div>
              <Eyebrow mb="14px">Eligibility</Eyebrow>
              <h2 id="who-h2" style={{ ...H2, marginBottom: "22px" }}>
                Who can <Serif>advertise?</Serif>
              </h2>
              <ul style={{ display: "grid", gap: "2px", marginBottom: "18px" }}>
                {ELIGIBILITY.map((item) => (
                  <li key={item} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid var(--border-subtle)", fontSize: "16px", lineHeight: "1.5", color: "var(--text-primary)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: "14.5px", color: "var(--text-secondary)" }}>We do not accept every advertiser, and some categories are restricted.</p>
            </div>
            <AdvertiseForm />
          </div>
        </section>

        <CentreFaq a="Advertising" b="questions" faqs={BILLING_FAQS} />
      </div>
    </SiteChrome>
  );
}
