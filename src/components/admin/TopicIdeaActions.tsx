"use client";

import { useActionState } from "react";
import Link from "next/link";
import { commissionTopic, type ActionState } from "@/app/actions/admin-topics";

const initial: ActionState = { status: "idle" };

/**
 * Commission, dismiss, or not this week.
 *
 * Commissioning is the only one that can fail in a way worth reading, so it is
 * the only one that carries state; the other two are plain posts.
 */
export function TopicIdeaActions({
  id,
  status,
  jobId,
  dismiss,
  snooze,
  restore,
}: {
  id: string;
  status: string;
  jobId: string | null;
  dismiss: (formData: FormData) => Promise<void>;
  snooze: (formData: FormData) => Promise<void>;
  restore: (formData: FormData) => Promise<void>;
}) {
  const [state, action, pending] = useActionState(commissionTopic, initial);

  if (status === "COMMISSIONED" && jobId) {
    return (
      <Link href={`/admin/guides/pipeline/${jobId}`} className="btn btn--secondary btn--sm">
        See the job
      </Link>
    );
  }

  if (status === "DISMISSED" || status === "SNOOZED") {
    return (
      <form action={restore}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="btn btn--secondary btn--sm">
          Put it back
        </button>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
          {pending ? "Sending…" : "Write it"}
        </button>
      </form>
      <form action={snooze}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="days" value="90" />
        <button type="submit" className="btn btn--secondary btn--sm">
          Not now
        </button>
      </form>
      <form action={dismiss}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="btn btn--secondary btn--sm">
          Never
        </button>
      </form>
      {state.status === "error" ? (
        <span style={{ fontSize: 12, color: "var(--maple-600)" }}>{state.message}</span>
      ) : null}
    </div>
  );
}
