import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { accentTail } from "@/components/ui/Accent";
import { ICON_PATHS, type IconName } from "@/lib/icon-paths";

/**
 * Where the design puts the serif accent in a guide heading: the last word of
 * a short heading, the last two of a longer one. The words are untouched.
 */
export function tail(text: string): ReactNode {
  const words = text.trim().split(/\s+/).length;
  return accentTail(text, words <= 3 ? 1 : 2);
}

/** The path list of an icon, one entry per stroke, so each can draw itself in. */
function strokes(name: IconName): string[] {
  return ICON_PATHS[name]
    .split(/\s(?=M)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

type TileTone = "blue" | "amber";

/**
 * The rounded icon tile with the gold "10" in its corner. The skin recolours
 * it and the hover rules turn it navy; this only carries the markup.
 */
export function Tile({
  icon,
  size = 40,
  iconSize,
  stroke = 1.9,
  tone = "blue",
  flex,
}: {
  icon: IconName;
  size?: number;
  iconSize?: number;
  stroke?: number;
  tone?: TileTone;
  flex?: boolean;
}) {
  const amber = tone === "amber";
  const radius = size >= 44 ? 12 : size >= 38 ? 11 : 10;
  const ten = Math.round(size * 0.5);
  const style: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: `${radius}px`,
    background: amber ? "var(--amber-50)" : "var(--blue-50)",
    color: amber ? "#8A5F0B" : "var(--color-primary)",
    border: amber ? "1px solid #EBCE95" : "1px solid var(--blue-100)",
    flexShrink: 0,
    ...(flex ? { flex: `0 0 ${size}px` } : null),
  };
  return (
    <span data-tile="" aria-hidden="true" style={style}>
      <span
        data-ten=""
        style={{
          position: "absolute",
          right: "-3px",
          bottom: size >= 40 ? "-7px" : "-6px",
          fontSize: `${ten}px`,
          fontWeight: "800",
          letterSpacing: "-0.08em",
          lineHeight: "1",
          color: amber ? "#8A5F0B" : "var(--ink)",
          opacity: amber ? 0.14 : 0.08,
        }}
      >
        10
      </span>
      <svg
        data-ico=""
        width={iconSize ?? Math.round(size * 0.5)}
        height={iconSize ?? Math.round(size * 0.5)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: "relative" }}
      >
        {strokes(icon).map((d) => (
          <path key={d} pathLength={1} d={d} />
        ))}
      </svg>
    </span>
  );
}

/** The arrow that nudges right when its link is hovered. */
export function LinkArrow() {
  return (
    <svg
      data-arrow=""
      width="15"
      height="15"
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

/** A text link with the nudging arrow. */
export function ArrowLink({
  href,
  children,
  size = 15,
  weight = 600,
}: {
  href: string;
  children: ReactNode;
  size?: number;
  weight?: number;
}) {
  return (
    <Link data-link="" href={href} style={{ fontSize: `${size}px`, fontWeight: `${weight}` }}>
      {children}
      <LinkArrow />
    </Link>
  );
}

/** The faint grid, the pointer-lit grid and the soft blue blob behind a guide hero. */
export function HeroBackdrop() {
  const grid = (alpha: number): CSSProperties => ({
    position: "absolute",
    inset: 0,
    backgroundImage: `linear-gradient(rgba(16,31,61,${alpha}) 1px, transparent 1px), linear-gradient(90deg, rgba(16,31,61,${alpha}) 1px, transparent 1px)`,
    backgroundSize: "56px 56px",
    pointerEvents: "none",
  });
  return (
    <>
      <div aria-hidden="true" style={grid(0.025)} />
      <div
        aria-hidden="true"
        style={{
          ...grid(0.07),
          WebkitMaskImage: "radial-gradient(520px 420px at var(--mx) var(--my), #000, transparent 75%)",
          maskImage: "radial-gradient(520px 420px at var(--mx) var(--my), #000, transparent 75%)",
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
    </>
  );
}

/**
 * The h1 of a guide: the title as written, with its last words in the serif
 * accent and the gold underline that draws in beneath them.
 */
export function HeroTitle({ text }: { text: string }) {
  const parts = text.trim().split(/(\s+)/);
  const words = parts.filter((part) => /\S/.test(part));
  const count = words.length <= 3 ? 1 : 2;
  if (words.length <= count) return <>{text}</>;
  const idx = parts.map((part, i) => (/\S/.test(part) ? i : -1)).filter((i) => i >= 0);
  const cut = idx[idx.length - count];
  return (
    <>
      {parts.slice(0, cut).join("")}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          fontFamily: "var(--serif)",
          fontStyle: "italic",
          fontWeight: "400",
          letterSpacing: "-0.02em",
          paddingRight: "0.06em",
        }}
      >
        {parts.slice(cut).join("")}
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
            zIndex: -1,
          }}
        />
      </span>
    </>
  );
}

/** One collapsible question, with the design's own padding. */
export function GuideFaq({ question, answer }: { question: string; answer: string }) {
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
          <svg
            width="19"
            height="19"
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
        <p style={{ padding: "0 0 18px", fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)" }}>{answer}</p>
      </details>
    </li>
  );
}
