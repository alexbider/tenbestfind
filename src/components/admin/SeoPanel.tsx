"use client";

import { useActionState, useState } from "react";
import { saveSeo, type ActionState } from "@/app/actions/admin-content";
import { MediaField } from "./MediaField";
import { Check, Icon } from "@/components/ui/Icon";
import { analyzeSeo, type SeoCheck } from "@/lib/seo";

export type SeoRecord = {
  title: string | null;
  description: string | null;
  canonical: string | null;
  focusKeyword: string | null;
  extraKeywords: string[];
  breadcrumbTitle: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  robotsNoArchive: boolean;
  robotsNoSnippet: boolean;
  robotsNoImageIndex: boolean;
  maxImagePreview: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string;
  schemaType: string | null;
  schemaJson: string | null;
  score: number;
} | null;

const initial: ActionState = { status: "idle" };

const SCHEMA_TYPES = [
  "",
  "WebPage",
  "Article",
  "FAQPage",
  "ItemList",
  "LocalBusiness",
  "Person",
  "CollectionPage",
];

function scoreColor(score: number) {
  if (score >= 80) return "var(--green-500)";
  if (score >= 50) return "var(--amber-500)";
  return "var(--maple-500)";
}

function CheckIcon({ status }: { status: SeoCheck["status"] }) {
  if (status === "good") return <Check size={16} />;
  if (status === "warn") return <Icon name="alert" size={16} color="var(--amber-600)" />;
  return <Icon name="info" size={16} color="var(--maple-600)" />;
}

/**
 * Per-entity SEO editor. Mirrors the Rank Math model: focus keyword, live
 * content analysis, a SERP preview, robots directives, social overrides and a
 * schema type with an optional JSON-LD override.
 */
