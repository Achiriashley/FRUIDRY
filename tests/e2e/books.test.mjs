// The Books page: recording sales in person, stock arrivals and expenses, how they
// change the stock count, the month's figures (website orders included), the dashboard
// totals, the Excel download, and deleting an entry recorded by mistake.
import { inflateRawSync } from "node:zlib";
import { ADMIN_PASSWORD, BASE_URL as B, check, finish, launch } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const errs = [];
const plain = (text) => text.replace(/\s+/g, " ");
// "11 500 FCFA" with any kind of space
const fcfa = (n) =>
  new RegExp(
    (n < 0 ? "-\\s?" : "") +
      String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\\s?") +
      "\\sFCFA",
  );

// ---------- A website order, paid ----------

const shop = await b.newContext({ locale: "en-GB", viewport: { width: 390, height: 844 } });
await shop.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
const s = await shop.newPage();
s.on("pageerror", (e) => errs.push("shop " + e.message));
await s.goto(B + "/en/shop/mixed-fruit-pack");
await s.getByRole("button", { name: "Buy now" }).first().click();
await s.waitForURL("**/checkout");
await s.getByLabel("Full name").fill("Online Buyer");
await s.getByLabel("Phone number").fill("677 00 00 01");
await s.getByLabel("Delivery address").fill("Douala");
await s.getByRole("button", { name: "Order on WhatsApp" }).click();
await s.waitForURL("https://wa.me/**");

const ctx = await b.newContext({ locale: "en-GB", viewport: { width: 1100, height: 900 } });
const a = await ctx.newPage();
a.on("pageerror", (e) => errs.push("admin " + e.message));
a.on("dialog", (d) => d.accept());
await a.goto(B + "/admin");
await a.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
await a.getByRole("button", { name: "Sign in" }).click();
await a.getByRole("heading", { name: "Dashboard" }).waitFor();
await a.waitForTimeout(800);
await a.getByRole("button", { name: "Mark as paid" }).first().click();
await a.getByRole("button", { name: "Mark as delivered" }).first().waitFor();

// ---------- The Books page ----------

await a.getByRole("link", { name: "Books", exact: true }).first().click();
await a.getByRole("heading", { name: "Books", level: 1 }).waitFor();
await a.waitForTimeout(600);

const panel = (title) =>
  a.locator("details").filter({ has: a.locator("summary", { hasText: title }) });
async function open(title) {
  const d = panel(title);
  if (!(await d.evaluate((el) => el.open))) await d.locator("summary").click();
  return d;
}
// Presses a form's button and returns the form's text once the new result is shown
// (not the message left from the previous save).
async function submit(d, button) {
  const form = d.locator("form");
  const before = plain(await form.innerText());
  await d.getByRole("button", { name: button }).click();
  for (let i = 0; i < 100; i++) {
    await a.waitForTimeout(100);
    const text = plain(await form.innerText());
    if (!text.includes("Saving…") && text !== before) return text;
  }
  throw new Error(`No result after pressing ${button}`);
}

// Stock arrives for a product whose packs aren't counted yet.
{
  const d = await open("Stock arrival");
  await d.getByLabel("Product").selectOption("mixed-fruit-pack");
  await d.getByLabel("Packs received").fill("100");
  await d.getByLabel(/What they cost you/).fill("150000");
  await d.getByLabel(/Note/).fill("Supplier batch 1");
  const text = await submit(d, "Record stock");
  check(
    "stock for an uncounted product is recorded, and the page says the count didn't change",
    text.includes("Stock arrival of 100 packs at 1 500 FCFA per pack recorded") &&
      text.includes("aren't counted"),
    text.slice(-200),
  );
}

// Turn counting on (40 packs), then record a delivery of 10.
const p = await ctx.newPage();
p.on("pageerror", (e) => errs.push("product " + e.message));
await p.goto(B + "/admin/products/mixed-fruit-pack");
const form = p.locator("form:visible", { has: p.locator('input[name="price"]') }).first();
await form.getByLabel("Packs in stock").waitFor();
await p.waitForTimeout(500);
await form.getByLabel("Packs in stock").fill("40");
await p.getByRole("button", { name: "Save changes" }).click();
await p.getByText("Saved ✓").first().waitFor();
await p.close();
// The paid website order was marked before counting started, so the count stays 40.

{
  const d = await open("Stock arrival");
  await d.getByLabel("Product").selectOption("mixed-fruit-pack");
  await d.getByLabel("Packs received").fill("10");
  await d.getByLabel(/What they cost you/).fill("15000");
  const text = await submit(d, "Record stock");
  check(
    "a stock arrival adds to the count",
    text.includes("Mixed Fruit Pack: 50 packs in stock"),
    text.slice(-120),
  );
  check(
    "…and the form is emptied for the next one",
    (await d.getByLabel("Packs received").inputValue()) === "",
  );
}

