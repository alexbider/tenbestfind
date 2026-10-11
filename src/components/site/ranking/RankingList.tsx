"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

/**
 * One ranked company, already rendered on the server. The list only decides
 * which of them are showing and which are open, so every word of a review is
 * in the page whether or not its card is open.
 */
export type RankItem = {
  id: string;
  /** The anchor the top-3 card and the TOC link to. */
  anchor: string;
  rankNum: string;
  rankLabel: string;
  name: string;
  href: string;
  top3: boolean;
  emergency: boolean;
  financing: boolean;
  logo: ReactNode;
  /** Designation, name, rating and verification, as the header's middle column. */
  info: ReactNode;
  spec: ReactNode;
  body: ReactNode;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "emergency", label: "Emergency service" },
  { key: "financing", label: "Financing available" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const CHEVRON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function RankingList({ heading, items }: { heading: ReactNode; items: RankItem[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => (items[0] ? { [items[0].id]: true } : {}));
  const [filter, setFilter] = useState<FilterKey>("all");

  const test = (key: FilterKey) => (item: RankItem) =>
    key === "all" ? true : key === "emergency" ? item.emergency : item.financing;
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, items.filter(test(f.key)).length])) as Record<FilterKey, number>;
  // A chip that selects nothing, or everything, is noise.
  const chips = FILTERS.filter((f) => f.key === "all" || (counts[f.key] > 0 && counts[f.key] < items.length));
  const shown = items.filter(test(filter));
  const allOpen = shown.length > 0 && shown.every((item) => open[item.id]);

  return (
    <>
      <div
        data-reveal=""
        style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "18px", flexWrap: "wrap", marginBottom: "20px" }}
      >
        <div style={{ maxWidth: "720px" }}>{heading}</div>
        <button
          data-press=""
          data-expandall=""
          type="button"
          aria-controls="rank-list"
          onClick={() => setOpen(allOpen ? {} : Object.fromEntries(shown.map((item) => [item.id, true])))}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            height: "44px",
            padding: "0 16px",
            borderRadius: "999px",
            border: "1px solid var(--border-subtle)",
            background: "var(--paper)",
            fontSize: "13.5px",
            fontWeight: "700",
            color: "var(--ink)",
            cursor: "pointer",
          }}
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      {chips.length > 1 ? (
        <div
          data-reveal=""
          data-chiprow=""
          role="group"
          aria-label="Filter the ranking"
          style={{ display: "flex", alignItems: "center", gap: "8px", overflowX: "auto", scrollbarWidth: "none", margin: "0 -24px 18px", padding: "2px 24px" }}
        >
          {chips.map((f) => (
            <button
              key={f.key}
              data-chip=""
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              style={{
                flex: "0 0 auto",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                height: "40px",
                padding: "0 8px 0 15px",
                borderRadius: "999px",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-card)",
                fontSize: "13.5px",
                fontWeight: "700",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              {f.key === "all" ? `All ${items.length}` : f.label}
              <span
                data-cnt=""
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "24px",
                  height: "24px",
                  padding: "0 7px",
                  borderRadius: "999px",
                  background: "var(--paper)",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
          <span aria-live="polite" style={{ flex: "0 0 auto", marginLeft: "6px", fontSize: "13px", color: "var(--text-muted)" }}>
            Showing {shown.length} of {items.length}
          </span>
        </div>
      ) : null}
      <ol id="rank-list" data-stagger="" data-rklist="" style={{ display: "grid", gap: "12px" }}>
        {shown.map((item, index) => {
          const isOpen = Boolean(open[item.id]);
          const toggle = () => setOpen((state) => ({ ...state, [item.id]: !state[item.id] }));
          const label = `${isOpen ? "Hide" : "Show"} details for ${item.name}`;
          const accId = `rk-acc-${item.id}`;
          return (
            <li key={item.id} id={item.anchor} style={{ ["--i" as string]: index, scrollMarginTop: "140px" }}>
              <article
                data-rk=""
                data-open={isOpen ? "1" : "0"}
                style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "22px", overflow: "hidden" }}
              >
                <div
                  data-rkhead=""
                  style={{ display: "grid", gridTemplateColumns: "64px auto minmax(0, 1fr) auto", gap: "18px", alignItems: "center", padding: "18px 20px" }}
                >
                  <span
                    data-rnum=""
                    aria-label={item.rankLabel}
                    style={{
                      fontFamily: "var(--serif)",
                      fontStyle: "italic",
                      fontSize: "52px",
                      lineHeight: "0.95",
                      color: item.top3 ? "var(--gold)" : "var(--ink)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    <span>{item.rankNum}</span>
                  </span>
                  <span data-rklogo="" style={{ display: "inline-flex" }}>
                    {item.logo}
                  </span>
                  <div style={{ minWidth: 0 }}>{item.info}</div>
                  <div data-rkact="" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Link
                      data-btn=""
                      data-btn-dark=""
                      href={item.href}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        height: "44px",
                        padding: "0 16px",
                        borderRadius: "12px",
                        background: "var(--ink)",
                        color: "#fff",
                        fontSize: "14px",
                        fontWeight: "700",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Profile
                      <svg data-arrow="" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold-ink)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </Link>
                    <button
                      data-tog=""
                      type="button"
                      onClick={toggle}
                      aria-expanded={isOpen}
                      aria-controls={accId}
                      aria-label={label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        border: "1px solid var(--border-strong)",
                        background: "var(--surface-card)",
                        color: "var(--ink)",
                        cursor: "pointer",
                        transition: "background 200ms ease, color 200ms ease, border-color 200ms ease",
                      }}
                    >
                      {CHEVRON}
                    </button>
                  </div>
                  <button
                    data-tog=""
                    data-rkmob=""
                    type="button"
                    onClick={toggle}
                    aria-expanded={isOpen}
                    aria-controls={accId}
                    aria-label={label}
                    style={{
                      display: "none",
                      placeItems: "center",
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-strong)",
                      background: "var(--surface-card)",
                      color: "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    {CHEVRON}
                  </button>
                </div>
                {item.spec}
                <div data-acc="" id={accId} inert={!isOpen}>
                  <div>
                    <div data-accin="" style={{ padding: "4px 20px 22px" }}>
                      {item.body}
                    </div>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </>
  );
}
