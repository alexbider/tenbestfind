// The part of a subservice page that is about the job rather than the trade.
//
// Four sections sit between the hero and the checks: the two options a buyer
// is choosing between, what the work costs, the one claim worth making about
// it, and the ways it goes wrong. Hardwood flooring has all four. Most jobs
// have none yet.
//
// None of it can be generated, which is the whole reason it is a stored field
// rather than a template. "Nine to eighteen dollars a square foot" and "the
// wood has to acclimate in the room for days before it is laid" are facts
// about hardwood, and there is no sentence shape that turns the name of a
// trade into either of them. A page with nothing here renders without these
// sections rather than with invented ones.
//
// Everything is optional at every level and the parser never throws, so a
// detail that has drifted, or that somebody half filled in, costs the section
// it belongs to and not the page.

import { parseJson } from "./json";

/* ------------------------------------------------------------------ tones */

/**
 * What a comparison row means, rather than what colour it is.
 *
 * Stored as a judgement so the palette stays in the stylesheet: an author
 * writes "no", not "#B4442C", and the three readable twins in colors.css
 * decide how that looks.
 */
export type Tone = "for" | "against" | "mixed" | "plain";

const TONES: Record<Tone, string> = {
  for: "var(--text-success)",
  against: "var(--text-against)",
  mixed: "var(--text-warning)",
  plain: "var(--blue-900)",
};

export const toneColor = (tone: Tone | undefined): string => TONES[tone ?? "plain"];

/* ------------------------------------------------------------------ shapes */

/** One line of a comparison card: "Over concrete slab", "No". */
export type CompareRow = { label: string; value: string; tone?: Tone };

/** One of the two things being compared. */
export type CompareOption = { name: string; note?: string; rows: CompareRow[] };

/**
 * The opening section: what this job actually involves.
 *
 * `paragraphs` is here as well as in `body` because the two answer different
 * questions. A body is the long-form page somebody wrote; this is the two or
 * three sentences that set up the comparison directly under them. A page may
 * have either, both or neither.
 */
export type Involves = {
  heading?: string;
  paragraphs?: string[];
  options?: CompareOption[];
  footnote?: string;
};

/** One priced option. Bounds are numbers so the chart can be drawn from them. */
export type PriceItem = { name: string; low: number; high: number; note?: string; tone?: Tone };

/** The costs section, with the aside that names the cheapest good option. */
export type Prices = {
  eyebrow?: string;
  heading?: string;
  lead?: string;
  unit?: string;
  /** Prefix on every figure. Absent means dollars, empty means no prefix. */
  currency?: string;
  /** Suffix on every figure, for an axis that is not money at all. */
  suffix?: string;
  items: PriceItem[];
  footnote?: string;
  aside?: { label?: string; heading: string; body: string; footnote?: string };
};

/** The one thing worth saying about this job that is not about booking it. */
export type Claim = { eyebrow?: string; heading: string; lead?: string; notes: string[] };

/** A way the job goes wrong, and the question that catches it. */
export type Pitfall = { title: string; body: string; ask?: string };

export type SubserviceDetail = {
  involves?: Involves;
  prices?: Prices;
  claim?: Claim;
  pitfalls?: Pitfall[];
};

/* ----------------------------------------------------------------- parsing */

const text = (value: unknown): string | undefined => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
};

const lines = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(text).filter((line): line is string => Boolean(line)) : [];

const tone = (value: unknown): Tone | undefined =>
  typeof value === "string" && value in TONES ? (value as Tone) : undefined;

/** A finite number, because Infinity and NaN both draw a bar off the chart. */
const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(record).filter((row): row is Record<string, unknown> => Boolean(row)) : [];

function readInvolves(value: unknown): Involves | undefined {
  const row = record(value);
  if (!row) return undefined;

  const options: CompareOption[] = list(row.options)
    .map((option) => ({
      name: text(option.name) ?? "",
      note: text(option.note),
      rows: list(option.rows)
        .map((entry) => ({
          label: text(entry.label) ?? "",
          value: text(entry.value) ?? "",
          tone: tone(entry.tone),
        }))
        .filter((entry) => entry.label && entry.value),
    }))
    // A comparison card with a name and nothing to compare is an empty box.
    .filter((option) => option.name && option.rows.length > 0);

  const involves: Involves = {
    heading: text(row.heading),
    paragraphs: lines(row.paragraphs),
    options: options.length > 0 ? options : undefined,
    footnote: text(row.footnote),
  };

  const anything = involves.heading || involves.paragraphs?.length || involves.options || involves.footnote;
  return anything ? involves : undefined;
}

function readPrices(value: unknown): Prices | undefined {
  const row = record(value);
  if (!row) return undefined;

  const items: PriceItem[] = list(row.items)
    .map((item) => {
      const low = num(item.low);
      const high = num(item.high);
      return {
        name: text(item.name) ?? "",
        low: low ?? 0,
        high: high ?? 0,
        note: text(item.note),
        tone: tone(item.tone),
        ok: Boolean(text(item.name)) && low !== undefined && high !== undefined && low >= 0 && high >= low,
      };
    })
    .filter((item) => item.ok)
    .map(({ ok: _ok, ...item }) => item);

  // A cost section is the chart. Without a priced row there is nothing to draw.
  if (items.length === 0) return undefined;

  const aside = record(row.aside);
  const asideHeading = text(aside?.heading);

  return {
    eyebrow: text(row.eyebrow),
    heading: text(row.heading),
    lead: text(row.lead),
    unit: text(row.unit),
    // An explicit empty string is a decision, not an omission: a percentage
    // axis has no prefix, and is not the same as a price nobody filled in.
    currency: typeof row.currency === "string" ? row.currency.trim() : "$",
    suffix: text(row.suffix),
    items,
    footnote: text(row.footnote),
    aside:
      aside && asideHeading
        ? {
            label: text(aside.label),
            heading: asideHeading,
            body: text(aside.body) ?? "",
            footnote: text(aside.footnote),
          }
        : undefined,
  };
}