// Sales in person
{
  const d = await open("Sale in person");
  await d.getByRole("button", { name: "Record sale" }).click();
  await d.getByText("Choose a product.").waitFor();
  const text = plain(await d.locator("form").innerText());
  check(
    "an empty sale shows what's missing",
    text.includes("Choose a product.") &&
      text.includes("Enter the number of packs") &&
      text.includes("Choose how they paid."),
    text.slice(0, 300),
  );
  const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  await d.getByLabel("Date").fill(tomorrow);
  await d.getByLabel("Product").selectOption("mixed-fruit-pack");
  check(
    "choosing the product fills in its shop price",
    (await d.getByLabel("Price per pack (FCFA)").inputValue()) === "2500",
  );
  await d.getByLabel("Packs sold").fill("3");
  await d.getByLabel("Paid by").selectOption("cash");
  const future = await submit(d, "Record sale");
  check("a date in the future is refused", future.includes("This date is in the future."));
  // A sale from earlier in the month (today, on the 1st).
  const today = new Date().toISOString().slice(0, 10);
  const earlier = `${today.slice(0, 8)}01`;
  await d.getByLabel("Date").fill(earlier);
  const text2 = await submit(d, "Record sale");
  check(
    "a cash sale takes the packs off the count and says its amount and date",
    text2.includes("Sale of 7 500 FCFA recorded for 1 ") && text2.includes("47 packs left"),
    text2.slice(-160),
  );
  check(
    "…and the form keeps that date for the next sale",
    (await d.getByLabel("Date").inputValue()) === earlier &&
      (await d.getByLabel("Packs sold").inputValue()) === "",
  );
  await d.getByLabel("Date").fill(today);

  await d.getByLabel("Product").selectOption("mixed-fruit-pack");
  await d.getByLabel("Packs sold").fill("2");
  await d.getByLabel("Price per pack (FCFA)").fill("2000");
  await d.getByLabel("Paid by").selectOption("momo");
  await d.getByLabel(/Note/).fill("Market stall");
  const text3 = await submit(d, "Record sale");
  check(
    "a MoMo sale at a lower price is recorded",
    text3.includes("Sale of 4 000 FCFA recorded") && text3.includes("45 packs left"),
    text3.slice(-120),
  );

  // More packs than are counted is refused (usually a typo).
  await d.getByLabel("Product").selectOption("mixed-fruit-pack");
  await d.getByLabel("Packs sold").fill("60");
  await d.getByLabel("Paid by").selectOption("cash");
  const tooMany = await submit(d, "Record sale");
  check(
    "a sale of more packs than are counted is refused",
    tooMany.includes("Only 45 packs of Mixed Fruit Pack are counted in stock"),
    tooMany.slice(0, 300),
  );
}

// Expenses
{
  const d = await open("Expense");
  await d.getByLabel("Category").selectOption("other");
  await d.getByLabel("Amount (FCFA)").fill("500");
  const missing = await submit(d, "Record expense");
  check("an Other expense needs a note", missing.includes("Say what it was for."));
  await d.getByLabel(/Note/).fill("Stickers");
  const ok1 = await submit(d, "Record expense");
  await d.getByLabel("Category").selectOption("transport");
  await d.getByLabel("Amount (FCFA)").fill("3000");
  const ok2 = await submit(d, "Record expense");
  check(
    "expenses are recorded",
    ok1.includes("Expense of 500 FCFA recorded") && ok2.includes("Expense of 3 000 FCFA recorded"),
  );
}

// ---------- The month's figures ----------

await a.reload();
await a.getByRole("heading", { name: "Books", level: 1 }).waitFor();
await a.waitForTimeout(600);
const card = async (title) => plain(await a.getByRole("region", { name: title }).innerText());
{
  const sales = await card("Sales");
  check(
    "sales: website and in person, by payment",
    /Website \(1 paid order, 1 pack\)/.test(sales) &&
      fcfa(2500).test(sales) &&
      /In person \(5 packs\)/.test(sales) &&
      fcfa(11500).test(sales) &&
      fcfa(7500).test(sales) &&
      fcfa(4000).test(sales) &&
      fcfa(14000).test(sales),
    sales,
  );
  const costs = await card("Costs");
  check(
    "costs: stock bought and expenses",
    /Stock bought \(110 packs\)/.test(costs) &&
      fcfa(165000).test(costs) &&
      fcfa(3000).test(costs) &&
      fcfa(168500).test(costs),
    costs,
  );
  const left = await card("Money left this month");
  check("money left = sales minus costs", fcfa(-154500).test(left), left);
  // Each pack cost 165 000 / 110 = 1 500; 6 packs sold cost 9 000.
  const profit = await card("Estimated profit");
  check(
    "estimated profit = sales minus what the packs sold cost minus expenses",
    fcfa(1500).test(profit) && fcfa(9000).test(profit),
    profit,
  );
  const stock = plain(
    await a.getByRole("heading", { name: "Stock now" }).locator("..").innerText(),
  );
  check("the stock list shows 45 packs", stock.includes("Mixed Fruit Pack 45 packs"), stock);
}

