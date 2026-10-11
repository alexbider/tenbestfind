import Link from "next/link";
import type { ReactNode } from "react";
import { routes } from "@/lib/urls";

/*
 * The business centre pages (claim, add a business, advertise), October 2026
 * design. Layout is inline, the way the design draws it, so the site's v2 skin
 * reads these styles exactly as it reads the design's own.
 */

export const SHELL_1240 = { maxWidth: "1240px", margin: "0 auto" } as const;

const TABS = [
  { key: "landing", label: "Overview", href: routes.forBusinesses() },
  { key: "claim", label: "Claim", href: routes.claim() },
  { key: "add", label: "Add a business", href: routes.addBusiness() },
  { key: "advertise", label: "Advertise", href: routes.advertise() },
] as const;

export type CentreTab = (typeof TABS)[number]["key"];

export const visuallyHidden = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
};

export function ArrowIcon({ size = 16, width = 2.2 }: { size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function Serif({ children, gold = false }: { children: ReactNode; gold?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "var(--serif)",
        fontStyle: "italic",
        fontWeight: "400",
        letterSpacing: "-0.01em",
        color: gold ? "var(--gold-ink)" : undefined,
      }}
    >
      {children}
    </span>
  );
}

/** Gold rule plus an uppercase label, on one line. */
export function Eyebrow({ children, mb = "16px" }: { children: ReactNode; mb?: string }) {
  return (
    <p
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        whiteSpace: "nowrap",
        fontSize: "12.5px",
        fontWeight: "700",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--ink)",
        marginBottom: mb,
      }}
    >
      <span aria-hidden="true" style={{ display: "inline-block", flexShrink: 0, width: "28px", height: "2px", background: "var(--gold-ink)" }} />
      {children}
    </p>
  );
}

