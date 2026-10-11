import type { CSSProperties, ReactNode } from "react";
import { Accent } from "@/components/ui/Accent";

/* The small pieces the company profile is drawn from. Kept next to the page so
   the page itself can stay about what the profile says rather than how a tick
   is drawn. */

export const SHELL = { maxWidth: "1240px", margin: "0 auto" } as const;

export const H2_BASE: CSSProperties = {
  fontSize: "clamp(26px, 3vw, 36px)",
  lineHeight: "1.08",
  fontWeight: "800",
  letterSpacing: "-0.035em",
};

export const H2_LARGE: CSSProperties = {
  fontSize: "clamp(28px, 3.4vw, 42px)",
  lineHeight: "1.06",
  fontWeight: "800",
  letterSpacing: "-0.04em",
};

/** The white card most of the profile's lists sit in. */
export const CARD: CSSProperties = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "22px",
  padding: "22px 24px",
};

/** The gold star the rating lines are built from. */
export function Star({ size = 20, filled = true }: { size?: number; filled?: boolean }) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#D99A1C" stroke="none" aria-hidden="true">
      <path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D99A1C" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 2.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 8.7l5.8-.8z" />
    </svg>
  );
}

/** The tick used on every "we checked this" list. */
export function Tick({
  colour,
  size = 16,
  nudge = true,
  weight = 2.2,
}: {
  colour: string;
  size?: number;
  nudge?: boolean;
  weight?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colour}
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: "0", ...(nudge ? { marginTop: "3px" } : null) }}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** The caution mark, for the things worth checking before signing. */
export function Caution({ colour, size = 16, nudge = true }: { colour: string; size?: number; nudge?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colour}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: "0", ...(nudge ? { marginTop: "3px" } : null) }}
    >
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

/** The chevron that ends every row link. */
export function RowChevron({ size = 15, arrow = false }: { size?: number; arrow?: boolean }) {
  return (
    <svg
      data-arrow={arrow ? "" : undefined}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: "0" }}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/** The arrow that follows a text link; it nudges right when the link is hovered. */
export function ArrowRight({ size = 15, inline = true }: { size?: number; inline?: boolean }) {
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
      style={inline ? { display: "inline-block", verticalAlign: "-0.18em", marginLeft: "6px" } : undefined}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/**
 * Splits a company name so its last words can be set in the serif accent, the
 * way the design sets "Roofing Co." in "Lone Star Roofing Co.". A name of one
 * word is left plain. The words and their order are untouched.
 */
export function splitName(name: string): { head: string; tail: string } {
  const parts = name.trim().split(/(\s+)/);
  const wordIdx = parts.map((part, i) => (/\S/.test(part) ? i : -1)).filter((i) => i >= 0);
  if (wordIdx.length < 2) return { head: name, tail: "" };
  const take = Math.min(2, wordIdx.length - 1);
  const cut = wordIdx[wordIdx.length - take];
  return { head: parts.slice(0, cut).join(""), tail: parts.slice(cut).join("") };
}

/** "Our Take on {name}" and its kin: the lead-in, the name, and the accented tail of both. */
export function NameHeading({ lead = "", name, trail = "" }: { lead?: string; name: string; trail?: string }) {
  const { head, tail } = splitName(name);
  if (!tail) {
    return (
      <>
        {lead}
        {name}
        {trail ? <Accent>{trail.trim()}</Accent> : null}
      </>
    );
  }
  return (
    <>
      {lead}
      {head}
      <Accent>
        {tail}
        {trail}
      </Accent>
    </>
  );
}

/** The gold rule and label that opens most sections. */
export function Eyebrow({ children, marginBottom = "10px" }: { children: ReactNode; marginBottom?: string }) {
  return (
    <p
      data-reveal=""
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "11.5px",
        fontWeight: "700",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--gold)",
        marginBottom,
      }}
    >
      <span aria-hidden="true" style={{ width: "22px", height: "2px", background: "var(--gold-ink)" }} />
      {children}
    </p>
  );
}

/** The navy eyebrow used at the top of the facts and the editorial review. */
export function NavyEyebrow({ children, marginBottom }: { children: ReactNode; marginBottom: string }) {
  return (
    <p data-reveal="" data-eyebrow="" style={{ marginBottom }}>
      <span data-eyebrow-rule="" aria-hidden="true" />
      {children}
    </p>
  );
}

/** A 38px icon tile that heads a card title. */
export function TitleTile({
  tone,
  children,
}: {
  tone: "green" | "gold";
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "38px",
        height: "38px",
        borderRadius: "12px",
        background: tone === "green" ? "var(--green-50)" : "var(--gold-soft)",
        border: tone === "green" ? "1px solid var(--green-100)" : "1px solid #EBCE95",
        color: tone === "green" ? "#178054" : "var(--gold)",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

/** The "10" mark that sits in the corner of a navy icon tile. */
export function TenMark({ size, right = "-3px", bottom = "-6px", opacity = 0.32 }: { size: number; right?: string; bottom?: string; opacity?: number }) {
  return (
    <span
      data-ten=""
      style={{
        position: "absolute",
        right,
        bottom,
        fontSize: `${size}px`,
        fontWeight: "800",
        letterSpacing: "-0.08em",
        lineHeight: "1",
        color: "var(--gold-ink)",
        opacity,
      }}
    >
      10
    </span>
  );
}

/** The sticky "on this page" strip, with the reading-progress bar under it. */
export function ProfileToc({ items }: { items: { href: string; label: string }[] }) {
  if (items.length === 0) return null;
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
          ...SHELL,
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
            flexShrink: "0",
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
