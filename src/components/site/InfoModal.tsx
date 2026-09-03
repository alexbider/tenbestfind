"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";

/**
 * The "i" button and dialog the hub pages use for their disclosures. A real
 * <dialog>, so Escape and the backdrop behave the way people expect, and the
 * content is in the markup either way for anyone reading without JavaScript.
 */
export function InfoModal({
  label,
  srLabel,
  title,
  children,
  points,
  link,
}: {
  /** Visible text beside the "i". Empty renders the icon alone. */
  label: string;
  /** What a screen reader hears when the button carries no visible text. */
  srLabel?: string;
  title: string;
  children: ReactNode;
  points?: string[];
  link?: { href: string; label: string };
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        data-info=""
        aria-haspopup="dialog"
        aria-label={label ? undefined : (srLabel ?? title)}
        onClick={() => ref.current?.showModal()}
      >
        <span aria-hidden="true">i</span>
        {label}
      </button>
      <dialog ref={ref} aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-h`}>
        <div style={{ padding: "26px 28px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "12px" }}>
            <h2
              id={`${title.replace(/\s+/g, "-").toLowerCase()}-h`}
              style={{ fontSize: "20px", fontWeight: "700", color: "var(--blue-900)" }}
            >
              {title}
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => ref.current?.close()}
              style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-card)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <p style={{ fontSize: "15px", lineHeight: "1.7", color: "var(--text-secondary)" }}>{children}</p>
          {points && points.length > 0 ? (
            <ul style={{ display: "grid", gap: "8px", marginTop: "14px" }}>
              {points.map((point) => (
                <li key={point} style={{ display: "flex", gap: "9px", fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D74D7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "3px" }}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
          ) : null}
          {link ? (
            <p style={{ marginTop: "16px" }}>
              <Link href={link.href} style={{ fontSize: "14px", fontWeight: "600" }}>
                {link.label} →
              </Link>
            </p>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
