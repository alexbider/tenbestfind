"use client";

import { useActionState } from "react";
import { saveSecret } from "@/app/actions/admin-import";
import type { ActionState } from "@/app/actions/admin-system";
import { Check } from "@/components/ui/Icon";
import { ConnectionLight } from "@/components/admin/ConnectionLight";
import type { SecretState } from "@/lib/secrets";

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
  fromEnv,
  connection,
  status,
  detail,
}: {
  secretKey: string;
  label: string;
  hint: string;
  set: boolean;
  fromEnv: boolean;
  connection: SecretState;
  /** The words next to the light. */
  status: string;
  detail: string | null;
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
        <div className="secret-head">
          <label htmlFor={secretKey} style={{ marginBottom: 0 }}>
            {label}
          </label>
          <ConnectionLight state={connection} status={status} />
        </div>
        {detail ? <span className="conn__detail">{detail}</span> : null}
        <input
          id={secretKey}
          name="value"
          type="password"
          autoComplete="off"
          // The light above already says what is on file, so the placeholder
          // only has to say what typing here would do.
          placeholder={
            fromEnv
              ? "Set on the server, and the server value wins"
              : set
                ? "Type to replace, or save empty to remove"
                : "Paste the key"
          }
          style={detail ? { marginTop: 8 } : undefined}
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
