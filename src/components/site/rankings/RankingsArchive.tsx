"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ArchiveCountry, ArchiveRow, ArchiveTrade } from "./types";

const visuallyHidden = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
};

/**
 * "All rankings, newest first": country tabs, a city or company filter and
 * trade chips over the full list, grouped by the month each list was last
 * reviewed. Everything renders on the server with no filter applied, so every
 * ranking link is in the HTML a crawler reads.
 */
export function RankingsArchive({
  rows,
  trades,
  countries,
}: {
  rows: ArchiveRow[];
  trades: ArchiveTrade[];
  countries: ArchiveCountry[];
}) {
  const [trade, setTrade] = useState("all");
  const [country, setCountry] = useState("all");
  const [q, setQ] = useState("");

  const { byQ, shown, groups } = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const byCountry = rows.filter((row) => country === "all" || row.country === country);
    const byQ = byCountry.filter(
      (row) => !ql || `${row.place} ${row.summary} ${row.title}`.toLowerCase().includes(ql),
    );
    const shown = byQ.filter((row) => trade === "all" || row.tradeKey === trade);
    const groups: { key: string; label: string; items: ArchiveRow[] }[] = [];
    for (const row of shown) {
      const last = groups[groups.length - 1];
      if (last && last.key === row.monthKey) last.items.push(row);
      else groups.push({ key: row.monthKey, label: row.monthLabel, items: [row] });
    }
    return { byQ, shown, groups };
  }, [rows, trade, country, q]);

  const tabs = [{ code: "all", name: "All" }, ...countries];
  const chips = [{ key: "all", name: "All trades", short: "" }, ...trades];

  return (
    <section aria-labelledby="all-h2" style={{ paddingTop: "44px" }}>
      <div
        style={{
          position: "sticky",
          top: "76px",
          zIndex: "150",
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "36px 24px 14px", display: "grid", gap: "12px" }}>
          <div data-stack="" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <h2 id="all-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)", lineHeight: "1.1" }}>
              All rankings <span className="serif-accent">newest first</span>
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {countries.length > 1 ? (
                <div
                  role="group"
                  aria-label="Country"
                  style={{
                    display: "inline-flex",
                    padding: "4px",
                    borderRadius: "999px",
                    background: "var(--surface-page)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {tabs.map((tab) => (
                    <button
                      key={tab.code}
                      type="button"
                      data-rchip=""
                      data-on={country === tab.code ? "1" : "0"}
                      aria-pressed={country === tab.code}
                      onClick={() => setCountry(tab.code)}
                      style={{
                        height: "34px",
                        minHeight: "34px",
                        padding: "0 14px",
                        border: "1px solid transparent",
                        borderRadius: "999px",
                        background: "transparent",
                        fontFamily: "var(--font-sans)",
                        fontSize: "13.5px",
                        fontWeight: "600",
                        color: "var(--blue-900)",
                        cursor: "pointer",
                      }}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
              ) : null}
              <label
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "44px",
                  padding: "0 14px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "12px",
                  background: "var(--surface-card)",
                  minWidth: "220px",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.34-4.34" />
                </svg>
                <span style={visuallyHidden}>Filter by city or company</span>
                <input
                  type="search"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Filter by city or company"
                  style={{
                    width: "100%",
                    border: "0",
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                    fontSize: "15px",
                    background: "transparent",
                    color: "var(--text-primary)",
                  }}
                />
              </label>
            </div>
          </div>
          {trades.length > 1 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflowX: "auto", scrollbarWidth: "none", paddingBottom: "2px" }}>
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  data-rchip=""
                  data-on={trade === chip.key ? "1" : "0"}
                  aria-pressed={trade === chip.key}
                  onClick={() => setTrade(chip.key)}
                  style={{
                    flexShrink: "0",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    height: "38px",
                    minHeight: "38px",
                    padding: "0 8px 0 15px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "999px",
                    background: "var(--surface-card)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "var(--blue-900)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chip.name}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "26px",
                      height: "24px",
                      padding: "0 7px",
                      borderRadius: "999px",
                      background: "var(--surface-page)",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {byQ.filter((row) => chip.key === "all" || row.tradeKey === chip.key).length}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "8px 24px 80px" }}>
        <p aria-live="polite" style={{ padding: "18px 0 4px", fontSize: "14px", color: "var(--text-secondary)" }}>
          Showing <strong style={{ color: "var(--ink)" }}>{shown.length}</strong> of {rows.length} rankings
        </p>

        {shown.length === 0 ? (
          <div style={{ marginTop: "20px", padding: "40px 28px", border: "1px dashed var(--border-strong)", borderRadius: "18px", textAlign: "center" }}>
            <p style={{ fontSize: "18px", fontWeight: "700", color: "var(--ink)", marginBottom: "6px" }}>
              {rows.length === 0 ? "No rankings published yet." : "No rankings match that filter yet"}
            </p>
            {rows.length > 0 ? (
              <>
                <p style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "18px" }}>Try another trade or clear the search.</p>
                <button
                  type="button"
                  onClick={() => {
                    setTrade("all");
                    setCountry("all");
                    setQ("");
                  }}
                  style={{
                    height: "44px",
                    padding: "0 22px",
                    border: "0",
                    borderRadius: "12px",
                    background: "var(--color-primary)",
                    color: "#fff",
                    fontFamily: "var(--font-sans)",
                    fontSize: "15px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Show all rankings
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {groups.map((group) => (
          <div key={group.key} style={{ marginTop: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", paddingBottom: "12px", borderBottom: "2px solid var(--ink)" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "-0.02em" }}>{group.label}</h3>
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{group.items.length} published</span>
            </div>
            <ol data-rk-list="">
              {group.items.map((row) => (
                <li key={row.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <Link
                    data-rk=""
                    href={row.href}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "52px minmax(0,1fr) 150px",
                      gap: "20px",
                      alignItems: "center",
                      padding: "20px 12px",
                      margin: "0 -12px",
                      borderRadius: "14px",
                      color: "inherit",
                    }}
                  >
                    <span
                      data-rk-n=""
                      aria-hidden="true"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "46px",
                        height: "46px",
                        borderRadius: "13px",
                        background: "var(--gold-soft)",
                        border: "1px solid #EBCE95",
                        color: "var(--gold)",
                        fontSize: "16px",
                        fontWeight: "800",
                        letterSpacing: "-0.06em",
                      }}
                    >
                      {row.count}
                    </span>
                    <span style={{ display: "grid", gap: "5px", minWidth: "0" }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        <span style={{ color: "var(--color-primary)" }}>{row.trade}</span>
                        <span aria-hidden="true" style={{ color: "var(--border-strong)" }}>
                          ·
                        </span>
                        <span style={{ color: "var(--text-secondary)" }}>{row.place}</span>
                      </span>
                      <span style={{ fontSize: "18px", lineHeight: "1.3", fontWeight: "700", letterSpacing: "-0.015em", color: "var(--blue-900)" }}>
                        {row.title}
                      </span>
                      {row.summary ? (
                        <span
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            fontSize: "14.5px",
                            lineHeight: "1.6",
                            color: "var(--text-secondary)",
                            maxWidth: "820px",
                          }}
                        >
                          {row.summary}
                        </span>
                      ) : null}
                    </span>
                    <span
                      data-rk-side=""
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "12px",
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.updated}
                      <svg data-rk-go="" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
