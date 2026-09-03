"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button that asks first. The check runs on the button rather than the
 * form so a panel can hold several actions and only the destructive one stops
 * to ask.
 */
export function ConfirmButton({
  children,
  question,
  className = "btn btn--ghost btn--sm",
}: {
  children: React.ReactNode;
  question: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
