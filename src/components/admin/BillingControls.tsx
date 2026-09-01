"use client";

import { useActionState } from "react";
import { openBillingPortal, syncPlans, type BillingState } from "@/app/actions/admin-billing";
import { Check, Icon } from "@/components/ui/Icon";

const initial: BillingState = { status: "idle" };

export function SyncPlansButton({ disabled }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(syncPlans, initial);

  return (
    <form action={action}>
      {state.status === "ok" ? (
        <p className="form-success" style={{ marginBottom: 12 }}>
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="form-error" style={{ marginBottom: 12 }}>
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="btn btn--secondary btn--sm" disabled={pending || disabled}>
        <Icon name="refresh" size={15} />
        {pending ? "Syncing…" : "Sync plans to Stripe"}
      </button>
    </form>
  );
}

export function BillingPortalButton({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(openBillingPortal, initial);

  return (
    <form action={action}>
      <input type="hidden" name="businessId" value={businessId} />
      {state.status === "error" ? (
        <p className="form-error" style={{ marginBottom: 12 }}>
          {state.message}
        </p>
      ) : null}
      {state.status === "ok" && state.url ? (
        <p className="form-success" style={{ marginBottom: 12 }}>
          <Check size={18} />
          <a href={state.url} target="_blank" rel="noopener noreferrer">
            Open the Stripe billing portal
          </a>
        </p>
      ) : null}
      <button type="submit" className="btn btn--secondary btn--sm" disabled={pending}>
        <Icon name="card" size={15} />
        {pending ? "Opening…" : "Billing portal"}
      </button>
    </form>
  );
}