function readClaim(value: unknown): Claim | undefined {
  const row = record(value);
  const heading = text(row?.heading);
  if (!row || !heading) return undefined;

  return { eyebrow: text(row.eyebrow), heading, lead: text(row.lead), notes: lines(row.notes) };
}

function readPitfalls(value: unknown): Pitfall[] | undefined {
  const rows = list(value)
    .map((row) => ({ title: text(row.title) ?? "", body: text(row.body) ?? "", ask: text(row.ask) }))
    .filter((row) => row.title && row.body);

  return rows.length > 0 ? rows : undefined;
}

/** Whatever of the four sections is actually there, or nothing at all. */
export function parseSubserviceDetail(value: string | null | undefined): SubserviceDetail {
  const stored = parseJson<unknown>(value, null);
  const row = record(stored);
  if (!row) return {};

  return {
    involves: readInvolves(row.involves),
    prices: readPrices(row.prices),
    claim: readClaim(row.claim),
    pitfalls: readPitfalls(row.pitfalls),
  };
}

/* ------------------------------------------------------------- the chart */

export type PriceBar = PriceItem & { left: string; width: string; range: string; fill: string };
export type PriceScale = { bars: PriceBar[]; ticks: string[] };

/**
 * The blues a set of bars is drawn in, darkening down the list.
 *
 * Two bars in the same blue are two bars a reader has to re-read the labels to
 * tell apart, which is the whole job of a chart undone. Taken from the ramp
 * rather than picked, so they stay in the family and a fifth option gets its
 * own shade instead of repeating the first.
 */
const SERIES = ["var(--blue-500)", "var(--blue-700)", "var(--blue-800)", "var(--blue-900)"];

/**
 * A step that a person would have chosen: 1, 2, 2.5 or 5 times a power of ten.
 *
 * Four divisions across the axis, so the ticks read 0, 5, 10, 15, 20 rather
 * than 0, 4.5, 9, 13.5, 18. Without this the axis under the bars is a set of
 * numbers nobody would write down.
 */
/** Decimal places an author actually wrote, capped so float noise cannot leak. */
function places(value: number): number {
  const dot = String(value).indexOf(".");
  return dot === -1 ? 0 : Math.min(String(value).length - dot - 1, 2);
}

function niceStep(rough: number): number {
  if (!(rough > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(rough));
  const scaled = rough / power;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return step * power;
}

/** Money as a reader writes it: no decimals unless the step needs them. */
function money(value: number, currency: string, suffix: string, decimals: number): string {
  // Grouped, because a trade whose unit is a whole job prints figures in the
  // tens of thousands and $36600 is not a number anybody reads at a glance.
  const [whole, fraction] = value.toFixed(decimals).split(".");
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency}${grouped}${fraction ? `.${fraction}` : ""}${suffix}`;
}

/**
 * Turns priced ranges into bars and an axis.
 *
 * The geometry is computed rather than stored, so an author writes 8 and 14
 * and never has to work out that this is 40% from the left and 30% wide. Add
 * a more expensive option later and every bar rescales on its own.
 */
export function priceScale(prices: Prices): PriceScale {
  const currency = prices.currency ?? "$";
  const suffix = prices.suffix ?? "";
  const highest = Math.max(...prices.items.map((item) => item.high));
  const step = niceStep(highest / 4);
  const max = step * 4;
  // Two precisions, because they answer different questions. The axis prints
  // its own step, so a $4 axis stays $0 $1 $2 $3 $4. A figure prints what was
  // written, so $0.95 a linear foot is not rounded away to $1.
  const tickDecimals = Number.isInteger(step) ? 0 : 1;
  const valueDecimals = Math.max(
    0,
    ...prices.items.flatMap((item) => [places(item.low), places(item.high)]),
  );

  const pct = (value: number) => `${((value / max) * 100).toFixed(2)}%`;

  // The gold bar is the one the aside is about, so it sits outside the blues
  // and does not take a place in their order.
  let series = 0;

  return {
    bars: prices.items.map((item) => ({
      ...item,
      fill: item.tone === "mixed" ? "var(--gold-ink)" : SERIES[series++ % SERIES.length]!,
      left: pct(item.low),
      // A single figure rather than a range still needs to be visible, so a
      // zero-width bar is drawn as a hairline instead of nothing.
      width: item.high > item.low ? pct(item.high - item.low) : "3px",
      range:
        item.high > item.low
          ? `${money(item.low, currency, suffix, valueDecimals)} to ${money(item.high, currency, suffix, valueDecimals)}`
          : money(item.low, currency, suffix, valueDecimals),
    })),
    ticks: [0, 1, 2, 3, 4].map((index) => money(step * index, currency, suffix, tickDecimals)),
  };
}
