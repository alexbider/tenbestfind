"use client";

import { useActionState } from "react";
import { consentSignIn, type ConsentState } from "@/app/actions/mcp-consent";

const initial: ConsentState = { status: "idle" };

export function ConsentSignIn({ next }: { next: string }) {
  const [state, action, pending] = useActionState(consentSignIn, initial);

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in to continue"}
      </button>
    </form>
  );
}
