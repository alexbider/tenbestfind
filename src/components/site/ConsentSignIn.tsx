"use client";

import { useActionState, useEffect, useState } from "react";
import { consentSignIn, type ConsentState } from "@/app/actions/mcp-consent";

const initial: ConsentState = { status: "idle" };

export function ConsentSignIn({ next }: { next: string }) {
  const [state, action, pending] = useActionState(consentSignIn, initial);

  // The form is submitted by a client action, so before this component has
  // hydrated the button does nothing at all: the page reloads and the typed
  // password is gone. It is a short window, and somebody who types quickly
  // will land in it and conclude the site is broken. So the button says it is
  // not ready yet rather than pretending it is.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

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

      <button type="submit" className="btn btn--primary" disabled={pending || !ready}>
        {pending ? "Signing in…" : "Sign in to continue"}
      </button>
    </form>
  );
}
