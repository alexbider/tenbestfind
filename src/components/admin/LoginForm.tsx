"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/actions/admin-auth";
import { LogoMark } from "@/components/site/Logo";

const initial: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <div className="login">
      <form action={action} className="login__card">
        <p className="login__brand">
          <LogoMark size={26} />
          TenBestFind
        </p>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Sign in to the admin</h1>
        <p style={{ fontSize: 14.5, color: "var(--text-secondary)", marginBottom: 24 }}>
          Staff accounts only. Everything you change here is recorded in the audit log.
        </p>

        {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>

        <p className="login__hint">
          Seeded accounts: admin@tenbestfind.com and editor@tenbestfind.com, password
          tenbest2026. Change them before this goes anywhere near production.
        </p>
      </form>
    </div>
  );
}
