import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Accent } from "@/components/ui/Accent";
import { SR_ONLY } from "@/components/site/page-parts";

/* ------------------------------------------------------------------
   The pieces the Top 10 page and the city hub share. Both are drawn in
   the October 2026 design directly (no skin), so the markup here is the
   design's own, written once.
   ------------------------------------------------------------------ */

export { Accent };

/** Heading size every section of the two pages opens with. */
export const H2S: CSSProperties = {
  fontSize: "clamp(28px, 3.4vw, 42px)",
  lineHeight: "1.04",
  fontWeight: "800",
  letterSpacing: "-0.04em",
  textWrap: "balance",
};

/** Section padding shell, the design's `data-shell` block. */
export const SHELL_STYLE: CSSProperties = { maxWidth: "1240px", margin: "0 auto" };

/** The icon paths the design's tiles draw (Lucide-style, 24px grid). */
export const ICO = {
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z M12 7a3 3 0 1 0 0 6 3 3 0 1 0 0-6",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20 M12 6v6l4 2",
  wrench:
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  star: "M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z",
  badge:
    "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z M9 12l2 2 4-4",
  shield:
    "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z M9 12l2 2 4-4",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 9h8 M8 13h5",
  hail: "M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25 M8 19v1 M12 17v1 M16 19v1 M10 22v.01 M14 22v.01",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 15l2 2 4-4",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8 M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M6.34 17.66l-1.41 1.41 M19.07 4.93l-1.41 1.41",
  house: "M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 21v-8h6v8",
  clip: "M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 13h6 M9 17h4",
  cal: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
} as const;

export const CRITERIA_ICONS = [ICO.pin, ICO.clock, ICO.wrench, ICO.star, ICO.badge, ICO.shield, ICO.chat, ICO.hail];
export const NOTE_ICONS = [ICO.hail, ICO.file, ICO.sun, ICO.house, ICO.clip, ICO.cal];

