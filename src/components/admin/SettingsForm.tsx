"use client";

import { useActionState } from "react";
import { saveSettings, type ActionState } from "@/app/actions/admin-system";
import { Check } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

export type SettingRow = {
  key: string;
  label: string;
  groupName: string;
  value: unknown;
};

const GROUP_LABEL: Record<string, string> = {
  general: "General",
  seo: "SEO defaults",
  editorial: "Editorial",
  billing: "Billing",
  analytics: "Analytics",
};

export function SettingsForm({ settings }: { settings: SettingRow[] }) {
  const [state, action, pending] = useActionState(saveSettings, initial);

  const groups = new Map<string, SettingRow[]>();
  for (const setting of settings) {
    groups.set(setting.groupName, [...(groups.get(setting.groupName) ?? []), setting]);
  }

  return (
    <form action={action}>
      <input type="hidden" name="renderedKeys" value={settings.map((setting) => setting.key).join(",")} />

      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      {[...groups.entries()].map(([group, rows]) => (
        <fieldset key={group} className="fieldset">
          <legend>{GROUP_LABEL[group] ?? group}</legend>
          {rows.map((setting) => {
            const name = `setting:${setting.key}`;
            if (typeof setting.value === "boolean") {
              return (
                <label key={setting.key} className="radio-row" style={{ marginBottom: 10, padding: "12px 14px" }}>
                  <input type="checkbox" name={name} defaultChecked={setting.value} />
                  <span>
                    <strong>{setting.label}</strong>
                    <span>{setting.key}</span>
                  </span>
                </label>
              );
            }
            return (
              <div className="field" key={setting.key}>
                <label htmlFor={setting.key}>{setting.label}</label>
                <input
                  id={setting.key}
                  name={name}
                  type={typeof setting.value === "number" ? "number" : "text"}
                  defaultValue={String(setting.value)}
                />
                <span className="field__hint">{setting.key}</span>
              </div>
            );
          })}
        </fieldset>
      ))}

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
