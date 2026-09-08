"use client";

import { useActionState } from "react";
import Link from "next/link";
import { deletePromptTemplate, savePromptTemplate, type ActionState } from "@/app/actions/admin-writer";
import { Check } from "@/components/ui/Icon";
import { GUIDE_TYPES, GUIDE_TYPE_LABELS } from "@/lib/enums";
import { SKILL_LABELS } from "@/lib/guide-skills";

const initial: ActionState = { status: "idle" };

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

export type TemplateDraft = {
  id?: string;
  name: string;
  slug: string;
  guideType: string | null;
  system: string;
  instructions: string;
  model: string;
  effort: string;
  wordTarget: number;
  skills: string[];
  notes: string | null;
  isDefault: boolean;
  archived: boolean;
};

/**
 * A template is instructions, not configuration.
 *
 * The two long fields are the whole point of the screen: the system prompt is
 * who the writer is and what it may never do, and the instructions are how to
 * write this particular kind of piece. Everything else on the page is a dial.
 */
export function PromptTemplateForm({ template }: { template: TemplateDraft }) {
  const [state, action, pending] = useActionState(savePromptTemplate, initial);

  return (
    <>
      <form action={action}>
        {template.id ? <input type="hidden" name="id" value={template.id} /> : null}

        {state.status === "ok" ? (
          <p className="form-success">
            <Check size={18} />
            {state.message}
          </p>
        ) : null}
        {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

        <div className="field-row">
          <div className="field">
            <label htmlFor="tpl-name">Name</label>
            <input id="tpl-name" name="name" type="text" defaultValue={template.name} required />
          </div>
          <div className="field">
            <label htmlFor="tpl-slug">Slug</label>
            <input id="tpl-slug" name="slug" type="text" defaultValue={template.slug} required />
          </div>
          <div className="field">
            <label htmlFor="tpl-type">Written for</label>
            <select id="tpl-type" name="guideType" defaultValue={template.guideType ?? "any"}>
              <option value="any">Any kind of guide</option>
              {GUIDE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {GUIDE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="tpl-system">Who the writer is</label>
          <textarea id="tpl-system" name="system" rows={16} defaultValue={template.system} required />
          <span className="field__hint">
            The standing rules: what it may assert, how it cites, the voice. This is cached between
            calls, so keep it stable and put the per-piece direction below.
          </span>
        </div>

        <div className="field">
          <label htmlFor="tpl-instructions">How to write this kind of guide</label>
          <textarea
            id="tpl-instructions"
            name="instructions"
            rows={14}
            defaultValue={template.instructions}
            required
          />
          <span className="field__hint">
            Tokens: %topic% %keyword% %type% %service% %location% %wordcount% %research% %sitename%.
            The research brief goes wherever you put %research%.
          </span>
        </div>

        <fieldset className="field">
          <legend>House rules</legend>
          <span className="field__hint" style={{ marginBottom: 10, display: "block" }}>
            Each one adds a paragraph to the instructions. Turn on what this kind of guide needs and
            nothing else: a writer told to do nine things does none of them well.
          </span>
          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(SKILL_LABELS).map(([key, label]) => (
              <label key={key} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
                <input
                  type="checkbox"
                  name="skills"
                  value={key}
                  defaultChecked={template.skills.includes(key)}
                  style={{ marginTop: 3 }}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field-row">
          <div className="field">
            <label htmlFor="tpl-model">Model</label>
            <input id="tpl-model" name="model" type="text" defaultValue={template.model} required />
          </div>
          <div className="field">
            <label htmlFor="tpl-effort">Effort</label>
            <select id="tpl-effort" name="effort" defaultValue={template.effort}>
              {EFFORTS.map((effort) => (
                <option key={effort} value={effort}>
                  {effort}
                </option>
              ))}
            </select>
            <span className="field__hint">Higher costs more and thinks longer. High is the sweet spot.</span>
          </div>
          <div className="field">
            <label htmlFor="tpl-words">Word target</label>
            <input
              id="tpl-words"
              name="wordTarget"
              type="number"
              min={300}
              max={6000}
              defaultValue={template.wordTarget}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="tpl-notes">Notes for whoever edits this next</label>
          <textarea id="tpl-notes" name="notes" rows={3} defaultValue={template.notes ?? ""} />
        </div>

        <div className="field-row">
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input type="checkbox" name="isDefault" defaultChecked={template.isDefault} />
            Use this when no template is chosen
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input type="checkbox" name="archived" defaultChecked={template.archived} />
            Archived, hide it from the writer
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? "Saving…" : "Save template"}
          </button>
          <Link href="/admin/guides/briefs" className="btn btn--secondary">
            Back
          </Link>
        </div>
      </form>

      {template.id ? (
        <form action={deletePromptTemplate} style={{ marginTop: 26 }}>
          <input type="hidden" name="id" value={template.id} />
          <button type="submit" className="btn btn--danger btn--sm">
            Delete this template
          </button>
        </form>
      ) : null}
    </>
  );
}
