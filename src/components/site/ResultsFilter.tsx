"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

const RATINGS = [
  { value: "any", label: "Any rating" },
  { value: "4.0", label: "4.0 and up" },
  { value: "4.5", label: "4.5 and up" },
];

const GROUPS: { key: string; title: string; icon: IconName; options: { value: string; label: string }[] }[] = [
  {
    key: "verified",
    title: "Verification",
    icon: "shield",
    options: [
      { value: "", label: "Any business" },
      { value: "1", label: "Verified only" },
    ],
  },
  {
    key: "ranked",
    title: "Editorial status",
    icon: "award",
    options: [
      { value: "", label: "Any status" },
      { value: "1", label: "In a top ten" },
    ],
  },
  {
    key: "emergency",
    title: "Availability",
    icon: "clock",
    options: [
      { value: "", label: "Any hours" },
      { value: "1", label: "Emergency service" },
    ],
  },
];

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Google rating" },
  { value: "reviews", label: "Most reviewed" },
  { value: "recent", label: "Recently reviewed by TenBestFind" },
];

const PILL = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  minHeight: "40px",
  padding: "8px 13px",
  borderRadius: "999px",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  fontWeight: "600",
};
// The phone sheet's pills are a size up, as the design draws them.
const PILL_SHEET = { ...PILL, padding: "8px 14px", fontSize: "14px" };

