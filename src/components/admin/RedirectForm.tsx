"use client";

import { useActionState } from "react";
import { saveRedirect, type ActionState } from "@/app/actions/admin-system";
import { Check } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

export function RedirectForm() {
  const [state, action, pending] = useActionState(saveRedirect, initial);

  return (
    <form action={action}>
      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field">
        <label htmlFor="redirect-source">From</label>
        <input id="redirect-source" name="source" type="text" placeholder="/old-path/" />
      </div>
      <div className="field">
        <label htmlFor="redirect-target">To</label>
        <input id="redirect-target" name="target" type="text" placeholder="/us/tx/dallas/roofing/" />
      </div>
      <div className="field">
        <label htmlFor="redirect-code">Type</label>
        <select id="redirect-code" name="code" defaultValue="301">
          <option value="301">Permanent, it moved</option>
          <option value="302">Temporary, it will come back</option>
          <option value="410">Gone, and not coming back</option>
        </select>
        <span className="field__hint">
          Permanent is served as a 308 and temporary as a 307, which is what the framework issues.
          Both are read the same way by search engines as 301 and 302.
        </span>
      </div>
      <button type="submit" className="btn btn--secondary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Add redirect"}
      </button>
    </form>
  );
}
