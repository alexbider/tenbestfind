"use client";

import { useEffect, useRef, useState } from "react";

// The quote form, as a real dialog element so the browser handles the modal
// behaviour: focus is trapped, Escape closes it, and the page behind it is
// inert. The button that opens it is the same one that was there before, so the
// click still counts as a quote click in the analytics.

type Props = {
  businessId: string;
  businessName: string;
  services: string[];
  label?: string;
  className?: string;
};

const URGENCIES = [
  { value: "EMERGENCY", label: "Today, it is urgent" },
  { value: "THIS_WEEK", label: "Within the week" },
  { value: "PLANNING", label: "Planning ahead" },
];

export function QuoteDialog({
  businessId,
  businessName,
  services,
  label = "Request a quote",
  className = "btn btn--secondary btn--block",
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const openedAt = useRef(0);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  // A dialog that was opened before hydration finished would not be modal, so
  // the button does nothing until the element is there to open.
  const open = () => {
    openedAt.current = Date.now();
    setState("idle");
    setError(null);
    dialog.current?.showModal();
  };

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const onCancel = () => setError(null);
    element.addEventListener("cancel", onCancel);
    return () => element.removeEventListener("cancel", onCancel);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    setError(null);

    try {
      const response = await fetch("/api/leads/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId,
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          postalCode: String(form.get("postalCode") ?? ""),
          jobType: String(form.get("jobType") ?? ""),
          message: String(form.get("message") ?? ""),
          urgency: String(form.get("urgency") ?? "PLANNING"),
          company: String(form.get("company") ?? ""),
          path: window.location.pathname,
          elapsed: Date.now() - openedAt.current,
        }),
      });
      const json = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setError(json.error ?? "Something went wrong. Try again in a moment.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
      setState("idle");
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={open}>
        {label}
      </button>

      <dialog ref={dialog} className="quote-dialog" aria-labelledby="quote-title">
        <form method="dialog" className="quote-dialog__close">
          <button type="submit" aria-label="Close">
            ×
          </button>
        </form>

        {state === "sent" ? (
          <div className="quote-dialog__done">
            <h2 id="quote-title">Sent to {businessName}</h2>
            <p>
              They have your details and usually reply directly. We keep a copy so we can follow up
              if they do not.
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => dialog.current?.close()}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="quote-dialog__form">
            <h2 id="quote-title">Request a quote from {businessName}</h2>
            <p className="quote-dialog__lead">
              This goes straight to the company. We do not sell it on, and we do not send it to
              anyone else.
            </p>

            <div className="field-row">
              <div className="field">
                <label htmlFor="q-name">Your name</label>
                <input id="q-name" name="name" type="text" required autoComplete="name" />
              </div>
              <div className="field">
                <label htmlFor="q-email">Email</label>
                <input id="q-email" name="email" type="email" required autoComplete="email" />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="q-phone">Phone</label>
                <input id="q-phone" name="phone" type="tel" autoComplete="tel" />
                <span className="field__hint">Optional, but most companies call back faster.</span>
              </div>
              <div className="field">
                <label htmlFor="q-postal">Postal code</label>
                <input id="q-postal" name="postalCode" type="text" autoComplete="postal-code" />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="q-job">What do you need done</label>
                {services.length > 0 ? (
                  <input id="q-job" name="jobType" list="q-services" type="text" />
                ) : (
                  <input id="q-job" name="jobType" type="text" />
                )}
                {services.length > 0 ? (
                  <datalist id="q-services">
                    {services.map((service) => (
                      <option key={service} value={service} />
                    ))}
                  </datalist>
                ) : null}
              </div>
              <div className="field">
                <label htmlFor="q-urgency">How soon</label>
                <select id="q-urgency" name="urgency" defaultValue="THIS_WEEK">
                  {URGENCIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="q-message">About the job</label>
              <textarea id="q-message" name="message" rows={4} required minLength={15} />
              <span className="field__hint">
                What needs doing, how old the property is, anything you have already tried.
              </span>
            </div>

            {/* Left empty by anyone who can see it. */}
            <div className="quote-dialog__trap" aria-hidden="true">
              <label htmlFor="q-company">Company</label>
              <input id="q-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <div className="quote-dialog__actions">
              <button type="submit" className="btn btn--primary" disabled={state === "sending"}>
                {state === "sending" ? "Sending…" : "Send the request"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => dialog.current?.close()}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
