import { tail } from "./parts";

/**
 * An axis a person would have drawn: the step comes from the short list of
 * numbers axes are actually marked in, and the top follows from it.
 */
function niceScale(max: number): { ceiling: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) return { ceiling: 1, ticks: [0, 1] };

  const target = max / 5;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= target) ?? magnitude * 10;

  const ceiling = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let tick = 0; tick <= ceiling + step / 2; tick += step) ticks.push(Math.round(tick * 1000) / 1000);
  return { ceiling, ticks };
}

function chartNumber(value: number, unit: string): string {
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return /dollar|usd|cad|\$/i.test(unit) ? `$${formatted}` : formatted;
}

/**
 * The range chart of a guide, built from its own numbers.
 *
 * Bars rather than a picture of bars, so the widths come from the data and the
 * figures are printed beside them. The bars carry data-cbar, which grows each
 * one from its left edge as the chart scrolls into view.
 */
export function GuideChart({
  title,
  unit,
  intro,
  note,
  rows,
  headSize = 28,
}: {
  title: string;
  unit: string;
  intro?: string;
  note?: string;
  rows: { label: string; low: number; high: number; typical?: number; note?: string }[];
  headSize?: number;
}) {
  const usable = rows.filter((row) => Number.isFinite(row.low) && Number.isFinite(row.high));
  if (usable.length === 0) return null;

  const { ceiling, ticks } = niceScale(Math.max(...usable.map((row) => Math.max(row.low, row.high))));

  return (
    <section>
      <h2 data-reveal="" style={{ fontSize: `${headSize}px`, lineHeight: "1.25", fontWeight: "700", marginBottom: intro ? "8px" : "18px" }}>
        {tail(title)}
      </h2>
      {intro ? <p style={{ marginBottom: "18px" }}>{intro}</p> : null}

      <div
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "18px",
          padding: "22px 24px 18px",
          background: "var(--surface-card)",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "16px",
          }}
        >
          {unit}
        </p>

        <div data-stagger="" style={{ display: "grid", gap: "18px" }}>
          {usable.map((row) => {
            const low = Math.max(0, Math.min(row.low, row.high));
            const high = Math.max(row.low, row.high);
            const left = (low / ceiling) * 100;
            const width = Math.max(1.5, ((high - low) / ceiling) * 100);
            const typical = row.typical !== undefined && row.typical >= low && row.typical <= high ? (row.typical / ceiling) * 100 : null;

            return (
              <div key={row.label}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "baseline", marginBottom: "7px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>{row.label}</span>
                  <span style={{ fontSize: "14px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {chartNumber(low, unit)} to {chartNumber(high, unit)}
                  </span>
                </div>

                <div
                  style={{
                    position: "relative",
                    height: "14px",
                    borderRadius: "999px",
                    background: "var(--surface-page)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span
                    data-cbar=""
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: "-1px",
                      bottom: "-1px",
                      left: `${left}%`,
                      width: `${width}%`,
                      borderRadius: "999px",
                      background: "linear-gradient(90deg, var(--blue-300), var(--color-primary))",
                    }}
                  />
                  {typical !== null ? (
                    <span
                      aria-hidden="true"
                      title="Typical"
                      style={{
                        position: "absolute",
                        top: "-4px",
                        bottom: "-4px",
                        left: `${typical}%`,
                        width: "2px",
                        background: "var(--surface-card)",
                        boxShadow: "0 0 0 1px var(--blue-900, #10305F)",
                      }}
                    />
                  ) : null}
                </div>

                {row.note ? (
                  <p style={{ marginTop: "6px", fontSize: "13.5px", lineHeight: "1.6", color: "var(--text-muted)" }}>{row.note}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div
          aria-hidden="true"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "18px",
            paddingTop: "10px",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: "12.5px",
            color: "var(--text-muted)",
          }}
        >
          {ticks.map((tick) => (
            <span key={tick}>{chartNumber(tick, unit)}</span>
          ))}
        </div>
      </div>

      {note ? <p style={{ marginTop: "12px", fontSize: "14px", lineHeight: "1.65", color: "var(--text-muted)" }}>{note}</p> : null}
    </section>
  );
}
