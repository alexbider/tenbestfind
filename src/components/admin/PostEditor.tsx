"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { GuideBlock } from "../../../prisma/data/editorial";
import { savePost, type ActionState } from "@/app/actions/admin-content";
import { BlockEditor } from "./BlockEditor";
import { MediaField } from "./MediaField";
import { Check } from "@/components/ui/Icon";
import type { Option } from "./GuideEditor";

const initial: ActionState = { status: "idle" };

export type PostDraft = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  heroImage: string;
  categoryId: string;
  authorId: string;
  status: string;
  body: GuideBlock[];
};

export function PostEditor({
  post,
  categories,
  people,
}: {
  post: PostDraft;
  categories: Option[];
  people: Option[];
}) {
  const [state, action, pending] = useActionState(savePost, initial);

  return (
    <form action={action}>
      {post.id ? <input type="hidden" name="id" value={post.id} /> : null}

      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="field">
        <label htmlFor="post-title">Title</label>
        <input id="post-title" name="title" type="text" defaultValue={post.title} required />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="post-slug">Slug</label>
          <input id="post-slug" name="slug" type="text" defaultValue={post.slug} required />
          <span className="field__hint">/blog/{post.slug || "slug"}/</span>
        </div>
        <div className="field">
          <label htmlFor="post-status">Status</label>
          <select id="post-status" name="status" defaultValue={post.status}>
            <option value="DRAFT">Draft</option>
            <option value="REVIEW">In review</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="post-category">Category</label>
          <select id="post-category" name="categoryId" defaultValue={post.categoryId}>
            <option value="">General, no category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="post-author">Author</label>
          <select id="post-author" name="authorId" defaultValue={post.authorId}>
            <option value="">Unassigned</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="post-excerpt">Excerpt</label>
        <textarea id="post-excerpt" name="excerpt" rows={3} defaultValue={post.excerpt} />
      </div>

      <MediaField name="heroImage" label="Hero image" initial={post.heroImage} />

      <fieldset className="fieldset">
        <legend>Body</legend>
        <BlockEditor name="body" initial={post.body} />
      </fieldset>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
          {pending ? "Saving…" : "Save post"}
        </button>
        <Link href="/admin/guides" className="btn btn--secondary btn--sm">
          Back
        </Link>
      </div>
    </form>
  );
}
