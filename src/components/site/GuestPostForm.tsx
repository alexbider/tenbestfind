"use client";

import { useActionState } from "react";
import { submitGuestPost, type GuestPostState } from "@/app/actions/guest-post";

const initial: GuestPostState = { status: "idle" };

const INPUT = {
  height: "50px",
  padding: "0 16px",
  border: "1px solid var(--border-strong)",
  borderRadius: "12px",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  width: "100%",
  background: "var(--surface-card)",
  color: "var(--text-primary)",
} as const;

const LABEL = { fontSize: "14px", fontWeight: "700", color: "var(--ink)" } as const;
const HINT = { fontSize: "13.5px", color: "var(--text-secondary)" } as const;

function FieldError({ errors, name }: { errors?: Record<string, string>; name: string }) {
  const message = errors?.[name];
  return message ? <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--maple-600)" }}>{message}</span> : null;
}

/** The guest post order form. Posts to submitGuestPost, which opens a one-time checkout. */
export function GuestPostForm() {
  const [state, action, pending] = useActionState(submitGuestPost, initial);

  return (
    <div style={{ borderRadius: "22px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
      <div style={{ padding: "26px 28px 0" }}>
        <h3 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.03em", marginBottom: "6px" }}>Order a sponsored guest post</h3>
        <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
          $99 once per post. An editor reviews the topic and the links before anything is published. The post is marked Sponsored and both links carry rel="sponsored".
        </p>
      </div>
      <form action={action} data-guest-post="" style={{ padding: "24px 28px 28px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "18px" }}>
        {state.status === "error" ? (
          <p role="alert" style={{ gridColumn: "1 / -1", padding: "12px 14px", borderRadius: "12px", background: "#FDF1EE", border: "1px solid #F3C6BB", fontSize: "14.5px", fontWeight: "600", color: "var(--maple-600)" }}>
            {state.message}
          </p>
        ) : null}
        {state.status === "ok" ? (
          <p role="status" style={{ gridColumn: "1 / -1", padding: "12px 14px", borderRadius: "12px", background: "var(--blue-50)", fontSize: "14.5px", color: "var(--ink)" }}>
            {state.message}
          </p>
        ) : null}
        <label style={{ display: "grid", gap: "8px" }}>
          <span style={LABEL}>Business name</span>
          <input required name="business" type="text" autoComplete="organization" style={INPUT} />
          <FieldError errors={state.errors} name="business" />
        </label>
        <label style={{ display: "grid", gap: "8px" }}>
          <span style={LABEL}>Your name</span>
          <input required name="name" type="text" autoComplete="name" style={INPUT} />
          <FieldError errors={state.errors} name="name" />
        </label>
        <label style={{ display: "grid", gap: "8px" }}>
          <span style={LABEL}>Email</span>
          <input required name="email" type="email" autoComplete="email" style={INPUT} />
          <FieldError errors={state.errors} name="email" />
        </label>
        <label style={{ gridColumn: "1 / -1", display: "grid", gap: "8px" }}>
          <span style={LABEL}>Post topic</span>
          <input required name="topic" type="text" placeholder="e.g. How to plan a roof replacement before storm season" style={INPUT} />
          <FieldError errors={state.errors} name="topic" />
        </label>
        <fieldset style={{ gridColumn: "1 / -1", display: "grid", gap: "14px", border: "0", padding: "0", margin: "0" }}>
          <legend style={{ ...LABEL, marginBottom: "4px" }}>Two links to include</legend>
          <p style={HINT}>Both must be full https:// addresses. Each link is paid and marked rel="sponsored".</p>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={LABEL}>Link one address</span>
            <input required name="url1" type="url" placeholder="https://" style={INPUT} />
            <FieldError errors={state.errors} name="url1" />
          </label>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={LABEL}>Link one anchor text</span>
            <input required name="anchor1" type="text" style={INPUT} />
            <FieldError errors={state.errors} name="anchor1" />
          </label>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={LABEL}>Link two address</span>
            <input required name="url2" type="url" placeholder="https://" style={INPUT} />
            <FieldError errors={state.errors} name="url2" />
          </label>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={LABEL}>Link two anchor text</span>
            <input required name="anchor2" type="text" style={INPUT} />
            <FieldError errors={state.errors} name="anchor2" />
          </label>
        </fieldset>
        <label style={{ gridColumn: "1 / -1", display: "grid", gap: "8px" }}>
          <span style={LABEL}>What the post should cover</span>
          <span style={HINT}>The points, facts or angles you want in the article. Name any services, areas or offers to mention.</span>
          <textarea required name="keyPoints" rows={4} style={{ ...INPUT, height: "auto", padding: "14px 16px", resize: "vertical" }} />
          <FieldError errors={state.errors} name="keyPoints" />
        </label>
        <label style={{ gridColumn: "1 / -1", display: "grid", gap: "8px" }}>
          <span style={LABEL}>Who the post is for</span>
          <input name="audience" type="text" placeholder="e.g. Homeowners in Texas planning a roof replacement" style={INPUT} />
          <FieldError errors={state.errors} name="audience" />
        </label>
        <label style={{ display: "grid", gap: "8px" }}>
          <span style={LABEL}>Length</span>
          <select required name="wordCount" defaultValue="" style={INPUT}>
            <option value="" disabled>Choose a length</option>
            <option value="800">About 800 words</option>
            <option value="1200">About 1,200 words</option>
            <option value="1500">About 1,500 words</option>
          </select>
          <FieldError errors={state.errors} name="wordCount" />
        </label>
        <label style={{ display: "grid", gap: "8px" }}>
          <span style={LABEL}>A page to base it on (optional)</span>
          <input name="sourceUrl" type="url" placeholder="https://" style={INPUT} />
          <FieldError errors={state.errors} name="sourceUrl" />
        </label>
        <label style={{ gridColumn: "1 / -1", display: "grid", gap: "8px" }}>
          <span style={LABEL}>Anything else for the editor</span>
          <textarea name="notes" rows={3} style={{ ...INPUT, height: "auto", padding: "14px 16px", resize: "vertical" }} />
        </label>
        <label style={{ gridColumn: "1 / -1", display: "flex", gap: "12px", alignItems: "flex-start", fontSize: "14.5px", lineHeight: "1.6", color: "var(--ink)" }}>
          <input required name="understands" type="checkbox" value="on" style={{ marginTop: "5px", width: "18px", height: "18px", flexShrink: 0 }} />
          <span>
            I understand the post is labelled Sponsored in the article and the byline, that both links are marked rel="sponsored", and that an editor must approve it before it is published.
          </span>
        </label>
        <FieldError errors={state.errors} name="understands" />
        <ol style={{ gridColumn: "1 / -1", display: "grid", gap: "8px", padding: "16px 18px", borderRadius: "14px", background: "var(--blue-50)", fontSize: "14.5px", lineHeight: "1.6", color: "var(--ink)", listStylePosition: "inside" }}>
          <li>You pay once, at secure checkout.</li>
          <li>An editor checks your points, the two links and the anchor text, and may write to you with questions.</li>
          <li>You receive the draft to approve before anything is published.</li>
          <li>The approved post goes live with the Sponsored label and both links marked rel="sponsored".</li>
        </ol>
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={pending}
            data-btnp=""
            style={{ height: "52px", padding: "0 26px", borderRadius: "14px", background: "var(--color-primary)", color: "#fff", fontSize: "16px", fontWeight: "600", border: "0", cursor: pending ? "wait" : "pointer", boxShadow: "var(--shadow-primary)" }}
          >
            {pending ? "Opening checkout" : "Continue to secure checkout"}
          </button>
          <span style={HINT}>Billed once. Nothing is published until an editor approves it.</span>
        </div>
      </form>
    </div>
  );
}
