"use client";

import { useActionState } from "react";
import { saveGlobals, type ActionState } from "@/app/actions/admin-content";
import { RepeatableEditor } from "./RepeatableEditor";
import { Check } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

export function GlobalsEditor({
  faqs,
  criteria,
}: {
  faqs: Record<string, string>[];
  criteria: Record<string, string>[];
}) {
  const [state, action, pending] = useActionState(saveGlobals, initial);

  return (
    <form action={action}>
      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <fieldset className="fieldset">
        <legend>Site-wide questions</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          These publish in the FAQ block that appears wherever a page has no questions of its own,
          and they carry FAQ schema.
        </p>
        <RepeatableEditor
          name="faqs"
          summaryKey="question"
          addLabel="Add question"
          emptyLabel="No site-wide questions."
          fields={[
            { key: "question", label: "Question" },
            { key: "answer", label: "Answer", type: "textarea" },
          ]}
          initial={faqs}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Ranking criteria</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          The standing method. It publishes on How we rank and on every service hub, so a reader can
          see what a list was judged on before reading the list.
        </p>
        <RepeatableEditor
          name="criteria"
          summaryKey="title"
          addLabel="Add criterion"
          emptyLabel="No criteria recorded."
          fields={[
            { key: "title", label: "Criterion" },
            { key: "body", label: "What it means", type: "textarea" },
            {
              key: "importance",
              label: "Weight",
              type: "select",
              width: "half",
              options: [
                { value: "HIGH", label: "High" },
                { value: "MODERATE", label: "Moderate" },
                { value: "SUPPORTING", label: "Supporting" },
              ],
            },
            { key: "iconKey", label: "Icon key", width: "half" },
          ]}
          initial={criteria}
        />
      </fieldset>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
