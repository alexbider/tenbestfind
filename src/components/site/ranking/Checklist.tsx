"use client";

import { useState } from "react";

/**
 * The questions to ask before hiring, as a checklist a reader can tick off
 * while they are on the phone. Nothing is stored: it is a pencil, not a form.
 */
export function Checklist({ questions }: { questions: string[] }) {
  const [asked, setAsked] = useState<Record<number, boolean>>({});
  const done = Object.values(asked).filter(Boolean).length;
  const pct = questions.length > 0 ? Math.round((done / questions.length) * 100) : 0;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <span aria-hidden="true" style={{ flex: "1", height: "6px", borderRadius: "99px", background: "rgba(16,31,61,0.1)", overflow: "hidden" }}>
          <span
            style={{
              display: "block",
              height: "100%",
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--gold-ink), var(--color-primary))",
              borderRadius: "99px",
              transition: "width 500ms var(--spring)",
            }}
          />
        </span>
        <span aria-live="polite" style={{ fontSize: "12.5px", fontWeight: "700", color: "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {done} of {questions.length} asked
        </span>
      </div>
      <ul style={{ display: "grid", gap: "2px" }}>
        {questions.map((question, index) => (
          <li key={question}>
            <button
              data-q=""
              type="button"
              aria-pressed={Boolean(asked[index])}
              onClick={() => setAsked((state) => ({ ...state, [index]: !state[index] }))}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                width: "100%",
                padding: "9px 6px",
                border: "0",
                borderRadius: "10px",
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              <span
                data-qbox=""
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "22px",
                  height: "22px",
                  marginTop: "1px",
                  borderRadius: "7px",
                  border: "1.5px solid var(--border-strong)",
                  background: "var(--surface-card)",
                  color: "var(--gold-ink)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <span data-qtext="" style={{ fontSize: "14.5px", lineHeight: "1.5", color: "var(--text-primary)" }}>
                {question}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
