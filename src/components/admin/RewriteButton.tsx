"use client";

import { useActionState } from "react";
import { rewriteOlderGuides, type ActionState } from "@/app/actions/admin-writer";
import { Check } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

/**
 * Commissions a rewrite of every guide that is short of the standard.
 *
 * The count is shown before the button rather than after, because the honest
 * question is how much this is about to spend.
 */
export function RewriteButton({ pending: waiting, words }: { pending: number; words: number }) {
  const [state, action, running] = useActionState(rewriteOlderGuides, initial);

  if (waiting === 0) {
    return <p style={{ fontSize: 14 }}>Every guide is already at the standard. Nothing to rewrite.</p>;
  }

  return (
    <form action={action}>
      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 14, maxWidth: "70ch" }}>
        {waiting} {waiting === 1 ? "guide is" : "guides are"} under three thousand words or short of fifteen questions,
        averaging {words.toLocaleString()} words. Rewriting them replaces each page in place, keeping its URL, its
        author and its review history, so nothing is duplicated and no link anybody has made goes stale.
      </p>

      <div className="field-row" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ flex: "0 0 200px" }}>
          <label htmlFor="rewrite-gap">Hours between each</label>
          <input id="rewrite-gap" name="everyHours" type="number" min={0} max={168} defaultValue={24} />
          <span className="field__hint">Zero starts them all at once.</span>
        </div>
        <button type="submit" className="btn btn--primary" disabled={running} style={{ marginBottom: 18 }}>
          {running ? "Queueing…" : `Rewrite ${waiting}`}
        </button>
      </div>
    </form>
  );
}
