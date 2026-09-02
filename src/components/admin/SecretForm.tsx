"use client";

import { useActionState } from "react";
import { saveSecret } from "@/app/actions/admin-import";
import type { ActionState } from "@/app/actions/admin-system";
import { Check } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

/**
 * One credential. The value is never sent back to the browser after it is
 * saved, so the field is always blank and the row states what is on file.
 */
export function SecretForm({
  secretKey,
  label,
  hint,
  set,
  last4,
  fromEnv,
}: {
  secretKey: string;
  label: string;
  hint: string;
  set: boolean;
  last4: string | null;
  fromEnv: boolean;
}) {
  const [state, action, pending] = useActionState(saveSecret, initial);

  return (
    <form action={action} style={{ marginBottom: 22 }}>
      <input type="hidden" name="key" value={secretKey} />

      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field">
        <label htmlFor={secretKey}>{label}</label>
        <input
          id={secretKey}
          name="value"
          type="password"
          autoComplete="off"
          placeholder={
            fromEnv
              ? "Set on the server, and the server value wins"
              : set
                ? `On file, ending ${last4}. Type to replace, or save empty to remove.`
                : "Paste the key"
          }
          disabled={fromEnv}
        />
        <span className="field__hint">{hint}</span>
      </div>

      {fromEnv ? null : (
        <button type="submit" className="btn btn--secondary btn--sm" disabled={pending}>
          {pending ? "Saving…" : set ? "Replace" : "Save"}
        </button>
      )}
    </form>
  );
}
