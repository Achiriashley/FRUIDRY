// Stock counts: validation, orders can't exceed what's left, confirming payment takes
// packs off (once), selling out everywhere, restocking, and the French message.
import { ADMIN_PASSWORD, BASE_URL as B, check, finish, launch } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const errs = [];
const admin = await (await b.newContext({ locale: "en-GB" })).newPage();
admin.on("pageerror", (e) => errs.push("admin " + e.message));
await admin.goto(B + "/admin");
await admin.waitForTimeout(500);
await admin.locator('input[name="password"]:visible').fill(ADMIN_PASSWORD);
await admin.getByRole("button", { name: "Sign in" }).first().click();
await admin.waitForTimeout(1000);
const form = () =>
  admin.locator("form:visible", { has: admin.locator('input[name="price"]') }).first();
async function setStock(stock, lowAt) {
  await admin.goto(B + "/admin/products/mixed-fruit-pack");
  await admin.waitForTimeout(800);
  await form().getByLabel("Packs in stock").fill(String(stock));
  if (lowAt !== undefined)
    await form().getByLabel("Warn me when stock falls to").fill(String(lowAt));
  await form().getByRole("button", { name: "Save changes" }).click();
  await admin.getByText("Saved ✓").first().waitFor();
}
// Validation
await admin.goto(B + "/admin/products/mixed-fruit-pack");
await admin.waitForTimeout(800);
check(
  "stock field empty by default (not counted)",
  (await form().getByLabel("Packs in stock").inputValue()) === "" &&
    (await form().getByLabel("Warn me when stock falls to").inputValue()) === "10",
);
await form().getByLabel("Packs in stock").fill("-3");
await form().getByLabel("Warn me when stock falls to").fill("2.5");
await form().getByRole("button", { name: "Save changes" }).click();
await admin.waitForTimeout(1200);
check(
  "invalid numbers are refused",
  (await admin
    .getByText("Enter a whole number of packs, e.g. 40, or leave it empty.")
    .first()
    .isVisible()) &&
    (await admin.getByText("Enter a whole number of packs, e.g. 10.").first().isVisible()),
);
await setStock(12, 10);
await admin.goto(B + "/admin/products");
await admin.waitForTimeout(700);
check(
  "product list shows the count",
  await admin.getByText("In stock · 12 left").first().isVisible(),
);

// Customer orders 3 packs
const ctx = await b.newContext({ locale: "en-GB" });
await ctx.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
const c = await ctx.newPage();
c.on("pageerror", (e) => errs.push("shop " + e.message));
async function order(qty) {
  await c.goto(B + "/en/shop/mixed-fruit-pack");
  await c.waitForTimeout(600);
  await c.evaluate(
    (q) =>
      localStorage.setItem(
        "fruidry-cart",
        JSON.stringify([{ slug: "mixed-fruit-pack", quantity: q }]),
      ),
    qty,
  );
  await c.goto(B + "/en/checkout");
  await c.waitForTimeout(900);
  const f = c.locator("form:visible", { has: c.locator('input[name="phone"]') }).first();
  await f.getByLabel("Full name").fill("Stock Test");
  await f.getByLabel("Phone number").fill("677123456");
  await f.getByLabel("Delivery address").fill("Douala");
  const nav = c
    .waitForURL("https://wa.me/**", { timeout: 6000 })
    .then(() => "sent")
    .catch(() => "not sent");
  await f.getByRole("button", { name: "Order on WhatsApp" }).click();
  const outcome = await nav;
  return {
    outcome,
    err:
      outcome === "sent"
        ? ""
        : await c
            .locator("p.text-red-600:visible")
            .first()
            .innerText()
            .catch(() => ""),
  };
}
const tooMany = await order(13);
check(
  "can't order more than is left",
  tooMany.outcome === "not sent" &&
    /only 12 packs of "Mixed Fruit Pack" are left/.test(tooMany.err),
  tooMany.err,
);
const ok = await order(3);
check("order of 3 goes through", ok.outcome === "sent");

