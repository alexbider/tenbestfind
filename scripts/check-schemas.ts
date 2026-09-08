// Every schema this codebase asks a model to fill, measured before it is sent.
//
// Structured output compiles the schema into a grammar, and a bounded array is
// not a note about length: `maxItems: 70` is seventy copies of the items. Nest
// a couple of those and the grammar stops compiling, which the API reports as a
// 400 at the moment of the call, after whatever the call was going to use has
// already been paid for. This prints the sizes so the number is visible rather
// than discovered.
//
// Guides are not in this list any more. They are written by Claude over MCP,
// where the shape is a tool argument rather than a compiled grammar, which is
// the failure this check was written for happening once and then being
// designed out.

import { assertJsonSchema, grammarSize } from "../src/lib/anthropic";
import { planJsonSchema } from "../src/lib/topic-planner";
import { listingJsonSchema } from "../src/lib/listing-writer";
import { extractionJsonSchema } from "../src/lib/site-extract";

// The two numbers this ceiling is calibrated against, both observed against the
// real API: a schema of about 5,600 compiled and ran, and one of about 16,400
// was refused with "the compiled grammar is too large".
const CEILING = 2_000;

const SCHEMAS: [string, unknown][] = [
  ["topic planner", planJsonSchema],
  ["listing writer", listingJsonSchema],
  ["site extractor", extractionJsonSchema],
];

let failures = 0;
for (const [name, schema] of SCHEMAS) {
  const size = grammarSize(schema);
  let malformed: string | null = null;
  try {
    assertJsonSchema(schema);
  } catch (error) {
    malformed = error instanceof Error ? error.message : String(error);
  }

  const ok = size <= CEILING && malformed === null;
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok   " : "TOO BIG"} ${name.padEnd(16)} ${size.toLocaleString().padStart(7)}`);
  if (malformed) console.log(`        ${malformed}`);
  if (size > CEILING) {
    console.log(`        over the ${CEILING.toLocaleString()} ceiling. Look for a maxItems on an array of objects.`);
  }
}

console.log(failures === 0 ? "\nall good" : `\n${failures} over the line`);
process.exit(failures === 0 ? 0 : 1);
