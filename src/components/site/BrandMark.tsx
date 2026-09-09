// The mark, in one place.
//
// It was drawn inline twice, once in the header and once in the footer, as two
// copies of the same forty-line SVG that had already drifted apart in their
// gradients. Worse, neither was the mark: they were an abstract outline of a
// one and a nought with a tick through it, from before the brand had a "10."
//
// So both call this, and this reads the same file the favicon is cut from,
// which is what stops the tab icon and the header from being two similar
// pictures of the same idea.

const SIZE = { header: 42, footer: 44 } as const;

/**
 * Two tones, because the footer is the navy the tile is.
 *
 * A navy mark on a navy panel is a mark nobody sees, so the dark one keeps the
 * blue the footer already used. Same shape, same numerals, same gold dot.
 */
export function BrandMark({ tone = "light" }: { tone?: "light" | "dark" }) {
  const size = tone === "dark" ? SIZE.footer : SIZE.header;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed-size mark in
    // the chrome of every page: the loader would add a request and a query
    // string to a file that is already the right size and already cached.
    <img
      src={tone === "dark" ? "/mark-dark.png" : "/mark-light.png"}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      decoding="async"
      data-mark=""
      style={{
        display: "block",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "13px",
        flexShrink: 0,
        boxShadow:
          tone === "dark"
            ? "inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 20px -10px rgba(0,0,0,0.6)"
            : "0 6px 16px -8px rgba(16,31,61,0.55)",
      }}
    />
  );
}
