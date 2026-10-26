// Invoices (admin panel → Invoices): settings with NIU and RCCM, a client saved while
// making an invoice, product and free lines with a discount, numbering, the client's
// printable page in French, part and full payments (a fully paid invoice counts in Books
// and takes its packs off the stock count; deleting a payment puts them back), reminders,
// a proforma turned into an invoice, cancelling, an invoice for a website order (not
// counted twice), editing, clients, the dashboard and the full backup.
import { ADMIN_PASSWORD, BASE_URL as B, check, finish, launch, unzip } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const errs = [];
const plain = (text) => text.replace(/[\s  ]+/g, " ").trim();
const year = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Douala",
  year: "numeric",
}).format(new Date());

const a = await (
  await b.newContext({ locale: "en-GB", viewport: { width: 390, height: 844 } })
).newPage();
a.on("pageerror", (e) => errs.push("admin " + e.message));
await a.goto(B + "/admin");
await a.locator('input[name="password"]:visible').fill(ADMIN_PASSWORD);
await a.getByRole("button", { name: "Sign in" }).first().click();
await a.getByRole("heading", { name: "Dashboard" }).waitFor();

const shop = await b.newContext({ locale: "fr-FR" });
await shop.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
const client = await shop.newPage();
client.on("pageerror", (e) => errs.push("client " + e.message));

const main = async (page) => plain(await page.locator("main").innerText());
// Next.js can keep a hidden copy of a page next to the one shown: act on what's visible.
const visible = (locator) => locator.filter({ visible: true });
const label = (text, options) => visible(a.getByLabel(text, options));
const button = (name, options = {}) => visible(a.getByRole("button", { name, ...options }));
const link = (name, options = {}) => visible(a.getByRole("link", { name, ...options }));
// Opens an admin page and waits until `ready` shows (pages stream in after "Loading…").
async function visit(path, ready) {
  await a.goto(B + path);
  await ready().first().waitFor();
}
async function stockLeft() {
  await visit("/admin/products", () => visible(a.getByText(/\d+ left/)));
  return Number((await main(a)).match(/(\d+) left/)?.[1]);
}
async function setStock(stock) {
  await visit("/admin/products/mixed-fruit-pack", () => a.locator('input[name="price"]:visible'));
  const form = a.locator("form:visible", { has: a.locator('input[name="price"]') }).first();
  await form.getByLabel("Packs in stock").fill(String(stock));
  await form.getByRole("button", { name: "Save changes" }).click();
  await visible(a.getByText("Saved ✓")).first().waitFor();
}
// The Sales card of this month's books: "Website (…) … Total sales 0 FCFA".
async function booksSales() {
  await visit("/admin/books", () => visible(a.getByText("Total sales")));
  const text = await main(a);
  return text.slice(
    text.indexOf("Website ("),
    text.indexOf("FCFA", text.indexOf("Total sales")) + 4,
  );
}
// After saving the invoice form: its page, once loaded.
async function saved() {
  await a.waitForURL(/\/admin\/invoices\/[A-Za-z0-9_-]{16,}$/);
  await link("Open / print").waitFor();
}
// The invoice form's line `n` (1, 2, …).
const line = (n) => visible(a.locator("li", { has: a.getByText(`Line ${n}`, { exact: true }) }));
async function confirm(name, yes) {
  await button(name, { exact: true }).first().click();
  await button(yes).click();
}
const invoiceId = () => a.url().match(/\/admin\/invoices\/([A-Za-z0-9_-]{16,})/)?.[1];

// ---------- Settings ----------
await visit("/admin/invoices/settings", () => button("Save settings"));
await label("NIU", { exact: true }).fill("M012345678901X");
await label("RCCM").fill("RC/DLA/2024/A/1234");
await label(/Other ways to pay/).fill("Afriland First Bank · 10005 00001 12345678901 23");
await button("Save settings").click();
await visible(a.getByText("Settings saved.")).waitFor();
check("invoice settings save", true);
await setStock(20);

