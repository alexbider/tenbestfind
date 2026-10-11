"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { routes } from "@/lib/urls";

/*
 * The stepped form both business centre flows share (claim, add a business),
 * October 2026 design. The page describes its steps as data, the way the
 * design's CONFIG does; this component owns the state, the stepper, the
 * validation and the order summary. Every value is held at the form level and
 * posted as hidden inputs on the last step, so going back and forth never loses
 * anything and the server action receives the same field names it always has.
 */

export type FlowValues = Record<string, string | string[] | boolean>;

export type FlowOption = { id: string; title: string; tag?: string; text?: string };

export type FinderItem = {
  id: string;
  name: string;
  meta: string;
  tag?: string;
  claimed?: boolean;
};

type Base = {
  id: string;
  label: string;
  full?: boolean;
  help?: string;
  /** Message shown when the field is left empty. Omit for optional fields. */
  required?: string;
  validate?: (value: FlowValues[string] | undefined, values: FlowValues) => string | null;
  /** Server error keys that belong to this field. */
  errorKeys?: string[];
  /** Hide this row on the review step. */
  noReview?: boolean;
};

export type FlowField =
  | (Base & { kind: "input"; type: "text" | "email" | "tel" | "url"; ph?: string; autoComplete?: string })
  | (Base & { kind: "textarea"; ph?: string })
  | (Base & { kind: "select"; options: FlowOption[] })
  | (Base & { kind: "choice"; options: FlowOption[]; def: string })
  | (Base & { kind: "check"; title: string; tag?: string; text: string })
  | (Base & { kind: "chips"; options: string[] })
  | (Base & { kind: "finder"; items: FinderItem[]; ph: string; notListed?: ReactNode })
  | (Base & { kind: "note"; title: string; text: string })
  | (Base & { kind: "review" });

export type FlowStep = { label: string; title: string; sub: string; fields: FlowField[] };

export type FlowSummary = {
  items: { name: string; price: string }[];
  due: string;
  dueNote: string;
};

const INPUT = {
  height: "50px",
  padding: "0 16px",
  border: "1px solid var(--border-strong)",
  borderRadius: "12px",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  color: "var(--text-primary)",
  background: "var(--surface-card)",
  width: "100%",
} as const;

const visuallyHidden = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function isEmpty(value: FlowValues[string] | undefined) {
  if (value === undefined || value === false) return true;
  if (Array.isArray(value)) return value.length === 0;
  return String(value).trim() === "";
}

/** The value of a field for the review step, in words. */
function display(field: FlowField, values: FlowValues): string {
  const value = values[field.id];
  switch (field.kind) {
    case "finder": {
      const item = field.items.find((entry) => entry.id === value);
      return item ? `${item.name} · ${item.meta}` : "";
    }
    case "select":
    case "choice": {
      const id = (value as string | undefined) ?? (field.kind === "choice" ? field.def : "");
      const option = field.options.find((entry) => entry.id === id);
      return option && option.id ? option.title : "";
    }
    case "check":
      return value ? field.title : "";
    case "chips":
      return Array.isArray(value) ? value.join(", ") : "";
    default:
      return typeof value === "string" ? value : "";
  }
}

