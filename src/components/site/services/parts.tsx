import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { TenOutline } from "@/components/site/page-parts";
import { ICON_PATHS, type IconName } from "@/lib/icon-paths";

/* ------------------------------------------------------------------
   Pieces the services index, the category page and the subservice page
   share and nothing else uses. They carry the design's inline styles and
   its motion attributes, so a page only decides what goes in them.
   ------------------------------------------------------------------ */

/**
 * A wrapping auto-fit grid whose minimum track and gap are also written as
 * custom properties. On a phone the older shared stylesheet rewrites these
 * grids from their inline text, and v2-services.css puts them back from these
 * two properties, plus --ag-pad and --ag-mb (the grid must carry data-ag).
 */
export function autoGrid(min: number, gap: string, space?: { padding?: string; marginBottom?: string }): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap,
    ...(space?.padding ? { padding: space.padding } : null),
    ...(space?.marginBottom ? { marginBottom: space.marginBottom } : null),
    ["--ag-min" as string]: `${min}px`,
    ["--ag-gap" as string]: gap,
    ["--ag-pad" as string]: space?.padding ?? "0",
    ["--ag-mb" as string]: space?.marginBottom ?? "0",
  };
}

const MASK = "radial-gradient(520px 420px at var(--mx) var(--my), #000, transparent 75%)";

/**
 * The light hero's backdrop: a faint grid, a brighter copy of it that follows
 * the pointer, a blue glow and the outlined "10". Goes first inside a
 * `data-hero` section whose background is var(--paper).
 */
export function HeroBackdrop({
  outline = { right: "-30px", top: "-40px" },
  blob = { right: "-8%", top: "-25%" },
}: {
  /** `false` leaves the outlined "10" out, as the subservice hero does. */
  outline?: CSSProperties | false;
  blob?: CSSProperties;
}) {
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
          WebkitMaskImage: MASK,
          maskImage: MASK,
          pointerEvents: "none",
        }}
      />
      <div
        data-blob=""
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "640px",
          height: "640px",
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(45,116,215,0.18), transparent)",
          pointerEvents: "none",
          ...blob,
        }}
      />
      {outline ? <TenOutline stroke="rgba(16,31,61,0.09)" strokeWidth={2} style={outline} /> : null}
    </>
  );
}

const DARK_MASK = "radial-gradient(700px 380px at var(--mx, 80%) var(--my, 0%), #000, transparent 75%)";

/** The navy sections' backdrop: a faint white grid and a blue glow. */
export function DarkBackdrop() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          WebkitMaskImage: DARK_MASK,
          maskImage: DARK_MASK,
          pointerEvents: "none",
        }}
      />
      <div
        data-blob=""
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
    </>
  );
}

/** A hero heading's closing words: the serif italic with the gold stroke under it. */
export function HeroAccent({ children }: { children: ReactNode }) {
  return (
    <span
      className="serif-accent"
      style={{ position: "relative", display: "inline-block", letterSpacing: "-0.02em", paddingRight: "0.06em" }}
    >
      {children}
      <span
        data-uline=""
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "0",
          right: "0.06em",
          bottom: "0.04em",
          height: "0.12em",
          borderRadius: "99px",
          background: "var(--gold-ink)",
          zIndex: "-1",
        }}
      />
    </span>
  );
}

/** Splits `text` so its last `words` words are the hero accent. */
export function heroAccentTail(text: string, words = 2): ReactNode {
  const parts = text.trim().split(/(\s+)/);
  const idx = parts.map((p, i) => (/\S/.test(p) ? i : -1)).filter((i) => i >= 0);
  if (idx.length <= words) return text;
  const cut = idx[idx.length - words];
  return (
    <>
      {parts.slice(0, cut).join("")}
      <HeroAccent>{parts.slice(cut).join("")}</HeroAccent>
    </>
  );
}

/** The gold-ruled small caps that open a section, fading up as it scrolls in. */
export function Kicker({
  children,
  gap = "14px",
  hero,
  style,
}: {
  children: ReactNode;
  gap?: string;
  /** The hero's entrance slot instead of the scroll reveal. */
  hero?: string;
  style?: CSSProperties;
}) {
  return (
    <p
      data-reveal={hero ? undefined : ""}
      data-in={hero}
      data-eyebrow=""
      style={{ marginBottom: gap, ...style }}
    >
      <span data-eyebrow-rule="" aria-hidden="true" />
      {children}
    </p>
  );
}

