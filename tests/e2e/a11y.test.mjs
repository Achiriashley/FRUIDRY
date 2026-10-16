// Accessibility and page metadata: focus outlines, announcements, labels, headings,
// link previews (og:image), robots.txt, and form errors linked to their fields.
import { BASE_URL as B, check, finish, launch } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const p = await (
  await b.newContext({ locale: "en-GB", viewport: { width: 390, height: 844 } })
).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
// Focus outline on Add to cart
await p.goto(B + "/en/shop/mixed-fruit-pack");
await p.waitForTimeout(700);
const btn = p.locator("button:visible", { hasText: "Add to cart" }).first();
await btn.focus();
await p.keyboard.press("Shift+Tab");
await p.keyboard.press("Tab");
await p.waitForTimeout(400);
const outline = await btn.evaluate((el) => {
  const s = getComputedStyle(el);
  return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} ${s.outlineOffset}`;
});
check(
  "Add to cart has a visible focus outline",
  /solid 2px rgb\(7, 42, 25\) 2px/.test(outline),
  outline,
);
const scrollPad = await p.evaluate(
  () => getComputedStyle(document.documentElement).scrollPaddingTop,
);
check(
  "scroll padding keeps focused items below the sticky header",
  scrollPad === "112px",
  scrollPad,
);
// Add to cart announced
await btn.click();
await p.waitForTimeout(200);
check(
  "adding to cart is announced",
  (await p
    .locator('[role="status"]:visible, [role="status"].sr-only')
    .filter({ hasText: "Added to cart" })
    .count()) >= 1,
);
// Header: one labelled nav visible
const navs = await p.evaluate(() =>
  [...document.querySelectorAll("header nav")]
    .filter((n) => n.offsetParent)
    .map((n) => n.getAttribute("aria-label")),
);
check("one labelled main menu", navs.length === 1 && navs[0] === "Main menu", JSON.stringify(navs));
const sw = await p.locator("header a[hreflang]").first().getAttribute("aria-label");
check("language switch name starts with its visible text", sw.startsWith("FR – "), sw);
// Logo is served small
const logoSrc = await p
  .locator("header img")
  .first()
  .evaluate((i) => i.currentSrc);
check(
  "header logo served small (not the 1107px original)",
  /w=(128|256|384)&/.test(logoSrc),
  logoSrc.split("?")[1],
);
// og:image on all pages
for (const path of [
  "/en/shop",
  "/fr/about",
  "/en/contact",
  "/fr/privacy",
  "/en",
  "/fr/shop/mango-pack",
]) {
  const html = await (await fetch(B + path)).text();
  const og = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  check(`og:image on ${path}`, Boolean(og) && /opengraph-image/.test(og), og);
}
// robots
const robots = await (await fetch(B + "/robots.txt")).text();
check(
  "robots.txt no longer blocks cart/checkout",
  !/cart|checkout/.test(robots) && /Disallow: \/admin/.test(robots),
);
// Coming-soon card alt
await p.goto(B + "/en");
await p.waitForTimeout(900);
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(800);
const alts = await p
  .locator("#coming-soon-heading ~ ul img")
  .evaluateAll((imgs) => imgs.map((i) => i.alt));
check(
  "coming-soon photos have empty alt (name is next to them)",
  alts.length === 4 && alts.every((a) => a === ""),
  JSON.stringify(alts),
);
// Shop heading order
await p.goto(B + "/en/shop");
await p.waitForTimeout(700);
const levels = await p.evaluate(() =>
  [...document.querySelectorAll("main h1, main h2, main h3")]
    .filter((h) => h.offsetParent || h.classList.contains("sr-only"))
    .map((h) => h.tagName),
);
check(
  "shop headings don't skip a level",
  levels[0] === "H1" && levels[1] === "H2" && levels[2] === "H3",
  levels.slice(0, 4).join(","),
);
// Checkout errors linked + focus
await p.goto(B + "/en/shop/mixed-fruit-pack");
await p.waitForTimeout(500);
await p.locator("button:visible", { hasText: "Add to cart" }).first().click();
await p.goto(B + "/en/checkout");
await p.waitForTimeout(900);
const f = p.locator("form:visible", { has: p.locator('input[name="phone"]') }).first();
await f.getByLabel("Full name").fill("Ann");
await f.getByRole("button", { name: "Order on WhatsApp" }).click();
await p.waitForTimeout(1200);
const focused = await p.evaluate(() => ({
  name: document.activeElement?.name,
  invalid: document.activeElement?.getAttribute("aria-invalid"),
  describedBy: document.getElementById(
    document.activeElement?.getAttribute("aria-describedby") ?? "",
  )?.textContent,
}));
check(
  "checkout: focus moves to first invalid field, linked to its error",
  focused.name === "phone" &&
    focused.invalid === "true" &&
    /Cameroon mobile number/.test(focused.describedBy ?? ""),
  JSON.stringify(focused),
);
const ph = await f
  .locator('input[name="phone"]')
  .evaluate((el) => getComputedStyle(el, "::placeholder").color);
check(
  "placeholder text is darker (stone-500)",
  /^lab\(48\.1/.test(ph) || /0\.553 0\.013/.test(ph) || /121, 113, 107/.test(ph),
  ph,
);
// Contact errors
await p.goto(B + "/en/contact");
await p.waitForTimeout(700);
const cf = p.locator("form:visible", { has: p.locator('textarea[name="message"]') }).first();
await cf.getByLabel("Name").fill("Ann");
await cf.getByRole("button", { name: "Send on WhatsApp" }).click();
await p.waitForTimeout(1200);
const cfocused = await p.evaluate(() => ({
  name: document.activeElement?.name,
  describedBy: document.getElementById(
    document.activeElement?.getAttribute("aria-describedby") ?? "",
  )?.textContent,
}));
check(
  "contact: focus moves to the message field with its error",
  cfocused.name === "message" && /at least 10/.test(cfocused.describedBy ?? ""),
  JSON.stringify(cfocused),
);
// Cart remove label + live quantity
await p.goto(B + "/en/cart");
await p.waitForTimeout(800);
check(
  "cart Remove button names the product",
  (await p.getByRole("button", { name: "Remove Mixed Fruit Pack from the cart" }).count()) >= 1,
);
check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
