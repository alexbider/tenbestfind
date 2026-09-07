"use client";

import { useActionState } from "react";
import { saveTopicDials, type ActionState } from "@/app/actions/admin-topics";
import { Check } from "@/components/ui/Icon";
import { GUIDE_TYPES, GUIDE_TYPE_LABELS } from "@/lib/enums";
import { TOPIC_FIELDS, TOPIC_GROUPS, type TopicField } from "@/lib/topic-fields";

const initial: ActionState = { status: "idle" };

export type DialValues = Record<string, unknown>;

/**
 * The dials, generated from the descriptors.
 *
 * Generated rather than hand-written so a new dial is one entry in
 * topic-fields.ts rather than an entry plus a form field plus a reader, which
 * is the shape that lets the three drift apart.
 */
export function TopicSettingsForm({
  values,
  services,
}: {
  values: DialValues;
  services: { slug: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(saveTopicDials, initial);

  return (
    <form action={action}>
      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {TOPIC_GROUPS.map((group) => {
        const fields = TOPIC_FIELDS.filter((field) => field.group === group.id);
        if (fields.length === 0) return null;
        return (
          <section key={group.id} style={{ marginBottom: 30 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{group.title}</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14, maxWidth: "68ch" }}>
              {group.description}
            </p>
            <div className="field-row" style={{ flexWrap: "wrap" }}>
              {fields.map((field) => (
                <Field key={field.key} field={field} value={values[field.key]} services={services} />
              ))}
            </div>
          </section>
        );
      })}

      <button type="submit" className="btn btn--primary" disabled={pending}>
        {pending ? "Saving…" : "Save these"}
      </button>
    </form>
  );
}

function Field({
  field,
  value,
  services,
}: {
  field: TopicField;
  value: unknown;
  services: { slug: string; label: string }[];
}) {
  const hint = field.hint ? <span className="field__hint">{field.hint}</span> : null;
  const width = field.half ? { flex: "1 1 220px" } : { flex: "1 1 100%" };

  if (field.type === "boolean") {
    return (
      <div className="field" style={{ flex: "1 1 100%" }}>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" name={field.key} defaultChecked={value === true} />
          {field.label}
        </label>
        {hint}
      </div>
    );
  }

  if (field.type === "types") {
    const chosen = new Set(Array.isArray(value) ? value.map(String) : []);
    return (
      <fieldset className="field" style={{ flex: "1 1 100%" }}>
        <legend>{field.label}</legend>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {GUIDE_TYPES.map((type) => (
            <label key={type} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
              <input type="checkbox" name={field.key} value={type} defaultChecked={chosen.has(type)} />
              {GUIDE_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
        {hint}
      </fieldset>
    );
  }

  if (field.type === "services") {
    const chosen = new Set(Array.isArray(value) ? value.map(String) : []);
    return (
      <fieldset className="field" style={{ flex: "1 1 100%" }}>
        <legend>{field.label}</legend>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 6,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {services.map((service) => (
            <label key={service.slug} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input
                type="checkbox"
                name={field.key}
                value={service.slug}
                defaultChecked={chosen.has(service.slug)}
              />
              {service.label}
            </label>
          ))}
        </div>
        {hint}
      </fieldset>
    );
  }

  return (
    <div className="field" style={width}>
      <label htmlFor={field.key}>{field.label}</label>
      {field.type === "select" ? (
        <select id={field.key} name={field.key} defaultValue={String(value ?? "")}>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={field.key}
          name={field.key}
          type={field.type === "number" ? "number" : "text"}
          min={field.min}
          max={field.max}
          defaultValue={String(value ?? "")}
        />
      )}
      {hint}
    </div>
  );
}
