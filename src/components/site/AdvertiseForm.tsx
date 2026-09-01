"use client";

import { useActionState } from "react";
import { submitAdvertising, type AdvertiseState } from "@/app/actions/business";
import { Check } from "@/components/ui/Icon";

const initial: AdvertiseState = { status: "idle" };

export function AdvertiseForm() {
  const [state, action, pending] = useActionState(submitAdvertising, initial);

  return (
    <form action={action} className="card" style={{ padding: "28px 30px", maxWidth: 620 }}>
      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field">
        <label htmlFor="ad-company">Company</label>
        <input id="ad-company" name="company" type="text" />
      </div>
      <div className="field">
        <label htmlFor="ad-email">Email</label>
        <input id="ad-email" name="email" type="email" autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="ad-markets">Which markets?</label>
        <input id="ad-markets" name="markets" type="text" placeholder="Dallas, Fort Worth, Plano" />
        <span className="field__hint">City and trade, so we can check what is available.</span>
      </div>
      <div className="field">
        <label htmlFor="ad-message">Anything else</label>
        <textarea id="ad-message" name="message" rows={5} />
      </div>
      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? "Sending…" : "Request a quote"}
      </button>
      <p style={{ marginTop: 14, fontSize: 13, color: "var(--text-muted)" }}>
        Every placement goes through an eligibility review first. We do not sell placements to
        companies that would not meet the minimum standards for the ranking.
      </p>
    </form>
  );
}
