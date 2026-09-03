import Link from "next/link";
import type { ReactNode } from "react";
import type { GuideBlock } from "../../../prisma/data/editorial";
import { ArrowRight, Check, Icon, StarIcon, type IconName } from "@/components/ui/Icon";
import { ArrowLink, Badge, Breadcrumbs, Shell } from "@/components/ui/primitives";
import { fullDate, priceRange } from "@/lib/format";
import { hasIcon } from "@/lib/icon-paths";
import type { Crumb } from "@/lib/urls";
import { routes } from "@/lib/urls";
import { SearchForm } from "./SearchForm";
import { PricingDisclosure } from "./disclosures";

/* --------------------------------------------------------------- crumb bar */

export function CrumbBar({ items }: { items: Crumb[] }) {
  return (
    <div className="crumbs-bar">
      <Shell>
        <Breadcrumbs items={items} />
      </Shell>
    </div>
  );
}

/* -------------------------------------------------------------- cost table */

export type CostRowView = {
  id: string;
  label: string;
  lowPrice: number | null;
  highPrice: number | null;
  typical: number | null;
  unit: string;
  currency: string;
  note: string | null;
};

const UNIT_LABEL: Record<string, string> = {
  project: "",
  sq_ft: " per sq ft",
  hour: " per hour",
  visit: " per visit",
};