export function CentreFlow({
  steps,
  flowLabel,
  finalLabel,
  pendingLabel,
  stripeText,
  summary,
  toForm,
  initialValues,
  action,
  pending,
  serverMessage,
  serverErrors,
  done,
}: {
  steps: FlowStep[];
  flowLabel: string;
  finalLabel: string;
  pendingLabel: string;
  stripeText: string;
  summary: (values: FlowValues) => FlowSummary;
  /** The hidden form fields the server action reads, built from the values. */
  toForm: (values: FlowValues) => Record<string, string>;
  initialValues?: FlowValues;
  action: (formData: FormData) => void;
  pending: boolean;
  serverMessage?: string;
  serverErrors?: Record<string, string>;
  /** Rendered in place of the form once the server reports success. */
  done?: ReactNode;
}) {
  const last = steps.length - 1;
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FlowValues>(() => {
    const start: FlowValues = { ...(initialValues ?? {}) };
    for (const s of steps) for (const field of s.fields) if (field.kind === "choice" && start[field.id] === undefined) start[field.id] = field.def;
    return start;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const set = (id: string, value: FlowValues[string]) => {
    setValues((current) => ({ ...current, [id]: value }));
    setErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const check = (index: number): Record<string, string> => {
    const found: Record<string, string> = {};
    for (const field of steps[index].fields) {
      const value = values[field.id];
      if (field.required && isEmpty(value)) found[field.id] = field.required;
      else if (field.validate) {
        const message = field.validate(value, values);
        if (message) found[field.id] = message;
      }
    }
    return found;
  };

  const goTo = (index: number) => {
    setStep(index);
    topRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const next = () => {
    const found = check(step);
    setErrors(found);
    if (Object.keys(found).length === 0) goTo(Math.min(last, step + 1));
  };

  // A field the server turned down takes the reader back to the step it is on.
  useEffect(() => {
    if (!serverErrors) return;
    const mapped: Record<string, string> = {};
    let first = -1;
    steps.forEach((s, index) =>
      s.fields.forEach((field) => {
        for (const key of field.errorKeys ?? [field.id]) {
          if (serverErrors[key]) {
            mapped[field.id] = serverErrors[key];
            if (first < 0) first = index;
          }
        }
      }),
    );
    setErrors(mapped);
    if (first >= 0) setStep(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverErrors]);

  const hidden = toForm(values);
  const order = summary(values);
  const current = steps[step];

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    const target = event.target as HTMLElement;
    if (event.key === "Enter" && target.tagName === "INPUT" && step < last) {
      event.preventDefault();
      next();
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    for (let index = 0; index < last; index += 1) {
      const found = check(index);
      if (Object.keys(found).length > 0) {
        event.preventDefault();
        setErrors(found);
        goTo(index);
        return;
      }
    }
  };

  const fieldError = (id: string) =>
    errors[id] ? (
      <p role="alert" style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--maple-600)" }}>
        {errors[id]}
      </p>
    ) : null;

  const renderField = (field: FlowField) => {
    const fid = `f-${field.id}`;
    const invalid = Boolean(errors[field.id]);
    const value = values[field.id];
    const label =
      field.kind !== "review" && field.kind !== "note" && field.kind !== "check" ? (
        <label htmlFor={field.kind === "finder" ? `${fid}-q` : fid} style={{ fontSize: "14px", fontWeight: "700", color: "var(--ink)" }}>
          {field.label}
        </label>
      ) : null;

    let control: ReactNode = null;
    switch (field.kind) {
      case "input":
        control = (
          <input
            data-fin=""
            data-bad={invalid ? "1" : undefined}
            id={fid}
            type={field.type}
            value={(value as string) ?? ""}
            onChange={(event) => set(field.id, event.target.value)}
            placeholder={field.ph}
            autoComplete={field.autoComplete}
            aria-invalid={invalid || undefined}
            style={INPUT}
          />
        );
        break;
      case "textarea":
        control = (
          <textarea
            data-fin=""
            data-bad={invalid ? "1" : undefined}
            id={fid}
            rows={4}
            value={(value as string) ?? ""}
            onChange={(event) => set(field.id, event.target.value)}
            placeholder={field.ph}
            aria-invalid={invalid || undefined}
            style={{ ...INPUT, height: "auto", padding: "14px 16px", lineHeight: "1.55", resize: "vertical" }}
          />
        );
        break;
      case "select":
        control = (
          <select
            data-fin=""
            data-bad={invalid ? "1" : undefined}
            id={fid}
            value={(value as string) ?? ""}
            onChange={(event) => set(field.id, event.target.value)}
            aria-invalid={invalid || undefined}
            style={{ ...INPUT, padding: "0 14px" }}
          >
            {field.options.map((option) => (
              <option key={option.id} value={option.id} disabled={option.id === ""}>
                {option.title}
              </option>
            ))}
          </select>
        );
        break;
      case "choice":
        control = (
          <div role="radiogroup" aria-label={field.label} data-choices="" style={{ display: "grid", gap: "12px" }}>
            {field.options.map((option) => {
              const on = (value ?? field.def) === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  data-opt=""
                  data-on={on ? "1" : "0"}
                  role="radio"
                  aria-checked={on}
                  onClick={() => set(field.id, option.id)}
                  style={{
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                    textAlign: "left",
                    padding: "18px",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "14px",
                    background: "var(--surface-card)",
                    fontFamily: "var(--font-sans)",
                    cursor: "pointer",
                  }}
                >
                  <span data-dot="" aria-hidden="true" style={{ flex: "0 0 20px", width: "20px", height: "20px", marginTop: "1px", borderRadius: "50%", border: "1.5px solid var(--border-strong)", background: "#fff" }} />
                  <span style={{ display: "grid", gap: "4px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "15.5px", fontWeight: "700", color: "var(--ink)" }}>
                      {option.title}
                      {option.tag ? (
                        <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--gold)" }}>{option.tag}</span>
                      ) : null}
                    </span>
                    {option.text ? <span style={{ fontSize: "14px", lineHeight: "1.55", color: "var(--text-secondary)" }}>{option.text}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        );
        break;
      case "check": {
        const on = Boolean(value);
        control = (
          <button
            type="button"
            data-opt=""
            data-sq=""
            data-on={on ? "1" : "0"}
            role="checkbox"
            aria-checked={on}
            onClick={() => set(field.id, !on)}
            style={{
              width: "100%",
              display: "flex",
              gap: "14px",
              alignItems: "flex-start",
              textAlign: "left",
              padding: "18px",
              border: "1px solid var(--border-strong)",
              borderRadius: "14px",
              background: "var(--surface-card)",
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            <span
              data-box=""
              aria-hidden="true"
              style={{
                flex: "0 0 20px",
                width: "20px",
                height: "20px",
                marginTop: "1px",
                borderRadius: "6px",
                border: "1.5px solid var(--border-strong)",
                background: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              {on ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : null}
            </span>
            <span style={{ display: "grid", gap: "4px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "15.5px", fontWeight: "700", color: "var(--ink)" }}>
                {field.title}
                {field.tag ? (
                  <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--gold)" }}>{field.tag}</span>
                ) : null}
              </span>
              <span style={{ fontSize: "14px", lineHeight: "1.55", color: "var(--text-secondary)" }}>{field.text}</span>
            </span>
          </button>
        );
        break;
      }
      case "chips": {
        const picked = Array.isArray(value) ? value : [];
        control = (
          <div role="group" aria-label={field.label} style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {field.options.map((option) => {
              const on = picked.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  data-chipx=""
                  data-on={on ? "1" : "0"}
                  aria-pressed={on}
                  onClick={() => set(field.id, on ? picked.filter((entry) => entry !== option) : [...picked, option])}
                  style={{
                    height: "40px",
                    minHeight: "40px",
                    padding: "0 16px",
                    borderRadius: "999px",
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface-card)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "var(--blue-900)",
                    cursor: "pointer",
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
        );
        break;
      }
      case "finder": {
        const query = ((values[`${field.id}Q`] as string) ?? "").trim().toLowerCase();
        const results = query
          ? field.items.filter((item) => `${item.name} ${item.meta}`.toLowerCase().includes(query)).slice(0, 4)
          : [];
        const selected = field.items.find((item) => item.id === value);
        const shown = selected && !results.some((item) => item.id === selected.id) ? [selected, ...results].slice(0, 4) : results;
        control = (
          <div style={{ display: "grid", gap: "12px" }}>
            <label
              data-finder=""
              data-bad={invalid ? "1" : undefined}
              style={{ display: "flex", alignItems: "center", gap: "10px", height: "54px", padding: "0 16px", border: "1px solid var(--border-strong)", borderRadius: "14px", background: "var(--surface-card)" }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.34-4.34" />
              </svg>
              <span style={visuallyHidden}>Business name or city</span>
              <input
                id={`${fid}-q`}
                type="search"
                value={(values[`${field.id}Q`] as string) ?? ""}
                onChange={(event) => set(`${field.id}Q`, event.target.value)}
                placeholder={field.ph}
                autoComplete="off"
                style={{ flex: "1", minWidth: "0", border: "0", outline: "none", fontFamily: "var(--font-sans)", fontSize: "16px", background: "transparent" }}
              />
            </label>
            {shown.length > 0 ? (
              <ul style={{ display: "grid", gap: "8px" }}>
                {shown.map((item) => {
                  const on = item.id === value;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        data-opt=""
                        data-on={on ? "1" : "0"}
                        aria-pressed={on}
                        onClick={() => set(field.id, item.id)}
                        style={{
                          width: "100%",
                          display: "grid",
                          gridTemplateColumns: "44px minmax(0,1fr) auto",
                          gap: "14px",
                          alignItems: "center",
                          textAlign: "left",
                          padding: "14px 16px",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "14px",
                          background: "var(--surface-card)",
                          fontFamily: "var(--font-sans)",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "var(--blue-50)",
                            border: "1px solid var(--blue-100)",
                            color: "var(--color-primary)",
                            fontSize: "14px",
                            fontWeight: "800",
                          }}
                        >
                          {initials(item.name)}
                        </span>
                        <span style={{ display: "grid", gap: "3px", minWidth: "0" }}>
                          <span style={{ fontSize: "15.5px", fontWeight: "700", color: "var(--ink)" }}>{item.name}</span>
                          <span style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>{item.meta}</span>
                        </span>
                        {item.claimed ? (
                          <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", padding: "5px 10px", borderRadius: "999px", background: "var(--surface-page)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                            Already claimed
                          </span>
                        ) : item.tag ? (
                          <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase", padding: "5px 10px", borderRadius: "999px", background: "var(--gold-soft)", color: "var(--gold)", whiteSpace: "nowrap" }}>
                            {item.tag}
                          </span>
                        ) : (
                          <span />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : query ? (
              <p style={{ padding: "16px 18px", borderRadius: "14px", background: "var(--paper)", border: "1px solid var(--border-subtle)", fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--ink)" }}>We do not have that listing yet.</strong> Add it instead. Nothing is charged until an editor publishes it.
              </p>
            ) : null}
            {field.notListed}
          </div>
        );
        break;
      }
      case "note":
        control = (
          <div style={{ display: "flex", gap: "14px", padding: "18px 20px", borderRadius: "14px", background: "var(--gold-soft)", border: "1px solid #EBCE95" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px" }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "#5B4310" }}>
              <strong style={{ color: "var(--ink)" }}>{field.title}</strong> {field.text}
            </p>
          </div>
        );
        break;
      case "review": {
        const rows = steps.slice(0, last).flatMap((s, index) =>
          s.fields
            .filter((entry) => entry.kind !== "note" && entry.kind !== "review" && !entry.noReview)
            .map((entry) => ({ entry, index })),
        );
        control = (
          <dl data-review="" style={{ margin: "0", border: "1px solid var(--border-subtle)", borderRadius: "16px", overflow: "hidden" }}>
            {rows.map(({ entry, index }) => (
              <div
                key={entry.id}
                style={{ display: "grid", gridTemplateColumns: "180px minmax(0,1fr) auto", gap: "16px", alignItems: "baseline", padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}
              >
                <dt style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>{entry.label}</dt>
                <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--ink)", overflowWrap: "anywhere" }}>{display(entry, values) || "Not provided"}</dd>
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Edit ${entry.label}`}
                  style={{ border: "0", background: "none", padding: "0", minHeight: "0", fontFamily: "var(--font-sans)", fontSize: "13.5px", fontWeight: "600", color: "var(--color-primary)", cursor: "pointer" }}
                >
                  Edit
                </button>
              </div>
            ))}
          </dl>
        );
        break;
      }
    }

    return (
      <div key={field.id} data-half="" style={{ gridColumn: field.full ? "1 / -1" : "auto", display: "grid", gap: "8px", alignContent: "start" }}>
        {label}
        {control}
        {fieldError(field.id)}
        {field.help ? <p style={{ fontSize: "13.5px", lineHeight: "1.5", color: "var(--text-secondary)" }}>{field.help}</p> : null}
      </div>
    );
  };

  return (
    <div data-split="" style={{ maxWidth: "1240px", margin: "0 auto", padding: "56px 24px 80px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: "32px", alignItems: "start" }}>
      <div ref={topRef} data-flowcard="" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "22px", boxShadow: "var(--shadow-md)", overflow: "hidden", scrollMarginTop: "130px" }}>
        {done ? (
          done
        ) : (
          <form action={action} onSubmit={onSubmit} onKeyDown={onKeyDown} noValidate>
            <div style={{ padding: "22px 28px", borderBottom: "1px solid var(--border-subtle)", background: "var(--paper)" }}>
              <h2 id="flow-h2" style={visuallyHidden}>
                {flowLabel}
              </h2>
              <ol data-stepper="" aria-label="Progress" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {steps.map((s, index) => {
                  const state = index < step ? "done" : index === step ? "now" : "todo";
                  return (
                    <li
                      key={s.label}
                      data-st=""
                      data-s={state}
                      aria-current={state === "now" ? "step" : undefined}
                      style={{ flex: "1", display: "flex", alignItems: "center", gap: "10px", minWidth: "0", position: "relative" }}
                    >
                      {state === "done" ? (
                        <button
                          type="button"
                          onClick={() => goTo(index)}
                          aria-label={`Back to ${s.label}`}
                          style={{ position: "absolute", inset: "0", border: "0", background: "transparent", padding: "0", minHeight: "0", cursor: "pointer" }}
                        />
                      ) : null}
                      <span
                        style={{
                          flex: "0 0 32px",
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--surface-card)",
                          border: "1.5px solid var(--border-strong)",
                          fontSize: "13px",
                          fontWeight: "800",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {state === "done" ? "✓" : index + 1}
                      </span>
                      <span style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div style={{ padding: "32px 28px 28px" }}>
              <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: "8px" }}>
                Step {step + 1} of {steps.length}
              </p>
              <h3 style={{ fontSize: "clamp(24px, 2.4vw, 30px)", fontWeight: "800", letterSpacing: "-0.03em", marginBottom: "6px" }}>{current.title}</h3>
              <p style={{ fontSize: "16px", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "28px", maxWidth: "620px" }}>{current.sub}</p>

              {serverMessage ? (
                <p role="alert" style={{ marginBottom: "20px", padding: "14px 16px", borderRadius: "12px", background: "#FDF1EE", border: "1px solid #F3C6BB", fontSize: "14.5px", fontWeight: "600", color: "var(--maple-600)" }}>
                  {serverMessage}
                </p>
              ) : null}

              <div data-fields="" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "20px 18px" }}>
                {current.fields.map(renderField)}
              </div>

              {step === last ? (
                <div style={{ marginTop: "24px", display: "flex", gap: "14px", padding: "18px 20px", borderRadius: "14px", background: "var(--paper)", border: "1px solid var(--border-subtle)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px" }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--ink)" }}>Payment is handled by Stripe.</strong> {stripeText}
                  </p>
                </div>
              ) : null}
            </div>

            {Object.entries(hidden).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "18px 28px", borderTop: "1px solid var(--border-subtle)", background: "var(--paper)" }}>
              <button
                type="button"
                onClick={() => goTo(Math.max(0, step - 1))}
                disabled={step === 0}
                style={{
                  height: "48px",
                  padding: "0 20px",
                  borderRadius: "12px",
                  border: "1.5px solid var(--border-strong)",
                  background: "var(--surface-card)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: "var(--blue-900)",
                  cursor: step === 0 ? "default" : "pointer",
                  opacity: step === 0 ? 0.45 : 1,
                }}
              >
                Back
              </button>
              <button
                // A different key for each, so the click that reaches the last
                // step lands on the Continue button React then removes, rather
                // than on the same node turned into a submit button mid-click.
                key={step === last ? "submit" : "next"}
                data-btnp=""
                type={step === last ? "submit" : "button"}
                onClick={step === last ? undefined : next}
                disabled={pending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  height: "48px",
                  padding: "0 26px",
                  border: "0",
                  borderRadius: "12px",
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontFamily: "var(--font-sans)",
                  fontSize: "15.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-primary)",
                }}
              >
                {step === last ? (pending ? pendingLabel : finalLabel) : "Continue"}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </form>
        )}
      </div>

      <aside data-bcaside="" style={{ position: "sticky", top: "100px", display: "grid", gap: "16px" }}>
        <div style={{ position: "relative", overflow: "hidden", padding: "26px", borderRadius: "22px", background: "var(--ink)", color: "#fff", boxShadow: "var(--shadow-lg)" }}>
          <div aria-hidden="true" style={{ position: "absolute", right: "-80px", top: "-80px", width: "240px", height: "240px", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(45,116,215,0.4), transparent)" }} />
          <h2 data-minih="" style={{ position: "relative", fontSize: "13px", fontWeight: "700", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold-ink)", marginBottom: "18px" }}>
            Order summary
          </h2>
          <ul style={{ position: "relative", display: "grid", gap: "12px", paddingBottom: "18px", borderBottom: "1px solid rgba(255,255,255,0.14)" }}>
            {order.items.map((item) => (
              <li key={item.name} style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "15px" }}>
                <span style={{ color: "rgba(232,237,245,0.85)" }}>{item.name}</span>
                <span style={{ fontWeight: "700" }}>{item.price}</span>
              </li>
            ))}
          </ul>
          <div style={{ position: "relative", display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "18px 0 14px" }}>
            <span style={{ fontSize: "15px", color: "rgba(232,237,245,0.85)" }}>Due today</span>
            <span style={{ fontSize: "44px", fontWeight: "800", letterSpacing: "-0.04em", color: "#fff" }}>{order.due}</span>
          </div>
          <p suppressHydrationWarning style={{ position: "relative", fontSize: "13.5px", lineHeight: "1.55", color: "rgba(232,237,245,0.72)" }}>
            {order.dueNote}
          </p>
        </div>
        <div style={{ padding: "22px 24px", borderRadius: "18px", background: "var(--gold-soft)", border: "1px solid #EBCE95" }}>
          <h3 style={{ fontSize: "15.5px", fontWeight: "700", color: "var(--ink)", marginBottom: "6px" }}>What this does not change</h3>
          <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#5B4310" }}>
            Ranking position, Top 10 status, the editorial summary and the Best for designation stay with the editorial team. A subscription cannot move any of them.
          </p>
        </div>
        <Link
          href={routes.contact()}
          data-bc-help=""
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "16px 20px", borderRadius: "14px", border: "1px solid var(--border-subtle)", fontSize: "14.5px", fontWeight: "600", color: "var(--blue-900)" }}
        >
          Questions? Talk to business support
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </aside>
    </div>
  );
}

/** The panel that replaces the form once a submission is recorded without Stripe. */
export function FlowDone({
  title,
  message,
  rows,
  links,
}: {
  title: string;
  message: string;
  rows: { label: string; value: ReactNode }[];
  links: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div style={{ padding: "36px 32px" }}>
      <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", borderRadius: "16px", background: "var(--green-50)", color: "var(--green-600)", marginBottom: "20px" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <h3 style={{ fontSize: "clamp(24px, 2.4vw, 30px)", fontWeight: "800", letterSpacing: "-0.03em", marginBottom: "10px" }}>{title}</h3>
      <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)", marginBottom: "22px", maxWidth: "620px" }}>{message}</p>
      <dl style={{ margin: "0 0 24px", border: "1px solid var(--border-subtle)", borderRadius: "16px", overflow: "hidden" }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: "grid", gridTemplateColumns: "180px minmax(0,1fr)", gap: "16px", alignItems: "baseline", padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
            <dt style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>{row.label}</dt>
            <dd style={{ margin: "0", fontSize: "15px", fontWeight: "600", color: "var(--ink)" }}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: "48px",
              padding: "0 22px",
              borderRadius: "12px",
              border: link.primary ? "0" : "1.5px solid var(--border-strong)",
              background: link.primary ? "var(--color-primary)" : "var(--surface-card)",
              color: link.primary ? "#fff" : "var(--blue-900)",
              fontSize: "15px",
              fontWeight: "600",
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