export function SeoPanel({
  entityType,
  entityId,
  path,
  fallbackTitle,
  fallbackDescription,
  contentSample,
  record,
}: {
  entityType: string;
  entityId: string;
  path: string;
  fallbackTitle: string;
  fallbackDescription: string;
  contentSample: string;
  record: SeoRecord;
}) {
  const [state, action, pending] = useActionState(saveSeo, initial);
  const [title, setTitle] = useState(record?.title ?? "");
  const [description, setDescription] = useState(record?.description ?? "");
  const [keyword, setKeyword] = useState(record?.focusKeyword ?? "");
  const [tab, setTab] = useState<"general" | "social" | "advanced">("general");

  const effectiveTitle = title || fallbackTitle;
  const effectiveDescription = description || fallbackDescription;

  const analysis = analyzeSeo({
    title: effectiveTitle,
    description: effectiveDescription,
    focusKeyword: keyword,
    slug: path,
    content: contentSample,
    hasImage: Boolean(record?.ogImage),
    internalLinks: 3,
  });

  return (
    <form action={action}>
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="contentSample" value={contentSample.slice(0, 4000)} />

      {state.status === "ok" ? (
        <p className="form-success">
          <Check size={18} />
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? <p className="form-error">{state.message}</p> : null}

      <div className="seo-score">
        <span
          className="seo-score__ring"
          style={{ background: scoreColor(analysis.score) }}
          aria-hidden="true"
        >
          {analysis.score}
        </span>
        <div>
          <strong style={{ display: "block", fontSize: 15, color: "var(--ink)" }}>
            Content score {analysis.score} out of 100
          </strong>
          <span style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
            {analysis.checks.filter((check) => check.status === "good").length} of{" "}
            {analysis.checks.length} checks passing. Updates as you type; saved when you submit.
          </span>
        </div>
      </div>

      <div className="serp-preview" style={{ marginBottom: 20 }}>
        <p className="serp-preview__url">tenbestfind.com{path}</p>
        <p className="serp-preview__title">{effectiveTitle.slice(0, 60)}</p>
        <p className="serp-preview__desc">{effectiveDescription.slice(0, 160)}</p>
      </div>

      <div className="admin-tabs" style={{ marginBottom: 18 }}>
        {(
          [
            ["general", "General"],
            ["social", "Social"],
            ["advanced", "Advanced"],
          ] as const
        ).map(([key, label]) => (
          <a
            key={key}
            href={`#${key}`}
            data-on={tab === key}
            onClick={(event) => {
              event.preventDefault();
              setTab(key);
            }}
          >
            {label}
          </a>
        ))}
      </div>

      <div hidden={tab !== "general"}>
        <div className="field">
          <label htmlFor="seo-keyword">Focus keyword</label>
          <input
            id="seo-keyword"
            name="focusKeyword"
            type="text"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="best roofers dallas"
          />
          <span className="field__hint">The phrase this page should rank for. Drives the checks below.</span>
        </div>

        <div className="field">
          <label htmlFor="seo-extra">Additional keywords</label>
          <input
            id="seo-extra"
            name="extraKeywords"
            type="text"
            defaultValue={record?.extraKeywords.join(", ") ?? ""}
            placeholder="roofing companies dallas, dallas roof replacement"
          />
          <span className="field__hint">Comma separated.</span>
        </div>

        <div className="field">
          <label htmlFor="seo-title">
            SEO title <span style={{ color: "var(--text-muted)" }}>({effectiveTitle.length}/60)</span>
          </label>
          <input
            id="seo-title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={fallbackTitle}
          />
          <span className="field__hint">Leave blank to use the page title.</span>
        </div>

        <div className="field">
          <label htmlFor="seo-desc">
            Meta description{" "}
            <span style={{ color: "var(--text-muted)" }}>({effectiveDescription.length}/160)</span>
          </label>
          <textarea
            id="seo-desc"
            name="description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={fallbackDescription}
          />
        </div>

        <ul className="seo-checks">
          {analysis.checks.map((check) => (
            <li key={check.id}>
              <CheckIcon status={check.status} />
              <span>
                <strong>{check.label}</strong>
                <span>{check.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div hidden={tab !== "social"}>
        <div className="field">
          <label htmlFor="seo-og-title">Open Graph title</label>
          <input id="seo-og-title" name="ogTitle" type="text" defaultValue={record?.ogTitle ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="seo-og-desc">Open Graph description</label>
          <textarea id="seo-og-desc" name="ogDescription" rows={3} defaultValue={record?.ogDescription ?? ""} />
        </div>
        <MediaField
          id="seo-og-image"
          name="ogImage"
          label="Social image"
          initial={record?.ogImage ?? ""}
          hint="Shown when the page is shared. 1200×630 reads well everywhere."
        />
        <div className="field">
          <label htmlFor="seo-twitter">Twitter card</label>
          <select id="seo-twitter" name="twitterCard" defaultValue={record?.twitterCard ?? "summary_large_image"}>
            <option value="summary_large_image">Large image</option>
            <option value="summary">Summary</option>
          </select>
        </div>
      </div>

      <div hidden={tab !== "advanced"}>
        <fieldset className="fieldset">
          <legend>Robots</legend>
          <div style={{ display: "grid", gap: 10 }}>
            {(
              [
                ["robotsIndex", "Index", record?.robotsIndex ?? true],
                ["robotsFollow", "Follow", record?.robotsFollow ?? true],
                ["robotsNoArchive", "No archive", record?.robotsNoArchive ?? false],
                ["robotsNoSnippet", "No snippet", record?.robotsNoSnippet ?? false],
                ["robotsNoImageIndex", "No image index", record?.robotsNoImageIndex ?? false],
              ] as const
            ).map(([name, label, checked]) => (
              <label key={name} className="radio-row" style={{ padding: "10px 14px" }}>
                <input type="checkbox" name={name} defaultChecked={checked} />
                <span>
                  <strong>{label}</strong>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="seo-preview">Max image preview</label>
          <select id="seo-preview" name="maxImagePreview" defaultValue={record?.maxImagePreview ?? "large"}>
            <option value="large">Large</option>
            <option value="standard">Standard</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="seo-canonical">Canonical URL</label>
          <input id="seo-canonical" name="canonical" type="url" defaultValue={record?.canonical ?? ""} />
          <span className="field__hint">Leave blank to use this page&apos;s own URL.</span>
        </div>

        <div className="field">
          <label htmlFor="seo-breadcrumb">Breadcrumb title</label>
          <input
            id="seo-breadcrumb"
            name="breadcrumbTitle"
            type="text"
            defaultValue={record?.breadcrumbTitle ?? ""}
          />
        </div>

        <div className="field">
          <label htmlFor="seo-schema">Schema type</label>
          <select id="seo-schema" name="schemaType" defaultValue={record?.schemaType ?? ""}>
            {SCHEMA_TYPES.map((type) => (
              <option key={type} value={type}>
                {type || "Automatic"}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="seo-json">JSON-LD override</label>
          <textarea id="seo-json" name="schemaJson" rows={6} defaultValue={record?.schemaJson ?? ""} />
          <span className="field__hint">
            Replaces the generated structured data for this page. Leave blank unless you need it.
          </span>
        </div>
      </div>

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending} style={{ marginTop: 8 }}>
        {pending ? "Saving…" : "Save SEO"}
      </button>
    </form>
  );
}
