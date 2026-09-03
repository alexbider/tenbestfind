"use client";

import { useId, useState } from "react";

/**
 * The long half of the Quick overview, hidden until asked for.
 *
 * The full text is in the markup either way, so a crawler reads the whole
 * profile and so does anyone with JavaScript off: closed means `hidden`, not
 * absent. Only the button is interactive.
 */
export function ReadMore({
  paragraphs,
  label = "Read the full profile",
  closeLabel = "Show less",
}: {
  paragraphs: string[];
  label?: string;
  closeLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (paragraphs.length === 0) return null;

  return (
    <div className="overview-card__more">
      <button
        type="button"
        className="overview-card__toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((was) => !was)}
      >
        {open ? closeLabel : label}
      </button>
      <div id={id} className="overview-card__full" hidden={!open}>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
