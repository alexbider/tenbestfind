"use client";

import { useActionState } from "react";
import { submitAdvertising, type AdvertiseState } from "@/app/actions/business";

const initial: AdvertiseState = { status: "idle" };

const INPUT = {
  height: "50px",
  padding: "0 16px",
  border: "1px solid var(--border-strong)",
  borderRadius: "12px",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  width: "100%",
  background: "var(--surface-card)",
  color: "var(--text-primary)",
} as const;

const LABEL = { fontSize: "14px", fontWeight: "700", color: "var(--ink)" } as const;

/** The advertising quote card, October 2026 design. Posts to the same server action as before. */
export function AdvertiseForm() {
  const [state, action, pending] = useActionState(submitAdvertising, initial);

  return (
    <div style={{ borderRadius: "22px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
      <div style={{ padding: "26px 28px 0" }}>
        <h3 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.03em", marginBottom: "6px" }}>Request a quote</h3>
        <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>Tell us the markets and we will check what inventory is available.</p>
      </div>
      {state.status === "ok" ? (
        <div role="status" style={{ margin: "24px 28px 28px", padding: "24px", borderRadius: "16px", background: "var(--blue-50)", border: "1px solid var(--blue-100)" }}>
          <p style={{ fontSize: "17px", fontWeight: "700", color: "var(--ink)", marginBottom: "4px" }}>Thanks, we have your request.</p>
          <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>{state.message}</p>
        </div>
      ) : (
        <form action={action} data-quote="" style={{ padding: "24px 28px 28px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "18px" }}>
          {state.status === "error" ? (
            <p role="alert" style={{ gridColumn: "1 / -1", padding: "12px 14px", borderRadius: "12px", background: "#FDF1EE", border: "1px solid #F3C6BB", fontSize: "14.5px", fontWeight: "600", color: "var(--maple-600)" }}>
              {state.message}
            </p>
          ) : null}
          <label data-half="" style={{ display: "grid", gap: "8px" }}>
            <span style={LABEL}>Company</span>
            <input data-fin="" required name="company" type="text" placeholder="Your company" autoComplete="organization" style={INPUT} />
          </label>
          <label data-half="" style={{ display: "grid", gap: "8px" }}>
            <span style={LABEL}>Email</span>
            <input data-fin="" required name="email" type="email" placeholder="you@company.com" autoComplete="email" style={INPUT} />
          </label>
          <label style={{ gridColumn: "1 / -1", display: "grid", gap: "8px" }}>
            <span style={LABEL}>Which markets?</span>
            <input data-fin="" required name="markets" type="text" placeholder="e.g. Roofing in Tampa, FL and Orlando, FL" style={INPUT} />
            <span style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>City and trade, so we can check what is available.</span>
          </label>
          <label style={{ gridColumn: "1 / -1", display: "grid", gap: "8px" }}>
            <span style={LABEL}>Anything else</span>
            <textarea data-fin="" name="message" rows={4} style={{ ...INPUT, height: "auto", padding: "14px 16px", resize: "vertical" }} />
          </label>
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", paddingTop: "6px" }}>
            <p style={{ flex: "1", minWidth: "220px", fontSize: "13.5px", lineHeight: "1.55", color: "var(--text-secondary)" }}>
              Every placement goes through an eligibility review first. We do not sell placements to companies that would not meet the minimum standards for the ranking.
            </p>
            <button
              data-btnp=""
              type="submit"
              disabled={pending}
              style={{
                height: "50px",
                padding: "0 26px",
                border: "0",
                borderRadius: "12px",
                background: "var(--color-primary)",
                color: "#fff",
                fontFamily: "var(--font-sans)",
                fontSize: "15.5px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "var(--shadow-primary)",
              }}
            >
              {pending ? "Sending…" : "Request a quote"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
