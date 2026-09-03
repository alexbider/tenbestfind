"use client";

import Link from "next/link";
import { useState } from "react";
import type { CountryNav } from "@/lib/navigation";
import { routes } from "@/lib/urls";

const GROUP_LABEL = {
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--text-muted)",
};

function Arrow({ size = 15, width = 2 }: { size?: number; width?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/**
 * Two-level Locations panel: the country rail on the left drives the region
 * and metro columns. Pointing at a country switches the panel, but the country
 * name is still a link, so the menu works for a reader who never hovers.
 */
export function LocationsMenu({ countries }: { countries: CountryNav[] }) {
  const [index, setIndex] = useState(0);
  const current = countries[index] ?? countries[0];
  if (!current) return null;

  return (
    <div
      data-panel=""
      style={{
        position: "absolute",
        top: "calc(var(--hdr-h) - 6px)",
        left: "var(--gutter)",
        right: "var(--gutter)",
        zIndex: "50",
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "24px",
        boxShadow: "0 30px 80px -20px rgba(16,31,61,0.28), 0 2px 6px rgba(16,31,61,0.06)",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "272px 1fr 250px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "26px 22px",
          background: "var(--surface-page)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        <p style={{ ...GROUP_LABEL, margin: "0 0 4px 6px" }}>Choose a country</p>
        {countries.map((country, i) => (
          <Link
            key={country.code}
            data-crail=""
            data-on={i === index ? "1" : "0"}
            href={country.href}
            onMouseEnter={() => setIndex(i)}
            onFocus={() => setIndex(i)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 14px",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              background: "var(--surface-card)",
            }}
          >
            <span
              data-cico=""
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "38px",
                height: "38px",
                flexShrink: 0,
                borderRadius: "11px",
                background: "var(--blue-50)",
                border: "1px solid var(--blue-100)",
                color: "var(--color-primary)",
                fontSize: "12px",
                fontWeight: "800",
                letterSpacing: "0.04em",
              }}
            >
              {country.code.toUpperCase()}
            </span>
            <span style={{ minWidth: 0 }}>
              <span data-cname="" style={{ display: "block", fontSize: "15px", fontWeight: "700", color: "var(--ink)" }}>
                {country.name}
              </span>
              <span data-cmeta="" style={{ display: "block", fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                {country.meta}
              </span>
            </span>
            <span data-cchev="" aria-hidden="true" style={{ display: "inline-flex", marginLeft: "auto", color: "var(--text-muted)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </Link>
        ))}
        <Link
          data-arrow=""
          href={routes.locationsIndex()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            margin: "8px 0 0 8px",
            fontSize: "14px",
            fontWeight: "600",
            color: "var(--color-primary)",
          }}
        >
          Every location
          <Arrow />
        </Link>
      </div>

      <div style={{ padding: "28px 30px 26px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "18px",
            paddingBottom: "14px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <p style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.02em", color: "var(--ink)" }}>
            {current.name}
            <span style={{ fontWeight: "500", color: "var(--text-secondary)" }}> · by {current.unit}</span>
          </p>
          <Link
            data-arrow=""
            href={current.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
              fontSize: "13.5px",
              fontWeight: "600",
              color: "var(--color-primary)",
            }}
          >
            {current.hubLabel}
            <Arrow size={14} />
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "4px 14px" }}>
          {current.groups.map((group) => (
            <div key={group.title}>
              <p style={{ ...GROUP_LABEL, margin: "0 0 6px 10px" }}>{group.title}</p>
              <ul>
                {group.items.map((region) => (
                  <li key={region.href}>
                    <Link
                      data-mitem=""
                      href={region.href}
                      style={{ display: "block", padding: "6px 10px", borderRadius: "9px", fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}
                    >
                      {region.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "28px 24px 26px", borderLeft: "1px solid var(--border-subtle)" }}>
        <p style={{ ...GROUP_LABEL, margin: "0 0 8px 10px" }}>Most rankings published</p>
        <ol>
          {current.cities.map((city) => (
            <li key={city.href}>
              <Link
                data-mitem=""
                href={city.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "7px 10px",
                  borderRadius: "9px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "var(--text-primary)",
                }}
              >
                {city.name}
                {city.count ? (
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {city.count}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
