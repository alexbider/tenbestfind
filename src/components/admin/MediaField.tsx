"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/** Posts one file and returns its URL, or the reason it did not upload. */
export async function uploadMedia(file: File): Promise<{ url: string } | { error: string }> {
  try {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/admin/media/", { method: "POST", body });
    const result = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !result.url) return { error: result.error ?? "The upload failed." };
    return { url: result.url };
  } catch {
    return { error: "The upload failed. Check the connection and try again." };
  }
}

/**
 * A URL field with an upload beside it. The value posted is always a URL, so an
 * image hosted anywhere else can still be pasted in and nothing depends on the
 * upload endpoint being reachable.
 */
export function MediaField({
  name,
  label,
  hint,
  initial,
  id,
}: {
  name: string;
  label: string;
  hint?: string;
  initial: string;
  id?: string;
}) {
  const fieldId = id ?? `media-${name}`;
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const result = await uploadMedia(file);
    if ("error" in result) setError(result.error);
    else setValue(result.url);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="media-field">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="media-field__preview" />
        ) : (
          <span className="media-field__preview media-field__preview--empty">
            <Icon name="image" size={18} />
          </span>
        )}
        <div className="media-field__controls">
          <input
            id={fieldId}
            name={name}
            type="text"
            value={value}
            placeholder="https://…"
            onChange={(event) => setValue(event.target.value)}
          />
          <div className="media-field__buttons">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {busy ? "Uploading…" : "Upload"}
            </button>
            {value ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setValue("")}
                disabled={busy}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {error ? (
        <span className="field__hint" style={{ color: "var(--maple-600)" }}>
          {error}
        </span>
      ) : (
        <span className="field__hint">{hint ?? "Paste a URL or upload a JPEG, PNG, WebP, AVIF or GIF up to 8 MB."}</span>
      )}
    </div>
  );
}
