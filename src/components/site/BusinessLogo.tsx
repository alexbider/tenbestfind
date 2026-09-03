"use client";

import { useState } from "react";

/**
 * A company's own mark, falling back to its initials.
 *
 * Logos are hosted by the companies themselves, so a URL that worked when the
 * website was read can stop working later. The fallback is not a rare path, and
 * it has to look deliberate rather than broken.
 *
 * Every tile is the same box whatever the file is, because a list of ten
 * companies whose logos each set their own shape reads as ten different
 * websites. The box is slightly wider than tall: most business logos are
 * wordmarks rather than squares, and in a square tile a wordmark shrinks to a
 * sliver. A square logo is limited by the height either way, so it loses
 * nothing. Inside, the image is contained, so nothing is ever cropped or
 * stretched to fit.
 */
const RATIO = 1.35;

export function BusinessLogo({
  name,
  url,
  size = 72,
  radius,
}: {
  name: string;
  url: string | null;
  size?: number;
  radius?: number;
}) {
  const [failed, setFailed] = useState(false);

  const box = {
    width: Math.round(size * RATIO),
    height: size,
    borderRadius: radius ?? Math.round(size / 4),
  };

  // The initials share the tile rather than borrowing a second component, so a
  // company without a logo lines up with the ones that have one.
  if (!url || failed) {
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
    return (
      <span
        className="biz-logo biz-logo--initials"
        style={{ ...box, fontSize: Math.round(size / 3) }}
        aria-hidden="true"
      >
        {initials}
      </span>
    );
  }

  return (
    <span className="biz-logo" style={{ ...box, padding: Math.round(size / 12) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`${name} logo`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
