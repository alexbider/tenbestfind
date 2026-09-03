import Link from "next/link";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------
   The pieces every 2026 page is built from. The design draws its layout
   in inline styles, so these carry those styles rather than class names,
   and each one is the single place a given piece is described.
   ------------------------------------------------------------------ */

export const SHELL = { maxWidth: "1240px", margin: "0 auto" };

export const H2 = {
  fontSize: "clamp(26px, 3vw, 36px)",
  fontWeight: "700",
  lineHeight: "1.2",
};

export const LEAD = { fontSize: "17px", lineHeight: "1.7", color: "var(--text-secondary)" };

export const LABEL = {
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "var(--ls-wide)",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
};

export const SR_ONLY = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
};

export const CHIP = {
  padding: "6px 12px",
  borderRadius: "999px",
  background: "var(--blue-50)",
  color: "var(--blue-800)",
  fontSize: "13px",
  fontWeight: "600",
};

export const PILL = {
  padding: "7px 13px",
  borderRadius: "999px",
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  fontSize: "14px",
  color: "var(--text-primary)",
};

export const BTN_PRIMARY = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "48px",
  padding: "0 22px",
  borderRadius: "14px",
  background: "var(--color-primary)",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "600",
};

export const BTN_GHOST = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "48px",
  padding: "0 20px",
  borderRadius: "14px",
  border: "1.5px solid var(--border-strong)",
  background: "var(--surface-card)",
  color: "var(--blue-900)",
  fontSize: "15px",
  fontWeight: "600",
};

export const TH = {
  padding: "12px 16px",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "var(--ls-wide)",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border-subtle)",
};

export const TD = {
  padding: "16px",
  borderBottom: "1px solid var(--border-subtle)",
  fontSize: "15px",
  color: "var(--text-primary)",
  verticalAlign: "middle" as const,
};

