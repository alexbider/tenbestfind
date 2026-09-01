"use client";

import { useActionState, useState } from "react";
import { submitContact, type FormState } from "@/app/actions/public";
import { Check, Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/icon-paths";

const TOPICS: { value: string; label: string; body: string; icon: IconName }[] = [
  {
    value: "general",
    label: "General questions",
    body: "Anything about how the research works or what a page means.",
    icon: "help",
  },
  {
    value: "correction",
    label: "Report incorrect business information",
    body: "A licence, address, service or warranty detail that is out of date.",
    icon: "alert",
  },
  {
    value: "business",
    label: "Business support",
    body: "Claiming, billing, or a question about managing your listing.",
    icon: "store",
  },
  {
    value: "advertising",
    label: "Advertising",
    body: "Sponsored placements, coverage and eligibility.",
    icon: "megaphone",
  },
  {
    value: "accessibility",
    label: "Accessibility",
    body: "A barrier that stopped you using the site. We treat these as priority.",
    icon: "access",
  },
];

const initial: FormState = { status: "idle" };

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initial);
  const [topic, setTopic] = useState("general");
  const needsUrl = topic === "correction" || topic === "accessibility";

  return (
    <div className="split" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 48, alignItems: "start" }}>
      <div>
        <h3 className="related-heading">Where should it go?</h3>
        <ul style={{ display: "grid", gap: 10 }}>
          {TOPICS.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                className="topic-card"
                data-on={topic === item.value}
                aria-pressed={topic === item.value}
                onClick={() => setTopic(item.value)}
              >
                <span className="topic-card__icon" aria-hidden="true">
                  <Icon name={item.icon} size={20} strokeWidth={1.8} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <span>{item.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <form action={action} className="card" style={{ padding: "28px 30px" }}>
        <input type="hidden" name="topic" value={topic} />

        {state.status === "ok" ? (
          <p className="form-success">
            <Check size={18} />
            {state.message}
          </p>
        ) : null}
        {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

        <div className="field">
          <label htmlFor="contact-name">Your name</label>
          <input id="contact-name" name="name" type="text" required autoComplete="name" />
          {state.errors?.name ? <span className="field__error">{state.errors.name}</span> : null}
        </div>

        <div className="field">
          <label htmlFor="contact-email">Email</label>
          <input id="contact-email" name="email" type="email" required autoComplete="email" />
          {state.errors?.email ? <span className="field__error">{state.errors.email}</span> : null}
        </div>

        {needsUrl ? (
          <div className="field">
            <label htmlFor="contact-url">Page address</label>
            <input
              id="contact-url"
              name="pageUrl"
              type="text"
              placeholder="/us/tx/dallas/roofing/"
              autoComplete="off"
            />
            <span className="field__hint">Which page is the problem on?</span>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="contact-message">Message</label>
          <textarea id="contact-message" name="message" rows={6} required />
          {state.errors?.message ? <span className="field__error">{state.errors.message}</span> : null}
        </div>

        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </button>
        <p style={{ marginTop: 14, fontSize: 13, color: "var(--text-muted)" }}>
          We use your email to reply to this message and nothing else.
        </p>
      </form>
    </div>
  );
}
