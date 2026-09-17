/**
 * What must never reach a JSON-LD graph.
 *
 * Structured data is read by machines that take it literally, so a leftover
 * example.com in a sameAs is a statement that the company is at example.com,
 * and an aggregateRating with no reviews behind it is the one piece of markup
 * that reliably gets a site penalised rather than ignored.
 *
 * These run in two places: the tests, against the graphs the templates build,
 * and the build guard, against every published page. Both use the same rules
 * so neither can drift into passing something the other rejects.
 */

export type SchemaProblem = { path: string; problem: string };

const PLACEHOLDER_TEXT = /\b(lorem|ipsum|todo|tbd|placeholder|coming soon|xxx)\b/i;
const PLACEHOLDER_HOST = /(^|\/\/|\.)(example\.(com|org|net)|localhost|test|invalid)(\/|:|$)/i;

/**
 * The site's own origin, which is http://localhost:3000 in development and in
 * CI. Every absolute URL we generate starts with it, so the host check has to
 * skip it or the guard fails on its own output everywhere except production,
 * which is the one place it would never get a chance to run.
 */
function selfOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || "http://localhost:3000").replace(/\/$/, "");
}

/** The same string with our own origin taken off the front, if it is there. */
function withoutSelf(value: string, origin: string): string {
  return origin && value.startsWith(origin) ? value.slice(origin.length) : value;
}

/** The string "null" or "undefined", which is a bug that rendered rather than a value. */
const NULL_STRING = /^\s*(null|undefined|nan|\[object object\])\s*$/i;

function walk(node: unknown, path: string, found: SchemaProblem[], origin: string): void {
  if (node === null || node === undefined) {
    found.push({ path, problem: "a null reached the graph rather than being left out" });
    return;
  }

  if (typeof node === "string") {
    if (NULL_STRING.test(node)) found.push({ path, problem: `the string "${node}"` });
    if (PLACEHOLDER_TEXT.test(node)) found.push({ path, problem: `placeholder text: "${node.slice(0, 60)}"` });
    if (PLACEHOLDER_HOST.test(withoutSelf(node, origin))) {
      found.push({ path, problem: `a reserved domain: "${node}"` });
    }
    return;
  }

  if (Array.isArray(node)) {
    if (node.length === 0) {
      found.push({ path, problem: "an empty array, which claims the answer is nothing" });
    }
    node.forEach((item, index) => walk(item, `${path}[${index}]`, found, origin));
    return;
  }

  if (typeof node === "object") {
    const row = node as Record<string, unknown>;

    // A rating nobody has rated. Both halves have to be real.
    if (row["@type"] === "AggregateRating") {
      const count = Number(row.reviewCount ?? row.ratingCount ?? 0);
      const value = Number(row.ratingValue ?? 0);
      if (!(count > 0)) {
        found.push({ path, problem: "aggregateRating with no reviews behind it" });
      }
      if (!(value > 0)) {
        found.push({ path, problem: "aggregateRating with no rating value" });
      }
    }

    for (const [key, value] of Object.entries(row)) {
      walk(value, path ? `${path}.${key}` : key, found, origin);
    }
  }
}

/** Everything wrong with one graph, or an empty list when it is clean. */
export function auditSchema(graph: unknown, label = "graph"): SchemaProblem[] {
  const found: SchemaProblem[] = [];
  walk(graph, label, found, selfOrigin());
  return found;
}

/** Throws with every problem named, for the tests and the build guard. */
export function assertSchemaClean(graph: unknown, label = "graph"): void {
  const problems = auditSchema(graph, label);
  if (problems.length === 0) return;
  throw new Error(
    `${problems.length} problem${problems.length === 1 ? "" : "s"} in ${label}:\n` +
      problems.map((row) => `  ${row.path}: ${row.problem}`).join("\n"),
  );
}
