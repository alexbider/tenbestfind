// The favicon, the app icons and the card that shows when a page is shared.
//
// Drawn here rather than checked in as pasted binaries, because every one of
// them is the same three colours and the same wordmark the header already
// renders, and a brand asset that cannot be regenerated is one nobody dares
// change. Move a token in globals.css, run this, and the icons follow.
//
// The wordmark is Inter, loaded the same way every page loads it, so the card
// and the site are set in the same typeface rather than two that nearly match.
//
//   npx tsx scripts/build-brand-assets.ts
//
// It is excluded from tsconfig on purpose: it needs Playwright, which is not a
// dependency of the site, and production installs from package.json and would
// fail the whole build on an import it cannot resolve. Nothing on a deploy runs
// this; what it writes is committed. Type check it by hand after changing it:
//
//   npx tsc --noEmit scripts/build-brand-assets.ts
//
// Writes:
//   src/app/favicon.ico          16 and 32, what a browser tab reads
//   src/app/icon.png             512, what everything modern reads
//   src/app/apple-icon.png       180, the iOS home screen
//   public/social-card.png       1200x630, the Open Graph and Twitter card
//   public/icon-192.png          the web manifest
//   public/logo-512.png          the Organization logo in the schema graph,
//                                which needs a stable path rather than the
//                                hashed one Next gives a file-based icon
//   public/mark-light.png        the mark in the header, on a pale page
//   public/mark-dark.png         the mark in the footer, which is the same navy
//                                the tile is, so that one is drawn on blue

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

/* ------------------------------------------------------------- the palette */

// The same values globals.css and tokens/colors.css hold. Written out rather
// than parsed so this script has no opinion about how the CSS is organised.
const INK = "#101f3d"; // --ink, the navy everything sits on
const GOLD = "#e7b863"; // --gold-ink, reserved for the ranking numeral
const BLUE = "#4e8fe8"; // --blue-400, the lighter half of the wordmark on dark
const MUTED = "#8fa2c4"; // the tagline, dimmed enough to sit under the name

const FONT = "https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&display=swap";

/* --------------------------------------------------------------- the pages */

/** The share card: the full wordmark, centred, with room around it. */
const socialCard = `
<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONT}">
<style>
  html, body { margin: 0; padding: 0; }
  body {
    width: 1200px; height: 630px; background: ${INK};
    display: flex; align-items: center; justify-content: center;
    font-family: Inter, sans-serif; -webkit-font-smoothing: antialiased;
  }
  .name {
    font-size: 92px; font-weight: 800; letter-spacing: -0.045em;
    color: #ffffff; line-height: 1; white-space: nowrap;
  }
  .find { color: ${BLUE}; }
  /* A drawn circle rather than a full stop. Inter sets its period as a square
     at this weight, which reads as a stray pixel at card size. */
  .dot {
    display: inline-block; width: 19px; height: 19px; border-radius: 50%;
    background: ${GOLD}; margin-left: 20px; vertical-align: baseline;
  }
  .tag {
    display: flex; align-items: center; gap: 18px; margin-top: 26px;
    font-size: 23px; font-weight: 700; letter-spacing: 0.22em;
    text-transform: uppercase; color: ${MUTED};
  }
  .rule { display: block; width: 42px; height: 4px; background: ${GOLD}; }
</style></head><body>
  <div>
    <div class="name">TenBest<span class="find">Find</span><span class="dot"></span></div>
    <div class="tag"><span class="rule"></span>The best, verified</div>
  </div>
</body></html>`;

/**
 * The icon: "10." on a rounded navy tile.
 *
 * The tile is drawn at 512 and scaled down rather than drawn at each size,
 * because the corner radius and the numeral weight have to keep the same
 * proportions at 16 pixels as at 512, and rounding each separately does not.
 */
