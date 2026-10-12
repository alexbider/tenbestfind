"use client";

import { useActionState, useEffect } from "react";
import { resendClaimCode, verifyClaimCode, type CodeState } from "@/app/actions/claim-verify";

const initial: CodeState = { status: "idle" };

const notice = (tone: "error" | "ok") =>
  ({
    padding: "12px 14px",
    borderRadius: "12px",
    fontSize: "14.5px",
    fontWeight: 600,
    lineHeight: 1.55,
    background: tone === "error" ? "#FDF1EE" : "var(--blue-50)",
    border: `1px solid ${tone === "error" ? "#F3C6BB" : "var(--blue-100)"}`,
    color: tone === "error" ? "var(--maple-600)" : "var(--ink)",
  }) as const;

/** The six-digit code entry for email-verified claims, plus a resend link. */
export function ClaimCodeForm({ claimId, maskedEmail }: { claimId: string; maskedEmail: string }) {
  const [state, verify, verifying] = useActionState(verifyClaimCode, initial);
  const [resent, resend, resending] = useActionState(resendClaimCode, initial);

  // A verified, paid claim signs the buyer in, so send them to their dashboard.
  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);

  if (state.status === "ok") {
    return (
      <div role="status" style={notice("ok")}>
        {state.message}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <form action={verify} style={{ display: "grid", gap: "10px" }}>
        <input type="hidden" name="claimId" value={claimId} />
        <label htmlFor="claim-code" style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
          Verification code
        </label>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
          We emailed a six-digit code to {maskedEmail}. It works for 30 minutes.
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            id="claim-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            required
            placeholder="000000"
            style={{
              height: "50px",
              width: "180px",
              padding: "0 16px",
              border: "1px solid var(--border-strong)",
              borderRadius: "12px",
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              fontSize: "22px",
              letterSpacing: "6px",
              background: "var(--surface-card)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            disabled={verifying}
            style={{
              height: "50px",
              padding: "0 24px",
              border: 0,
              borderRadius: "12px",
              background: "var(--color-primary)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: "15.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {verifying ? "Checking…" : "Verify"}
          </button>
        </div>
        {state.status === "error" ? (
          <p role="alert" style={notice("error")}>
            {state.message}
          </p>
        ) : null}
      </form>

      <form action={resend} style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <input type="hidden" name="claimId" value={claimId} />
        <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>No email after a few minutes?</span>
        <button
          type="submit"
          disabled={resending}
          style={{
            border: 0,
            background: "none",
            padding: 0,
            color: "var(--color-primary)",
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          {resending ? "Sending…" : "Send a new code"}
        </button>
        {resent.status === "sent" || resent.status === "error" ? (
          <p role="status" style={{ ...notice(resent.status === "error" ? "error" : "ok"), width: "100%" }}>
            {resent.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
