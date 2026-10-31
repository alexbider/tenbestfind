import type { CSSProperties, ReactNode } from "react";
import { TenOutline } from "@/components/site/page-parts";
import { accent, accentTail } from "@/components/ui/Accent";
import { ICON_PATHS, type IconName } from "@/lib/icon-paths";

/* ------------------------------------------------------------------
   Pieces the country and region hubs share and nothing else uses. They
   carry the design's inline styles and motion attributes, so a template
   only decides what goes in them.
   ------------------------------------------------------------------ */

const MASK = "radial-gradient(520px 420px at var(--mx) var(--my), #000, transparent 75%)";

/**
 * The light hero's backdrop: a faint grid, a brighter copy that follows the
 * pointer, a blue glow and the outlined "10". Goes first inside a `data-hero`
 * section whose background is var(--paper).
 */
export function HeroBackdrop() {
  const grid = (alpha: number): CSSProperties => ({
    position: "absolute",
    inset: "0",
    backgroundImage: `linear-gradient(rgba(16,31,61,${alpha}) 1px, transparent 1px), linear-gradient(90deg, rgba(16,31,61,${alpha}) 1px, transparent 1px)`,
    backgroundSize: "56px 56px",
    pointerEvents: "none",
  });
  return (
    <>
      <div aria-hidden="true" style={grid(0.025)} />
      <div aria-hidden="true" style={{ ...grid(0.07), WebkitMaskImage: MASK, maskImage: MASK }} />
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
      <TenOutline stroke="rgba(16,31,61,0.09)" strokeWidth={2} style={{ right: "-30px", top: "-40px" }} />
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
        top: "0",
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

/**
 * One collapsible question as the country design draws it: a ruled row with a
 * plus that turns. No box, so the skin's numbered-list treatment leaves it be.
 */
export function HubFaq({ question, answer }: { question: string; answer: string }) {
  return (
    <details data-faq="" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <summary
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "20px",
          padding: "22px 4px",
          fontSize: "18px",
          fontWeight: "700",
          lineHeight: "1.4",
          color: "var(--ink)",
          transition: "color 160ms var(--ease-out)",
        }}
      >
        <span>{question}</span>
        <span
          data-fq-ico=""
          aria-hidden="true"
          style={{ flexShrink: 0, display: "inline-flex", color: "var(--color-primary)", marginTop: "3px" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </span>
      </summary>
      <div style={{ padding: "0 44px 24px 4px" }}>
        <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)", textWrap: "pretty" }}>{answer}</p>
      </div>
    </details>
  );
}

/**
 * Where the design puts the serif accent in a heading: a named phrase when the
 * heading carries it ("in Texas"), otherwise its last few words. The words are
 * untouched either way.
 */
export function accentPhrase(text: string, phrase: string, fallbackWords = 2): ReactNode {
  return text.includes(phrase) ? accent(text, phrase) : accentTail(text, fallbackWords);
}

/** The path list of an icon, one entry per stroke, so each can draw itself in. */
function strokes(name: IconName): string[] {
  return ICON_PATHS[name]
    .split(/\s(?=M)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * The rounded icon tile with the gold "10" in its corner. The skin recolours
 * it and the hover rules turn it navy; this only carries the markup.
 */
export function Tile({
  icon,
  size = 40,
  iconSize,
  flex,
}: {
  icon: IconName;
  size?: number;
  iconSize?: number;
  flex?: boolean;
}) {
  const style: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: size >= 44 ? "12px" : "11px",
    background: "var(--blue-50)",
    color: "var(--color-primary)",
    border: "1px solid var(--blue-100)",
    flexShrink: 0,
    ...(flex ? { flex: `0 0 ${size}px` } : null),
  };
  const glyph = iconSize ?? Math.round(size * 0.5);
  return (
    <span data-tile="" aria-hidden="true" style={style}>
      <span
        data-ten=""
        style={{
          position: "absolute",
          right: "-3px",
          bottom: "-7px",
          fontSize: `${Math.round(size * 0.5)}px`,
          fontWeight: "800",
          letterSpacing: "-0.08em",
          lineHeight: "1",
          color: "var(--ink)",
          opacity: 0.08,
        }}
      ></span>
      <svg
        data-ico=""
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
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

/** The nudging arrow that ends a text link. */
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

/**
 * The h1 of a hub: the title as written, with `phrase` (or its last two words)
 * in the serif accent and the gold underline that draws in beneath it.
 */
export function HeroTitle({ text, phrase }: { text: string; phrase: string }) {
  const at = text.endsWith(phrase) ? text.length - phrase.length : -1;
  let head: string;
  let tail: string;
  if (at >= 0) {
    head = text.slice(0, at);
    tail = phrase;
  } else {
    const words = text.trim().split(/(\s+)/);
    const idx = words.map((w, i) => (/\S/.test(w) ? i : -1)).filter((i) => i >= 0);
    if (idx.length <= 2) return <>{text}</>;
    const cut = idx[idx.length - 2];
    head = words.slice(0, cut).join("");
    tail = words.slice(cut).join("");
  }
  return (
    <>
      {head}
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
        {tail}
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

const FIELD: CSSProperties = {
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
 * FinalSearchBand (same action, fields, ids and wording), drawn the way the
 * design draws it, with the grid and glow behind it.
 */
export function FinalBand({ heading, after }: { heading: ReactNode; after?: ReactNode }) {
  return (
    <section
      id="fs"
      aria-labelledby="final-h2"
      style={{ position: "relative", overflow: "hidden", background: "var(--ink)" }}
    >
      <DarkBackdrop />
      <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
        <h2
          data-reveal=""
          id="final-h2"
          style={{
            fontSize: "clamp(28px, 3.4vw, 42px)",
            lineHeight: "1.06",
            fontWeight: "800",
            letterSpacing: "-0.04em",
            color: "#fff",
            marginBottom: "22px",
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
            borderRadius: "18px",
            boxShadow: "var(--shadow-xl)",
            padding: "8px",
            textAlign: "left",
          }}
        >
          <div style={{ flex: "1.1", padding: "0 14px" }}>
            <label htmlFor="fin-svc" style={SR}>
              Service
            </label>
            <input id="fin-svc" name="service" type="text" placeholder="What needs doing?" style={FIELD} />
          </div>
          <div data-divider="" aria-hidden="true" style={{ width: "1px", alignSelf: "stretch", background: "var(--border-subtle)", margin: "8px 0" }} />
          <div style={{ flex: "0.9", padding: "0 14px" }}>
            <label htmlFor="fin-loc" style={SR}>
              Location
            </label>
            <input id="fin-loc" name="location" type="text" autoComplete="postal-code" placeholder="City or ZIP" style={FIELD} />
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
        {after ? <p style={{ marginTop: "18px" }}>{after}</p> : null}
      </div>
    </section>
  );
}