// ---------- A new invoice ----------
await visit("/admin/invoices/new", () => button("Save invoice"));
await button("Save invoice").click();
await visible(a.getByText("Enter the client's name")).waitFor();
check(
  "an empty invoice says what's missing, field by field",
  (await main(a)).includes("Line 1: write what it is.") &&
    (await a.evaluate(() => document.activeElement?.name)) === "name",
);
await label("Client name").fill("Café Akwa SARL");
await label("Contact person (optional)").fill("Mme Ngo");
await label("Phone / WhatsApp (optional)").fill("677 11 22 33");
await label("Address (optional)").fill("Rue Joss, Akwa, Douala");
await label("Client's NIU (optional)").fill("P098765432101Y");
await line(1).getByLabel("Product").selectOption("mixed-fruit-pack");
await line(1).getByLabel("Quantity").fill("10");
await button("+ Add a line").click();
await line(2).getByLabel("Description").fill("Livraison Akwa");
await line(2).getByLabel("Unit price (FCFA)").fill("1500");
await label("Discount in FCFA (optional)").fill("2000");
check(
  "the form shows the total while you type (10 × 2 500 + 1 500 − 2 000)",
  (await main(a)).includes("Total 24 500 FCFA") &&
    (await line(1).getByLabel("Description").inputValue()) === "Mélange de fruits",
  await main(a),
);
await button("Save invoice").click();
await saved();
const firstId = invoiceId();
{
  const text = await main(a);
  check(
    "it gets the year's first number and is unpaid",
    text.includes(`FAC-${year}-0001`) && text.includes("Unpaid"),
    text.slice(0, 200),
  );
  check(
    "the invoice shows your NIU and RCCM, the client's details and every line",
    [
      "M012345678901X",
      "RC/DLA/2024/A/1234",
      "Café Akwa SARL",
      "Mme Ngo",
      "P098765432101Y",
      "Mélange de fruits",
      "FD-MIX-50",
      "Livraison Akwa",
      "Remise",
      "24 500 FCFA",
    ].every((t) => text.includes(t)),
    text,
  );
  check(
    "…the amount in words, the MoMo code for it and your bank details",
    text.includes(
      "Arrêtée la présente facture à la somme de vingt-quatre mille cinq cents francs CFA.",
    ) &&
      text.includes("*126*16*747434*24500#") &&
      text.includes("Afriland First Bank"),
  );
  const send = await link("Send on WhatsApp").getAttribute("href");
  const message = new URL(send).searchParams.get("text");
  check(
    "Send on WhatsApp writes to the client with the invoice's link",
    new URL(send).pathname === "/237677112233" &&
      message.includes(`facture Fruidry FAC-${year}-0001`) &&
      message.includes(`/fr/invoice/${firstId}`),
    message,
  );
}

// ---------- The client's page ----------
const clientPage = `/fr/invoice/${firstId}`;
async function clientSees() {
  await client.goto(B + clientPage);
  await visible(client.locator("article h1")).waitFor();
  return main(client);
}
{
  const text = await clientSees();
  check(
    "the client's page shows the invoice, ready to print",
    text.includes(`N° FAC-${year}-0001`) &&
      /Facturé à/i.test(text) &&
      text.includes("24 500 FCFA") &&
      (await client.getByRole("button", { name: "Imprimer ou enregistrer en PDF" }).count()) === 1,
    text.slice(0, 300),
  );
  check(
    "…and is kept out of search engines",
    (await client.locator('meta[name="robots"]').first().getAttribute("content")).includes(
      "noindex",
    ),
  );
}

