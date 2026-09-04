// SQLite has no array or JSON column type in this schema, so list-shaped and
// object-shaped fields are stored as JSON text. These helpers keep the parsing
// in one place and never throw on malformed data.

export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stringify(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value) && value.length === 0) return null;
  return JSON.stringify(value);
}

/**
 * A stored list of same-shaped rows, as the repeatable editors post them.
 * Every value comes back as a string so the editor can render it straight
 * into an input; anything that is not an object is dropped.
 */
export function parseRows(value: string | null | undefined): Record<string, string>[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object" && !Array.isArray(item))
      .map((item) =>
        Object.fromEntries(
          Object.entries(item as Record<string, unknown>).map(([key, val]) => [
            key,
            val === null || val === undefined ? "" : String(val),
          ]),
        ),
      );
  } catch {
    return [];
  }
}

/** One row of the at-a-glance facts panel, gathered under `group` on render. */
export type FactRow = {
  group: string;
  iconKey?: string;
  label: string;
  value: string;
};

/** One check behind a ranking position, listed under the rank mark. */
export type CriterionRow = {
  title: string;
  text: string;
};

export type LicensingRow = {
  trade: string;
  authority: string;
  licensed: boolean;
  note?: string;
};

export type ConditionRow = {
  title: string;
  body: string;
  iconKey?: string;
};

export type HoursRow = {
  day: string;
  opens?: string;
  closes?: string;
  closed?: boolean;
};

export type LinkRow = {
  label: string;
  url: string;
};

export type FieldChange = {
  field: string;
  current: string;
  requested: string;
  immediate?: boolean;
};

/**
 * A stored list of {title, body} notes. Anything that is not that shape is
 * dropped rather than half-rendered, so a bad write shows as a missing
 * section instead of an empty card.
 */
export function parseNotes(value: string | null | undefined): { title: string; body: string }[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.title === "string" && typeof item.body === "string")
      .map((item) => ({ title: item.title, body: item.body }));
  } catch {
    return [];
  }
}
