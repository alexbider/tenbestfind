"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { GuideBlock } from "../../../prisma/data/editorial";
import { savePage, type ActionState } from "@/app/actions/admin-content";
import { BlockEditor } from "./BlockEditor";
import { RepeatableEditor } from "./RepeatableEditor";
import { Check } from "@/components/ui/Icon";

const initial: ActionState = { status: "idle" };

export type PageDraft = {
  id?: string;
  title: string;
  slug: string;
  template: string;
  excerpt: string;
  noticeTitle: string;
  noticeBody: string;
  printable: boolean;
  status: string;
  body: GuideBlock[];
  faqs: { question: string; answer: string }[];
};

export function PageEditor({ page }: { page: PageDraft }) {
  const [state, action, pending] = useActionState(savePage, initial);

  return (
    <form action={action}>
      {page.id ? <input type="hidden" name="id" value={page.id} /> : null}

      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field">
        <label htmlFor="page-title">Title</label>
        <input id="page-title" name="title" type="text" defaultValue={page.title} required />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="page-slug">Slug</label>
          <input id="page-slug" name="slug" type="text" defaultValue={page.slug} required />
          <span className="field__hint">
            Published at /{page.slug || "slug"}/. Changing it creates a redirect from the old
            address automatically.
          </span>
        </div>
        <div className="field">
          <label htmlFor="page-template">Template</label>
          <select id="page-template" name="template" defaultValue={page.template}>
            <option value="document">Document (sticky contents, reading column)</option>
            <option value="contact">Contact (routing cards and form)</option>
            <option value="sitemap">Sitemap (grouped link cards)</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="page-excerpt">Summary</label>
        <textarea id="page-excerpt" name="excerpt" rows={3} defaultValue={page.excerpt} />
        <span className="field__hint">Shown under the heading and used as the default meta description.</span>
      </div>

      <fieldset className="fieldset">
        <legend>Notice callout</legend>
        <div className="field">
          <label htmlFor="page-notice-title">Notice title</label>
          <input
            id="page-notice-title"
            name="noticeTitle"
            type="text"
            defaultValue={page.noticeTitle}
            placeholder="Your rights"
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="page-notice-body">Notice body</label>
          <textarea id="page-notice-body" name="noticeBody" rows={3} defaultValue={page.noticeBody} />
          <span className="field__hint">
            Leave both blank for no callout. Use it for the one thing a reader must not miss.
          </span>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Body</legend>
        <BlockEditor name="body" initial={page.body} />
      </fieldset>

      <fieldset className="fieldset">
        <legend>Questions on this page</legend>
        <RepeatableEditor
          name="faqs"
          summaryKey="question"
          addLabel="Add question"
          emptyLabel="No questions on this page yet."
          fields={[
            { key: "question", label: "Question", placeholder: "What does this policy cover?" },
            { key: "answer", label: "Answer", type: "textarea" },
          ]}
          initial={page.faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))}
        />
      </fieldset>

      <div className="field-row">
        <div className="field">
          <label htmlFor="page-status">Status</label>
          <select id="page-status" name="status" defaultValue={page.status}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="page-printable" style={{ marginBottom: 12 }}>
            Print button
          </label>
          <label className="radio-row" style={{ padding: "10px 14px" }}>
            <input id="page-printable" type="checkbox" name="printable" defaultChecked={page.printable} />
            <span>
              <strong>Offer a print view</strong>
              <span>Useful on legal pages people keep for their records.</span>
            </span>
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
          {pending ? "Saving…" : "Save page"}
        </button>
        <Link href="/admin/pages" className="btn btn--secondary btn--sm">
          Back to pages
        </Link>
      </div>
    </form>
  );
}
