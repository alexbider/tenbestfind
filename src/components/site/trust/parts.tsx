import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Chevron, TenOutline } from "@/components/site/page-parts";
import { ICON_PATHS, type IconName } from "@/lib/icon-paths";

/* ------------------------------------------------------------------
   Pieces the trust and utility pages share (how we rank, experts, search,
   for businesses, the CMS pages). They carry the design's inline styles and
   its motion attributes, so a page only decides what goes in them. Copied
   from the other templates' helpers so each page family owns its own.
   ------------------------------------------------------------------ */

const MASK = "radial-gradient(520px 420px at var(--mx) var(--my), #000, transparent 75%)";

/**
 * The light hero's backdrop: a faint grid, a brighter copy that follows the
 * pointer, a blue glow and the outlined "10". Goes first inside a `data-hero`
 * section whose background is var(--paper).
 */
export function HeroBackdrop({
  outline = { right: "-30px", top: "-40px" },
  blob = { right: "-8%", top: "-25%" },
}: {
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
export function DarkBackdrop({ blob }: { blob?: CSSProperties }) {
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
          ...blob,
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
    <p data-reveal={hero ? undefined : ""} data-in={hero} data-eyebrow="" style={{ marginBottom: gap, ...style }}>
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
  dark?: boolean;
}) {
  return (
    <Link data-link="" data-darklink={dark ? "" : undefined} href={href} style={style}>
      {children}
      <NudgeArrow />
    </Link>
  );
}

/** The icon tile with the corner "10". `blue` is the quiet tile, `amber` the gold one. */
export function Tile({
  icon,
  size = 42,
  iconSize,
  tone = "blue",
  flex,
  radius,
  style,
}: {
  icon: IconName;
  size?: number;
  iconSize?: number;
  tone?: "blue" | "amber";
  flex?: boolean;
  radius?: string;
  style?: CSSProperties;
}) {
  const amber = tone === "amber";
  const ten = size >= 46 ? 24 : size >= 44 ? 23 : size >= 42 ? 22 : size >= 40 ? 21 : 20;
  const ico = iconSize ?? Math.round(size / 2);
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
        borderRadius: radius ?? (size >= 46 ? "14px" : size >= 38 ? "12px" : "11px"),
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
          bottom: amber ? "-8px" : size >= 40 ? "-7px" : "-6px",
          fontSize: `${ten}px`,
          fontWeight: "800",
          letterSpacing: "-0.08em",
          lineHeight: "1",
          color: amber ? "#8A5F0B" : "var(--ink)",
          opacity: amber ? "0.14" : "0.08",
        }}
      >
        10
      </span>
      <svg
        data-ico=""
        width={ico}
        height={ico}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
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
export function SectionToc({ items, top = "76px" }: { items: { href: string; label: string }[]; top?: string }) {
  return (
    <nav
      aria-label="On this page"
      data-toc=""
      style={{
        position: "sticky",
        top,
        zIndex: "150",
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(12px)",
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
          gap: "16px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        <span
          style={{
            flexShrink: 0,
            whiteSpace: "nowrap",
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
            <li key={item.href} style={{ flexShrink: "0" }}>
              <a
                href={item.href}
                data-on="0"
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

/** The thin reading-progress line fixed to the top edge of the window. */
export function PageProgress() {
  return (
    <span aria-hidden="true" style={{ position: "fixed", left: "0", right: "0", top: "0", height: "3px", zIndex: "300", pointerEvents: "none" }}>
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
  );
}

/** One collapsible question, drawn the way the design draws it (the skin numbers the list). */
export function FaqRow({ question, answer }: { question: string; answer: string }) {
  return (
    <li>
      <details
        data-faq=""
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "2px 20px",
        }}
      >
        <summary
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            padding: "17px 0",
            fontSize: "16px",
            fontWeight: "700",
            color: "var(--blue-900)",
          }}
        >
          {question}
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <p style={{ padding: "0 0 18px", fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)" }}>{answer}</p>
      </details>
    </li>
  );
}

/**
 * A wrapping auto-fit grid whose minimum track and gap are also written as
 * custom properties. On a phone the older shared stylesheet rewrites these
 * grids from their inline text; v2-*.css puts them back from these properties
 * (the grid must carry data-ag: "one" for a single column, "auto" to let it fall to as many columns as fit).
 */
export function autoGrid(
  min: number,
  gap: string,
  space?: { padding?: string; marginTop?: string; marginBottom?: string },
): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap,
    ...(space?.padding ? { padding: space.padding } : null),
    ...(space?.marginTop ? { marginTop: space.marginTop } : null),
    ...(space?.marginBottom ? { marginBottom: space.marginBottom } : null),
    ["--ag-min" as string]: `${min}px`,
    ["--ag-gap" as string]: gap,
    ["--ag-pad" as string]: space?.padding ?? "0",
    ["--ag-mt" as string]: space?.marginTop ?? "0",
    ["--ag-mb" as string]: space?.marginBottom ?? "0",
  };
}

/** A link row the way the utility pages draw them: an icon tile, a label, an optional second line and a chevron. */
export function LinkRow({ href, label, meta, icon }: { href: string; label: string; meta?: string; icon: IconName }) {
  return (
    <li>
      <Link
        data-row=""
        href={href}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 18px",
          background: "var(--surface-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "14px",
          textDecoration: "none",
          color: "var(--blue-900)",
        }}
      >
        <Tile icon={icon} size={36} iconSize={17} flex />
        <span style={{ display: "block", minWidth: "0" }}>
          <span style={{ display: "block", fontSize: "15px", fontWeight: "600" }}>{label}</span>
          {meta ? <span style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)" }}>{meta}</span> : null}
        </span>
        <span style={{ marginLeft: "auto", display: "inline-flex" }}>
          <Chevron />
        </span>
      </Link>
    </li>
  );
}
