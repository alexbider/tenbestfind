"use client";

import Link from "next/link";
import { useRef, type CSSProperties, type ReactNode } from "react";

/**
 * The "i" popovers on a company profile. Every claim on that page that is not
 * self-evident carries one saying where it came from, which is the point of
 * the design.
 *
 * They are anchored to their trigger, and a trigger can sit anywhere: the
 * badges one rides a wrapping row, so which end of the line it lands on
 * depends on the badge text and the viewport. That made the note run off the
 * right edge at some widths and not others, and no per-call-site "open it
 * leftwards" flag can be right at every width. So the note measures itself
 * when it opens and slides back inside the viewport when it has to, which is
 * the only version of this that cannot be got wrong by a later caller.
 */
const POP_NOTE = {
  position: "absolute",
  top: "calc(100% + 10px)",
  left: "0",
  zIndex: "180",
  background: "var(--blue-900)",
  color: "var(--text-on-ink)",
  borderRadius: "16px",
  boxShadow: "var(--shadow-xl)",
  padding: "20px 22px",
  // Narrower than the viewport whatever the caller asked for, so the slide
  // below only ever has to move it, never shrink it.
  maxWidth: "calc(100vw - 24px)",
} as const;

const POP_SUMMARY = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  fontSize: "13px",
  fontWeight: "600",
  color: "var(--text-secondary)",
} as const;

const POP_MARK = {
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
} as const;

/** Clear of the edge by this much, so the shadow is not cut in half either. */
const GUTTER = 12;

export function Pop({
  label,
  children,
  width = "min(420px, 78vw)",
  align = "left",
  above = false,
  small = false,
  style,
}: {
  label: string;
  children: ReactNode;
  width?: string;
  align?: "left" | "right";
  above?: boolean;
  /** The trigger that sits beside a panel heading, a size down from the rest. */
  small?: boolean;
  style?: CSSProperties;
}) {
  const note = useRef<HTMLDivElement>(null);

  const settle = (event: React.SyntheticEvent<HTMLDetailsElement>) => {
    const el = note.current;
    if (!el) return;
    // Measure from where it wants to be, not from where it was nudged to last
    // time, or a second open would compound the first.
    el.style.transform = "";
    if (!event.currentTarget.open) return;

    const room = document.documentElement.clientWidth - GUTTER;
    const box = el.getBoundingClientRect();
    if (box.right > room) {
      // Never so far that it falls off the other edge instead.
      const shift = Math.min(box.right - room, Math.max(box.left - GUTTER, 0));
      if (shift > 0) el.style.transform = `translateX(${-shift}px)`;
    } else if (box.left < GUTTER) {
      el.style.transform = `translateX(${GUTTER - box.left}px)`;
    }
  };

  return (
    <details data-pop="" onToggle={settle} style={{ position: "relative", ...style }}>
      <summary aria-label={label} style={small ? { ...POP_SUMMARY, gap: "6px", fontSize: "12px" } : POP_SUMMARY}>
        <span style={small ? { ...POP_MARK, width: "17px", height: "17px", fontSize: "10px" } : POP_MARK}>i</span>
        {label}
      </summary>
      <div
        ref={note}
        role="note"
        style={{
          ...POP_NOTE,
          width,
          ...(align === "right" ? { left: "auto", right: "0" } : null),
          ...(above ? { top: "auto", bottom: "calc(100% + 10px)" } : null),
        }}
      >
        {children}
      </div>
    </details>
  );
}

export function PopText({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: "13px", lineHeight: "1.65", color: "rgba(232,237,245,0.88)" }}>{children}</p>;
}

export function PopLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p style={{ marginTop: "14px" }}>
      <Link href={href} style={{ fontSize: "13px", fontWeight: "600", color: "#E8B551" }}>
        {children}
      </Link>
    </p>
  );
}
