/** One published ranking, flattened for the archive's client-side filters. */
export type ArchiveRow = {
  id: string;
  href: string;
  title: string;
  summary: string;
  /** The trade's display name, e.g. "Roofing". */
  trade: string;
  /** The category slug, used as the filter key. */
  tradeKey: string;
  /** "Dallas, TX" */
  place: string;
  city: string;
  st: string;
  cityHref: string;
  country: string;
  /** Published companies on the list, shown in the number tile. */
  count: number;
  /** "Oct 2026" */
  updated: string;
  /** "2026-10", for grouping. */
  monthKey: string;
  /** "October 2026" */
  monthLabel: string;
};

export type ArchiveTrade = { key: string; name: string; short: string };
export type ArchiveCountry = { code: string; name: string };