export function CostTable({
  rows,
  caption,
  currency = "USD",
}: {
  rows: CostRowView[];
  caption?: string;
  currency?: string;
}) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {caption ? (
        <div className="cost-table__band">
          <Icon name="coin" size={18} color="var(--color-primary)" />
          <span>{caption}</span>
          <span style={{ marginLeft: "auto" }}>
            <PricingDisclosure />
          </span>
        </div>
      ) : null}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Work</th>
              <th scope="col">Typical range</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Work" style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {row.label}
                </td>
                <td data-label="Typical range" style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {priceRange(row.lowPrice, row.highPrice, row.currency || currency)}
                  {row.lowPrice ? UNIT_LABEL[row.unit] ?? "" : ""}
                </td>
                <td data-label="Notes" style={{ color: "var(--text-secondary)" }}>
                  {row.note ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- criteria list */

export type CriterionView = {
  id: string;
  title: string;
  body: string;
  importance: string;
  iconKey: string | null;
};

const IMPORTANCE_LABEL: Record<string, string> = {
  HIGH: "High importance",
  MODERATE: "Moderate importance",
  SUPPORTING: "Supporting factor",
};

export function CriteriaGrid({ criteria, onInk }: { criteria: CriterionView[]; onInk?: boolean }) {
  return (
    <ul className={onInk ? "criteria-grid criteria-grid--ink" : "criteria-grid"}>
      {criteria.map((criterion) => (
        <li key={criterion.id}>
          <span className="criteria-grid__icon" aria-hidden="true">
            <Icon
              name={criterion.iconKey && hasIcon(criterion.iconKey) ? criterion.iconKey : "check"}
              size={20}
              strokeWidth={1.8}
            />
          </span>
          <h3>{criterion.title}</h3>
          <p>{criterion.body}</p>
          <span className="criteria-grid__weight">{IMPORTANCE_LABEL[criterion.importance]}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ google rating */

export function GoogleRating({
  rating,
  count,
  size = "md",
}: {
  rating: number | null;
  count: number | null;
  size?: "sm" | "md";
}) {
  if (!rating) return null;
  return (
    <span className={size === "sm" ? "grating grating--sm" : "grating"}>
      <StarIcon size={size === "sm" ? 13 : 15} />
      <strong>{rating.toFixed(1)}</strong>
      {count ? <span>({count.toLocaleString()} Google reviews)</span> : <span>Google</span>}
    </span>
  );
}

/* ------------------------------------------------------------- sources list */

export type SourceView = {
  id: string;
  label: string;
  publisher: string | null;
  url: string | null;
  tier: string;
  accessedAt: Date | null;
};

const TIER_TONE: Record<string, "positive" | "brand" | "neutral" | "warning"> = {
  PRIMARY: "positive",
  SECONDARY: "brand",
  REPORTED: "warning",
  EDITORIAL: "neutral",
};

const TIER_LABEL: Record<string, string> = {
  PRIMARY: "Primary source",
  SECONDARY: "Secondary source",
  REPORTED: "Reported",
  EDITORIAL: "Editorial research",
};

export function SourceList({ sources }: { sources: SourceView[] }) {
  if (sources.length === 0) return null;
  return (
    <ol className="sources">
      {sources.map((source, index) => (
        <li key={source.id}>
          <span className="sources__num" aria-hidden="true">
            {index + 1}
          </span>
          <span>
            <span className="sources__label">
              {source.url ? (
                <a href={source.url} rel="nofollow noopener" target="_blank">
                  {source.label}
                </a>
              ) : (
                source.label
              )}
            </span>
            <span className="sources__meta">
              {source.publisher ? `${source.publisher} · ` : ""}
              <Badge tone={TIER_TONE[source.tier] ?? "neutral"}>{TIER_LABEL[source.tier]}</Badge>
              {source.accessedAt ? ` · Checked ${fullDate(source.accessedAt)}` : ""}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------- transparency block */

export function TransparencyBlock({
  title = "About this page",
  rows,
  children,
}: {
  title?: string;
  rows: { label: string; value: ReactNode }[];
  children?: ReactNode;
}) {
  return (
    <div className="transparency">
      <h2 className="transparency__title">{title}</h2>
      <dl className="transparency__grid">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {children}
      <div className="transparency__foot">
        <ArrowLink href={routes.corrections()}>Suggest a correction</ArrowLink>
        <ArrowLink href={routes.howWeRank()}>How we rank</ArrowLink>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- guide blocks */

const PROSE_H2 = { fontSize: "28px", lineHeight: "1.25", fontWeight: "700" };
const ICON_H2 = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  fontSize: "26px",
  fontWeight: "700",
  marginBottom: "18px",
};
const PANEL = {
  display: "grid",
  gap: "11px",
  border: "1px solid var(--border-subtle)",
  borderRadius: "18px",
  padding: "24px 26px",
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
const CELL = {
  padding: "15px 22px",
  fontSize: "15px",
  lineHeight: "1.6",
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border-subtle)",
  verticalAlign: "top" as const,
};

/** The square tile that sits beside a section heading. */
function HeadTile({ tone, children }: { tone: "blue" | "amber" | "red"; children: ReactNode }) {
  const skin =
    tone === "amber"
      ? { background: "var(--amber-50)", color: "#8A5F0B" }
      : tone === "red"
        ? { background: "#FDEDEC", color: "#C32620" }
        : { background: "var(--blue-50)", color: "var(--color-primary)" };
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "40px",
        height: "40px",
        borderRadius: "11px",
        flexShrink: 0,
        ...skin,
      }}
    >
      {children}
    </span>
  );
}

export function GuideBody({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading":
            return (
              <h2 key={block.id} id={block.id} style={PROSE_H2}>
                {block.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={index} style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-primary)" }}>
                {block.text}
              </p>
            );
          case "list":
            return (
              <ul key={index} style={{ display: "grid", gap: "11px" }}>
                {block.items.filter(Boolean).map((item) => (
                  <li
                    key={item}
                    style={{ display: "flex", gap: "11px", fontSize: "16px", lineHeight: "1.65", color: "var(--text-primary)" }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1F9D6B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "4px" }}>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "steps":
            return (
              <ol key={index} style={{ display: "grid", gap: "14px" }}>
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
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "20px",
                        fontWeight: "700",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "34px",
                          height: "34px",
                          borderRadius: "10px",
                          background: "var(--blue-50)",
                          color: "var(--color-primary)",
                          flexShrink: 0,
                        }}
                      >
                        <Icon
                          name={item.iconKey && hasIcon(item.iconKey) ? (item.iconKey as IconName) : "check"}
                          size={17}
                          strokeWidth={1.85}
                        />
                      </span>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: "17px", lineHeight: "1.75", color: "var(--text-primary)" }}>{item.body}</p>
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
                  <h2 style={{ fontSize: "19px", fontWeight: "700" }}>{block.title}</h2>
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
                <h2 style={{ ...PROSE_H2, marginBottom: block.intro ? "8px" : "20px" }}>{block.title}</h2>
                {block.intro ? (
                  <p style={{ marginBottom: "20px", fontSize: "17px", lineHeight: "1.75", color: "var(--text-primary)" }}>
                    {block.intro}
                  </p>
                ) : null}
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
                <h2 style={ICON_H2}>
                  <HeadTile tone="red">
                    <Icon name="alert" size={20} strokeWidth={1.9} />
                  </HeadTile>
                  {block.title}
                </h2>
                <ul style={PANEL}>
                  {block.items.filter(Boolean).map((item) => (
                    <li key={item} style={{ display: "flex", gap: "11px", fontSize: "16px", lineHeight: "1.65", color: "var(--text-primary)" }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C32620" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: "4px" }}>
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
              <aside
                key={index}
                style={{ background: skin.background, border: skin.border, borderRadius: "18px", padding: "22px 24px" }}
              >
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
              <blockquote
                key={index}
                style={{
                  margin: "0",
                  padding: "4px 0 4px 22px",
                  borderLeft: "3px solid var(--gold-ink)",
                }}
              >
                <p style={{ fontSize: "20px", lineHeight: "1.55", fontWeight: "600", color: "var(--blue-900)" }}>
                  {block.text}
                </p>
                <cite style={{ display: "block", marginTop: "10px", fontSize: "14px", fontStyle: "normal", color: "var(--text-secondary)" }}>
                  {block.attribution}
                </cite>
              </blockquote>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

/* ------------------------------------------------------------- final search */

export function FinalSearch({
  title = "Start with the shortlist",
  lead = "Tell us the job and where you are. We will point you at the ten worth calling.",
  lockedLocation,
  lockedService,
}: {
  title?: string;
  lead?: string;
  lockedLocation?: { label: string; value: string };
  lockedService?: { label: string; value: string };
}) {
  return (
    <section aria-labelledby="final-search-h2" style={{ background: "var(--ink)" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "88px var(--gutter)", textAlign: "center" }}>
        <h2 id="final-search-h2" className="h2" style={{ color: "#fff", marginBottom: 14, textWrap: "balance" }}>
          {title}
        </h2>
        <p style={{ fontSize: 18, lineHeight: 1.65, color: "rgba(232,237,245,0.72)", marginBottom: 32 }}>
          {lead}
        </p>
        <div style={{ textAlign: "left" }}>
          <SearchForm
            idPrefix="page-final"
            showIcons={false}
            lockedLocation={lockedLocation}
            lockedService={lockedService}
          />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- business teaser */

export function BusinessCta() {
  return (
    <div className="split biz-cta">
      <div>
        <h2 className="h2" style={{ marginBottom: 16, textWrap: "balance" }}>
          Own a business people are comparing?
        </h2>
        <p style={{ fontSize: 18, lineHeight: 1.65, color: "var(--text-secondary)", marginBottom: 28, maxWidth: 500 }}>
          Claim your listing to keep its details current, or add a business we have not covered yet.
          Both are $29 a month per location.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={routes.claim()} className="btn btn--primary">
            Claim your business
          </Link>
          <Link href={routes.addBusiness()} className="btn btn--secondary">
            Add a business
          </Link>
        </div>
      </div>
      <ul style={{ display: "grid", gap: 14 }}>
        {[
          {
            icon: "lock" as const,
            title: "Rankings stay editorial",
            body: "A subscription buys profile management, never a ranking position.",
          },
          {
            icon: "pulse" as const,
            title: "See what your listing does",
            body: "Impressions, profile views, website clicks and calls, by day.",
          },
          {
            icon: "pen" as const,
            title: "Keep the details right",
            body: "Hours, services, coverage and contact details, updated by you.",
          },
        ].map((item) => (
          <li key={item.title} className="benefit-card">
            <span aria-hidden="true" style={{ color: "var(--blue-700)", display: "inline-flex", paddingTop: 2 }}>
              <Icon name={item.icon} size={22} strokeWidth={1.7} />
            </span>
            <span style={{ display: "block" }}>
              <h3 style={{ fontSize: 17, marginBottom: 4 }}>{item.title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--text-secondary)" }}>{item.body}</p>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------- link columns */

export function LinkGrid({
  items,
  columns = 3,
}: {
  items: { label: string; href: string; meta?: string }[];
  columns?: number;
}) {
  return (
    <ul className="link-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="link-grid__item">
            <span>
              <strong>{item.label}</strong>
              {item.meta ? <span>{item.meta}</span> : null}
            </span>
            <ArrowRight size={15} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul style={{ display: "grid", gap: 12 }}>
      {items.map((item) => (
        <li key={item} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 16, lineHeight: 1.6 }}>
          <span style={{ paddingTop: 3 }}>
            <Check size={17} />
          </span>
          <span style={{ color: "var(--text-secondary)" }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}