/** Breadcrumb on the left, the four business centre tabs on the right. */
function TopRow({ crumb, active }: { crumb: string; active: CentreTab }) {
  return (
    <div data-stack="" data-bc-top="" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "36px" }}>
      <nav aria-label="Breadcrumb">
        <ol style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
          <li>
            <Link href="/" style={{ color: "var(--text-secondary)" }}>
              Home
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href={routes.forBusinesses()} style={{ color: "var(--text-secondary)" }}>
              For businesses
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" style={{ color: "var(--blue-900)", fontWeight: "600" }}>
            {crumb}
          </li>
        </ol>
      </nav>
      <nav aria-label="Business centre" data-bc-tabs="" style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", scrollbarWidth: "none" }}>
        <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginRight: "6px", whiteSpace: "nowrap" }}>
          Business centre
        </span>
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            data-bctab=""
            data-on={tab.key === active ? "1" : "0"}
            aria-current={tab.key === active ? "page" : undefined}
            href={tab.href}
            style={{
              whiteSpace: "nowrap",
              padding: "8px 14px",
              borderRadius: "999px",
              border: "1px solid var(--border-subtle)",
              background: "var(--surface-card)",
              fontSize: "13.5px",
              fontWeight: "600",
              color: "var(--blue-900)",
            }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** The hero every business centre page opens with. */
export function CentreHero({
  crumb,
  active,
  children,
  padBottom = "56px",
  blob = "rgba(45,116,215,0.15)",
  blobSize = "620px",
}: {
  crumb: string;
  active: CentreTab;
  children: ReactNode;
  padBottom?: string;
  blob?: string;
  blobSize?: string;
}) {
  return (
    <section style={{ position: "relative", background: "var(--paper)", borderBottom: "1px solid var(--border-subtle)" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            inset: "0",
            backgroundImage: "linear-gradient(rgba(16,31,61,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,31,61,0.03) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "-6%",
            top: "-40%",
            width: blobSize,
            height: blobSize,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, ${blob}, transparent)`,
          }}
        />
      </div>
      <div style={{ ...SHELL_1240, position: "relative", padding: `20px 24px ${padBottom}` }}>
        <TopRow crumb={crumb} active={active} />
        {children}
      </div>
    </section>
  );
}

/** The two-column hero body for the stepped flows: copy on the left, the guarantee card on the right. */
export function FlowHeroBody({
  eyebrow,
  h1a,
  h1b,
  lede,
  guardTitle,
  guardText,
}: {
  eyebrow: string;
  h1a: string;
  h1b: string;
  lede: string;
  guardTitle: string;
  guardText: string;
}) {
  return (
    <div data-split="" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,0.8fr)", gap: "56px", alignItems: "end" }}>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 style={{ fontSize: "clamp(38px, 5vw, 62px)", lineHeight: "1.02", letterSpacing: "-0.045em", textWrap: "balance" }}>
          {h1a}{" "}
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: "400", letterSpacing: "-0.02em" }}>{h1b}</span>
        </h1>
        <p style={{ marginTop: "20px", fontSize: "19px", lineHeight: "1.6", color: "var(--text-secondary)", maxWidth: "600px", textWrap: "pretty" }}>{lede}</p>
      </div>
      <div style={{ display: "flex", gap: "16px", padding: "22px 24px", borderRadius: "18px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)" }}>
        <span
          aria-hidden="true"
          style={{
            flex: "0 0 44px",
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--gold-soft)",
            border: "1px solid #EBCE95",
            color: "var(--gold)",
          }}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <span style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: "16px", fontWeight: "700", color: "var(--ink)", marginBottom: "4px" }}>{guardTitle}</span>
          <span style={{ display: "block", fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{guardText}</span>
        </span>
      </div>
    </div>
  );
}

/** The FAQ section, identical on all three pages apart from its heading. */
export function CentreFaq({
  a,
  b,
  intro,
  faqs,
}: {
  a: string;
  b: string;
  intro?: string;
  faqs: { question: string; answer: string }[];
}) {
  return (
    <section aria-labelledby="faq-h2" style={{ background: "var(--surface-page)", borderBottom: "1px solid var(--border-subtle)" }}>
      <div data-split="" style={{ ...SHELL_1240, padding: "80px 24px", display: "grid", gridTemplateColumns: "minmax(0,0.7fr) minmax(0,1.3fr)", gap: "56px", alignItems: "start" }}>
        <div>
          <h2 id="faq-h2" style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: "1.06", textWrap: "balance" }}>
            {a} <Serif>{b}</Serif>
          </h2>
          {intro ? <p style={{ marginTop: "16px", fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)" }}>{intro}</p> : null}
          <Link href={routes.contact()} style={{ display: "inline-flex", marginTop: "20px", fontSize: "15px", fontWeight: "600" }}>
            Talk to business support →
          </Link>
        </div>
        <div data-bcfaq="" style={{ display: "grid", gap: "12px" }}>
          {faqs.map((faq) => (
            <details key={faq.question} data-faq="" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "4px 22px" }}>
              <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "18px 0", fontSize: "17px", fontWeight: "700", color: "var(--blue-900)" }}>
                {faq.question}
                <span
                  data-fq=""
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    border: "1px solid var(--border-strong)",
                    color: "var(--ink)",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p style={{ padding: "0 0 20px", fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)", maxWidth: "680px" }}>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** "See what homeowners see": the navy search band that closes the flow pages. */
export function SearchBand() {
  const input = { width: "100%", border: "0", outline: "none", height: "52px", fontFamily: "var(--font-sans)", fontSize: "16px", background: "transparent" };
  return (
    <section aria-labelledby="see-h2" style={{ position: "relative", overflow: "hidden", background: "var(--ink)" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10%",
          bottom: "-40%",
          width: "620px",
          height: "620px",
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(45,116,215,0.3), transparent)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto", padding: "76px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold-ink)", marginBottom: "14px" }}>See what homeowners see</p>
        <h2 id="see-h2" style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: "1.08", color: "#fff", marginBottom: "26px", textWrap: "balance" }}>
          Search the way <Serif gold>your customers do</Serif>
        </h2>
        <form
          action={routes.search()}
          method="get"
          role="search"
          aria-label="Search"
          data-stack=""
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-card)", borderRadius: "18px", boxShadow: "var(--shadow-xl)", padding: "8px", textAlign: "left" }}
        >
          <label style={{ position: "relative", flex: "1.1", padding: "0 14px" }}>
            <span style={visuallyHidden}>Service</span>
            <input name="service" type="text" placeholder="What service do you need?" style={input} />
          </label>
          <span aria-hidden="true" data-divider="" style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }} />
          <label style={{ position: "relative", flex: "1", padding: "0 14px" }}>
            <span style={visuallyHidden}>City</span>
            <input name="location" type="text" placeholder="Your city or postal code" style={input} />
          </label>
          <button
            type="submit"
            style={{ height: "52px", padding: "0 26px", border: "0", borderRadius: "14px", background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-sans)", fontSize: "16px", fontWeight: "600", cursor: "pointer" }}
          >
            Find the best
          </button>
        </form>
      </div>
    </section>
  );
}
