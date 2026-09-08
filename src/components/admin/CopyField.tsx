"use client";

import { useState } from "react";

// A value somebody has to move into another application. Selecting the text out
// of a read-only input works, and every person who has ever done it has also
// missed a character off the end at least once.

export function CopyField({
  id,
  label,
  value,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard access can be refused, and an input the reader can still
      // select by hand is not a failure worth an error message.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          id={id}
          type="text"
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          style={{ flex: 1, fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: 13.5 }}
        />
        <button type="button" className="btn btn--secondary" onClick={copy} style={{ flexShrink: 0 }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  );
}
