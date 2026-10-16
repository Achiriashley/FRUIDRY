// A whole order on a phone: product page → checkout → WhatsApp message to the shop,
// the order in the admin dashboard, Mark as paid, and the customer's receipt.
import { ADMIN_PASSWORD, BASE_URL as B, artifact, check, finish, launch } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const ctx = await b.newContext({ locale: "en-GB", viewport: { width: 390, height: 844 } });
const errs = [];
const waUrls = [];
await ctx.route("https://wa.me/**", (route) => {
  waUrls.push(route.request().url());
  route.fulfill({ status: 200, contentType: "text/html", body: "<h1>WhatsApp</h1>" });
});
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push(e.message));

await p.goto(B + "/en/shop/mixed-fruit-pack");
{
  const code = await p.getByText("Item code").first().innerText();
  check("the product page shows the item code", code.includes("FD-MIX-50"), code);
}
await p.locator('button[aria-label="Increase quantity"]:visible').first().click();
await p.getByRole("button", { name: "Buy now" }).first().click();
await p.waitForURL("**/checkout");
await p.getByLabel("Full name").fill("Marie Ngono");
await p.getByLabel("Phone number").fill("677 12 34 56");
await p.getByLabel("Delivery address").fill("Douala, Bonapriso");
await p.getByLabel(/Notes/).fill("Please call before");
await p.screenshot({ path: artifact("wa-checkout.png"), fullPage: true });
await p.getByRole("button", { name: "Order on WhatsApp" }).click();
await p.waitForURL("https://wa.me/**");
const url = new URL(waUrls[0]);
const message = url.searchParams.get("text").replace(/[  ]/g, " ");
check(
  "the order goes to the shop's WhatsApp number",
  url.pathname === "/237600000000",
  url.pathname,
);
check(
  "the message lists the item, total and the customer's details",
  /^\*Order FD-[A-Z0-9]+\*$/m.test(message) &&
    message.includes("• FD-MIX-50 · Mixed Fruit Pack × 2 = 5 000 FCFA") &&
    message.includes("*Total: 5 000 FCFA*") &&
    message.includes("Marie Ngono") &&
    /677 ?12 ?34 ?56/.test(message) &&
    message.includes("Douala, Bonapriso") &&
    message.includes("Please call before"),
  JSON.stringify(message),
);

await p.goBack();
await p.waitForTimeout(1500);
{
  const main = (await p.locator("main").innerText()).replace(/\s+/g, " ");
  check(
    "coming back from WhatsApp shows the order is ready to send",
    main.includes("is ready in WhatsApp") &&
      (await p.getByRole("link", { name: "View your order" }).count()) === 1,
    main.slice(0, 120),
  );
}

const a = await ctx.newPage();
a.on("pageerror", (e) => errs.push("admin " + e.message));
await a.goto(B + "/admin");
await a.getByLabel("Password").fill(ADMIN_PASSWORD);
await a.getByRole("button", { name: "Sign in" }).click();
await a.getByRole("heading", { name: "Dashboard" }).first().waitFor();
await a.waitForTimeout(1000);
{
  const sections = (await a.locator("h2").allInnerTexts()).join(" / ");
  check(
    "the dashboard lists the order under New orders",
    /New orders \(1\)/.test(sections) && (await a.getByText("Marie Ngono").count()) > 0,
    sections,
  );
}
// New orders have "Ask for payment on WhatsApp"; paid ones "Message on WhatsApp".
const msgHref = await a
  .getByRole("link", { name: /^(Ask for payment|Message) on WhatsApp$/ })
  .first()
  .getAttribute("href");
check(
  "the admin's WhatsApp link goes to the customer",
  new URL(msgHref).pathname === "/237677123456",
  new URL(msgHref).pathname,
);
await a.screenshot({ path: artifact("wa-admin.png"), fullPage: true });
const orderLink = await a
  .getByRole("link", { name: "View customer page" })
  .first()
  .getAttribute("href");
await a.getByRole("button", { name: "Mark as paid" }).first().click();
await a.getByRole("button", { name: "Mark as delivered" }).first().waitFor();
await p.goto(B + orderLink);
await p.getByRole("heading", { name: "Payment confirmed" }).first().waitFor();
await p.waitForTimeout(800);
{
  const receipt = (await p.locator("article").first().innerText()).replace(/[  ]/g, " ");
  check(
    "after Mark as paid, the customer's page shows the receipt",
    /Receipt|RC-[A-Z0-9]{8}/.test(receipt) &&
      receipt.includes("Marie Ngono") &&
      receipt.includes("5 000 FCFA"),
    receipt.replace(/\n/g, " | "),
  );
}
check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
