"use client";

import { useState } from "react";

/**
 * The About paragraphs with a read-more toggle.
 *
 * The collapse is CSS: the body is clipped to a fixed height and faded out at
 * the bottom, so the text is in the page from the first render and readable
 * without JavaScript. The button only lifts the clip. When the copy is short
 * enough to fit there is no button and no fade, because there is nothing
 * behind it to reveal.
 */
export function AboutBody({ paragraphs }: { paragraphs: string[] }) {
  const [open, setOpen] = useState(false);
  // Roughly the height the clip allows. Below this the fade would sit over
  // blank space and the button would open nothing.
  const hasMore = paragraphs.length > 2 || paragraphs.join(" ").length > 420;

  return (
    <>
      <div
        data-about-body=""
        data-open={open ? "1" : "0"}
        data-short={hasMore ? "0" : "1"}
        id="about-body"
      >
        {paragraphs.map((text, index) => (
          <p
            key={index}
            style={{
              fontSize: "17px",
              lineHeight: "1.75",
              color: "var(--text-secondary)",
              marginBottom: "16px",
            }}
          >
            {text}
          </p>
        ))}
      </div>

      {hasMore ? (
        <button
          type="button"
          data-readmore=""
          aria-expanded={open}
          aria-controls="about-body"
          onClick={() => setOpen((value) => !value)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            height: "42px",
            padding: "0 18px",
            marginTop: "4px",
            border: "1px solid var(--border-strong)",
            borderRadius: "999px",
            background: "var(--surface-card)",
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            fontWeight: "600",
            color: "var(--blue-900)",
            cursor: "pointer",
          }}
        >
          {open ? "Show less" : "Read more"}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      ) : null}
    </>
  );
}