/** The right-pointing arrow every link and button in the design ends on. */
export function ArrowSvg({ size = 16, stroke = "currentColor", width = 2.2 }: { size?: number; stroke?: string; width?: number }) {
  return (
    <svg data-arrow="" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** The small up-and-right arrow on a boxed list row. */
export function OutArrow({ size = 15 }: { size?: number }) {
  return (
    <svg data-arrow="" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

/** The gold rule and small caps that open a section. */
export function Kicker({ children, tone, style }: { children: ReactNode; tone?: "ink"; style?: CSSProperties }) {
  return (
    <p
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "11.5px",
        fontWeight: "700",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: tone === "ink" ? "var(--gold-ink)" : "var(--gold)",
        marginBottom: "10px",
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ width: "22px", height: "2px", background: "var(--gold-ink)" }} />
      {children}
    </p>
  );
}

/** An icon tile with the ghosted "10" in its corner. */
export function Tile({
  d,
  size = 46,
  radius = 14,
  icon = 21,
  tone = "paper",
  ten = true,
  tenSize = 24,
  tenOpacity,
  stroke = 1.7,
  style,
}: {
  d: string;
  size?: number;
  radius?: number;
  icon?: number;
  tone?: "paper" | "blue" | "gold" | "goldDark" | "white";
  ten?: boolean;
  tenSize?: number;
  tenOpacity?: number;
  stroke?: number;
  style?: CSSProperties;
}) {
  const tones: Record<string, CSSProperties> = {
    paper: { background: "var(--paper)", border: "1px solid var(--border-subtle)", color: "var(--ink)" },
    blue: { background: "var(--blue-50)", border: "1px solid var(--blue-100)", color: "var(--color-primary)" },
    gold: { background: "var(--gold-soft)", border: "1px solid #EBCE95", color: "var(--gold)" },
    goldDark: { background: "rgba(231,184,99,0.12)", border: "1px solid rgba(231,184,99,0.28)", color: "var(--gold-ink)" },
    white: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", color: "var(--color-primary)" },
  };
  const tenColor = tone === "paper" || tone === "goldDark" ? "var(--gold-ink)" : "var(--ink)";
  const tenAlpha = tenOpacity ?? (tone === "paper" ? 0.32 : tone === "goldDark" ? 0.22 : 0.08);
  return (
    <span
      data-tile=""
      aria-hidden="true"
      style={{
        position: "relative",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${radius}px`,
        overflow: "hidden",
        ...tones[tone],
        ...style,
      }}
    >
      {ten ? (
        <span
          data-ten=""
          style={{
            position: "absolute",
            right: "-3px",
            bottom: `${-Math.round(tenSize / 3)}px`,
            fontSize: `${tenSize}px`,
            fontWeight: "800",
            letterSpacing: "-0.08em",
            lineHeight: "1",
            color: tenColor,
            opacity: tenAlpha,
          }}
        ></span>
      ) : null}
      <svg data-ico="" width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative" }}>
        <path pathLength={1} d={d} />
      </svg>
    </span>
  );
}

/** The blue radial glow that drifts behind a hero. */
export function HeroBackdrop({ ten = true }: { ten?: boolean }) {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0",
          backgroundImage:
            "linear-gradient(rgba(16,31,61,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(16,31,61,0.025) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0",
          backgroundImage:
            "linear-gradient(rgba(16,31,61,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(16,31,61,0.07) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          WebkitMaskImage: "radial-gradient(520px 420px at var(--mx) var(--my), #000, transparent 75%)",
          maskImage: "radial-gradient(520px 420px at var(--mx) var(--my), #000, transparent 75%)",
          pointerEvents: "none",
        }}
      />
      <div
        data-blob=""
        aria-hidden="true"
        style={{
          position: "absolute",
          right: "-8%",
          top: "-25%",
          width: "640px",
          height: "640px",
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(45,116,215,0.18), transparent)",
          pointerEvents: "none",
        }}
      />
      {ten ? (
        <svg
          data-ten-outline=""
          aria-hidden="true"
          viewBox="0 0 240 170"
          width="420"
          height="298"
          style={{ position: "absolute", right: "-50px", top: "30px", overflow: "visible", pointerEvents: "none" }}
        >
          <path pathLength={1} d="M18 40 L52 16 L52 158" fill="none" stroke="rgba(16,31,61,0.1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path
            pathLength={1}
            d="M150 16 C 196 16, 226 46, 226 87 C 226 128, 196 158, 150 158 C 104 158, 74 128, 74 87 C 74 46, 104 16, 150 16 Z"
            fill="none"
            stroke="rgba(16,31,61,0.1)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="226" cy="30" r="4" fill="var(--gold-ink)" />
        </svg>
      ) : null}
    </>
  );
}

/** Breadcrumbs, in the design's own shape. */
export function HeroCrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" data-in="1" style={{ marginBottom: "24px" }}>
      <ol style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", fontSize: "13.5px", color: "var(--text-secondary)" }}>
        {items.map((item, index) => (
          <CrumbItem key={item.label} item={item} first={index === 0} />
        ))}
      </ol>
    </nav>
  );
}

function CrumbItem({ item, first }: { item: { label: string; href?: string }; first: boolean }) {
  return (
    <>
      {first ? null : (
        <li aria-hidden="true" style={{ color: "var(--text-secondary)" }}>
          ›
        </li>
      )}
      {item.href ? (
        <li>
          <Link href={item.href} style={{ color: "var(--text-secondary)" }}>
            {item.label}
          </Link>
        </li>
      ) : (
        <li aria-current="page" style={{ color: "var(--ink)", fontWeight: "600" }}>
          {item.label}
        </li>
      )}
    </>
  );
}

/** The sticky in-page navigation strip, with the reading progress bar. */
export function PageNav({ label = "On this page", items }: { label?: string; items: { href: string; label: string }[] }) {
  return (
    <nav
      aria-label="On this page"
      data-toc=""
      style={{
        position: "sticky",
        top: "0",
        zIndex: "150",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(14px)",
        borderTop: "1px solid var(--border-subtle)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        <span
          style={{
            flexShrink: 0,
            fontSize: "10.5px",
            fontWeight: "800",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </span>
        <ul style={{ display: "flex", alignItems: "center", gap: "4px", padding: "9px 0" }}>
          {items.map((item, index) => (
            <li key={item.href}>
              <a
                href={item.href}
                data-on={index === 0 ? "1" : "0"}
                style={{
                  display: "block",
                  padding: "8px 13px",
                  borderRadius: "999px",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <span aria-hidden="true" style={{ position: "absolute", left: "0", right: "0", bottom: "-1px", height: "2px" }}>
        <span
          data-prog=""
          style={{
            display: "block",
            height: "100%",
            background: "linear-gradient(90deg, var(--gold-ink), var(--color-primary))",
            transform: "scaleX(0)",
            transformOrigin: "left",
          }}
        />
      </span>
    </nav>
  );
}

/**
 * The small "i" disclosure with a dark note under it. `side="right"` is the
 * narrow card that hangs off the right edge of a hero card; `side="wide"` fills
 * the width of the block it sits in.
 */
export function Pop({
  ariaLabel,
  label,
  side = "right",
  children,
  style,
}: {
  ariaLabel: string;
  label: string;
  side?: "right" | "wide";
  children: ReactNode;
  style?: CSSProperties;
}) {
  const wide = side === "wide";
  return (
    <details data-pop="" style={{ position: "relative", ...style }}>
      <summary
        aria-label={ariaLabel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: wide ? "8px" : "6px",
          minHeight: wide ? "40px" : "32px",
          fontSize: wide ? "13px" : "12px",
          fontWeight: "600",
          color: "var(--text-secondary)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: wide ? "20px" : "18px",
            height: wide ? "20px" : "18px",
            borderRadius: "50%",
            border: "1.5px solid var(--border-strong)",
            fontSize: wide ? "11px" : "10.5px",
            fontWeight: "800",
            color: "var(--color-primary)",
          }}
        >
          i
        </span>
        {label}
      </summary>
      <div
        role="note"
        style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          ...(wide ? { left: "0", right: "0", padding: "18px 20px" } : { right: "0", width: "min(320px, 80vw)", padding: "16px 18px" }),
          zIndex: "180",
          background: "var(--ink)",
          borderRadius: "14px",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {children}
      </div>
    </details>
  );
}

/** The design's accordion list of questions. */
export function FaqList({ faqs, numbered }: { faqs: { id?: string; question: string; answer: string }[]; numbered?: boolean }) {
  return (
    <div data-reveal="" style={{ borderTop: "2px solid var(--ink)" }}>
      {faqs.map((faq, index) => (
        <details key={faq.id ?? faq.question} data-faq="" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <summary
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              minHeight: "64px",
              padding: "16px 2px",
              fontSize: "16.5px",
              fontWeight: "600",
              lineHeight: "1.35",
              color: "var(--ink)",
            }}
          >
            {numbered ? (
              <span className="serif-accent" style={{ fontSize: "20px", color: "var(--gold)", width: "26px", flexShrink: 0 }}>
                {String(index + 1).padStart(2, "0")}
              </span>
            ) : null}
            <span style={{ flex: "1" }}>{faq.question}</span>
            <span
              data-fq-ico=""
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </span>
          </summary>
          <p
            style={{
              padding: numbered ? "0 50px 20px 44px" : "0 50px 20px 2px",
              fontSize: "15px",
              lineHeight: "1.7",
              color: "var(--text-secondary)",
              textWrap: "pretty",
            }}
          >
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

/**
 * The closing dark band with the search box. Same form as every other page's
 * (`/search/`, `service` and `location`); the design draws it on ink with a
 * blue glow behind.
 */
export function FinalBand({
  heading,
  service,
  location,
  after,
  grid,
}: {
  heading: ReactNode;
  service?: string;
  location?: string;
  after?: ReactNode;
  /** The city hub's band carries a faint grid under the glow. */
  grid?: boolean;
}) {
  return (
    <section aria-labelledby="final-h2" style={{ position: "relative", overflow: "hidden", background: "var(--ink)" }}>
      {grid ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "0",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            WebkitMaskImage: "radial-gradient(600px 300px at 50% 100%, #000, transparent 75%)",
            maskImage: "radial-gradient(600px 300px at 50% 100%, #000, transparent 75%)",
            pointerEvents: "none",
          }}
        />
      ) : null}
      <div
        data-blob=""
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          bottom: "-60%",
          width: "900px",
          height: "600px",
          marginLeft: "-450px",
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(45,116,215,0.5), transparent)",
          pointerEvents: "none",
        }}
      />
      <div data-reveal="" style={{ position: "relative", maxWidth: "860px", margin: "0 auto", padding: "84px 24px 88px", textAlign: "center" }}>
        <h2
          id="final-h2"
          style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            lineHeight: "1",
            fontWeight: "800",
            letterSpacing: "-0.045em",
            color: "#fff",
            marginBottom: "26px",
            textWrap: "balance",
          }}
        >
          {heading}
        </h2>
        <form
          action="/search/"
          method="get"
          role="search"
          aria-label="Find providers"
          data-stack=""
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--surface-card)",
            borderRadius: "22px",
            boxShadow: "0 40px 80px -20px rgba(0,0,0,0.55)",
            padding: "8px",
            textAlign: "left",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 200px", padding: "0 14px" }}>
            <label htmlFor="fin-svc" style={SR_ONLY}>
              Service
            </label>
            <input
              id="fin-svc"
              name="service"
              type="text"
              defaultValue={service}
              placeholder="What needs doing?"
              style={{ width: "100%", border: "0", outline: "none", height: "52px", fontFamily: "var(--font-sans)", fontSize: "16px", color: "var(--text-primary)", background: "transparent" }}
            />
          </div>
          <div data-divider="" style={{ flex: "1 1 200px", padding: "0 14px", borderLeft: "1px solid var(--border-subtle)" }}>
            <label htmlFor="fin-loc" style={SR_ONLY}>
              Location
            </label>
            <input
              id="fin-loc"
              name="location"
              type="text"
              autoComplete="postal-code"
              defaultValue={location}
              placeholder="City or ZIP"
              style={{ width: "100%", border: "0", outline: "none", height: "52px", fontFamily: "var(--font-sans)", fontSize: "16px", color: "var(--text-primary)", background: "transparent" }}
            />
          </div>
          <button
            data-btn=""
            type="submit"
            style={{
              flex: "1 1 180px",
              height: "54px",
              padding: "0 26px",
              border: "0",
              borderRadius: "16px",
              background: "var(--gold-ink)",
              color: "var(--ink)",
              fontFamily: "var(--font-sans)",
              fontSize: "16px",
              fontWeight: "800",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            Find Top Providers
            <ArrowSvg />
          </button>
        </form>
        {after ? <p style={{ marginTop: "18px" }}>{after}</p> : null}
      </div>
    </section>
  );
}
