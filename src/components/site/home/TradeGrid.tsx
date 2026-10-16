"use client";

import Link from "next/link";
import { useState } from "react";

export type Trade = { href: string; name: string; d: string };

const SHOWN = 8;

/**
 * The compact trade grid under the hero: eight icon tiles, with the rest behind
 * a "show more" control. The second row of tiles is always in the markup (and
 * so in the HTML a crawler reads); it is only hidden until the button opens it.
 */
export function TradeGrid({ trades }: { trades: Trade[] }) {
  const [more, setMore] = useState(false);
  const first = trades.slice(0, SHOWN);
  const rest = trades.slice(SHOWN);

  return (
    <>
      <ul
        data-quick=""
        data-stagger=""
        style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "8px 4px" }}
      >
        {first.map((trade) => (
          <TradeTile key={trade.href} trade={trade} />
        ))}
      </ul>
      {rest.length > 0 ? (
        <>
          <ul
            id="more-trades"
            data-quick=""
            hidden={!more}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "8px 4px",
              marginTop: "4px",
              animation: more ? "riseIn 500ms var(--spring) both" : undefined,
            }}
          >
            {rest.map((trade) => (
              <TradeTile key={trade.href} trade={trade} />
            ))}
          </ul>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
            <button
              data-press=""
              type="button"
              aria-expanded={more}
              aria-controls="more-trades"
              onClick={() => setMore((open) => !open)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                height: "44px",
                padding: "0 20px",
                borderRadius: "999px",
                border: "1px solid var(--border-subtle)",
                background: "var(--paper)",
                fontSize: "14px",
                fontWeight: "600",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              {more ? "Show fewer trades" : `Show ${rest.length} more trades`}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
                style={{ transform: more ? "rotate(180deg)" : "none", transition: "transform 360ms var(--spring)" }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}

function TradeTile({ trade }: { trade: Trade }) {
  return (
    <li>
      <Link
        data-trade=""
        href={trade.href}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          padding: "10px 2px 8px",
          borderRadius: "16px",
          color: "var(--ink)",
        }}
      >
        <span
          data-tile=""
          aria-hidden="true"
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "60px",
            height: "60px",
            borderRadius: "19px",
            background: "var(--paper)",
            border: "1px solid var(--border-subtle)",
            color: "var(--ink)",
            overflow: "hidden",
          }}
        >
          <span
            data-ten=""
            style={{
              position: "absolute",
              right: "-3px",
              bottom: "-9px",
              fontSize: "30px",
              fontWeight: "800",
              letterSpacing: "-0.08em",
              lineHeight: "1",
              color: "var(--gold-ink)",
              opacity: 0.32,
              pointerEvents: "none",
            }}
          ></span>
          <svg
            data-ico=""
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "relative" }}
          >
            <path pathLength="1" d={trade.d} />
          </svg>
        </span>
        <span style={{ fontSize: "12.5px", fontWeight: "600", textAlign: "center", lineHeight: "1.25" }}>
          {trade.name}
        </span>
      </Link>
    </li>
  );
}
