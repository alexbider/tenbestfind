"use client";

import { useActionState, useState } from "react";
import { submitContact, type FormState } from "@/app/actions/public";
import { Check } from "@/components/ui/Icon";
import { Tile } from "@/components/site/trust/parts";
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
    <div data-contact-form="">
      <h3 style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", margin: "0 0 12px" }}>
        Where should it go?
      </h3>
      <ul style={{ display: "grid", gap: "10px", marginBottom: "22px" }}>
        {TOPICS.map((item) => {
          const on = topic === item.value;
          return (
            <li key={item.value}>
              <button
                type="button"
                data-on={on}
                aria-pressed={on}
                onClick={() => setTopic(item.value)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  width: "100%",
                  padding: "14px 16px",
                  textAlign: "left",
                  borderRadius: "14px",
                  border: `1px solid ${on ? "var(--color-primary)" : "var(--border-subtle)"}`,
                  background: on ? "var(--blue-50)" : "var(--surface-card)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  color: "var(--text-primary)",
                }}
              >
                <Tile icon={item.icon} size={36} iconSize={17} flex />
                <span style={{ display: "block", minWidth: "0" }}>
                  <strong style={{ display: "block", fontSize: "15px", fontWeight: "700", color: "var(--blue-900)", marginBottom: "2px" }}>{item.label}</strong>
                  <span style={{ display: "block", fontSize: "14px", lineHeight: "1.55", color: "var(--text-secondary)" }}>{item.body}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <form action={action}>
        <input type="hidden" name="topic" value={topic} />

        {state.status === "ok" ? (
          <p className="form-success">
            <Check size={18} />
            {state.message}
          </p>
        ) : null}
        {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

        <div data-form-grid="" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <span style={{ display: "block" }}>
            <label data-label="" htmlFor="contact-name">
              Your name
            </label>
            <input data-field="" id="contact-name" name="name" type="text" required autoComplete="name" />
            {state.errors?.name ? <span className="field__error">{state.errors.name}</span> : null}
          </span>

          <span style={{ display: "block" }}>
            <label data-label="" htmlFor="contact-email">
              Email
            </label>
            <input data-field="" id="contact-email" name="email" type="email" required autoComplete="email" />
            {state.errors?.email ? <span className="field__error">{state.errors.email}</span> : null}
          </span>

          {needsUrl ? (
            <span style={{ display: "block", gridColumn: "1 / -1" }}>
              <label data-label="" htmlFor="contact-url">
                Page address
              </label>
              <input
                data-field=""
                id="contact-url"
                name="pageUrl"
                type="text"
                placeholder="/us/tx/dallas/roofing/"
                autoComplete="off"
              />
              <span style={{ display: "block", marginTop: "6px", fontSize: "13px", color: "var(--text-secondary)" }}>
                Which page is the problem on?
              </span>
            </span>
          ) : null}

          <span style={{ display: "block", gridColumn: "1 / -1" }}>
            <label data-label="" htmlFor="contact-message">
              Message
            </label>
            <textarea data-field="" id="contact-message" name="message" rows={5} required />
            {state.errors?.message ? <span className="field__error">{state.errors.message}</span> : null}
          </span>
        </div>

        <button
          data-btn=""
          type="submit"
          disabled={pending}
          style={{
            marginTop: "20px",
            height: "50px",
            padding: "0 26px",
            border: "0",
            borderRadius: "14px",
            background: "var(--color-primary)",
            color: "#fff",
            fontFamily: "var(--font-sans)",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "var(--shadow-primary)",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Sending…" : "Send message"}
        </button>
        <p style={{ marginTop: "14px", fontSize: "13px", color: "var(--text-muted)" }}>
          We use your email to reply to this message and nothing else.
        </p>
      </form>
    </div>
  );
}
