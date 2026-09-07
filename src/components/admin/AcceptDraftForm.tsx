"use client";

import { useActionState } from "react";
import { acceptJob, type ActionState } from "@/app/actions/admin-writer";

const initial: ActionState = { status: "idle" };

/**
 * Accepting a draft.
 *
 * The author and reviewer are asked for here rather than defaulted, because
 * those two fields are the page's E-E-A-T claim: a byline is somebody saying
 * they stand behind this, and nothing but a person can decide that.
 */
export function AcceptDraftForm({
  jobId,
  people,
}: {
  jobId: string;
  people: { id: string; label: string; isReviewer: boolean }[];
}) {
  const [state, action, pending] = useActionState(acceptJob, initial);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={jobId} />
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field-row">
        <div className="field">
          <label htmlFor="accept-author">Author</label>
          <select id="accept-author" name="authorId" defaultValue="">
            <option value="">Set it later</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </select>
          <span className="field__hint">Whose name goes on it.</span>
        </div>
        <div className="field">
          <label htmlFor="accept-reviewer">Expert reviewer</label>
          <select id="accept-reviewer" name="reviewerId" defaultValue="">
            <option value="">None</option>
            {people
              .filter((person) => person.isReviewer)
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.label}
                </option>
              ))}
          </select>
          <span className="field__hint">Only if somebody has actually read it.</span>
        </div>
      </div>

      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? "Creating…" : "Create the guide"}
      </button>
    </form>
  );
}
