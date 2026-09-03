import { InfoModal } from "@/components/site/InfoModal";
import { Icon, type IconName } from "@/components/ui/Icon";
import { dollars, monthYear, priceRange } from "@/lib/format";
import { routes } from "@/lib/urls";
import { CostEstimator } from "./CostEstimator";

type Row = {
  id: string;
  label: string;
  lowPrice: number | null;
  highPrice: number | null;
  typical: number | null;
  unit: string;
  currency: string;
  group: string | null;
  note: string | null;
};

type Guide = {
  typicalLow: number | null;
  typicalHigh: number | null;
  unitLow: number | null;
  unitHigh: number | null;
  unitLabel: string | null;
  reviewedAt: Date | null;
  updatedAt: Date;
  costs: Row[];
  sources: { id: string }[];
};

const CELL_HEAD = {
  padding: "13px 22px",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "var(--ls-wide)",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border-subtle)",
};
const ROW_HEAD = {
  padding: "15px 22px",
  fontSize: "16px",
  fontWeight: "700",
  color: "var(--blue-900)",
  borderBottom: "1px solid var(--border-subtle)",
};
const MONEY_CELL = {
  padding: "15px 22px",
  fontSize: "16px",
  fontWeight: "600",
  color: "var(--blue-900)",
  borderBottom: "1px solid var(--border-subtle)",
  fontVariantNumeric: "tabular-nums" as const,
  whiteSpace: "nowrap" as const,
};

export function priceModal() {
  return (
    <InfoModal
      label="How we calculate these estimates"
      title="How we calculate these estimates"
      points={[
        "Figures are market ranges compiled from published contractor pricing and regional cost data",
        "They are for budgeting; nothing here is an estimate or an offer from any company",
        "Actual pricing depends on scope, materials, labour, permits and property condition",
        "Where we have no sourced figure we say so rather than inventing one",
      ]}
      link={{ href: routes.howWeRank(), label: "How we research costs" }}
    >
      Every figure on this page traces back to a source named at the bottom of the guide.
    </InfoModal>
  );
}

