// French and English: a French visitor's whole order in French, switching language,
// old links without a language, and French product fields in the admin panel.
import { ADMIN_PASSWORD, BASE_URL as B, artifact, check, finish, launch } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const errors = [];
const watch = (p) => {
  p.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 160));
  });
};

// French phone visitor
const fr = await b.newContext({ locale: "fr-FR", viewport: { width: 390, height: 844 } });
await fr.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
const p = await fr.newPage();
watch(p);
await p.goto(B + "/");
await p.waitForTimeout(600);
check("French browser lands on /fr", p.url() === B + "/fr", p.url());
check("home is in French", await p.getByText("naturellement").first().isVisible());
await p.screenshot({ path: artifact("fr-home.png"), fullPage: false });
await p.getByRole("link", { name: "Boutique" }).first().click();
await p.waitForURL(B + "/fr/shop");
check("nav keeps French (/fr/shop)", true);
await p.getByRole("link", { name: "Mélange de fruits" }).first().click();
await p.waitForURL(/\/fr\/shop\/mixed-fruit-pack/);
check(
  "product name in French",
  await p.getByRole("heading", { name: "Mélange de fruits" }).isVisible(),
);
await p.getByRole("button", { name: "Ajouter au panier" }).first().click();
await p.waitForTimeout(300);
await p.getByRole("button", { name: "Acheter maintenant" }).first().click();
await p.waitForURL(B + "/fr/checkout");
check("Buy now goes to /fr/checkout", true);
const f = p.locator("form:visible", { has: p.locator('input[name="phone"]') }).first();
await f.getByRole("button", { name: "Commander sur WhatsApp" }).click();
await p.waitForTimeout(800);
check(
  "validation errors in French",
  await p.getByText("Veuillez saisir votre nom.").first().isVisible(),
);
await f.getByLabel("Nom complet").fill("Amina Test");
await f.getByLabel("Numéro de téléphone").fill("677123456");
await f.getByLabel("Adresse de livraison").fill("Douala, Akwa");
const nav = p.waitForURL("https://wa.me/**", { timeout: 8000 });
await f.getByRole("button", { name: "Commander sur WhatsApp" }).click();
await nav;
const text = new URL(p.url()).searchParams.get("text");
const plainText = text.replace(/[  ]/g, " ");
check(
  "WhatsApp message in French with item code",
  plainText.startsWith("Bonjour Fruidry ! Je voudrais commander :") &&
    plainText.includes("FD-MIX-50 · Mélange de fruits × 2") &&
    plainText.includes("Livraison : Douala, Akwa") &&
    plainText.includes("*Total : 5 000 FCFA*") &&
    /Livraison :/.test(text),
  plainText.split("\n").slice(0, 4).join(" | "),
);
await p.goBack();
await p.waitForTimeout(800);
const orderLink = p.getByRole("link", { name: "Voir votre commande" });
check("French confirmation shown after WhatsApp", await orderLink.isVisible());
await orderLink.click();
await p.waitForURL(/\/fr\/order\//);
await p
  .getByText("Nous avons bien reçu votre commande")
  .waitFor({ timeout: 5000 })
  .catch(() => {});
check("order page in French", await p.getByText("Nous avons bien reçu votre commande").isVisible());
const orderUrl = p.url();

// Language switch (with something in the cart, which ordering emptied)
await p.goto(B + "/fr/shop/mixed-fruit-pack");
await p.waitForTimeout(500);
await p.getByRole("button", { name: "Ajouter au panier" }).first().click();
await p.waitForTimeout(300);
await p.goto(B + "/fr/about");
await p.waitForTimeout(600);
await p.getByRole("link", { name: "View the site in English" }).click();
await p.waitForURL(B + "/en/about");
check(
  "switch FR→EN keeps the page",
  await p.getByRole("heading", { name: "Our story", level: 1 }).isVisible(),
);
await p.goto(B + "/shop");
await p.waitForTimeout(400);
check("choice remembered for plain links", p.url() === B + "/en/shop", p.url());
{
  const cart = await p.getByRole("link", { name: /Cart/ }).first().innerText();
  check("cart kept across languages", /1/.test(cart), cart.replace(/\s+/g, " "));
}

// Old order link redirects
const ctxEn = await b.newContext({ locale: "en-GB" });
const e = await ctxEn.newPage();
watch(e);
await e.goto(B + "/order/" + orderUrl.split("/").pop());
await e.waitForTimeout(500);
check(
  "old /order/<id> link still works",
  /\/en\/order\//.test(e.url()) && (await e.getByText("We've got your order").isVisible()),
  e.url(),
);

// Admin: French fields
const a = await ctxEn.newPage();
watch(a);
await a.goto(B + "/admin");
await a.waitForTimeout(500);
await a.locator('input[name="password"]:visible').fill(ADMIN_PASSWORD);
await a.getByRole("button", { name: "Sign in" }).first().click();
await a.waitForTimeout(1000);
await a.goto(B + "/admin/products/mixed-fruit-pack");
await a.waitForTimeout(800);
const form = a.locator("form:visible", { has: a.locator('input[name="price"]') }).first();
check(
  "admin shows French fields filled",
  (await form.getByLabel("Name in French").inputValue()) === "Mélange de fruits",
);
await form.getByLabel("Short tagline in French").fill("Des fruits croquants, rien d'autre.");
await form.getByRole("button", { name: "Save changes" }).click();
await a.getByText("Saved ✓").first().waitFor();
await p.goto(B + "/fr/shop/mixed-fruit-pack");
await p.waitForTimeout(600);
check(
  "French tagline edit shows on /fr",
  await p.getByText("Des fruits croquants, rien d'autre.").first().isVisible(),
);
await p.goto(B + "/en/shop/mixed-fruit-pack");
await p.waitForTimeout(600);
check(
  "English page unaffected",
  await p.getByText("A crunchy mix of freeze-dried fruit.").first().isVisible(),
);
await a.goto(B + "/admin/orders");
await a.waitForTimeout(800);
const adminLink = await a
  .getByRole("link", { name: /View customer page|View receipt/ })
  .first()
  .getAttribute("href")
  .catch(() => null);
check("admin order link points to the French page", adminLink?.startsWith("/fr/order/"), adminLink);
check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
finish();
await b.close();