// ---------- Payments ----------
async function pay(amount, method = "momo") {
  await visit(`/admin/invoices/${firstId}`, () => link("Open / print"));
  await label("Amount received (FCFA)").fill(String(amount));
  await label("Paid by").selectOption(method);
  await button("Record payment").click();
}
await pay(10000);
await visible(a.getByText("Still to pay: 14 500 FCFA.")).waitFor();
{
  const text = await main(a);
  const sales = await booksSales();
  const left = await stockLeft();
  check(
    "a part payment: part paid, not yet in Books, stock unchanged",
    text.includes("Part paid") && !sales.includes("Invoices") && left === 20,
    `${left} left | ${sales} | ${text.slice(0, 200)}`,
  );
}
await pay(20000);
await visible(a.getByText("Enter an amount between 1 and 14 500 FCFA.")).waitFor();
check("you can't record more than what's left to pay", true);
await pay(14500, "cash");
await visible(a.getByText("✓ Paid in full.")).waitFor();
{
  const sales = await booksSales();
  check(
    "paid in full: it counts in Books and its 10 packs come off the stock count",
    sales.includes("Invoices (1 paid, 10 packs) 24 500 FCFA") && (await stockLeft()) === 10,
    sales,
  );
  check("the client's page says it's paid", /Payée/i.test(await clientSees()));
}
await visit(`/admin/invoices/${firstId}`, () => link("Open / print"));
check(
  "a paid invoice can't be edited or cancelled",
  (await link("Edit", { exact: true }).count()) === 0 &&
    (await button("Cancel invoice").count()) === 0,
);
// Deleting a payment recorded by mistake undoes the sale and puts the packs back.
await visible(a.locator("li", { hasText: "14 500 FCFA" }))
  .getByRole("button", { name: "Delete" })
  .click();
await button("Yes, delete it").click();
await visible(a.getByText("Paid 10 000 FCFA of 24 500 FCFA")).waitFor();
check(
  "deleting a payment: part paid again, out of Books, packs back in stock",
  !(await booksSales()).includes("Invoices") && (await stockLeft()) === 20,
);
await pay(14500, "cash");
await visible(a.getByText("✓ Paid in full.")).waitFor();
check("paying again counts it once more", (await stockLeft()) === 10);

// ---------- An overdue invoice for a saved client, cancelled then reopened ----------
await visit("/admin/invoices/new", () => label("Saved client"));
await label("Saved client").selectOption({ label: "Café Akwa SARL" });
check(
  "choosing a saved client fills in their details",
  (await label("Contact person (optional)").inputValue()) === "Mme Ngo" &&
    (await label("Client's NIU (optional)").inputValue()) === "P098765432101Y" &&
    (await main(a)).includes("Changes typed here also update this client"),
);
await label("Saved client").selectOption("");
check(
  "going back to New client empties the client's details",
  (await label("Client name").inputValue()) === "" &&
    (await label("Client's NIU (optional)").inputValue()) === "",
);
await label("Saved client").selectOption({ label: "Café Akwa SARL" });
await label("Date", { exact: true }).fill(`${year}-01-05`);
await label("Pay by").fill(`${year}-01-20`);
await line(1).getByLabel("Product").selectOption("mixed-fruit-pack");
await line(1).getByLabel("Quantity").fill("4");
await button("Save invoice").click();
await saved();
const overdueId = invoiceId();
{
  const text = await main(a);
  const remind = await link("Remind on WhatsApp").getAttribute("href");
  const message = plain(new URL(remind).searchParams.get("text"));
  check(
    "a second invoice gets the next number and shows as overdue",
    text.includes(`FAC-${year}-0002`) && text.includes("Overdue"),
  );
  check(
    "the reminder gives what's left to pay, the due date and the MoMo code",
    message.includes("petit rappel") &&
      message.includes("il reste 10 000 FCFA à payer") &&
      message.includes("*126*16*747434*10000#"),
    message,
  );
}
await label("Reason for cancelling").fill("Mauvais client");
await confirm("Cancel invoice", "Yes, cancel invoice");
await visible(a.getByText("Cancelled: Mauvais client")).waitFor();
await client.goto(B + `/fr/invoice/${overdueId}`);
await visible(client.locator("article h1")).waitFor();
{
  const text = await main(client);
  check(
    "a cancelled invoice's link says so, without the client's details",
    /Annulée/i.test(text) &&
      text.includes("Ce document a été annulé") &&
      !text.includes("Café Akwa SARL") &&
      !text.includes("P098765432101Y"),
    text.slice(0, 300),
  );
}
await confirm("Undo cancel", "Yes, reopen");
await button("Cancel invoice").waitFor();
check("Undo cancel reopens it", (await main(a)).includes("Overdue"));