/** The at-a-glance band that opens a cost guide. */
export function CostSummary({ guide, title, intro }: { guide: Guide; title: string; intro?: string | null }) {
  const cards: { label: string; value: string; note: string; icon: IconName; tone: "blue" | "gold" | "plain" }[] = [];

  if (guide.typicalLow || guide.typicalHigh) {
    cards.push({
      label: "Typical project",
      value: priceRange(guide.typicalLow, guide.typicalHigh),
      note: "What most homeowners end up paying once the job is scoped.",
      icon: "dollar",
      tone: "blue",
    });
  }
  if (guide.unitLow || guide.unitHigh) {
    cards.push({
      label: `Rate ${guide.unitLabel ?? "per unit"}`,
      value: priceRange(guide.unitLow, guide.unitHigh),
      note: "Useful for sanity-checking a quote against the size of the job.",
      icon: "calc",
      tone: "gold",
    });
  }
  cards.push({
    label: "Sources cited",
    value: String(guide.sources.length),
    note: "Every figure on this page traces back to one of them.",
    icon: "doc",
    tone: "plain",
  });
  cards.push({
    label: "Last reviewed",
    value: monthYear(guide.reviewedAt ?? guide.updatedAt),
    note: "Prices move. This is when an editor last checked them.",
    icon: "refresh",
    tone: "plain",
  });

  const skin = (tone: "blue" | "gold" | "plain") =>
    tone === "blue"
      ? { background: "var(--blue-50)", border: "1px solid var(--blue-100)", label: "var(--color-primary)" }
      : tone === "gold"
        ? { background: "var(--amber-50)", border: "1px solid #EBCE95", label: "#8A5F0B" }
        : { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", label: "var(--text-secondary)" };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "18px" }}>
        <h2 id="sum-h2" style={{ fontSize: "26px", fontWeight: "700" }}>
          {title} at a glance
        </h2>
        {priceModal()}
      </div>
      {intro ? (
        <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-primary)", marginBottom: "18px", maxWidth: "70ch" }}>
          {intro}
        </p>
      ) : null}
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px" }}>
        {cards.map((card) => {
          const tone = skin(card.tone);
          return (
            <li
              key={card.label}
              data-card=""
              style={{
                background: tone.background,
                border: tone.border,
                borderRadius: "20px",
                padding: "22px",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <span style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "var(--ls-wider)",
                    textTransform: "uppercase",
                    color: tone.label,
                    maxWidth: "8em",
                    lineHeight: "1.4",
                  }}
                >
                  {card.label}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "11px",
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-subtle)",
                    color: tone.label,
                  }}
                >
                  <Icon name={card.icon} size={18} strokeWidth={1.8} />
                </span>
              </span>
              <span
                style={{
                  marginTop: "auto",
                  display: "block",
                  fontSize: "24px",
                  fontWeight: "700",
                  lineHeight: "1.15",
                  letterSpacing: "var(--ls-tighter)",
                  color: "var(--blue-900)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {card.value}
              </span>
              <span style={{ display: "block", fontSize: "13px", lineHeight: "1.55", color: "var(--text-secondary)" }}>
                {card.note}
              </span>
            </li>
          );
        })}
      </ul>

      {guide.typicalLow && guide.typicalHigh ? (
        <div
          style={{
            marginTop: "20px",
            background: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "18px",
            padding: "24px",
          }}
        >
          <h3 style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "18px" }}>
            Typical range
          </h3>
          <div aria-hidden="true" style={{ position: "relative", height: "12px", borderRadius: "999px", background: "var(--surface-sunken)", marginBottom: "12px" }}>
            <span
              style={{
                position: "absolute",
                left: "12%",
                right: "26%",
                top: "0",
                bottom: "0",
                borderRadius: "999px",
                background: "linear-gradient(90deg, var(--blue-300), var(--color-primary))",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <span style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                Low end
              </span>
              <span style={{ display: "block", fontSize: "17px", fontWeight: "700", color: "var(--blue-900)", fontVariantNumeric: "tabular-nums" }}>
                {dollars(guide.typicalLow)}
              </span>
            </span>
            <span style={{ display: "block", textAlign: "center" }}>
              <span style={{ display: "block", fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--color-primary)" }}>
                Most homeowners
              </span>
              <span style={{ display: "block", fontSize: "17px", fontWeight: "700", color: "var(--blue-900)", fontVariantNumeric: "tabular-nums" }}>
                {dollars(guide.typicalLow)} – {dollars(guide.typicalHigh)}
              </span>
            </span>
            <span style={{ display: "block", textAlign: "right" }}>
              <span style={{ display: "block", fontSize: "12px", fontWeight: "700", letterSpacing: "var(--ls-wide)", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                High end
              </span>
              <span style={{ display: "block", fontSize: "17px", fontWeight: "700", color: "var(--blue-900)", fontVariantNumeric: "tabular-nums" }}>
                {dollars(guide.typicalHigh)}+
              </span>
            </span>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * One table per group an editor has bucketed the rows into, so a cost guide
 * reads as "by size", "by material", "common scenarios" rather than one long
 * list. Rows with no group fall into a single table at the end.
 */
export function CostTables({ rows, anchorPrefix }: { rows: Row[]; anchorPrefix: string }) {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row.group?.trim() || "";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const ordered = [...groups.entries()].sort((a, b) => (a[0] === "" ? 1 : b[0] === "" ? -1 : 0));

  return (
    <>
      {ordered.map(([group, list], index) => {
        const hasNotes = list.some((row) => row.note);
        const id = group ? `${anchorPrefix}-${index}` : anchorPrefix;
        return (
          <section key={id} id={id} aria-labelledby={`${id}-h2`}>
            <h2 id={`${id}-h2`} style={{ fontSize: "26px", fontWeight: "700", marginBottom: "18px" }}>
              {group || "What the work costs"}
            </h2>
            <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "18px", overflow: "hidden", overflowX: "auto" }}>
              <table style={{ minWidth: hasNotes ? "680px" : "520px" }} data-rtable="">
                <thead>
                  <tr style={{ background: "var(--surface-page)" }}>
                    <th scope="col" style={CELL_HEAD}>
                      Work
                    </th>
                    <th scope="col" style={CELL_HEAD}>
                      Typical range
                    </th>
                    {hasNotes ? (
                      <th scope="col" style={CELL_HEAD}>
                        What it covers
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id}>
                      <th scope="row" style={ROW_HEAD}>
                        {row.label}
                      </th>
                      <td data-label="Typical range" style={MONEY_CELL}>
                        {priceRange(row.lowPrice, row.highPrice, row.currency)}
                      </td>
                      {hasNotes ? (
                        <td
                          data-label="What it covers"
                          style={{
                            padding: "15px 22px",
                            fontSize: "15px",
                            lineHeight: "1.6",
                            color: "var(--text-secondary)",
                            borderBottom: "1px solid var(--border-subtle)",
                          }}
                        >
                          {row.note ?? ""}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}

export { CostEstimator };
