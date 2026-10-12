"use client";

import { useActionState, type CSSProperties } from "react";
import {
  completeSignIn,
  requestPasswordLink,
  requestSignInLink,
  setPassword,
  signInWithPassword,
  type AccountState,
} from "@/app/actions/client-login";
// Kept in step with MIN_PASSWORD_LENGTH in lib/auth-tokens, which the server checks.
// That module uses Node's crypto, so it cannot be imported into the browser bundle.
const MIN_PASSWORD_LENGTH = 10;

const initial: AccountState = { status: "idle" };

const field: CSSProperties = {
  height: "48px",
  padding: "0 14px",
  border: "1px solid var(--border-strong)",
  borderRadius: "12px",
  fontFamily: "var(--font-sans)",
  fontSize: "15.5px",
  background: "var(--surface-card)",
  color: "var(--text-primary)",
  width: "100%",
};

const primary: CSSProperties = {
  height: "48px",
  padding: "0 22px",
  border: 0,
  borderRadius: "12px",
  background: "var(--color-primary)",
  color: "#fff",
  fontFamily: "var(--font-sans)",
  fontSize: "15.5px",
  fontWeight: 600,
  cursor: "pointer",
};

const label: CSSProperties = { fontSize: "14px", fontWeight: 700, color: "var(--ink)", marginBottom: "6px", display: "block" };

const notice = (tone: "error" | "ok"): CSSProperties => ({
  padding: "12px 14px",
  borderRadius: "12px",
  fontSize: "14.5px",
  fontWeight: 600,
  lineHeight: 1.55,
  background: tone === "error" ? "#FDF1EE" : "var(--blue-50)",
  border: `1px solid ${tone === "error" ? "#F3C6BB" : "var(--blue-100)"}`,
  color: tone === "error" ? "var(--maple-600)" : "var(--ink)",
});

function Message({ state }: { state: AccountState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} style={notice(state.status === "error" ? "error" : "ok")}>
      {state.message}
    </p>
  );
}

/** Email and password, for owners who have set one. */
export function PasswordSignInForm() {
  const [state, action, pending] = useActionState(signInWithPassword, initial);
  return (
    <form action={action} style={{ display: "grid", gap: "12px" }}>
      <div>
        <label htmlFor="pw-email" style={label}>
          Email
        </label>
        <input id="pw-email" name="email" type="email" autoComplete="email" required style={field} />
      </div>
      <div>
        <label htmlFor="pw-password" style={label}>
          Password
        </label>
        <input id="pw-password" name="password" type="password" autoComplete="current-password" required style={field} />
      </div>
      <button type="submit" disabled={pending} style={primary}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <Message state={state} />
    </form>
  );
}

/** One email field, one action. Used for both the sign-in link and the password reset. */
function EmailOnlyForm({
  action,
  buttonLabel,
  id,
}: {
  action: (prev: AccountState, formData: FormData) => Promise<AccountState>;
  buttonLabel: string;
  id: string;
}) {
  const [state, submit, pending] = useActionState(action, initial);
  return (
    <form action={submit} style={{ display: "grid", gap: "12px" }}>
      <div>
        <label htmlFor={id} style={label}>
          Email you claimed with
        </label>
        <input id={id} name="email" type="email" autoComplete="email" required style={field} />
      </div>
      <button type="submit" disabled={pending} style={{ ...primary, background: "var(--surface-card)", color: "var(--color-primary)", border: "1px solid var(--color-primary)" }}>
        {pending ? "Sending…" : buttonLabel}
      </button>
      <Message state={state} />
    </form>
  );
}

export const EmailSignInLinkForm = () => (
  <EmailOnlyForm action={requestSignInLink} buttonLabel="Email me a sign-in link" id="link-email" />
);

export const ForgotPasswordForm = () => (
  <EmailOnlyForm action={requestPasswordLink} buttonLabel="Email me a link to set a new password" id="reset-email" />
);

/** The sign-in page. Options are shown together so the owner picks what suits them. */
export function LoginOptions({ googleEnabled, notice: banner }: { googleEnabled: boolean; notice?: string }) {
  return (
    <div style={{ display: "grid", gap: "28px" }}>
      {banner ? (
        <p role="alert" style={notice("error")}>
          {banner}
        </p>
      ) : null}

      <section>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Sign in with a password</h2>
        <PasswordSignInForm />
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--color-primary)" }}>
            Forgot your password?
          </summary>
          <div style={{ marginTop: 12 }}>
            <ForgotPasswordForm />
          </div>
        </details>
      </section>

      <section>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Email me a sign-in link</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.6 }}>
          No password needed. The link works once and expires after 15 minutes.
        </p>
        <EmailSignInLinkForm />
      </section>

      {googleEnabled ? (
        <section>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Sign in with Google</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.6 }}>
            Use the Google account that has the same address you claimed with.
          </p>
          <a href="/api/auth/google/" style={{ ...primary, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Continue with Google
          </a>
        </section>
      ) : null}
    </div>
  );
}

/** Choose a password from the link in the welcome email. */
export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(setPassword, initial);
  return (
    <form action={action} style={{ display: "grid", gap: "12px" }}>
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="new-password" style={label}>
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          style={field}
        />
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>At least {MIN_PASSWORD_LENGTH} characters.</span>
      </div>
      <div>
        <label htmlFor="confirm-password" style={label}>
          Type it again
        </label>
        <input
          id="confirm-password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          style={field}
        />
      </div>
      <button type="submit" disabled={pending} style={primary}>
        {pending ? "Saving…" : "Save password and open my dashboard"}
      </button>
      <Message state={state} />
    </form>
  );
}

/** Spends an emailed sign-in link. The button is pressed by the owner, not by the link itself. */
export function ConfirmSignInForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(completeSignIn, initial);
  return (
    <form action={action} style={{ display: "grid", gap: "12px" }}>
      <input type="hidden" name="token" value={token} />
      <button type="submit" disabled={pending} style={primary}>
        {pending ? "Signing in…" : "Sign in to my dashboard"}
      </button>
      <Message state={state} />
    </form>
  );
}
