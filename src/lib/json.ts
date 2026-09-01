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
