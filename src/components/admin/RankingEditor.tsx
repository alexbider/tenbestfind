"use client";

import { useActionState, useState } from "react";
import { saveRanking, type ActionState } from "@/app/actions/admin-content";
import { RepeatableEditor } from "./RepeatableEditor";
import { Check } from "@/components/ui/Icon";
import type { Option } from "./GuideEditor";

const initial: ActionState = { status: "idle" };

export type RankingDraft = {
  id?: string;
  title: string;
  slug: string;
  categoryId: string;
  cityId: string;
  summary: string;
  intro: string;
  methodologyNote: string;
  companiesReviewed: string;
  readingMinutes: string;
  authorId: string;
  reviewerId: string;
  status: string;
  entries: Record<string, string>[];
  criteria: Record<string, string>[];
  costs: Record<string, string>[];
  sources: Record<string, string>[];
  faqs: Record<string, string>[];
};

export function RankingEditor({
  ranking,
  categories,
  cities,
  people,
  businesses,
}: {
  ranking: RankingDraft;
  categories: Option[];
  cities: Option[];
  people: Option[];
  businesses: Option[];
}) {
  const [state, action, pending] = useActionState(saveRanking, initial);
  const [categoryId, setCategoryId] = useState(ranking.categoryId);
  const [cityId, setCityId] = useState(ranking.cityId);

  const businessOptions = [
    { value: "", label: "Pick a company" },
    ...businesses.map((business) => ({ value: business.id, label: business.label })),
  ];

  return (
    <form action={action}>
      {ranking.id ? <input type="hidden" name="id" value={ranking.id} /> : null}

      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field">
        <label htmlFor="rank-title">Title</label>
        <input id="rank-title" name="title" type="text" defaultValue={ranking.title} required />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="rank-category">Category</label>
          <select
            id="rank-category"
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            <option value="">Pick a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rank-city">City</label>
          <select
            id="rank-city"
            name="cityId"
            value={cityId}
            onChange={(event) => setCityId(event.target.value)}
            required
          >
            <option value="">Pick a city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.label}
              </option>
            ))}
          </select>
          <span className="field__hint">
            The public address is built from the city and category, so one ranking exists per pair.
          </span>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="rank-slug">Slug</label>
          <input id="rank-slug" name="slug" type="text" defaultValue={ranking.slug} required />
          <span className="field__hint">Internal reference. The public URL uses the city and category.</span>
        </div>
        <div className="field">
          <label htmlFor="rank-status">Status</label>
          <select id="rank-status" name="status" defaultValue={ranking.status}>
            <option value="DRAFT">Draft</option>
            <option value="REVIEW">In review</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="rank-summary">Answer-first summary</label>
        <textarea id="rank-summary" name="summary" rows={3} defaultValue={ranking.summary} />
        <span className="field__hint">
          The first thing on the page and in search results. Name the pick and say why.
        </span>
      </div>

      <div className="field">
        <label htmlFor="rank-intro">Introduction</label>
        <textarea id="rank-intro" name="intro" rows={5} defaultValue={ranking.intro} />
      </div>

      <div className="field">
        <label htmlFor="rank-method">Methodology note</label>
        <textarea id="rank-method" name="methodologyNote" rows={4} defaultValue={ranking.methodologyNote} />
        <span className="field__hint">How this list was built, in plain words. It publishes verbatim.</span>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="rank-reviewed">Companies reviewed</label>
          <input
            id="rank-reviewed"
            name="companiesReviewed"
            type="number"
            min="0"
            defaultValue={ranking.companiesReviewed}
          />
        </div>
        <div className="field">
          <label htmlFor="rank-reading">Reading time, minutes</label>
          <input
            id="rank-reading"
            name="readingMinutes"
            type="number"
            min="1"
            max="60"
            defaultValue={ranking.readingMinutes}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="rank-author">Author</label>
          <select id="rank-author" name="authorId" defaultValue={ranking.authorId}>
            <option value="">Unassigned</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rank-reviewer">Expert reviewer</label>
          <select id="rank-reviewer" name="reviewerId" defaultValue={ranking.reviewerId}>
            <option value="">Not required for this list</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="fieldset">
        <legend>Positions</legend>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
          Row order is the published order. Marking an entry sponsored labels it on the page; it does
          not move it up.
        </p>
        <RepeatableEditor
          name="entries"
          summaryKey="designation"
          addLabel="Add position"
          emptyLabel="No companies on this list yet."
          fields={[
            { key: "businessId", label: "Company", type: "select", options: businessOptions },
            {
              key: "designation",
              label: "Designation",
              placeholder: "Best for emergency call-outs",
            },
            { key: "whyPicked", label: "Why we picked it", type: "textarea" },
            { key: "likes", label: "What we like", type: "textarea", hint: "One per line." },
            { key: "concerns", label: "What to check", type: "textarea", hint: "One per line." },
            {
              key: "sponsored",
              label: "Sponsored label",
              type: "select",
              width: "half",
              options: [
                { value: "no", label: "No" },
                { value: "yes", label: "Yes, label it sponsored" },
              ],
            },
          ]}
          initial={ranking.entries}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Criteria</legend>
        <RepeatableEditor
          name="criteria"
          summaryKey="title"
          addLabel="Add criterion"
          emptyLabel="No criteria recorded for this list."
          fields={[
            { key: "title", label: "Criterion", placeholder: "Licence and insurance checked" },
            { key: "body", label: "What it means", type: "textarea" },
            {
              key: "importance",
              label: "Weight",
              type: "select",
              width: "half",
              options: [
                { value: "HIGH", label: "High" },
                { value: "MODERATE", label: "Moderate" },
                { value: "SUPPORTING", label: "Supporting" },
              ],
            },
            { key: "iconKey", label: "Icon key", width: "half", placeholder: "shield" },
          ]}
          initial={ranking.criteria}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Local costs</legend>
        <RepeatableEditor
          name="costs"
          summaryKey="label"
          addLabel="Add cost row"
          emptyLabel="No local cost rows on this list."
          fields={[
            { key: "label", label: "Work" },
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
          initial={ranking.costs}
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
            { key: "label", label: "Source" },
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
          initial={ranking.sources}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Questions</legend>
        <RepeatableEditor
          name="faqs"
          summaryKey="question"
          addLabel="Add question"
          emptyLabel="No questions on this list."
          fields={[
            { key: "question", label: "Question" },
            { key: "answer", label: "Answer", type: "textarea" },
          ]}
          initial={ranking.faqs}
        />
      </fieldset>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? "Saving…" : "Save ranking"}
      </button>
    </form>
  );
}
