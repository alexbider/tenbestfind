// Post-processing for generated copy.
//
// Two separate jobs. Cleaning removes characters and marks that have no place
// in body text: zero-width characters, provenance markers, smart punctuation
// that betrays a paste. Auditing flags the phrasing habits that make writing
// read as machine-made, so the writer can be sent back for another pass.
//
// Worth being straight about the limit: this removes the tells a reader or a
// pattern-matcher would notice. No process can guarantee a given detector's
// verdict, and detectors are unreliable in both directions.

/** Zero-width and bidirectional control characters, plus the BOM. */
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\u206a-\u206f\ufeff\u00ad]/g;

/** Non-breaking and exotic spaces that survive a copy and paste. */
const ODD_SPACE = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g;

export function stripInvisible(text: string): string {
  return text.replace(INVISIBLE, "").replace(ODD_SPACE, " ");
}

/**
 * Normalises punctuation to what a person types. Em dashes go because they are
 * the single most recognisable tell in generated prose, and because the house
 * style does not use them.
 */
export function normalizePunctuation(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/[“”„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/…/g, "...")
    .replace(/ {2,}/g, " ")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function clean(text: string): string {
  return normalizePunctuation(stripInvisible(text));
}

/* -------------------------------------------------------------------- audit */

export type Tell = { id: string; label: string; hits: string[] };

// Phrases that read as filler in a local business listing. Some are fine in
// other registers; the point is that they cluster in generated copy.
const PHRASES: { id: string; label: string; pattern: RegExp }[] = [
  { id: "not-just", label: "Not just X but Y", pattern: /\bnot (just|only|merely)\b[^.?!]{0,80}\bbut\b/gi },
  { id: "in-todays", label: "In today's landscape", pattern: /\bin today'?s\s+\w+/gi },
  { id: "when-it-comes", label: "When it comes to", pattern: /\bwhen it comes to\b/gi },
  { id: "nestled", label: "Nestled or boasting", pattern: /\b(nestled|boasts?|boasting)\b/gi },
  { id: "testament", label: "A testament to", pattern: /\b(a|is a) testament to\b/gi },
  { id: "landscape", label: "Ever-evolving landscape", pattern: /\b(ever[- ]evolving|rapidly changing) (landscape|world|industry)\b/gi },
  { id: "delve", label: "Delve or navigate", pattern: /\b(delve|delves|delving|navigat(e|es|ing) the)\b/gi },
  { id: "seamless", label: "Seamless or cutting-edge", pattern: /\b(seamless(ly)?|cutting[- ]edge|state[- ]of[- ]the[- ]art|game[- ]chang(er|ing))\b/gi },
  { id: "unwavering", label: "Unwavering commitment", pattern: /\b(unwavering|steadfast|unparalleled|unmatched) (commitment|dedication|quality|service)\b/gi },
  { id: "elevate", label: "Elevate or unlock", pattern: /\b(elevate|unlock|harness|leverage|streamline) (your|the)\b/gi },
  { id: "whether-you", label: "Whether you are X or Y", pattern: /\bwhether you'?re\b[^.?!]{0,60}\bor\b/gi },
  { id: "look-no-further", label: "Look no further", pattern: /\blook no further\b/gi },
  { id: "peace-of-mind", label: "Peace of mind", pattern: /\bpeace of mind\b/gi },
  { id: "trusted-name", label: "Trusted name in", pattern: /\b(trusted|leading|premier|go[- ]to) (name|choice|provider|destination) (in|for)\b/gi },
  { id: "moreover", label: "Moreover or furthermore", pattern: /\b(moreover|furthermore|additionally|in conclusion|to sum up)\b/gi },
  { id: "ensure-that", label: "Ensuring that", pattern: /\bensur(ing|es) that\b/gi },
  { id: "plays-a-role", label: "Plays a vital role", pattern: /\bplays? an? (vital|crucial|key|pivotal|significant) role\b/gi },
];

/** Three short clauses in a row, the rhythm that gives generated copy away. */
function ruleOfThree(text: string): string[] {
  const hits: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const parts = sentence.split(/,\s+/);
    if (parts.length === 3 && parts.every((part) => part.split(/\s+/).length <= 4 && part.length > 3)) {
      hits.push(sentence.trim().slice(0, 90));
    }
  }
  return hits;
}

export function auditTells(text: string): Tell[] {
  const tells: Tell[] = [];

  for (const phrase of PHRASES) {
    const hits = [...text.matchAll(phrase.pattern)].map((match) => match[0]);
    if (hits.length > 0) tells.push({ id: phrase.id, label: phrase.label, hits: [...new Set(hits)].slice(0, 5) });
  }

  const dashes = [...text.matchAll(/[—–]/g)];
  if (dashes.length > 0) tells.push({ id: "em-dash", label: "Em or en dash", hits: ["—"] });

  const invisible = [...text.matchAll(INVISIBLE)];
  if (invisible.length > 0) {
    tells.push({
      id: "invisible",
      label: "Invisible characters",
      hits: [...new Set(invisible.map((match) => `U+${match[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`))],
    });
  }

  const triples = ruleOfThree(text);
  if (triples.length >= 2) tells.push({ id: "rule-of-three", label: "Three-part list rhythm", hits: triples.slice(0, 3) });

  return tells;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Repeats across a batch are the other giveaway: every listing sounding alike. */
export function openingFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join(" ");
}
