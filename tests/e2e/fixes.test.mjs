// Assorted fixes: related products, link-preview images, the contact form opening
// WhatsApp once, the sold-out hero, and the header on small phones.
import { ADMIN_PASSWORD, BASE_URL as B, check, finish, launch } from "./lib.mjs";

const b = await launch({ adminHarness: true });

// 1. Related products on a coming-soon page start with the product on sale
const ctx = await b.newContext({ locale: "en-GB" });
let waOpens = 0;
await ctx.route("https://wa.me/**", (r) => {
  waOpens++;
  r.fulfill({ status: 200, body: "wa" });
});
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(B + "/en/shop/mango-pack");
await p.waitForTimeout(700);
const related = await p
  .locator("section:has(h2:text('You might also like')) article h3:visible")
  .allInnerTexts();
check(
  "mango page suggests the Mixed Fruit Pack first",
  related[0] === "Mixed Fruit Pack",
  related.join(", "),
);
const column = await p.evaluate(() => {
  const h = [...document.querySelectorAll("main h1")].find((e) => e.offsetParent);
  return {
    pill: h.parentElement.querySelector("span.bg-sun")?.textContent,
    buttons: [...h.parentElement.querySelectorAll("button")].filter((x) => !x.closest("form"))
      .length,
  };
});
check(
  "coming-soon pill next to the title, no order buttons",
  column.pill === "Coming soon" && column.buttons === 0,
  JSON.stringify(column),
);

// 2. Link previews are JPEG and small enough for WhatsApp
for (const path of [
  "/fr/opengraph-image",
  "/en/shop/mixed-fruit-pack/opengraph-image",
  "/fr/shop/mango-pack/opengraph-image",
]) {
  const res = await fetch(B + path);
  const buf = Buffer.from(await res.arrayBuffer());
  check(
    `preview ${path} is a JPEG under 300 KB`,
    res.headers.get("content-type") === "image/jpeg" &&
      buf[0] === 0xff &&
      buf[1] === 0xd8 &&
      buf.length < 300_000,
    `${Math.round(buf.length / 1024)} KB, ${res.headers.get("content-type")}`,
  );
}
const html = await (await fetch(B + "/en/shop/mixed-fruit-pack")).text();
check("og:image type says image/jpeg", /og:image:type" content="image\/jpeg"/.test(html));

// 3. Contact form opens WhatsApp only once per message
await p.goto(B + "/en/contact");
await p.waitForTimeout(700);
const f = p.locator("form:visible", { has: p.locator('textarea[name="message"]') }).first();
await f.getByLabel("Name").fill("Test");
await f.getByLabel("Message").fill("Do you deliver to Kribi?");
const nav = p.waitForURL("https://wa.me/**", { timeout: 8000 });
await f.getByRole("button", { name: "Send on WhatsApp" }).click();
await nav;
check("WhatsApp opened once on send", waOpens === 1, `opens ${waOpens}`);
await p.goBack();
await p.waitForTimeout(900);
check(
  "coming back shows the reminder",
  await p
    .getByText("Your message is ready in WhatsApp")
    .first()
    .isVisible()
    .catch(() => false),
);
await p.getByRole("link", { name: "Shop" }).first().click();
await p.waitForTimeout(700);
await p.getByRole("link", { name: "Contact" }).first().click();
await p.waitForTimeout(1200);
check(
  "going Shop → Contact doesn't reopen WhatsApp",
  waOpens === 1 && p.url() === B + "/en/contact",
  `opens ${waOpens}, at ${p.url()}`,
);
check(
  "…and shows a fresh form",
  (await p.locator('form:visible textarea[name="message"]').count()) === 1 &&
    (await p.locator('form:visible input[name="name"]').inputValue()) === "",
);
await p.goBack();
await p.waitForTimeout(800);
await p.goForward();
await p.waitForTimeout(1200);
check("back/forward doesn't reopen WhatsApp", waOpens === 1, `opens ${waOpens}`);

// 4. Sold-out hero: no price or Order now
const a = await (await b.newContext({ locale: "en-GB" })).newPage();
await a.goto(B + "/admin");
await a.waitForTimeout(500);
await a.locator('input[name="password"]:visible').fill(ADMIN_PASSWORD);
await a.getByRole("button", { name: "Sign in" }).first().click();
await a.waitForTimeout(1000);
await a.goto(B + "/admin/products/mixed-fruit-pack");
await a.waitForTimeout(800);
const form = a.locator("form:visible", { has: a.locator('input[name="price"]') }).first();
await form.locator('input[name="inStock"]').uncheck();
await form.getByRole("button", { name: "Save changes" }).click();
await a.getByText("Saved ✓").first().waitFor();
await p.goto(B + "/en");
await p.waitForTimeout(800);
const hero = p.locator("section").first();
check(
  "sold-out: hero shows no price or Order now",
  !(await hero.getByText("2 500 FCFA").count()) &&
    !(await hero.getByRole("link", { name: "Order now" }).count()) &&
    (await hero.getByRole("link", { name: "Shop now" }).isVisible()) &&
    (await hero.locator("img").first().isVisible()),
);
await form.locator('input[name="inStock"]').check();
await form.getByRole("button", { name: "Save changes" }).click();
await a.getByText("Saved ✓").first().waitFor();

// 5. Small phones: header fits with items in the cart (French), badge on one line
const sp = await (
  await b.newContext({ locale: "fr-FR", viewport: { width: 320, height: 640 }, isMobile: true })
).newPage();
await sp.goto(B + "/fr/shop/mixed-fruit-pack");
await sp.waitForTimeout(600);
await sp.evaluate(() =>
  localStorage.setItem(
    "fruidry-cart",
    JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 12 }]),
  ),
);
await sp.goto(B + "/fr/shop");
await sp.waitForTimeout(900);
const overflow = await sp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("320px French header with 12 items fits", overflow <= 0, `overflow ${overflow}px`);
const badge = await sp
  .locator("#coming-soon-heading ~ ul span:text('Bientôt disponible')")
  .first()
  .boundingBox();
check(
  "coming-soon badge stays on one line at 320px",
  badge && badge.height < 30,
  `height ${badge?.height}`,
);
check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
