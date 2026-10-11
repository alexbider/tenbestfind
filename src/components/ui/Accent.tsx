import type { ReactNode } from "react";

/**
 * The italic serif accent the October 2026 design puts on one or two words of
 * most headings. It only changes the face: the words, their order and the
 * heading's text content stay exactly as written.
 */
export function Accent({ children }: { children: ReactNode }) {
  return <span className="serif-accent">{children}</span>;
}

/**
 * Sets `phrase` in the accent wherever it first appears in `text`. When the
 * phrase is missing or not found, the text comes back untouched.
 */
export function accent(text: string, phrase?: string | null): ReactNode {
  if (!phrase) return text;
  const at = text.indexOf(phrase);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <Accent>{phrase}</Accent>
      {text.slice(at + phrase.length)}
    </>
  );
}

/**
 * Sets the last `words` words of `text` in the accent: "Popular Home Service
 * Rankings" with 2 becomes "Popular Home <em>Service Rankings</em>".
 */
export function accentTail(text: string, words = 2): ReactNode {
  const parts = text.trim().split(/(\s+)/);
  const wordIdx = parts.map((p, i) => (/\S/.test(p) ? i : -1)).filter((i) => i >= 0);
  if (wordIdx.length <= words) return text;
  const cut = wordIdx[wordIdx.length - words];
  return (
    <>
      {parts.slice(0, cut).join("")}
      <Accent>{parts.slice(cut).join("")}</Accent>
    </>
  );
}

/**
 * Sets the first `words` words in the accent: "10 Best Roofing Companies"
 * with 2 becomes "<em>10 Best</em> Roofing Companies".
 */
export function accentHead(text: string, words = 2): ReactNode {
  const parts = text.trim().split(/(\s+)/);
  const wordIdx = parts.map((p, i) => (/\S/.test(p) ? i : -1)).filter((i) => i >= 0);
  if (wordIdx.length <= words) return text;
  const cut = wordIdx[words];
  return (
    <>
      <Accent>{parts.slice(0, cut).join("").trimEnd()}</Accent>{" "}
      {parts.slice(cut).join("")}
    </>
  );
}