// ---------- A proforma in English, turned into an invoice ----------
await visit("/admin/invoices/new?kind=proforma", () => label("Saved client"));
await label("Saved client").selectOption({ label: "Café Akwa SARL" });
await label("Language").selectOption("en");
await line(1).getByLabel("Product").selectOption("mixed-fruit-pack");
await line(1).getByLabel("Quantity").fill("5");
check(
  "in English, the product line uses the English name",
  (await line(1).getByLabel("Description").inputValue()) === "Mixed Fruit Pack",
);
await button("Save proforma").click();
await saved();
const proformaId = invoiceId();
{
  const text = await main(a);
  check(
    "a proforma has its own numbers, a validity date and no payments section",
    text.includes(`PRO-${year}-0001`) &&
      text.includes("Open") &&
      text.includes("PROFORMA INVOICE") &&
      text.includes("Valid until") &&
      text.includes("This proforma is a quote") &&
      text.includes("Amount in words: twelve thousand five hundred CFA francs.") &&
      (await a.getByRole("heading", { name: "Payments" }).count()) === 0,
    text.slice(0, 400),
  );
}
await confirm("Turn into an invoice", "Yes, make the invoice");
await a.waitForURL((url) => !url.pathname.endsWith(proformaId));
await link("Open / print").waitFor();
const fromProformaId = invoiceId();
{
  const text = await main(a);
  check(
    "turning it into an invoice makes the next invoice, linked to the proforma",
    text.includes(`FAC-${year}-0003`) &&
      text.includes(`From proforma PRO-${year}-0001`) &&
      text.includes("12 500 FCFA"),
    text.slice(0, 300),
  );
}
await visit(`/admin/invoices/${proformaId}`, () => link("Open / print"));
check(
  "the proforma shows it was invoiced",
  (await main(a)).includes(`Turned into invoice FAC-${year}-0003`) &&
    (await main(a)).includes("Invoiced"),
);

// ---------- Editing an unpaid invoice ----------
await visit(`/admin/invoices/${fromProformaId}/edit`, () => button("Save changes"));
{
  const date = await label("Date", { exact: true }).inputValue();
  await label("Date", { exact: true }).fill(`${Number(year) - 1}-12-28`);
  await button("Save changes").click();
  await visible(a.getByText(`Keep a date in ${year}`)).waitFor();
  check("an invoice can't move to another year (its number belongs to its year)", true);
  await label("Date", { exact: true }).fill(date);
}
await line(1).getByLabel("Quantity").fill("6");
await button("Save changes").click();
await a.waitForURL((url) => url.pathname.endsWith(fromProformaId));
await link("Open / print").waitFor();
check(
  "editing an unpaid invoice keeps its number and updates the total",
  (await main(a)).includes(`FAC-${year}-0003`) && (await main(a)).includes("15 000 FCFA"),
);

