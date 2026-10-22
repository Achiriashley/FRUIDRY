// "Ask for payment on WhatsApp" on new orders: the MTN Mobile Money code with the exact
// amount, in the customer's language; paid orders get the plain message instead.
import { BASE_URL as B, adminHarness, check, finish, launch, nowS, signToken } from "./lib.mjs";

const b = await launch();
const order = async (lang, name, qty) => {
  const pg = await (await b.newContext({ locale: lang === "fr" ? "fr-FR" : "en-GB" })).newPage();
  await pg.context().route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
  await pg.goto(`${B}/${lang}/shop/mixed-fruit-pack`);
  await pg.waitForTimeout(400);
  await pg.evaluate(
    (q) =>
      localStorage.setItem(
        "fruidry-cart",
        JSON.stringify([{ slug: "mixed-fruit-pack", quantity: q }]),
      ),
    qty,
  );
  await pg.goto(`${B}/${lang}/checkout`);
  await pg.waitForTimeout(700);
  const f = pg.locator("form:visible", { has: pg.locator('input[name="phone"]') }).first();
  await f.locator('input[name="name"]').fill(name);
  await f.locator('input[name="phone"]').fill("677123456");
  await f.locator('textarea[name="address"], input[name="address"]').first().fill("Douala");
  const nav = pg.waitForURL("https://wa.me/**", { timeout: 6000 }).catch(() => {});
  await f.locator('button[type="submit"]').first().click();
  await nav;
  await pg.context().close();
};
await order("en", "Momo English", 2);
await order("fr", "Momo Français", 3);
const c = await b.newContext({ locale: "en-GB" });
await adminHarness(c);
const t = nowS();
await c.addCookies([{ name: "fruidry_admin", value: signToken(t), url: B }]);
const a = await c.newPage();
await a.goto(B + "/admin/orders");
await a.waitForTimeout(1200);
const textFor = async (who, label) => {
  const card = a.locator("article", { hasText: who }).first();
  const href = await card
    .getByRole("link", { name: label })
    .first()
    .getAttribute("href")
    .catch(() => null);
  return href ? decodeURIComponent(new URL(href).searchParams.get("text")) : null;
};
const en = await textFor("Momo English", "Ask for payment on WhatsApp");
const fr = await textFor("Momo Français", "Ask for payment on WhatsApp");
check("new order button asks for payment", Boolean(en && fr));
check(
  "English message has the code with the exact amount, in monospace",
  Boolean(en?.includes("```*126*16*747434*5000#```") && /Amount to pay: \*5\s000\sFCFA\*/.test(en)),
  JSON.stringify(en),
);
check(
  "French message is in French with its own amount",
  Boolean(
    fr?.includes("```*126*16*747434*7500#```") &&
    fr.includes("Montant à payer") &&
    fr.includes("Momo Français"),
  ),
  JSON.stringify(fr),
);
check(
  "each message has its order number in bold",
  /\*FD-[A-Z0-9]{6}\*/.test(en ?? "") && /\*FD-[A-Z0-9]{6}\*/.test(fr ?? ""),
);
// After Mark as paid, the button goes back to a plain message and the receipt button appears
await a
  .locator("article", { hasText: "Momo English" })
  .first()
  .getByRole("button", { name: "Mark as paid" })
  .click();
await a.getByRole("button", { name: "Yes, mark as paid" }).click();
await a.waitForTimeout(2000);
await a.getByRole("link", { name: /^All/ }).first().click();
await a.waitForTimeout(1200);
const after = await textFor("Momo English", "Message on WhatsApp");
check(
  "a paid order gets the plain message instead",
  Boolean(after) && !after.includes("126*16"),
  after ?? "no link",
);
finish();
await b.close();
