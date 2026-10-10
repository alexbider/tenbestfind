import type { ReactNode } from "react";
import type { GuideBlock } from "../../../../prisma/data/editorial";
import { GuideFigure, LinkedText, type GuideImageMap } from "@/components/site/blocks";
import { Icon, type IconName } from "@/components/ui/Icon";
import { hasIcon } from "@/lib/icon-paths";
import { GuideChart } from "./GuideChart";
import { Tile, tail } from "./parts";

const CELL_HEAD = {
  padding: "13px 22px",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "var(--ls-wide)",
  textTransform: "uppercase" as const,
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border-subtle)",
};
const CELL = {
  padding: "15px 22px",
  fontSize: "15px",
  lineHeight: "1.6",
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border-subtle)",
  verticalAlign: "top" as const,
};

const CHECK = (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#1F9D6B"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ flexShrink: 0, marginTop: "4px" }}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/**
 * The body of a guide, drawn the way the October 2026 design draws it.
 *
 * Same blocks, same words, same order as the shared GuideBody; what differs is
 * the dress: the serif accent on headings, reveal-on-scroll, the icon tiles and
 * the stacked-card tables on a phone. It is rendered as a plain fragment so the
 * blocks stay direct children of the article's gap grid.
 */
export function GuideBody({
  blocks,
  images = {},
  headSize = 28,
}: {
  blocks: GuideBlock[];
  images?: GuideImageMap;
  /** Editorial guides set section headings at 28px, cost guides at 26px. */
  headSize?: number;
}) {
  const gap = headSize === 26 ? 18 : 20;
  const h2 = { fontSize: `${headSize}px`, lineHeight: "1.25", fontWeight: "700" };
  const iconH2 = { display: "flex", alignItems: "center", gap: "11px", fontSize: "26px", fontWeight: "700", marginBottom: "18px" };

  const render = (block: GuideBlock, index: number): ReactNode => {
    switch (block.kind) {
      case "heading":
        return (
          <h2 key={block.id} data-reveal="" id={block.id} style={h2}>
            {tail(block.text)}
          </h2>
        );
      case "paragraph":
        return (
          <p key={index}>
            <LinkedText text={block.text} links={block.links} />
          </p>
        );
      case "list":
        return (
          <ul key={index} data-stagger="" style={{ display: "grid", gap: "11px" }}>
            {block.items.filter(Boolean).map((item) => (
              <li key={item} style={{ display: "flex", gap: "11px", fontSize: "16px", lineHeight: "1.65", color: "var(--text-primary)" }}>
                {CHECK}
                {item}
              </li>
            ))}
          </ul>
        );
      case "steps":
        return (
          <ol key={index} data-stagger="" style={{ display: "grid", gap: "14px" }}>
            {block.items.map((item, stepIndex) => (
              <li
                key={item.title}
                style={{
                  display: "flex",
                  gap: "18px",
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "16px",
                  padding: "20px 22px",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: "0 0 40px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "40px",
                    height: "40px",
                    borderRadius: "11px",
                    background: "var(--blue-900)",
                    color: "#E8B551",
                    fontSize: "14px",
                    fontWeight: "700",
                  }}
                >
                  {stepIndex + 1}
                </span>
                <span style={{ display: "block" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "5px" }}>{item.title}</h3>
                  <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-secondary)" }}>{item.body}</p>
                </span>
              </li>
            ))}
          </ol>
        );
      case "criteria":
        return (
          <div key={index} style={{ display: "grid", gap: "20px" }}>
            {block.items.map((item) => (
              <div key={item.title}>
                <h3
                  style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}
                >
                  <Tile
                    icon={(item.iconKey && hasIcon(item.iconKey) ? item.iconKey : "check") as IconName}
                    size={34}
                    iconSize={17}
                    stroke={1.85}
                  />
                  {item.title}
                </h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        );
      case "checklist":
        return (
          <section key={index} style={{ border: "1px solid var(--border-subtle)", borderRadius: "20px", overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                padding: "16px 24px",
                background: "var(--surface-page)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <Icon name="clipboard" size={19} color="#2D74D7" strokeWidth={1.9} />
              <h2 data-reveal="" style={{ fontSize: "19px", fontWeight: "700" }}>
                {tail(block.title)}
              </h2>
            </div>
            <ul
              style={{
                padding: "20px 24px 24px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "10px 24px",
              }}
            >
              {block.items.filter(Boolean).map((item) => (
                <li key={item} style={{ display: "flex", gap: "10px", fontSize: "15px", lineHeight: "1.6", color: "var(--text-primary)" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      marginTop: "2px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "18px",
                      height: "18px",
                      borderRadius: "5px",
                      border: "1.5px solid var(--border-strong)",
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        );
      case "compare":
        return (
          <section key={index}>
            <h2 data-reveal="" style={{ ...h2, marginBottom: block.intro ? "8px" : "20px" }}>
              {tail(block.title)}
            </h2>
            {block.intro ? <p style={{ marginBottom: "20px" }}>{block.intro}</p> : null}
            <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "18px", overflow: "hidden", overflowX: "auto" }}>
              <table style={{ minWidth: "680px" }} data-rtable="">
                <thead>
                  <tr style={{ background: "var(--surface-page)" }}>
                    {["Factor", "What to check", "Why it matters"].map((head) => (
                      <th key={head} scope="col" style={CELL_HEAD}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row) => (
                    <tr key={row.factor}>
                      <th
                        scope="row"
                        style={{
                          padding: "15px 22px",
                          fontSize: "16px",
                          fontWeight: "700",
                          color: "var(--blue-900)",
                          borderBottom: "1px solid var(--border-subtle)",
                          verticalAlign: "top",
                        }}
                      >
                        {row.factor}
                      </th>
                      <td data-label="What to check" style={CELL}>
                        {row.check}
                      </td>
                      <td data-label="Why it matters" style={CELL}>
                        {row.why}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      case "flags":
        return (
          <section key={index}>
            <h2 data-reveal="" style={iconH2}>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "40px",
                  height: "40px",
                  borderRadius: "11px",
                  background: "#FDEDEC",
                  color: "#C32620",
                  flexShrink: 0,
                }}
              >
                <Icon name="alert" size={20} strokeWidth={1.9} />
              </span>
              <span>{tail(block.title)}</span>
            </h2>
            <ul
              data-stagger=""
              style={{ display: "grid", gap: "11px", border: "1px solid var(--border-subtle)", borderRadius: "18px", padding: "24px 26px" }}
            >
              {block.items.filter(Boolean).map((item) => (
                <li key={item} style={{ display: "flex", gap: "11px", fontSize: "16px", lineHeight: "1.65", color: "var(--text-primary)" }}>
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#C32620"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ flexShrink: 0, marginTop: "4px" }}
                  >
                    <path d="M12 8v5" />
                    <path d="M12 16h.01" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        );
      case "callout": {
        const skin =
          block.tone === "alert"
            ? { background: "#FDEDEC", border: "1px solid #F6C9C6", stroke: "#C32620" }
            : block.tone === "note"
              ? { background: "var(--amber-50)", border: "1px solid #EBCE95", stroke: "#8A5F0B" }
              : { background: "var(--green-50)", border: "1px solid var(--green-100)", stroke: "#178054" };
        return (
          <aside key={index} style={{ background: skin.background, border: skin.border, borderRadius: "18px", padding: "22px 24px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "17px", fontWeight: "700", marginBottom: "10px" }}>
              <Icon
                name={block.tone === "alert" ? "alert" : block.tone === "note" ? "info" : "shield"}
                size={19}
                color={skin.stroke}
                strokeWidth={1.9}
              />
              {block.title}
            </h3>
            <p style={{ fontSize: "16px", lineHeight: "1.7", color: "var(--text-primary)" }}>{block.body}</p>
          </aside>
        );
      }
      case "quote":
        return (
          <blockquote key={index} style={{ margin: "0", padding: "4px 0 4px 22px", borderLeft: "3px solid var(--gold-ink)" }}>
            <p style={{ fontSize: "20px", lineHeight: "1.55", fontWeight: "600", color: "var(--blue-900)" }}>{block.text}</p>
            <cite style={{ display: "block", marginTop: "10px", fontSize: "14px", fontStyle: "normal", color: "var(--text-secondary)" }}>
              {block.attribution}
            </cite>
          </blockquote>
        );
      case "figure":
        return <GuideFigure key={index} image={images[block.key]} alt={block.alt} caption={block.caption} />;
      case "chart":
        return (
          <GuideChart
            key={index}
            headSize={headSize}
            title={block.title}
            unit={block.unit}
            intro={block.intro}
            note={block.note}
            rows={block.rows}
          />
        );
      default:
        return null;
    }
  };

  // A heading owns the prose that follows it, as each section does in the
  // design, so the heading sits close to its text and the sections sit apart.
  // Blocks that are panels in their own right (checklist, comparison, flags,
  // callout, chart) end the section and stand on their own.
  const standalone = new Set(["checklist", "compare", "flags", "callout", "chart"]);
  const nodes: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.kind !== "heading") {
      nodes.push(render(block, i));
      continue;
    }
    const members: ReactNode[] = [render(block, i)];
    while (i + 1 < blocks.length && blocks[i + 1].kind !== "heading" && !standalone.has(blocks[i + 1].kind)) {
      i += 1;
      members.push(render(blocks[i], i));
    }
    nodes.push(
      <section key={block.id} aria-labelledby={block.id} style={{ display: "grid", gap: `${gap}px` }}>
        {members}
      </section>,
    );
  }

  return <>{nodes}</>;
}
