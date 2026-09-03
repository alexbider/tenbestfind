"use client";

import { useActionState } from "react";
import type { GuideBlock } from "../../../prisma/data/editorial";
import { saveGuide, type ActionState } from "@/app/actions/admin-content";
import { BlockEditor } from "./BlockEditor";
import { RepeatableEditor, StringListEditor } from "./RepeatableEditor";
import { MediaField } from "./MediaField";
import { Check } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

export type GuideDraft = {
  id?: string;
  title: string;
  slug: string;
  type: string;
  categoryId: string;
  authorId: string;
  reviewerId: string;
  excerpt: string;
  shortAnswer: string;
  bottomLine: string;
  heroImage: string;
  readingMinutes: string;
  typicalLow: string;
  typicalHigh: string;
  unitLow: string;
  unitHigh: string;
  unitLabel: string;
  status: string;
  keyTakeaways: string[];
  body: GuideBlock[];
  costs: Record<string, string>[];
  sources: Record<string, string>[];
  faqs: Record<string, string>[];
};

export type Option = { id: string; label: string };

export function GuideEditor({
  guide,
  categories,
  people,
}: {
  guide: GuideDraft;
  categories: Option[];
  people: Option[];
}) {
  const [state, action, pending] = useActionState(saveGuide, initial);
  const isCost = guide.type === "COST";

  return (
    <form action={action}>
      {guide.id ? <input type="hidden" name="id" value={guide.id} /> : null}

      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field">
        <label htmlFor="guide-title">Title</label>
        <input id="guide-title" name="title" type="text" defaultValue={guide.title} required />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="guide-slug">Slug</label>
          <input id="guide-slug" name="slug" type="text" defaultValue={guide.slug} required />
          <span className="field__hint">
            /guides/{guide.slug || "slug"}/. Changing it creates a redirect automatically.
          </span>
        </div>
        <div className="field">
          <label htmlFor="guide-type">Type</label>
          <select id="guide-type" name="type" defaultValue={guide.type}>
            <option value="EDITORIAL">Editorial guide</option>
            <option value="COST">Cost guide</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="guide-category">Category</label>
          <select id="guide-category" name="categoryId" defaultValue={guide.categoryId}>
            <option value="">General, no category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="guide-reading">Reading time, minutes</label>
          <input
            id="guide-reading"
            name="readingMinutes"
            type="number"
            min="1"
            max="60"
            defaultValue={guide.readingMinutes}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="guide-author">Author</label>
          <select id="guide-author" name="authorId" defaultValue={guide.authorId}>
            <option value="">Unassigned</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="guide-reviewer">Expert reviewer</label>
          <select id="guide-reviewer" name="reviewerId" defaultValue={guide.reviewerId}>
            <option value="">Not required for this topic</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="guide-excerpt">Excerpt</label>
        <textarea id="guide-excerpt" name="excerpt" rows={2} defaultValue={guide.excerpt} />
        <span className="field__hint">Shown on index cards and used as the default meta description.</span>
      </div>

      <div className="field">
        <label htmlFor="guide-answer">The short answer</label>
        <textarea id="guide-answer" name="shortAnswer" rows={4} defaultValue={guide.shortAnswer} />
        <span className="field__hint">
          Answer the question in the title before anything else. This is what gets quoted.
        </span>
      </div>

      <div className="field">
        <label htmlFor="guide-bottom">The bottom line</label>
        <textarea id="guide-bottom" name="bottomLine" rows={3} defaultValue={guide.bottomLine} />
        <span className="field__hint">
          What to do with everything above. Leave it empty and the closing panel stays off the page.
        </span>
      </div>

      <MediaField
        name="heroImage"
        label="Hero image"
        initial={guide.heroImage}
        hint="Paste a URL or upload one. Leave blank for a neutral placeholder."
      />

      <StringListEditor
        name="keyTakeaways"
        label="Key takeaways"
        initial={guide.keyTakeaways}
        hint="One per line. Rendered as a checklist under the short answer."
      />

      {isCost ? (
        <fieldset className="fieldset">
          <legend>Headline cost</legend>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
            Leave blank where we have no sourced figure. The page says so rather than showing a
            number we cannot support.
          </p>
          <div className="field-row">
            <div className="field">
              <label htmlFor="guide-low">Typical low</label>
              <input id="guide-low" name="typicalLow" type="number" defaultValue={guide.typicalLow} />
            </div>
            <div className="field">
              <label htmlFor="guide-high">Typical high</label>
              <input id="guide-high" name="typicalHigh" type="number" defaultValue={guide.typicalHigh} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="guide-unit-low">Unit low</label>
              <input id="guide-unit-low" name="unitLow" type="number" defaultValue={guide.unitLow} />
            </div>
            <div className="field">
              <label htmlFor="guide-unit-high">Unit high</label>
              <input id="guide-unit-high" name="unitHigh" type="number" defaultValue={guide.unitHigh} />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="guide-unit-label">Unit label</label>
            <input
              id="guide-unit-label"
              name="unitLabel"
              type="text"
              defaultValue={guide.unitLabel}
              placeholder="per square foot installed"
            />
          </div>
        </fieldset>
      ) : null}

      <fieldset className="fieldset">
        <legend>Body</legend>
        <BlockEditor name="body" initial={guide.body} />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Cost rows</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          A row with no low or high price publishes as &ldquo;Quoted per project&rdquo;.
        </p>
        <RepeatableEditor
          name="costs"
          summaryKey="label"
          addLabel="Add cost row"
          emptyLabel="No cost rows on this guide."
          fields={[
            { key: "label", label: "Work", placeholder: "2,000 sq ft architectural shingle roof" },
            {
              key: "unit",
              label: "Unit",
              type: "select",
              width: "half",
              options: [
                { value: "project", label: "Per project" },
                { value: "sq_ft", label: "Per square foot" },
                { value: "hour", label: "Per hour" },
                { value: "visit", label: "Per visit" },
              ],
            },
            { key: "low", label: "Low", type: "number", width: "half" },
            { key: "high", label: "High", type: "number", width: "half" },
            { key: "typical", label: "Typical", type: "number", width: "half" },
            { key: "note", label: "Note", type: "textarea" },
          ]}
          initial={guide.costs}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Sources</legend>
        <RepeatableEditor
          name="sources"
          summaryKey="label"
          addLabel="Add source"
          emptyLabel="No sources cited yet."
          fields={[
            { key: "label", label: "Source", placeholder: "City of Dallas permit fee schedule" },
            { key: "publisher", label: "Publisher", width: "half" },
            {
              key: "tier",
              label: "Tier",
              type: "select",
              width: "half",
              options: [
                { value: "PRIMARY", label: "Primary" },
                { value: "SECONDARY", label: "Secondary" },
                { value: "REPORTED", label: "Reported" },
                { value: "EDITORIAL", label: "Editorial research" },
              ],
            },
            { key: "url", label: "URL" },
          ]}
          initial={guide.sources}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Questions</legend>
        <RepeatableEditor
          name="faqs"
          summaryKey="question"
          addLabel="Add question"
          emptyLabel="No questions on this guide."
          fields={[
            { key: "question", label: "Question" },
            { key: "answer", label: "Answer", type: "textarea" },
          ]}
          initial={guide.faqs}
        />
      </fieldset>

      <div className="field">
        <label htmlFor="guide-status">Status</label>
        <select id="guide-status" name="status" defaultValue={guide.status}>
          <option value="DRAFT">Draft</option>
          <option value="REVIEW">In review</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save guide"}
      </button>
    </form>
  );
}