const tile = (background: string) => `
<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONT}">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body { width: 512px; height: 512px; }
  .tile {
    width: 512px; height: 512px; border-radius: 112px; background: ${background};
    display: flex; align-items: center; justify-content: center;
    font-family: Inter, sans-serif; -webkit-font-smoothing: antialiased;
  }
  .num {
    font-size: 268px; font-weight: 700; letter-spacing: -0.04em;
    color: #ffffff; line-height: 1;
  }
  .dot {
    display: inline-block; width: 52px; height: 52px; border-radius: 50%;
    background: ${GOLD}; margin-left: 18px; vertical-align: baseline;
  }
</style></head><body>
  <div class="tile"><span class="num">10<span class="dot"></span></span></div>
</body></html>`;

/** The tile as the icons use it: navy, for a pale page. */
const iconTile = tile(INK);

/**
 * The same tile for the footer, which is the navy the tile is.
 *
 * A navy mark on a navy panel is a mark nobody sees, so this one keeps the
 * gradient the footer already used and only the shape changes.
 */
const darkTile = tile("linear-gradient(135deg, #2D74D7, #1E3564)");

/* ----------------------------------------------------------------- the ico */

/**
 * An .ico wrapping PNGs.
 *
 * Every browser still in use reads PNG inside ICO, which means no bitmap
 * encoder and no palette decisions: the header points at the same PNG bytes
 * sharp produced. 0 in the width and height byte means 256.
 */
function ico(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries: Buffer[] = [];

  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2); // colours in palette: none, it is a PNG
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.png.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

/* ---------------------------------------------------------------- the work */

async function main(): Promise<void> {
  // The pinned build in this image does not always match the version the
  // installed Playwright looks for, so the binary is named when it is there.
  const bundled = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch(existsSync(bundled) ? { executablePath: bundled } : {});
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  const shoot = async (html: string, width: number, height: number): Promise<Buffer> => {
    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: "networkidle" });
    // Chromium reports the stylesheet loaded before the face is usable, and a
    // card set in the fallback is the whole reason to do this in a browser.
    await page.evaluate(() => document.fonts.ready);
    return page.screenshot({ omitBackground: true, type: "png" });
  };

  const card = await shoot(socialCard, 1200, 630);
  const tile = await shoot(iconTile, 512, 512);
  const dark = await shoot(darkTile, 512, 512);

  await browser.close();

  const root = process.cwd();
  mkdirSync(join(root, "public"), { recursive: true });

  const resize = (size: number) =>
    sharp(tile).resize(size, size, { fit: "cover" }).png({ compressionLevel: 9 }).toBuffer();

  const [icon512, icon192, apple180, ico32, ico16] = await Promise.all([
    resize(512),
    resize(192),
    // iOS puts its own rounding on top, so the tile is flattened onto the navy
    // rather than left transparent, which would otherwise show as white notches
    // in the corners.
    sharp(tile).resize(180, 180).flatten({ background: INK }).png().toBuffer(),
    resize(32),
    resize(16),
  ]);

  const written: [string, Buffer][] = [
    // 32 first: the directory is read in order, and the size Next declares on
    // the link tag comes from the first entry. Both are in there either way.
    ["src/app/favicon.ico", ico([{ size: 32, png: ico32 }, { size: 16, png: ico16 }])],
    ["src/app/icon.png", icon512],
    ["src/app/apple-icon.png", apple180],
    ["public/icon-192.png", icon192],
    ["public/logo-512.png", icon512],
    // 192 for a 42px mark, so it stays sharp on a three-times display.
    ["public/mark-light.png", await sharp(tile).resize(192, 192).png({ compressionLevel: 9 }).toBuffer()],
    ["public/mark-dark.png", await sharp(dark).resize(192, 192).png({ compressionLevel: 9 }).toBuffer()],
    ["public/social-card.png", await sharp(card).png({ compressionLevel: 9 }).toBuffer()],
  ];

  for (const [path, bytes] of written) {
    writeFileSync(join(root, path), bytes);
    console.log(`  wrote ${path.padEnd(24)} ${(bytes.length / 1024).toFixed(1)} kB`);
  }
}

main();
