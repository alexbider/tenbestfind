"use client";

import Link from "next/link";
import { useState } from "react";
import type { ArchiveCountry, ArchiveRow, ArchiveTrade } from "./types";

/**
 * The dark "which trades we cover in each city" grid. One card per city with
 * a tile per trade: gold opens that city's ranking, dashed means not covered
 * yet. Picking a trade dims the cities without it and outlines its tiles.
 */
export function CoverageMap({
  rows,
  trades,
  countries,
}: {
  rows: ArchiveRow[];
  trades: ArchiveTrade[];
  countries: ArchiveCountry[];
}) {
  const [cov, setCov] = useState("all");

  const pills = [
    { key: "all", name: "All trades", count: rows.length },
    ...trades.map((trade) => ({ key: trade.key, name: trade.name, count: rows.filter((row) => row.tradeKey === trade.key).length })),
  ];

  const groups = countries
    .map((country) => {
      const inCountry = rows.filter((row) => row.country === country.code);
      const byCity = new Map<string, ArchiveRow[]>();
      for (const row of inCountry) {
        const list = byCity.get(row.cityHref) ?? [];
        list.push(row);
        byCity.set(row.cityHref, list);
      }
      const cities = [...byCity.entries()]
        .map(([href, list]) => ({ href, list, first: list[0] }))
        .sort((a, b) => b.list.length - a.list.length || a.first.city.localeCompare(b.first.city));
      return { country, cities, total: inCountry.length };
    })
    .filter((group) => group.cities.length > 0);

  return (
    <>
      <div role="group" aria-label="Highlight a trade" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "40px" }}>
        {pills.map((pill) => (
          <button
            key={pill.key}
            type="button"
            data-ct=""
            data-on={cov === pill.key ? "1" : "0"}
            aria-pressed={cov === pill.key}
            onClick={() => setCov(pill.key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              height: "42px",
              minHeight: "42px",
              padding: "0 10px 0 16px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {pill.name}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "28px",
                height: "26px",
                padding: "0 8px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.1)",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {pill.count}
            </span>
          </button>
        ))}
      </div>

      {groups.map((group) => (
        <div key={group.country.code} style={{ marginBottom: "40px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "14px",
              paddingBottom: "14px",
              marginBottom: "18px",
              borderBottom: "1px solid rgba(255,255,255,0.16)",
            }}
          >
            <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#fff" }}>{group.country.name}</h3>
            <span style={{ fontSize: "14px", color: "rgba(232,237,245,0.6)" }}>
              {group.cities.length} {group.cities.length === 1 ? "city" : "cities"} · {group.total}{" "}
              {group.total === 1 ? "ranking" : "rankings"}
            </span>
          </div>
          <ul data-cov-grid="" style={{ display: "grid", gap: "12px" }}>
            {group.cities.map(({ href, list, first }) => (
              <li
                key={href}
                data-cc=""
                data-dim={cov !== "all" && !list.some((row) => row.tradeKey === cov) ? "1" : "0"}
                style={{
                  padding: "18px 18px 16px",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", marginBottom: "14px" }}>
                  <Link href={href} style={{ fontSize: "16px", fontWeight: "700", color: "#fff", letterSpacing: "-0.01em" }}>
                    {first.city}
                    <span style={{ fontWeight: "500", color: "rgba(232,237,245,0.55)", marginLeft: "6px" }}>{first.st}</span>
                  </Link>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--gold-ink)", whiteSpace: "nowrap" }}>
                    {list.length}
                    <span style={{ color: "rgba(232,237,245,0.45)", fontWeight: "600" }}> / {trades.length}</span>
                  </span>
                </div>
                <div data-cov-cells="" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "6px" }}>
                  {trades.map((trade) => {
                    const hit = list.find((row) => row.tradeKey === trade.key);
                    return hit ? (
                      <Link
                        key={trade.key}
                        data-cell=""
                        data-hl={cov === trade.key ? "1" : "0"}
                        href={hit.href}
                        title={hit.title}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "30px",
                          borderRadius: "8px",
                          background: "var(--gold-ink)",
                          color: "var(--ink)",
                          fontSize: "11.5px",
                          fontWeight: "800",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {trade.short}
                      </Link>
                    ) : (
                      <span
                        key={trade.key}
                        role="img"
                        aria-label={`${trade.name}: not yet covered`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "30px",
                          borderRadius: "8px",
                          border: "1px dashed rgba(255,255,255,0.16)",
                          color: "rgba(232,237,245,0.32)",
                          fontSize: "11.5px",
                          fontWeight: "700",
                        }}
                      >
                        {trade.short}
                      </span>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