// ---------- Excel download ----------

function unzip(bytes) {
  const files = {};
  let at = 0;
  while (bytes.readUInt32LE(at) === 0x04034b50) {
    const size = bytes.readUInt32LE(at + 18);
    const nameLength = bytes.readUInt16LE(at + 26);
    const extra = bytes.readUInt16LE(at + 28);
    const name = bytes.subarray(at + 30, at + 30 + nameLength).toString();
    const start = at + 30 + nameLength + extra;
    files[name] = inflateRawSync(bytes.subarray(start, start + size)).toString();
    at = start + size;
  }
  return files;
}
{
  const [download] = await Promise.all([
    a.waitForEvent("download"),
    a.getByRole("button", { name: /Download for Excel/ }).click(),
  ]);
  check(
    "the download button gives an Excel file",
    /^fruidry-books-\d{4}-\d{2}\.xlsx$/.test(download.suggestedFilename()),
    download.suggestedFilename(),
  );
  const res = await a.request.get(B + "/admin/books/export");
  const files = unzip(Buffer.from(await res.body()));
  const summary = files["xl/worksheets/sheet1.xml"] ?? "";
  const salesSheet = files["xl/worksheets/sheet2.xml"] ?? "";
  check(
    "the file has a summary, sales, stock and expenses sheet",
    /Summary.*Sales.*Stock arrivals.*Expenses/.test(files["xl/workbook.xml"] ?? ""),
  );
  check(
    "the summary has the month's totals",
    ["<v>14000</v>", "<v>-154500</v>", "<v>1500</v>"].every((v) => summary.includes(v)),
  );
  check(
    "the sales sheet lists the website order and both sales in person",
    salesSheet.includes("Website") &&
      salesSheet.includes("Cash") &&
      salesSheet.includes("MTN MoMo") &&
      salesSheet.includes("Market stall") &&
      (salesSheet.match(/<row /g) ?? []).length === 4,
  );
  const anon = await fetch(B + "/admin/books/export");
  check("the file can't be downloaded without signing in", anon.status === 401, anon.status);
}

// ---------- Editing an entry ----------

{
  const item = a.locator("li").filter({ hasText: "Supplier batch 1" });
  await item.locator("summary", { hasText: "Edit" }).click();
  await item.getByLabel(/What they cost you/).fill("120000");
  await item.getByRole("button", { name: "Save changes" }).click();
  await item.getByText("Changes saved.").waitFor();
  await a.waitForTimeout(500);
  const costs = await card("Costs");
  const left = await card("Money left this month");
  const stock = plain(
    await a.getByRole("heading", { name: "Stock now" }).locator("..").innerText(),
  );
  check(
    "editing a stock arrival's cost updates the figures but not the stock count",
    fcfa(135000).test(costs) && fcfa(-124500).test(left) && stock.includes("45 packs"),
    `${costs} | ${left} | ${stock}`,
  );
}

// ---------- Deleting an entry ----------

await a
  .locator("li")
  .filter({ hasText: "Market stall" })
  .getByRole("button", { name: "Delete" })
  .click();
await a.locator("li", { hasText: "Market stall" }).waitFor({ state: "detached" });
await a.waitForTimeout(500);
{
  const sales = await card("Sales");
  const stock = plain(
    await a.getByRole("heading", { name: "Stock now" }).locator("..").innerText(),
  );
  check(
    "deleting a sale removes it from the figures and puts its packs back",
    /In person \(3 packs\)/.test(sales) && stock.includes("Mixed Fruit Pack 47 packs"),
    `${sales} | ${stock}`,
  );
}
// The first arrival was recorded while packs weren't counted: deleting it doesn't
// touch today's count.
await a
  .locator("li")
  .filter({ hasText: "Supplier batch 1" })
  .getByRole("button", { name: "Delete" })
  .click();
await a.locator("li", { hasText: "Supplier batch 1" }).waitFor({ state: "detached" });
await a.waitForTimeout(500);
{
  const stock = plain(
    await a.getByRole("heading", { name: "Stock now" }).locator("..").innerText(),
  );
  check(
    "deleting an entry made while packs weren't counted leaves the count alone",
    stock.includes("Mixed Fruit Pack 47 packs"),
    stock,
  );
}

// ---------- Dashboard ----------

await a.getByRole("link", { name: "Dashboard" }).first().click();
await a.getByRole("heading", { name: "Dashboard" }).waitFor();
{
  const text = plain(await a.locator("main").innerText());
  check(
    "the dashboard's sales include sales in person",
    /Sales this month 10\s?000\sFCFA 4 packs · 1 website order, 1 in person/.test(text),
    text.slice(0, 400),
  );
}

// Last month has nothing recorded.
await a.goto(B + "/admin/books");
await a.getByRole("link", { name: /^← / }).click();
await a.getByText("Nothing recorded this month.").waitFor();
check("an earlier month can be viewed", true);

check("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
finish();