/** The design's three-bar filter mark. */
function FilterIcon({ size, stroke, strokeWidth }: { size: number; stroke: string; strokeWidth: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function pillSkin(active: boolean) {
  return active
    ? { border: "1px solid var(--color-primary)", background: "var(--blue-50)", color: "var(--blue-800)" }
    : { border: "1px solid var(--border-subtle)", background: "var(--surface-card)", color: "var(--text-primary)" };
}

/**
 * Filters write to the query string and let the server re-query, so a filtered
 * view is shareable and the results stay server-rendered.
 */
export function ResultsFilter({
  rating,
  values,
  activeCount,
  rankingHref,
  rankingLabel,
  evaluated,
  variant = "panel",
}: {
  variant?: "panel" | "sheet";
  rating: string;
  values: Record<string, string>;
  activeCount: number;
  rankingHref?: string;
  rankingLabel?: string;
  evaluated?: number;
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

  const clearAll = useCallback(() => {
    const next = new URLSearchParams();
    const service = params.get("service");
    const location = params.get("location");
    if (service) next.set("service", service);
    if (location) next.set("location", location);
    router.push(`/search/?${next.toString()}`, { scroll: false });
  }, [params, router]);

  if (variant === "sheet") {
    const section = { paddingBottom: "14px", marginBottom: "14px", borderBottom: "1px solid var(--border-subtle)" } as const;
    return (
      <details data-filter-toggle="" style={{ gridColumn: "1 / -1" }}>
        <summary
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            height: "46px",
            padding: "0 18px",
            borderRadius: "14px",
            border: "1.5px solid var(--border-strong)",
            background: "var(--surface-card)",
            fontSize: "15px",
            fontWeight: "600",
            color: "var(--blue-900)",
          }}
        >
          <FilterIcon size={18} stroke="currentColor" strokeWidth={1.9} />
          Filters
          {activeCount > 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "20px",
                height: "20px",
                padding: "0 6px",
                borderRadius: "999px",
                background: "var(--color-primary)",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "700",
              }}
            >
              {activeCount}
            </span>
          ) : null}
        </summary>
        <div style={{ marginTop: "12px", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "20px" }}>
          <div style={{ ...section, paddingBottom: "16px", marginBottom: "16px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "700", color: "var(--blue-900)", marginBottom: "10px" }}>
              <Icon name="star" size={15} color="#D99A1C" strokeWidth={2} />
              Google rating
            </h3>
            <ul style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
              {RATINGS.map((option) => {
                const active = (rating || "any") === option.value;
                return (
                  <li key={option.value}>
                    <button type="button" aria-pressed={active} onClick={() => setParam("rating", option.value)} style={{ ...PILL_SHEET, ...pillSkin(active) }}>
                      {option.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {GROUPS.map((group) => (
            <div key={group.key} style={section}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--blue-900)", marginBottom: "10px" }}>{group.title}</h3>
              <ul style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {group.options.map((option) => {
                  const active = (values[group.key] ?? "") === option.value;
                  return (
                    <li key={option.label}>
                      <button type="button" aria-pressed={active} onClick={() => setParam(group.key, option.value)} style={{ ...PILL_SHEET, ...pillSkin(active) }}>
                        {option.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <button
            type="button"
            onClick={clearAll}
            style={{
              minHeight: "44px",
              padding: "0 16px",
              borderRadius: "12px",
              border: "1.5px solid var(--border-strong)",
              background: "var(--surface-card)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
              fontWeight: "600",
              color: "var(--blue-900)",
            }}
          >
            Clear all
          </button>
        </div>
      </details>
    );
  }

  return (
    <>
      <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            padding: "16px 20px",
            background: "var(--surface-page)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <h2 style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--blue-900)" }}>
            <FilterIcon size={16} stroke="#2D74D7" strokeWidth={2} />
            Filters
            {activeCount > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "20px",
                  height: "20px",
                  padding: "0 6px",
                  borderRadius: "999px",
                  background: "var(--color-primary)",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "700",
                }}
              >
                {activeCount}
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={clearAll}
            style={{ background: "none", border: "0", minHeight: "40px", padding: "0 2px", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: "600", color: "var(--color-primary)" }}
          >
            Clear all
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div style={{ paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "700", color: "var(--blue-900)", marginBottom: "10px" }}>
              <Icon name="star" size={15} color="#D99A1C" strokeWidth={2} />
              Google rating
            </h3>
            <ul style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
              {RATINGS.map((option) => {
                const active = (rating || "any") === option.value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setParam("rating", option.value)}
                      style={{ ...PILL, ...pillSkin(active) }}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {GROUPS.map((group) => (
            <div key={group.key} style={{ paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "700", color: "var(--blue-900)", marginBottom: "10px" }}>
                <Icon name={group.icon} size={15} color="var(--color-primary)" strokeWidth={2} />
                {group.title}
              </h3>
              <ul style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {group.options.map((option) => {
                  const active = (values[group.key] ?? "") === option.value;
                  return (
                    <li key={option.label}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setParam(group.key, option.value)}
                        style={{ ...PILL, ...pillSkin(active) }}
                      >
                        {option.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <p style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
            Filters refine what you see here. They do not create new indexable pages.
          </p>
        </div>
      </div>

      {rankingHref ? (
        <div style={{ position: "relative", overflow: "hidden", background: "var(--ink)", borderRadius: "20px", padding: "22px", boxShadow: "var(--shadow-md)" }}>
          <span
            aria-hidden="true"
            style={{ position: "absolute", right: "-40px", top: "-40px", width: "140px", height: "140px", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(45,116,215,0.45), transparent)" }}
          />
          <span aria-hidden="true" style={{ position: "relative", display: "block", width: "28px", height: "2px", background: "var(--gold-ink)", marginBottom: "12px" }} />
          <p style={{ position: "relative", fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>Want our researched shortlist?</p>
          <p style={{ position: "relative", fontSize: "14px", lineHeight: "1.6", color: "rgba(232,237,245,0.78)", marginBottom: "14px" }}>
            {evaluated ? `Ten companies, selected from ${evaluated} evaluated in this market.` : "Ten companies an editor actually researched."}
          </p>
          <a
            href={rankingHref}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "46px",
              borderRadius: "12px",
              background: "var(--gold-ink)",
              color: "var(--ink)",
              fontSize: "14px",
              fontWeight: "700",
            }}
          >
            {rankingLabel ?? "See the ten best"}
          </a>
        </div>
      ) : null}
    </>
  );
}

/** The sort control above the results. Writes to the query string like the rail. */
export function ResultsSort({ value }: { value: string }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
      <label htmlFor="s-sort" style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
        Sort
      </label>
      <select
        id="s-sort"
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          if (event.target.value === "recommended") next.delete("sort");
          else next.set("sort", event.target.value);
          router.push(`/search/?${next.toString()}`, { scroll: false });
        }}
        style={{
          height: "42px",
          padding: "0 12px",
          border: "1px solid var(--border-strong)",
          borderRadius: "12px",
          background: "var(--surface-card)",
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          fontWeight: "600",
          color: "var(--blue-900)",
        }}
      >
        {SORTS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

/** The removable chips that show what is currently narrowing the results. */
export function ActiveChips({ chips }: { chips: { key: string; label: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();

  if (chips.length === 0) return null;

  return (
    <ul aria-label="Active filters" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            aria-label={`Remove filter ${chip.label}`}
            onClick={() => {
              const next = new URLSearchParams(params.toString());
              next.delete(chip.key);
              router.push(`/search/?${next.toString()}`, { scroll: false });
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              minHeight: "36px",
              padding: "6px 12px",
              borderRadius: "999px",
              border: "1px solid var(--blue-100)",
              background: "var(--blue-50)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--blue-800)",
            }}
          >
            {chip.label}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
