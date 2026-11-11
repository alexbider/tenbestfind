"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { bulkBusinessAction, type BulkState } from "@/app/actions/admin-bulk";

/** The row checkboxes point at this form with their `form` attribute. */
export const BULK_FORM_ID = "bulk-businesses";

const initial: BulkState = { status: "idle", done: [], skipped: [] };

/** The ticked-or-not row checkboxes, wherever they sit in the table. */
function rowBoxes(): HTMLInputElement[] {
  const form = document.getElementById(BULK_FORM_ID);
  if (!(form instanceof HTMLFormElement)) return [];
  return Array.from(form.elements).filter(
    (el): el is HTMLInputElement => el instanceof HTMLInputElement && el.name === "ids",
  );
}

/** Tells the bar and the header box that the selection changed. */
function announceChange() {
  document.dispatchEvent(new Event("bulk-selection"));
}

/** Follows how many rows are ticked and how many there are. */
function useSelection() {
  const [selection, setSelection] = useState({ checked: 0, total: 0 });
  const recount = useCallback(() => {
    const boxes = rowBoxes();
    setSelection({ checked: boxes.filter((box) => box.checked).length, total: boxes.length });
  }, []);
  useEffect(() => {
    recount();
    const onChange = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.name === "ids") recount();
    };
    document.addEventListener("change", onChange);
    document.addEventListener("bulk-selection", recount);
    return () => {
      document.removeEventListener("change", onChange);
      document.removeEventListener("bulk-selection", recount);
    };
  }, [recount]);
  return { ...selection, recount };
}

/** The header checkbox: ticks or clears every row on this page. */
export function BulkSelectAll() {
  const { checked, total } = useSelection();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = checked > 0 && checked < total;
  }, [checked, total]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Select all businesses on this page"
      checked={total > 0 && checked === total}
      disabled={total === 0}
      onChange={(event) => {
        const on = event.target.checked;
        for (const box of rowBoxes()) box.checked = on;
        announceChange();
      }}
    />
  );
}

/**
 * The bar above the table. Archive is the plain button because it can be
 * undone from the business page; delete asks again, with the count, before it
 * goes anywhere.
 */
export function BulkActionBar() {
  const [state, action, pending] = useActionState(bulkBusinessAction, initial);
  const { checked } = useSelection();
  const [confirming, setConfirming] = useState(false);

  // Once a run comes back, clear the ticks so nothing is acted on twice.
  useEffect(() => {
    if (state.status === "idle") return;
    for (const box of rowBoxes()) box.checked = false;
    setConfirming(false);
    announceChange();
  }, [state]);

  useEffect(() => {
    if (checked === 0) setConfirming(false);
  }, [checked]);

  const plural = (n: number) => `${n} business${n === 1 ? "" : "es"}`;

  return (
    <form id={BULK_FORM_ID} action={action} className="bulk-bar" aria-live="polite">
      <div className="bulk-bar__row">
        <span className="bulk-bar__count">
          {checked > 0 ? `${plural(checked)} selected` : "Tick businesses to archive or delete them together."}
        </span>
        {checked > 0 && !confirming ? (
          <div className="bulk-bar__buttons">
            <button
              type="submit"
              name="intent"
              value="archive"
              className="btn btn--secondary btn--sm"
              disabled={pending}
            >
              {pending ? "Working…" : `Archive ${checked}`}
            </button>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              disabled={pending}
              onClick={() => setConfirming(true)}
            >
              Delete permanently
            </button>
          </div>
        ) : null}
      </div>

      {confirming && checked > 0 ? (
        <div className="bulk-bar__confirm" role="alertdialog" aria-label="Confirm permanent delete">
          <p>
            Delete {plural(checked)} permanently? This can&rsquo;t be undone. Any with an active or
            past-due subscription are skipped, and any on a ranking list or with billing history are
            archived instead.
          </p>
          <div className="bulk-bar__buttons">
            <button
              type="submit"
              name="intent"
              value="delete"
              className="btn btn--danger btn--sm"
              disabled={pending}
            >
              {pending ? "Deleting…" : `Yes, delete ${checked}`}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {state.status !== "idle" ? (
        <div className={state.status === "ok" ? "form-success bulk-bar__result" : "form-error bulk-bar__result"}>
          <div>
            <strong>{state.message}</strong>
            {state.skipped.length > 0 ? (
              <ul>
                {state.skipped.map((row) => (
                  <li key={row.id}>
                    {row.name}: {row.note}
                  </li>
                ))}
              </ul>
            ) : null}
            {state.done.some((row) => row.note) ? (
              <ul>
                {state.done
                  .filter((row) => row.note)
                  .map((row) => (
                    <li key={row.id}>
                      {row.name}: {row.note}
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}
