"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Icon } from "@/components/ui/Icon";

const RATINGS = [
  { value: "any", label: "Any rating" },
  { value: "4.0", label: "4.0 and up" },
  { value: "4.5", label: "4.5 and up" },
];

/**
 * Filters write to the query string and let the server re-query, so a filtered
 * view is shareable and the results stay server-rendered.
 */
export function ResultsFilter({
  service,
  location,
  rating,
  verified,
}: {
  service: string;
  location: string;
  rating: string;
  verified: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "" || value === "any") next.delete(key);
      else next.set(key, value);
      router.push(`/search/?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const activeCount = (rating !== "any" ? 1 : 0) + (verified ? 1 : 0);

  return (
    <aside className="filters" aria-label="Filter results">
      <div className="filters__head">
        <span>
          <Icon name="sliders" size={18} color="var(--color-primary)" />
          Filters
        </span>
        {activeCount > 0 ? (
          <button type="button" onClick={() => router.push(`/search/?service=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`)}>
            Clear all ({activeCount})
          </button>
        ) : null}
      </div>

      <div className="filters__group">
        <h3>Google rating</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {RATINGS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="chip"
              aria-pressed={rating === option.value}
              onClick={() => setParam("rating", option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="filters__note">Ratings come from Google Business Profiles.</p>
      </div>

      <div className="filters__group">
        <h3>TenBestFind status</h3>
        <button
          type="button"
          className="chip"
          aria-pressed={verified}
          onClick={() => setParam("verified", verified ? null : "1")}
        >
          Verified details only
        </button>
      </div>
    </aside>
  );
}