// ---------- An invoice for a website order ----------
await client.goto(B + "/fr/shop/mixed-fruit-pack");
await client.waitForLoadState("networkidle");
await client.evaluate(() =>
  localStorage.setItem("fruidry-cart", JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 2 }])),
);
await client.goto(B + "/fr/checkout");
await client.getByLabel("Nom complet").fill("Paul Ekane");
await client.getByLabel("Numéro de téléphone").fill("699 00 11 22");
await client.getByLabel("Adresse de livraison").fill("Buea, Molyko");
await client.getByRole("button", { name: "Commander sur WhatsApp" }).click();
await client.waitForURL("https://wa.me/**");
await visit("/admin", () => visible(a.getByText("Paul Ekane")));
{
  const order = visible(a.locator("article", { hasText: "Paul Ekane" })).first();
  await order.getByRole("button", { name: "Mark as paid", exact: true }).click();
  await order.getByRole("button", { name: "Yes, mark as paid" }).click();
  await order.getByRole("button", { name: "Mark as delivered", exact: true }).waitFor();
  await order.getByRole("link", { name: "Make an invoice" }).click();
}
await label("Client name").waitFor();
check(
  "Make an invoice on an order starts from the customer and what they ordered",
  (await label("Client name").inputValue()) === "Paul Ekane" &&
    (await line(1).getByLabel("Quantity").inputValue()) === "2" &&
    (await main(a)).includes("For website order FD-"),
);
await button("Save invoice").click();
await saved();
{
  const text = await main(a);
  check(
    "the order's invoice is already paid, and says the order counts in Books",
    text.includes(`FAC-${year}-0004`) &&
      text.includes("Paid 5 000 FCFA of 5 000 FCFA") &&
      text.includes("its sale and stock are counted through the order") &&
      text.includes("Commande en ligne FD-"),
    text.slice(0, 500),
  );
  check(
    "its order payment can't be deleted, it can be cancelled, and it isn't copied",
    (await button("Delete").count()) === 0 &&
      (await button("Cancel invoice").count()) === 1 &&
      (await link("New invoice like this").count()) === 0,
  );
  const sales = await booksSales();
  check(
    "it isn't counted twice: Books has the order and the first invoice only",
    sales.includes("Website (1 paid order, 2 packs) 5 000 FCFA") &&
      sales.includes("Invoices (1 paid, 10 packs) 24 500 FCFA") &&
      (await stockLeft()) === 8,
    sales,
  );
}
// An unpaid order: no invoice yet.
await client.goto(B + "/fr/shop/mixed-fruit-pack");
await client.waitForLoadState("networkidle");
await client.evaluate(() =>
  localStorage.setItem("fruidry-cart", JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 1 }])),
);
await client.goto(B + "/fr/checkout");
await client.getByLabel("Nom complet").fill("Unpaid Buyer");
await client.getByLabel("Numéro de téléphone").fill("699 33 44 55");
await client.getByLabel("Adresse de livraison").fill("Limbé");
await client.getByRole("button", { name: "Commander sur WhatsApp" }).click();
await client.waitForURL("https://wa.me/**");
await visit("/admin/orders", () => visible(a.getByText("Unpaid Buyer")));
check("the order now links to its invoice", (await link(`Invoice FAC-${year}-0004`).count()) === 1);
{
  const unpaid = visible(a.locator("article", { hasText: "Unpaid Buyer" })).first();
  const orderId = (
    await unpaid.getByRole("link", { name: "View customer page" }).getAttribute("href")
  )
    .split("/")
    .at(-1);
  check(
    "an unpaid order has no Make an invoice link",
    (await unpaid.getByRole("link", { name: "Make an invoice" }).count()) === 0,
  );
  await visit(`/admin/invoices/new?order=${orderId}`, () => visible(a.getByText(/isn't paid yet/)));
  check("…and its invoice page says to mark it as paid first", true);
}

// ---------- The list, clients, dashboard and backup ----------
await visit("/admin/invoices", () => visible(a.getByText("Received this month")));
{
  const text = await main(a);
  check(
    "the list shows what's to be paid and what's overdue",
    text.includes("To be paid 25 000 FCFA 2 invoices") && text.includes("Overdue 10 000 FCFA"),
    text.slice(0, 400),
  );
}
await label("Search invoices").fill("0003");
await button("Search").click();
await a.waitForURL(/q=0003/);
check(
  "search finds an invoice by its number",
  (await a.locator("main li").count()) === 1 && (await main(a)).includes(`FAC-${year}-0003`),
);
await visit("/admin/invoices/clients", () => visible(a.getByText("Café Akwa SARL")));
check(
  "the client saved from the first invoice is in Clients, with 4 invoices",
  (await main(a)).includes("Café Akwa SARL") && (await main(a)).includes("4 invoices"),
);
await visit("/admin", () => visible(a.getByText("Sales this month")));
check("the dashboard's sales include the paid invoice", (await main(a)).includes("1 invoice"));
{
  const files = unzip(Buffer.from(await (await a.request.get(B + "/admin/backup")).body()));
  check(
    "the full copy has the invoices and clients",
    (files["xl/worksheets/sheet7.xml"] ?? "").includes(`FAC-${year}-0001`) &&
      (files["xl/worksheets/sheet7.xml"] ?? "").includes(`PRO-${year}-0001`) &&
      (files["xl/worksheets/sheet8.xml"] ?? "").includes("Café Akwa SARL"),
  );
}
const anon = await fetch(B + `/admin/invoices/${firstId}`, { redirect: "manual" });
check("the admin invoice page needs a sign-in", !(await anon.text()).includes("Café Akwa SARL"));

check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
