"use client";

import { useActionState } from "react";
import { sendTestEmailAction, type ActionState } from "@/app/actions/admin-system";

const initial: ActionState = { status: "idle" };

export function TestEmailForm({ templates, defaultTo }: { templates: [string, string][]; defaultTo: string }) {
  const [state, action, pending] = useActionState(sendTestEmailAction, initial);

  return (
    <form action={action}>
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}
      {state.status === "ok" ? <p className="form-success">{state.message}</p> : null}
      <div className="field-row">
        <div className="field">
          <label htmlFor="test-template">Template</label>
          <select id="test-template" name="template" defaultValue="plain">
            {templates.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <span className="field__hint">Filled with sample data, nothing real.</span>
        </div>
        <div className="field">
          <label htmlFor="test-to">Send to</label>
          <input id="test-to" name="to" type="email" defaultValue={defaultTo} />
          <span className="field__hint">The team inbox, any tenbestfind.com address, or your own login email.</span>
        </div>
      </div>
      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? "Sending…" : "Send test email"}
      </button>
    </form>
  );
}