/** The arrow that nudges right when its link or card is hovered. */
export function NudgeArrow({ size = 15 }: { size?: number }) {
  return (
    <svg
      data-arrow=""
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.18em", marginLeft: "6px" }}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** A text link that ends in the nudging arrow. */
export function ArrowLink({
  href,
  children,
  style,
  dark,
}: {
  href: string;
  children: ReactNode;
  style?: CSSProperties;
  /** On navy, where the link and its hover are gold. */
  dark?: boolean;
}) {
  return (
    <Link data-link="" data-darklink={dark ? "" : undefined} href={href} style={style}>
      {children}
      <NudgeArrow />
    </Link>
  );
}

/**
 * The icon tile with the corner "10". `blue` is the quiet tile the cards use,
 * `amber` the gold one for the project panels.
 */
export function Tile({
  icon,
  size = 42,
  iconSize = 20,
  tone = "blue",
  flex,
  style,
}: {
  icon: IconName;
  size?: number;
  iconSize?: number;
  tone?: "blue" | "amber";
  /** Holds the tile at its width inside a flex row. */
  flex?: boolean;
  style?: CSSProperties;
}) {
  const amber = tone === "amber";
  const ten = size >= 46 ? 24 : size >= 44 ? 23 : 22;
  return (
    <span
      data-tile=""
      aria-hidden="true"
      style={{
        ...(flex ? { flex: `0 0 ${size}px` } : null),
        position: "relative",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: size >= 46 ? "14px" : "12px",
        background: amber ? "var(--amber-50)" : "var(--blue-50)",
        color: amber ? "#8A5F0B" : "var(--color-primary)",
        border: amber ? "1px solid #EBCE95" : "1px solid var(--blue-100)",
        ...style,
      }}
    >
      <span
        data-ten=""
        style={{
          position: "absolute",
          right: "-3px",
          bottom: amber ? "-8px" : "-7px",
          fontSize: `${ten}px`,
          fontWeight: "800",
          letterSpacing: "-0.08em",
          lineHeight: "1",
          color: amber ? "#8A5F0B" : "var(--ink)",
          opacity: amber ? "0.14" : "0.08",
        }}
      ></span>
      <svg
        data-ico=""
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: "relative" }}
      >
        <path pathLength={1} d={ICON_PATHS[icon]} />
      </svg>
    </span>
  );
}

/**
 * The sticky "on this page" strip: pills for each section, the one being read
 * marked navy by V2Motion, and a reading-progress line along its lower edge.
 */
export function SectionToc({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav
      aria-label="On this page"
      data-toc=""
      style={{
        position: "sticky",
        top: "76px",
        zIndex: "150",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(14px)",
        borderTop: "1px solid var(--border-subtle)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div
        data-toc-scroll=""
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
            whiteSpace: "nowrap",
            fontSize: "10.5px",
            fontWeight: "800",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          On this page
        </span>
        <ul style={{ display: "flex", alignItems: "center", gap: "4px", padding: "9px 0" }}>
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                data-on="0"
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

/** One collapsible question, with the design's plus-in-a-circle that turns when open. */
export function FaqRow({ question, answer, roomy }: { question: string; answer: string; roomy?: boolean }) {
  return (
    <li>
      <details
        data-faq=""
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: roomy ? "2px 24px" : "4px 22px",
        }}
      >
        <summary
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: roomy ? "18px" : "16px",
            padding: roomy ? "20px 0" : "18px 0",
            fontSize: roomy ? "17.5px" : "17px",
            fontWeight: "700",
            color: "var(--blue-900)",
          }}
        >
          {question}
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </span>
        </summary>
        <p
          style={{
            padding: roomy ? "0 0 22px" : "0 0 20px",
            fontSize: "16px",
            lineHeight: roomy ? "1.72" : "1.7",
            color: "var(--text-secondary)",
            maxWidth: roomy ? "68ch" : "680px",
          }}
        >
          {answer}
        </p>
      </details>
    </li>
  );
}

const FIELD_STYLE: CSSProperties = {
  width: "100%",
  border: "0",
  outline: "none",
  height: "52px",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  color: "var(--text-primary)",
  background: "transparent",
};

const SR: CSSProperties = { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" };

/**
 * The closing navy band with its search box: the same form as the shared
 * FinalSearchBand (same action, fields and ids), drawn the way the design draws
 * it, with the grid and glow behind it and the heading's last words in the serif.
 */
export function FinalBand({
  heading,
  service,
  base = "var(--ink)",
  backdrop = true,
}: {
  heading: ReactNode;
  service?: string;
  /** The band's colour: the design uses the ink on some pages and blue-900 on others. */
  base?: string;
  backdrop?: boolean;
}) {
  return (
    <section aria-labelledby="final-h2" style={{ position: "relative", overflow: "hidden", background: base }}>
      {backdrop ? (
        <DarkBackdrop />
      ) : (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: "-260px",
            width: "700px",
            height: "700px",
            marginLeft: "-350px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(45,116,215,0.30), rgba(45,116,215,0) 65%)",
            pointerEvents: "none",
          }}
        />
      )}
      <div style={{ position: "relative", maxWidth: "880px", margin: "0 auto", padding: "76px 24px", textAlign: "center" }}>
        <h2
          data-reveal=""
          id="final-h2"
          style={{
            fontSize: "clamp(28px, 3.4vw, 42px)",
            lineHeight: "1.06",
            fontWeight: "800",
            letterSpacing: "-0.04em",
            textWrap: "balance",
            color: "#fff",
            marginBottom: "24px",
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
            gap: "10px",
            background: "var(--surface-card)",
            borderRadius: "18px",
            boxShadow: "var(--shadow-xl)",
            padding: "8px",
            textAlign: "left",
          }}
        >
          <div style={{ flex: "1.15", padding: "0 14px" }}>
            <label htmlFor="fin-svc" style={SR}>
              Service
            </label>
            <input id="fin-svc" name="service" type="text" defaultValue={service} placeholder="What needs doing?" style={FIELD_STYLE} />
          </div>
          <div data-divider="" aria-hidden="true" style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }} />
          <div style={{ flex: "1", padding: "0 14px" }}>
            <label htmlFor="fin-loc" style={SR}>
              Location
            </label>
            <input id="fin-loc" name="location" type="text" autoComplete="postal-code" placeholder="City or ZIP" style={FIELD_STYLE} />
          </div>
          <button
            data-btn=""
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
      </div>
    </section>
  );
}