export function Arrow({ size = 16, width = 2 }: { size?: number; width?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function Chevron({ size = 15, width = 2 }: { size?: number; width?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/** The gold rule and small caps that open a section. */
export function Eyebrow({
  children,
  tone,
  heroIn,
  gap,
}: {
  children: ReactNode;
  tone?: "gold";
  /** Stagger slot for the hero entrance animation, when the design gives it one. */
  heroIn?: string;
  /** Space below the eyebrow, where the design sets it on the eyebrow itself. */
  gap?: string;
}) {
  const style = {
    ...(tone === "gold" ? { color: "var(--gold-ink)" } : null),
    ...(gap ? { marginBottom: gap } : null),
  };
  return (
    <p data-eyebrow="" data-hero-in={heroIn} style={Object.keys(style).length ? style : undefined}>
      <span data-eyebrow-rule="" aria-hidden="true" />
      {children}
    </p>
  );
}

/** The outlined "10" that drifts behind a hero. */
export function TenOutline({
  width = 300,
  height = 213,
  stroke = "rgba(16,31,61,0.16)",
  strokeWidth = 2.4,
  dot = true,
  style,
}: {
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  dot?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      data-ten-outline=""
      aria-hidden="true"
      viewBox="0 0 240 170"
      width={width}
      height={height}
      style={{ position: "absolute", overflow: "visible", pointerEvents: "none", ...style }}
    >
      <path
        pathLength={1}
        d="M18 40 L52 16 L52 158"
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        pathLength={1}
        d="M150 16 C 196 16, 226 46, 226 87 C 226 128, 196 158, 150 158 C 104 158, 74 128, 74 87 C 74 46, 104 16, 150 16 Z"
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dot ? <circle cx="226" cy="30" r="5" fill="var(--gold-ink)" /> : null}
    </svg>
  );
}

/** The faint grid the light heroes sit on. */
export const GRID_BACKDROP = {
  position: "relative" as const,
  overflow: "hidden",
  background: "var(--paper)",
  backgroundImage:
    "linear-gradient(rgba(16,31,61,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(16,31,61,0.045) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
};

/** Breadcrumbs, in the design's own shape. */
export function Crumbs({ items, flush }: { items: { label: string; href?: string }[]; flush?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: flush ? undefined : "26px" }}>
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          fontSize: "14px",
          color: "var(--text-secondary)",
        }}
      >
        {items.map((item, index) => (
          <li key={item.label} style={{ display: "contents" }}>
            {index > 0 ? (
              <li aria-hidden="true" style={{ color: "var(--text-secondary)" }}>
                ›
              </li>
            ) : null}
            {item.href ? (
              <li>
                <Link href={item.href} style={{ color: "var(--text-secondary)" }}>
                  {item.label}
                </Link>
              </li>
            ) : (
              <li aria-current="page" style={{ color: "var(--blue-900)", fontWeight: "600" }}>
                {item.label}
              </li>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The sticky in-page navigation strip. */
export function PageToc({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav
      aria-label="On this page"
      data-toc=""
      style={{
        position: "sticky",
        top: "76px",
        zIndex: "150",
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border-subtle)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div
        style={{
          ...SHELL,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          overflowX: "auto",
        }}
      >
        <span
          style={{
            flexShrink: 0,
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "var(--ls-wider)",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          On this page
        </span>
        <ul style={{ display: "flex", alignItems: "center", gap: "4px", padding: "10px 0" }}>
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                style={{
                  display: "block",
                  padding: "8px 12px",
                  borderRadius: "999px",
                  fontSize: "14px",
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
    </nav>
  );
}

/** One collapsible question. */
export function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <li>
      <details
        data-faq=""
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "4px 22px",
        }}
      >
        <summary
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            padding: "18px 0",
            fontSize: "17px",
            fontWeight: "700",
            color: "var(--blue-900)",
          }}
        >
          {question}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2D74D7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <p
          style={{
            padding: "0 0 20px",
            fontSize: "16px",
            lineHeight: "1.7",
            color: "var(--text-secondary)",
            maxWidth: "680px",
          }}
        >
          {answer}
        </p>
      </details>
    </li>
  );
}

/** A row that reveals its chevron on hover, used by every "related" list. */
export function RowLink({
  href,
  children,
  boxed,
  outline,
  compact,
  tight,
}: {
  href: string;
  children: ReactNode;
  /** The heavier card row the ranking page uses for related services. */
  boxed?: boolean;
  /** The lighter outlined row the profile and hub pages use for their lists. */
  outline?: boolean;
  /** The hubs sit a hair tighter than the profile does. */
  compact?: boolean;
  /** The tightest variant, for long alphabetical index lists. */
  tight?: boolean;
}) {
  const style = outline
    ? {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        padding: compact ? "11px 14px" : "12px 14px",
        border: "1px solid var(--border-subtle)",
        borderRadius: "12px",
        fontSize: "15px",
        fontWeight: "600",
        color: "var(--blue-900)",
        textDecoration: "none",
      }
    : undefined;
  return (
    <li>
      <Link
        data-row=""
        href={href}
        style={
          style ??
          (boxed
            ? {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                padding: "16px 18px",
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: "600",
                color: "var(--blue-900)",
                textDecoration: "none",
              }
            : {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: tight ? "8px 10px" : "10px 12px",
                margin: tight ? "0 -10px" : "0 -12px",
                borderRadius: "10px",
                fontSize: "15px",
                color: "var(--text-primary)",
                textDecoration: "none",
              })
        }
      >
        {children}
        <Chevron />
      </Link>
    </li>
  );
}

/** The closing dark band with a search box, on every public template. */
export function FinalSearchBand({
  heading,
  service,
  after,
}: {
  heading: string;
  service?: string;
  after?: ReactNode;
}) {
  return (
    <section aria-labelledby="final-h2" style={{ background: "var(--blue-900)" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "76px 24px", textAlign: "center" }}>
        <h2 id="final-h2" style={{ ...H2, color: "#fff", marginBottom: "24px" }}>
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
            borderRadius: "18px",
            boxShadow: "var(--shadow-xl)",
            padding: "8px",
            textAlign: "left",
          }}
        >
          <div style={{ flex: "1.15", padding: "0 14px" }}>
            <label htmlFor="fin-svc" style={SR_ONLY}>
              Service
            </label>
            <input
              id="fin-svc"
              name="service"
              type="text"
              defaultValue={service}
              placeholder="What needs doing?"
              style={{
                width: "100%",
                border: "0",
                outline: "none",
                height: "52px",
                fontFamily: "var(--font-sans)",
                fontSize: "16px",
                color: "var(--text-primary)",
                background: "transparent",
              }}
            />
          </div>
          <div
            data-divider=""
            aria-hidden="true"
            style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }}
          />
          <div style={{ flex: "1", padding: "0 14px" }}>
            <label htmlFor="fin-loc" style={SR_ONLY}>
              Location
            </label>
            <input
              id="fin-loc"
              name="location"
              type="text"
              autoComplete="postal-code"
              placeholder="City or ZIP"
              style={{
                width: "100%",
                border: "0",
                outline: "none",
                height: "52px",
                fontFamily: "var(--font-sans)",
                fontSize: "16px",
                color: "var(--text-primary)",
                background: "transparent",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              height: "52px",
              padding: "0 28px",
              border: "0",
              borderRadius: "14px",
              background: "var(--color-primary)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Find Top Providers
          </button>
        </form>
        {after ? <p style={{ marginTop: "18px" }}>{after}</p> : null}
      </div>
    </section>
  );
}

/** Two initials, used wherever a logo is missing. */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * The small "i" disclosure the design puts beside anything a reader might
 * reasonably ask where it came from. Open on click, dark card, always with a
 * link to the fuller explanation.
 */
export function InfoPopover({
  label,
  align = "left",
  width = "min(420px, 80vw)",
  above,
  children,
  link,
  style,
}: {
  label: string;
  align?: "left" | "right";
  width?: string;
  above?: boolean;
  children: ReactNode;
  link?: { href: string; label: string };
  style?: React.CSSProperties;
}) {
  return (
    <details data-pop="" style={{ position: "relative", ...style }}>
      <summary
        aria-label={label}
        style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            border: "1.5px solid var(--border-strong)",
            fontSize: "11px",
            fontWeight: "700",
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
          ...(above ? { bottom: "calc(100% + 10px)" } : { top: "calc(100% + 10px)" }),
          [align]: "0",
          zIndex: "180",
          width,
          background: "var(--blue-900)",
          color: "var(--text-on-ink)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-xl)",
          padding: "18px 20px",
        }}
      >
        <p style={{ fontSize: "13px", lineHeight: "1.65", color: "rgba(232,237,245,0.88)" }}>{children}</p>
        {link ? (
          <p style={{ marginTop: "12px" }}>
            <Link href={link.href} style={{ fontSize: "13px", fontWeight: "600", color: "#E8B551" }}>
              {link.label} →
            </Link>
          </p>
        ) : null}
      </div>
    </details>
  );
}
