import Link from "next/link";
import type { ReactNode } from "react";
import type { GuideBlock } from "../../../prisma/data/editorial";
import { ArrowRight, Check, Icon, StarIcon } from "@/components/ui/Icon";
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

export function GuideBody({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <div className="prose">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading":
            return (
              <h2 key={block.id} id={block.id}>
                {block.text}
              </h2>
            );
          case "paragraph":
            return <p key={index}>{block.text}</p>;
          case "list":
            return (
              <ul key={index}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "steps":
            return (
              <ol key={index} className="numbered-steps">
                {block.items.map((item, stepIndex) => (
                  <li key={item.title}>
                    <span className="numbered-steps__num" aria-hidden="true">
                      {stepIndex + 1}
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <span>{item.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            );
          case "callout":
            return (
              <div key={index} className={`callout callout--${block.tone}`} style={{ marginTop: 24 }}>
                <Icon
                  name={block.tone === "alert" ? "alert" : block.tone === "note" ? "info" : "bulb"}
                  size={20}
                  color={
                    block.tone === "alert"
                      ? "var(--maple-600)"
                      : block.tone === "note"
                        ? "var(--amber-600)"
                        : "var(--color-primary)"
                  }
                />
                <div>
                  <p className="callout__title">{block.title}</p>
                  <p>{block.body}</p>
                </div>
              </div>
            );
          case "quote":
            return (
              <blockquote key={index} className="pull-quote">
                <p>{block.text}</p>
                <cite>{block.attribution}</cite>
              </blockquote>
            );
          default:
            return null;
        }
      })}
    </div>
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
