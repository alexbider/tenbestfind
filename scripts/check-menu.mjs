// The header menus, driven the way a hand drives them.
//
// Three things went wrong here and none of them show up in a build, a type
// check or the rendered HTML: the panels opened behind the page, the mobile
// drawer was squashed into the header, and the trip from a nav link down to
// its panel crossed a gap where the menu closed. All three need a real
// browser, a real pointer and real geometry, so this drives Chromium.
//
// Not part of the deploy: it needs a browser and a running site.
//
//   npm run build && PORT=3234 npm run start &
//   node scripts/check-menu.mjs http://127.0.0.1:3234

import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const executablePath = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok   " : "WRONG"} ${label}${detail ? `: ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath });

/* ------------------------------------------------------------- desktop */

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base, { waitUntil: "networkidle" });
const visibility = (handle) => handle.evaluate((el) => getComputedStyle(el).visibility);

console.log("desktop menus:");
const count = (await page.$$("[data-mega]")).length;
check("the header has its mega menus", count > 0, `${count} found`);

for (let index = 0; index < count; index += 1) {
  const mega = (await page.$$("[data-mega]"))[index];
  const link = await mega.$("[data-navlink]");
  const panel = await mega.$("[data-panel]");
  const label = (await link.innerText()).trim().split("\n")[0];

  await page.mouse.move(20, 500);
  await page.waitForTimeout(300);

  const lb = await link.boundingBox();
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2, { steps: 5 });
  await page.waitForTimeout(320);
  check(`${label} opens on hover`, (await visibility(panel)) === "visible");

  // An item in the body of the panel, which is where people are heading.
  // Reaching the link tucked in the panel's top corner means passing over the
  // next trigger along, and opening that menu instead is correct.
  const item = (await panel.$("[data-mitem]")) ?? (await panel.$("a"));
  const ib = await item.boundingBox();
  await page.mouse.move(ib.x + ib.width / 2, ib.y + ib.height / 2, { steps: 25 });
  await page.waitForTimeout(320);
  check(`${label} stays open on the way to an item`, (await visibility(panel)) === "visible");

  const reachable = await page.evaluate(
    ([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest("[data-panel]")),
    [ib.x + ib.width / 2, ib.y + ib.height / 2],
  );
  check(`${label} items are clickable, not behind the page`, reachable);
}

await page.mouse.move(700, 750, { steps: 15 });
await page.waitForTimeout(400);
check("moving away closes the menu", (await visibility(await page.$("[data-mega] [data-panel]"))) === "hidden");

/* -------------------------------------------------------------- mobile */

console.log("\nmobile drawer:");
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await phone.goto(base, { waitUntil: "networkidle" });

const drawer = await phone.$("[data-mobile-nav]");
await (await drawer.$("summary")).click();
await phone.waitForTimeout(400);
check("opens on tap", await drawer.evaluate((el) => el.hasAttribute("open")));

const shape = await phone.evaluate(() => {
  const panel = document.querySelector("[data-mobile-nav] nav");
  const acc = document.querySelector("[data-macc]");
  const rect = acc.getBoundingClientRect();
  return {
    height: Math.round(panel.getBoundingClientRect().height),
    viewport: window.innerHeight,
    reachable: Boolean(document.elementFromPoint(rect.x + rect.width / 2, rect.y + 20)?.closest("[data-mobile-nav]")),
  };
});
check(
  "covers the screen rather than being trapped in the header",
  shape.height > shape.viewport * 0.6,
  `${shape.height}px of ${shape.viewport}px`,
);
check("its sub-menus are reachable, not behind the page", shape.reachable);

const accordion = (await phone.$$("[data-macc]"))[0];
await (await accordion.$("summary")).click();
await phone.waitForTimeout(300);
check("a sub-menu opens on tap", await accordion.evaluate((el) => el.hasAttribute("open")));

await browser.close();
console.log(failures === 0 ? "\nall good" : `\n${failures} wrong`);
process.exit(failures === 0 ? 0 : 1);
