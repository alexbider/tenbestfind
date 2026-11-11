"use client";

import { useActionState, type CSSProperties } from "react";
import { changeOwnPassword, type PasswordState } from "@/app/actions/portal";

const initial: PasswordState = { status: "idle" };

const field: CSSProperties = {
  height: "44px",
  padding: "0 12px",
  border: "1px solid var(--border-strong)",
  borderRadius: "10px",
  fontFamily: "var(--font-sans)",
  fontSize: "15px",
  background: "var(--surface-card)",
  color: "var(--text-primary)",
  width: "100%",
};

const label: CSSProperties = { fontSize: "13.5px", fontWeight: 650, color: "var(--ink)", marginBottom: "6px", display: "block" };

/** Current password, then the new one twice. The server repeats every check. */
export function PasswordForm({ minLength, email }: { minLength: number; email: string }) {
  const [state, action, pending] = useActionState(changeOwnPassword, initial);
  return (
    <form action={action} style={{ display: "grid", gap: "14px", maxWidth: 420 }}>
      {/* Lets password managers file the new password under the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div>
        <label htmlFor="pw-current" style={label}>
          Current password
        </label>
        <input id="pw-current" name="current" type="password" autoComplete="current-password" required style={field} />
      </div>
      <div>
        <label htmlFor="pw-new" style={label}>
          New password
        </label>
        <input
          id="pw-new"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={minLength}
          required
          style={field}
          aria-describedby="pw-new-hint"
        />
        <p id="pw-new-hint" style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>
          At least {minLength} characters.
        </p>
      </div>
      <div>
        <label htmlFor="pw-confirm" style={label}>
          New password again
        </label>
        <input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" minLength={minLength} required style={field} />
      </div>
      {state.status !== "idle" && state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={state.status === "error" ? "form-error" : undefined}
          style={state.status === "ok" ? { fontSize: 14, fontWeight: 600, color: "#178054" } : undefined}
        >
          {state.message}
        </p>
      ) : null}
      <p>
        <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </button>
      </p>
    </form>
  );
}
