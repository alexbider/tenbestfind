"use client";

import { useState } from "react";
import { InfoModal } from "@/components/site/InfoModal";
import { Icon } from "@/components/ui/Icon";
import { routes } from "@/lib/urls";

const FIELD = {
  width: "100%",
  height: "48px",
  padding: "0 14px",
  border: "1px solid var(--border-strong)",
  borderRadius: "12px",
  fontFamily: "var(--font-sans)",
  fontSize: "16px",
  color: "var(--text-primary)",
  background: "var(--surface-card)",
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

/**
 * Multiplies the guide's own sourced per-unit range by a size the reader
 * types. It asks only for what it can actually use: adding fields we have no
 * pricing for would make the answer look more precise than it is.
 */
export function CostEstimator({
  title,
  unitLow,
  unitHigh,
  unitLabel,
}: {
  title: string;
  unitLow: number;
  unitHigh: number;
  unitLabel: string;
}) {
  const [size, setSize] = useState("");
  const amount = Number(size.replace(/[^0-9.]/g, ""));
  const valid = Number.isFinite(amount) && amount > 0;

  return (
    <section id="calculator" aria-labelledby="calc-h2" style={{ border: "1px solid var(--blue-100)", borderRadius: "20px", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "16px 24px",
          background: "var(--blue-50)",
          borderBottom: "1px solid var(--blue-100)",
        }}
      >
        <h2 id="calc-h2" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "18px", fontWeight: "700" }}>
          <Icon name="calc" size={19} color="#2D74D7" strokeWidth={1.9} />
          Estimate your {title.toLowerCase()}
        </h2>
        <InfoModal
          label="Calculator disclaimer"
          title="Calculator disclaimer"
          points={[
            "This multiplies the published per-unit range by the size you enter, nothing more",
            "It does not know your materials, access, permits or property condition",
            "It is a budgeting sanity check, not a quote from anyone",
            "Only written estimates on identical scope are comparable",
          ]}
          link={{ href: routes.howWeRank(), label: "How we research costs" }}
        >
          The range comes from the same sourced figures published above.
        </InfoModal>
      </div>
      <div style={{ padding: "22px 24px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "18px" }}>
          <span style={{ display: "block" }}>
            <label htmlFor="calc-size" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Size ({unitLabel})
            </label>
            <input
              id="calc-size"
              name="size"
              type="text"
              inputMode="numeric"
              placeholder="2,000"
              value={size}
              onChange={(event) => setSize(event.target.value)}
              style={FIELD}
            />
          </span>
        </div>
        <div data-stack="" style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <span
            aria-live="polite"
            style={{ fontSize: "20px", fontWeight: "700", color: "var(--blue-900)", fontVariantNumeric: "tabular-nums" }}
          >
            {valid ? `${money(amount * unitLow)} – ${money(amount * unitHigh)}` : "—"}
          </span>
          <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
            {valid
              ? "A budgeting range, not a quote. No email or phone number required."
              : `Enter a size in ${unitLabel} to see the range. No email or phone number required.`}
          </span>
        </div>
      </div>
    </section>
  );
}
