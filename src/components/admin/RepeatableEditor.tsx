"use client";

import { useRef, useState } from "react";
import { IMAGE_ACCEPT, uploadMedia } from "./MediaField";
import { Icon } from "@/components/ui/Icon";

export type FieldSpec = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select" | "media";
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  width?: "full" | "half";
};

export type RepeatableRow = Record<string, string>;

/**
 * Edits a list of same-shaped rows: FAQs, criteria, cost rows, sources,
 * credentials, service areas. The whole list is serialized into one hidden
 * field and posted with the parent form, so a save is one transaction rather
 * than a row at a time.
 */
export function RepeatableEditor({
  name,
  fields,
  initial,
  addLabel = "Add row",
  emptyLabel = "Nothing yet.",
  summaryKey,
}: {
  name: string;
  fields: FieldSpec[];
  initial: RepeatableRow[];
  addLabel?: string;
  emptyLabel?: string;
  summaryKey?: string;
}) {
  const [rows, setRows] = useState<RepeatableRow[]>(initial);

  const blank = (): RepeatableRow =>
    Object.fromEntries(fields.map((field) => [field.key, ""])) as RepeatableRow;

  const update = (index: number, key: string, value: string) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  };

  const move = (index: number, delta: number) => {
    setRows((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div className="repeatable">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />

      {rows.length === 0 ? (
        <p style={{ fontSize: 14.5, color: "var(--text-secondary)", marginBottom: 14 }}>{emptyLabel}</p>
      ) : null}

      <ol className="repeatable__list">
        {rows.map((row, index) => (
          <li key={index} className="repeatable__row">
            <div className="repeatable__bar">
              <span className="repeatable__index">{index + 1}</span>
              <span className="repeatable__summary">
                {(summaryKey ? row[summaryKey] : Object.values(row)[0]) || "Empty"}
              </span>
              <div className="repeatable__actions">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                  <Icon name="up" size={14} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label="Move down"
                >
                  <Icon name="down" size={14} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  aria-label="Remove"
                >
                  <Icon name="alert" size={14} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="repeatable__fields">
              {fields.map((field) => (
                <div
                  className="field"
                  key={field.key}
                  style={{ marginBottom: 0, gridColumn: field.width === "half" ? "span 1" : "span 2" }}
                >
                  <label htmlFor={`${name}-${index}-${field.key}`}>{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      id={`${name}-${index}-${field.key}`}
                      rows={3}
                      value={row[field.key] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) => update(index, field.key, event.target.value)}
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={`${name}-${index}-${field.key}`}
                      value={row[field.key] ?? ""}
                      onChange={(event) => update(index, field.key, event.target.value)}
                    >
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "media" ? (
                    <MediaRowInput
                      id={`${name}-${index}-${field.key}`}
                      value={row[field.key] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(next) => update(index, field.key, next)}
                    />
                  ) : (
                    <input
                      id={`${name}-${index}-${field.key}`}
                      type={field.type === "number" ? "number" : "text"}
                      value={row[field.key] ?? ""}
                      placeholder={field.placeholder}
                      onChange={(event) => update(index, field.key, event.target.value)}
                    />
                  )}
                  {field.hint ? <span className="field__hint">{field.hint}</span> : null}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={() => setRows((current) => [...current, blank()])}
      >
        <Icon name="plus" size={15} />
        {addLabel}
      </button>
    </div>
  );
}


/** The media variant of a repeatable cell: a URL with an upload beside it. */
function MediaRowInput({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder ?? "https://…"}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={busy}
          onClick={() => input.current?.click()}
          style={{ flexShrink: 0 }}
        >
          {busy ? "…" : "Upload"}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(null);
          const result = await uploadMedia(file);
          if ("error" in result) setError(result.error);
          else onChange(result.url);
          setBusy(false);
          event.target.value = "";
        }}
      />
      {error ? (
        <span className="field__hint" style={{ color: "var(--maple-600)" }}>
          {error}
        </span>
      ) : null}
    </>
  );
}

/**
 * Picks any number of ids from a grouped list: the subservices a company
 * offers, the cities it serves. Posts them newline separated in one field, and
 * the order they were checked in is preserved so the first area can be treated
 * as the primary one.
 */
export function IdListEditor({
  name,
  label,
  hint,
  options,
  initial,
}: {
  name: string;
  label: string;
  hint?: string;
  options: { id: string; label: string; group?: string }[];
  initial: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initial);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const groups = options.reduce<Record<string, typeof options>>((acc, option) => {
    const key = option.group ?? "";
    (acc[key] ??= []).push(option);
    return acc;
  }, {});

  return (
    <div className="field">
      <label htmlFor={`idlist-${name}`}>{label}</label>
      <input type="hidden" id={`idlist-${name}`} name={name} value={selected.join("\n")} />
      <div className="checkgrid">
        {Object.entries(groups).map(([group, groupOptions]) => (
          <div key={group} className="checkgrid__group">
            {group ? <h4>{group}</h4> : null}
            <div className="checkgrid__items">
              {groupOptions.map((option) => (
                <label key={option.id} className="checkgrid__item">
                  <input
                    type="checkbox"
                    checked={selected.includes(option.id)}
                    onChange={() => toggle(option.id)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {options.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Nothing to pick from yet.</p>
        ) : null}
      </div>
      <span className="field__hint">
        {hint ?? `${selected.length} selected.`}
      </span>
    </div>
  );
}

/** A simpler list of plain strings: takeaways, likes, concerns, features. */
export function StringListEditor({
  name,
  initial,
  label,
  hint,
  rows = 5,
}: {
  name: string;
  initial: string[];
  label: string;
  hint?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(initial.join("\n"));
  return (
    <div className="field">
      <label htmlFor={`list-${name}`}>{label}</label>
      <textarea
        id={`list-${name}`}
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <span className="field__hint">{hint ?? "One per line. Blank lines are ignored."}</span>
    </div>
  );
}
