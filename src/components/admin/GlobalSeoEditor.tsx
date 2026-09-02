"use client";

import { useActionState, useState } from "react";
import { saveSeoSettings } from "@/app/actions/admin-seo";
import type { ActionState } from "@/app/actions/admin-system";
import { MediaField } from "./MediaField";
import { Check } from "@/components/ui/Icon";
import {
  AI_BOTS,
  AI_BOT_PURPOSE_LABEL,
  SEO_FIELDS,
  SEO_GROUPS,
  type AiBotPurpose,
  type SeoField,
} from "@/lib/seo-settings";

const initial: ActionState = { status: "idle" };

function Hint({ text }: { text?: string }) {
  return text ? <span className="field__hint">{text}</span> : null;
}

/** The AI crawler grid. Ticked means blocked, so the default state is open. */
function BotPicker({ blocked }: { blocked: string[] }) {
  const [selected, setSelected] = useState(new Set(blocked));

  const toggle = (agent: string, on: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(agent);
      else next.delete(agent);
      return next;
    });
  };

  const purposes: AiBotPurpose[] = ["search", "user", "training"];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {purposes.map((purpose) => {
        const bots = AI_BOTS.filter((bot) => bot.purpose === purpose);
        const blockedHere = bots.filter((bot) => selected.has(bot.agent)).length;
        return (
          <div key={purpose}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink)",
                margin: "0 0 4px",
              }}
            >
              {AI_BOT_PURPOSE_LABEL[purpose]}
            </p>
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "0 0 10px" }}>
              {blockedHere} of {bots.length} blocked
            </p>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
              {bots.map((bot) => (
                <label key={bot.agent} className="radio-row" style={{ margin: 0, padding: "10px 12px" }}>
                  <input
                    type="checkbox"
                    name={`bot:${bot.agent}`}
                    checked={selected.has(bot.agent)}
                    onChange={(event) => toggle(bot.agent, event.target.checked)}
                  />
                  <span>
                    <strong>{bot.label}</strong>
                    <span>{bot.operator}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldControl({ field, value }: { field: SeoField; value: unknown }) {
  const name = `seo:${field.key}`;

  if (field.type === "bots") {
    return <BotPicker blocked={Array.isArray(value) ? (value as string[]) : []} />;
  }

  if (field.type === "boolean") {
    return (
      <label className="radio-row" style={{ marginBottom: 10, padding: "12px 14px" }}>
        <input type="checkbox" name={name} defaultChecked={value === true} />
        <span>
          <strong>{field.label}</strong>
          <span>{field.hint ?? field.key}</span>
        </span>
      </label>
    );
  }

  if (field.type === "media") {
    return (
      <MediaField
        name={name}
        label={field.label}
        hint={field.hint}
        initial={typeof value === "string" ? value : ""}
      />
    );
  }

  if (field.type === "select") {
    return (
      <div className="field">
        <label htmlFor={field.key}>{field.label}</label>
        <select id={field.key} name={name} defaultValue={String(value ?? "")}>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Hint text={field.hint} />
      </div>
    );
  }

  if (field.type === "textarea" || field.type === "lines") {
    const text = field.type === "lines" ? (Array.isArray(value) ? value.join("\n") : "") : String(value ?? "");
    return (
      <div className="field">
        <label htmlFor={field.key}>{field.label}</label>
        <textarea id={field.key} name={name} rows={field.type === "lines" ? 4 : 3} defaultValue={text} />
        <Hint text={field.hint} />
      </div>
    );
  }

  return (
    <div className="field">
      <label htmlFor={field.key}>{field.label}</label>
      <input
        id={field.key}
        name={name}
        type={field.type === "number" ? "number" : "text"}
        defaultValue={String(value ?? "")}
        placeholder={field.placeholder}
      />
      <Hint text={field.hint} />
    </div>
  );
}

/**
 * One form for every global SEO setting. It posts all of them at once so a
 * cleared checkbox is recorded rather than silently kept at its old value.
 */
export function GlobalSeoEditor({ values }: { values: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveSeoSettings, initial);

  return (
    <form action={action}>
      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {SEO_GROUPS.map((group) => {
        const fields = SEO_FIELDS.filter((field) => field.group === group.id);
        if (fields.length === 0) return null;

        // Half-width fields pair up; everything else takes the full row.
        const rows: SeoField[][] = [];
        for (const field of fields) {
          const last = rows[rows.length - 1];
          if (field.half && last && last.length === 1 && last[0].half) last.push(field);
          else rows.push([field]);
        }

        return (
          <fieldset key={group.id} className="fieldset">
            <legend>{group.title}</legend>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: "0 0 16px", lineHeight: 1.6 }}>
              {group.description}
            </p>
            {rows.map((row, index) =>
              row.length === 2 ? (
                <div className="field-row" key={`${group.id}-${index}`}>
                  {row.map((field) => (
                    <FieldControl key={field.key} field={field} value={values[field.key]} />
                  ))}
                </div>
              ) : (
                <FieldControl key={row[0].key} field={row[0]} value={values[row[0].key]} />
              ),
            )}
          </fieldset>
        );
      })}

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save global SEO"}
      </button>
    </form>
  );
}
