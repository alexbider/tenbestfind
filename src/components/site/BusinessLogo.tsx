"use client";

import { useState } from "react";
import { Monogram } from "@/components/ui/primitives";

/**
 * A company's own mark, falling back to its initials.
 *
 * Logos are hosted by the companies themselves, so a URL that worked when the
 * website was read can stop working later. The fallback is not a rare path, and
 * it has to look deliberate rather than broken.
 */
export function BusinessLogo({
  name,
  url,
  size = 72,
}: {
  name: string;
  url: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <Monogram name={name} size={size} radius={18} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${name} logo`}
      className="biz-hero__logo"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