// Placing an order doesn't change stock; confirming payment does
await admin.goto(B + "/admin/products");
await admin.waitForTimeout(700);
check(
  "unpaid order leaves stock alone",
  await admin.getByText("In stock · 12 left").first().isVisible(),
);
await admin.goto(B + "/admin/orders");
await admin.waitForTimeout(900);
await admin.getByRole("button", { name: "Mark as paid" }).first().click();
await admin.getByRole("button", { name: "Yes, mark as paid" }).click();
await admin.waitForTimeout(1500);
await admin.goto(B + "/admin/products");
await admin.waitForTimeout(700);
check(
  "confirming payment takes 3 off (9 left, running low)",
  await admin.getByText("Running low · 9 left").first().isVisible(),
);
await admin.goto(B + "/admin");
await admin.waitForTimeout(900);
check(
  "dashboard shows Running low",
  (await admin.getByRole("heading", { name: "Running low" }).isVisible()) &&
    (await admin.getByText("9 left").first().isVisible()),
);
// Confirming the same order again (double click / stale page) must not subtract twice
await admin.goto(B + "/admin/orders");
await admin.waitForTimeout(800);
const again = await admin.getByRole("button", { name: "Mark as paid" }).count();
check("paid order can't be confirmed again", again === 0);

// Sell out: set stock to 2, order 2, confirm → 0 → sold out everywhere
await setStock(2);
const last = await order(2);
check("order the last 2", last.outcome === "sent");
await admin.goto(B + "/admin/orders");
await admin.waitForTimeout(900);
await admin.getByRole("button", { name: "Mark as paid" }).first().click();
await admin.getByRole("button", { name: "Yes, mark as paid" }).click();
await admin.waitForTimeout(1500);
await admin.goto(B + "/admin/products");
await admin.waitForTimeout(700);
check(
  "stock 0 → Sold out in admin",
  await admin.getByText("Sold out · 0 left").first().isVisible(),
);
await c.goto(B + "/en/shop/mixed-fruit-pack");
await c.waitForTimeout(900);
check(
  "product page shows Sold out, no buttons",
  (await c.getByText("Sold out").first().isVisible()) &&
    !(await c
      .locator("main h1:visible")
      .locator("..")
      .getByRole("button", { name: "Add to cart" })
      .count()),
);
const ld = (await c.locator('script[type="application/ld+json"]').allTextContents()).join("");
check("Google data says OutOfStock", ld.includes("OutOfStock"));
await c.goto(B + "/en");
await c.waitForTimeout(800);
check(
  "hero: no Order now when sold out",
  !(await c.locator("section").first().getByRole("link", { name: "Order now" }).count()),
);
const blocked = await order(1);
check(
  "checkout refuses a sold-out product",
  blocked.outcome === "not sent" && /sold out/.test(blocked.err),
  blocked.err,
);
// Restock
await setStock(40);
await c.goto(B + "/en/shop/mixed-fruit-pack");
await c.waitForTimeout(900);
check(
  "restocking to 40 puts it back on sale",
  await c.getByRole("button", { name: "Add to cart" }).first().isVisible(),
);
// French message
const fr = await (await b.newContext({ locale: "fr-FR" })).newPage();
await fr.goto(B + "/fr/shop/mixed-fruit-pack");
await fr.waitForTimeout(500);
await fr.evaluate(() =>
  localStorage.setItem(
    "fruidry-cart",
    JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 41 }]),
  ),
);
await fr.goto(B + "/fr/checkout");
await fr.waitForTimeout(900);
const ff = fr.locator("form:visible", { has: fr.locator('input[name="phone"]') }).first();
await ff.getByLabel("Nom complet").fill("Test");
await ff.getByLabel("Numéro de téléphone").fill("677123456");
await ff.getByLabel("Adresse de livraison").fill("Douala");
await ff.getByRole("button", { name: "Commander sur WhatsApp" }).click();
await fr.waitForTimeout(1200);
const frErr = await fr
  .locator("p.text-red-600:visible")
  .first()
  .innerText()
  .catch(() => "");
check(
  "French 'only N left' message",
  /il ne reste que 40 sachets de « Mélange de fruits »/.test(frErr.replace(/[  ]/g, " ")),
  frErr,
);
check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
