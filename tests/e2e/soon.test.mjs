// "Coming soon" products: no price or order buttons, refused at checkout, and put on
// sale from the admin panel.
import { ADMIN_PASSWORD, BASE_URL as B, check, finish, launch } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const ctx = await b.newContext({ locale: "fr-FR" });
await ctx.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(B + "/fr/shop/mango-pack");
await p.waitForTimeout(700);
const column = await p.evaluate(() => {
  const h = [...document.querySelectorAll("main h1")].find((e) => e.offsetParent);
  const c = h.parentElement;
  return {
    pill: c.querySelector("span.bg-sun")?.textContent,
    price: /FCFA/.test(c.innerText),
    buttons: [...c.querySelectorAll("button")].filter((x) => !x.closest("form")).length,
  };
});
check(
  "coming-soon page shows badge, no price, no buttons",
  column.pill === "Bientôt disponible" && !column.price && column.buttons === 0,
  JSON.stringify(column),
);
check(
  "…and suggests the Mixed Fruit Pack to buy instead",
  (await p.locator("article h3:visible").first().innerText()) === "Mélange de fruits",
);
const lds = await p.locator('script[type="application/ld+json"]').allTextContents();
check(
  "coming-soon page publishes no Product data (no price)",
  !lds.some((t) => t.includes('"Product"')),
);
check(
  "coming-soon meta description says coming soon",
  /Bientôt disponible/.test(await p.locator('meta[name="description"]').getAttribute("content")),
);
// Tampered order for a coming-soon product
await p.goto(B + "/fr/shop/mixed-fruit-pack");
await p.waitForTimeout(500);
await p.getByRole("button", { name: "Ajouter au panier" }).first().click();
await p.waitForTimeout(300);
await p.goto(B + "/fr/checkout");
await p.waitForTimeout(700);
const f = p.locator("form:visible", { has: p.locator('input[name="phone"]') }).first();
await f.getByLabel("Nom complet").fill("Test");
await f.getByLabel("Numéro de téléphone").fill("677123456");
await f.getByLabel("Adresse de livraison").fill("Douala");
await f
  .locator('input[name="items"]')
  .evaluate((el) => (el.value = JSON.stringify([{ slug: "mango-pack", quantity: 1 }])));
await f.getByRole("button", { name: "Commander sur WhatsApp" }).click();
await p.waitForTimeout(1200);
const err = await p
  .locator("p.text-red-600:visible")
  .first()
  .innerText()
  .catch(() => "");
check(
  "tampered order for coming-soon product is refused",
  /pas encore disponible/.test(err) && !p.url().startsWith("https://wa.me"),
  err,
);
// Admin unticks "Coming soon" for mango
const a = await (await b.newContext({ locale: "en-GB" })).newPage();
await a.goto(B + "/admin");
await a.waitForTimeout(500);
await a.locator('input[name="password"]:visible').fill(ADMIN_PASSWORD);
await a.getByRole("button", { name: "Sign in" }).first().click();
await a.waitForTimeout(1000);
await a.goto(B + "/admin/products/mango-pack");
await a.waitForTimeout(800);
const form = a.locator("form:visible", { has: a.locator('input[name="price"]') }).first();
check("admin shows Coming soon ticked", await form.locator('input[name="comingSoon"]').isChecked());
await form.locator('input[name="comingSoon"]').uncheck();
await form.getByLabel("Price (FCFA)").fill("2800");
await form.getByRole("button", { name: "Save changes" }).click();
await a.getByText("Saved ✓").first().waitFor();
await p.goto(B + "/fr/shop");
await p.waitForTimeout(800);
check(
  "mango now in the shop with its price",
  (await p.getByRole("heading", { name: "Mangue" }).first().isVisible()) &&
    (await p.getByText("2 800 FCFA").first().isVisible()),
);
await p.goto(B + "/fr");
await p.waitForTimeout(800);
check(
  "home switches to product grid and hero shows 'from' price",
  (await p.getByText("Notre gamme").isVisible()) &&
    (await p
      .getByText(/À partir de 2.500.FCFA/)
      .first()
      .isVisible()),
);
check(
  "coming-soon section now lists 3 flavours",
  (await p.locator("#coming-soon-heading ~ ul > li").count()) === 3,
);
check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
