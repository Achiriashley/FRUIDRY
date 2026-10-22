// The admin's order buttons ask before they act ("Are you sure?"), and each step can be
// undone: payment (putting back exactly the packs it took off the stock count), delivery
// and cancelling. The customer's order page follows.
import fs from "node:fs";
import path from "node:path";
import { ADMIN_PASSWORD, BASE_URL as B, check, finish, launch, skip } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const errs = [];
const plain = (text) => text.replace(/[\s  ]+/g, " ").trim();

const admin = await (await b.newContext({ locale: "en-GB" })).newPage();
admin.on("pageerror", (e) => errs.push("admin " + e.message));
await admin.goto(B + "/admin");
await admin.locator('input[name="password"]:visible').fill(ADMIN_PASSWORD);
await admin.getByRole("button", { name: "Sign in" }).first().click();
await admin.getByRole("heading", { name: "Dashboard" }).waitFor();

const productForm = () =>
  admin.locator("form:visible", { has: admin.locator('input[name="price"]') }).first();
async function setStock(stock) {
  await admin.goto(B + "/admin/products/mixed-fruit-pack");
  await productForm().getByLabel("Packs in stock").fill(String(stock));
  await productForm().getByRole("button", { name: "Save changes" }).click();
  await admin.getByText("Saved ✓").first().waitFor();
}
async function stockLeft() {
  await admin.goto(B + "/admin/products");
  const text = plain(await admin.locator("main").innerText());
  return Number(text.match(/(\d+) left/)?.[1]);
}

const shop = await b.newContext({ locale: "en-GB" });
await shop.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
const customer = await shop.newPage();
customer.on("pageerror", (e) => errs.push("shop " + e.message));
async function order(name, quantity) {
  await customer.goto(B + "/en/shop/mixed-fruit-pack");
  // After the page has started (it saves its own cart when it does).
  await customer.waitForLoadState("networkidle");
  await customer.evaluate(
    (q) =>
      localStorage.setItem(
        "fruidry-cart",
        JSON.stringify([{ slug: "mixed-fruit-pack", quantity: q }]),
      ),
    quantity,
  );
  await customer.goto(B + "/en/checkout");
  await customer.getByLabel("Full name").fill(name);
  await customer.getByLabel("Phone number").fill("677123456");
  await customer.getByLabel("Delivery address").fill("Douala");
  await customer.getByRole("button", { name: "Order on WhatsApp" }).click();
  await customer.waitForURL("https://wa.me/**");
}

const card = (name) => admin.locator("article", { hasText: name }).first();
const customerPage = async (name) =>
  card(name)
    .getByRole("link", { name: /View (receipt|customer page)/ })
    .getAttribute("href");
async function customerSees(href) {
  await customer.goto(B + href);
  await customer.locator("main h1").waitFor(); // the order streams in after "Loading…"
  return plain(await customer.locator("main").innerText());
}
// Opens a button's question and returns its text (question and explanation).
async function ask(name, button) {
  await card(name).getByRole("button", { name: button, exact: true }).click();
  const group = card(name).getByRole("group", { name: button });
  await group.waitFor();
  return plain(await group.innerText());
}

await setStock(10);
await order("Undo Test", 2);
await admin.goto(B + "/admin");

// ---------- Mark as paid asks first ----------
{
  const question = await ask("Undo Test", "Mark as paid");
  const focused = await admin.evaluate(() => document.activeElement?.textContent ?? "");
  check(
    "Mark as paid asks whether the money has arrived, and the question takes the focus",
    /^Has the 5 000 FCFA for FD-[A-Z0-9]{6} arrived\?/.test(question) &&
      question.includes("Check your MoMo account first") &&
      plain(focused).startsWith("Has the 5 000 FCFA"),
    `${question} | focus: ${focused}`,
  );
  await card("Undo Test").getByRole("button", { name: "Not yet" }).click();
  const focusBack = await admin.evaluate(() => document.activeElement?.textContent ?? "");
  check(
    "Not yet changes nothing and gives the focus back to the button",
    (await card("Undo Test").getByRole("group").count()) === 0 &&
      plain(await card("Undo Test").innerText()).includes("New order") &&
      focusBack === "Mark as paid",
    focusBack,
  );
  await ask("Undo Test", "Mark as paid");
  await admin.keyboard.press("Escape");
  check(
    "Escape closes the question too",
    (await card("Undo Test").getByRole("group").count()) === 0,
  );
}

// ---------- Paid, then Undo payment ----------
await ask("Undo Test", "Mark as paid");
await card("Undo Test").getByRole("button", { name: "Yes, mark as paid" }).click();
await card("Undo Test").getByRole("button", { name: "Mark as delivered" }).waitFor();
const orderHref = await customerPage("Undo Test");
check("Yes takes 2 packs off the stock count", (await stockLeft()) === 8);
{
  const seen = await customerSees(orderHref);
  check("the customer sees their receipt", seen.includes("Payment confirmed"), seen);
}

await admin.goto(B + "/admin");
{
  const question = await ask("Undo Test", "Undo payment");
  check(
    "Undo payment says what it does, including the packs",
    /Move FD-[A-Z0-9]{6} back to New orders\?/.test(question) &&
      question.includes("The customer's receipt is hidden and 2 packs go back into stock."),
    question,
  );
}
await card("Undo Test").getByRole("button", { name: "Yes, undo payment" }).click();
await card("Undo Test").getByRole("button", { name: "Mark as paid", exact: true }).waitFor();
check(
  "after Undo payment the order is a new order again",
  plain(await card("Undo Test").innerText()).includes("New order") &&
    !/RC-[A-Z0-9]{8}/.test(await card("Undo Test").innerText()),
);
check("…its 2 packs are back in stock", (await stockLeft()) === 10);
check(
  "…and the customer no longer sees a receipt",
  !(await customerSees(orderHref)).includes("Payment confirmed"),
);

// ---------- Delivered, then Undo delivery ----------
await admin.goto(B + "/admin");
await ask("Undo Test", "Mark as paid");
await card("Undo Test").getByRole("button", { name: "Yes, mark as paid" }).click();
await card("Undo Test").getByRole("button", { name: "Mark as delivered" }).waitFor();
{
  const question = await ask("Undo Test", "Mark as delivered");
  check(
    "Mark as delivered asks first",
    /^Has FD-[A-Z0-9]{6} been delivered\?/.test(question),
    question,
  );
}
await card("Undo Test").getByRole("button", { name: "Yes, mark as delivered" }).click();
await card("Undo Test").waitFor({ state: "detached" }); // leaves the dashboard's lists
{
  const seen = await customerSees(orderHref);
  check("the delivered customer is asked for a review", seen.includes("Enjoyed it?"), seen);
}
await admin.goto(B + "/admin/orders");
{
  const question = await ask("Undo Test", "Undo delivery");
  check(
    "Undo delivery says where the order goes back to",
    /Move FD-[A-Z0-9]{6} back to Paid, to deliver\?/.test(question),
    question,
  );
}
await card("Undo Test").getByRole("button", { name: "Yes, undo delivery" }).click();
await card("Undo Test").getByRole("button", { name: "Mark as delivered" }).waitFor();
{
  const text = plain(await card("Undo Test").innerText());
  const left = await stockLeft();
  check(
    "after Undo delivery the order is paid, to deliver, and the stock is unchanged",
    text.includes("Paid, to deliver") && left === 8,
    `${left} left | ${text}`,
  );
}
check(
  "…and the customer's receipt no longer asks for a review",
  !(await customerSees(orderHref)).includes("Enjoyed it?"),
);

// ---------- Undo payment after Undo delivery still knows its packs ----------
await admin.goto(B + "/admin");
{
  const question = await ask("Undo Test", "Undo payment");
  check(
    "after Undo delivery, Undo payment still knows its 2 packs",
    question.includes("2 packs go back into stock."),
    question,
  );
}
await card("Undo Test").getByRole("button", { name: "Yes, undo payment" }).click();
await card("Undo Test").getByRole("button", { name: "Mark as paid", exact: true }).waitFor();
check("…and puts them back", (await stockLeft()) === 10);

// ---------- Undo puts back what really came off, not what was ordered ----------
await setStock(1);
await admin.goto(B + "/admin");
await ask("Undo Test", "Mark as paid");
await card("Undo Test").getByRole("button", { name: "Yes, mark as paid" }).click();
await card("Undo Test").getByRole("button", { name: "Mark as delivered" }).waitFor();
check("with 1 pack left, paying for 2 leaves 0", (await stockLeft()) === 0);
await admin.goto(B + "/admin");
{
  const question = await ask("Undo Test", "Undo payment");
  check(
    "Undo payment then puts back only the pack that came off",
    question.includes("1 pack goes back into stock."),
    question,
  );
}
await card("Undo Test").getByRole("button", { name: "Yes, undo payment" }).click();
await card("Undo Test").getByRole("button", { name: "Mark as paid", exact: true }).waitFor();
check("…so the count is 1 again, not 2", (await stockLeft()) === 1);

// ---------- Cancel, then Undo cancel ----------
await order("Cancel Test", 1);
await admin.goto(B + "/admin");
{
  const reason = card("Cancel Test").getByLabel("Reason for cancelling");
  await reason.fill("Outside our delivery area");
  await reason.press("Enter"); // "Go" on a phone keyboard
  await admin.waitForTimeout(1500);
  check(
    "pressing Enter in the reason box doesn't cancel without asking",
    plain(await card("Cancel Test").innerText()).includes("New order") &&
      (await card("Cancel Test").getByRole("group").count()) === 0,
  );
}
{
  const question = await ask("Cancel Test", "Cancel order");
  check(
    "Cancel order asks first",
    /^Cancel FD-[A-Z0-9]{6}\?/.test(question) && question.includes("with your reason"),
    question,
  );
}
await card("Cancel Test").getByRole("button", { name: "Yes, cancel order" }).click();
await card("Cancel Test").waitFor({ state: "detached" });
await admin.goto(B + "/admin/orders");
const cancelHref = await customerPage("Cancel Test");
check(
  "a cancelled order shows its reason, offers Undo cancel and can't be cancelled again",
  plain(await card("Cancel Test").innerText()).includes("Rejected: Outside our delivery area") &&
    (await card("Cancel Test").getByRole("button", { name: "Undo cancel" }).count()) === 1 &&
    (await card("Cancel Test").getByRole("button", { name: "Cancel order" }).count()) === 0,
);
check(
  "the customer sees it's cancelled",
  (await customerSees(cancelHref)).includes("Outside our delivery area"),
);
await ask("Cancel Test", "Undo cancel");
await card("Cancel Test").getByRole("button", { name: "Yes, reopen order" }).click();
await card("Cancel Test").getByRole("button", { name: "Cancel order" }).waitFor();
check(
  "Undo cancel makes it a new order again",
  plain(await card("Cancel Test").innerText()).includes("New order") &&
    !(await customerSees(cancelHref)).includes("Outside our delivery area"),
);
check("cancelling never touched the stock count", (await stockLeft()) === 1);

// ---------- Paid orders that don't know what came off the stock count ----------
if (process.env.E2E_DATA_DIR) {
  const file = path.join(process.env.E2E_DATA_DIR, "orders.json");
  // Marks "Undo Test" paid, rewrites its record of the packs, then undoes the payment.
  async function payAndUndo(stockTaken) {
    await admin.goto(B + "/admin");
    await ask("Undo Test", "Mark as paid");
    await card("Undo Test").getByRole("button", { name: "Yes, mark as paid" }).click();
    await card("Undo Test").getByRole("button", { name: "Mark as delivered" }).waitFor();
    const orders = JSON.parse(fs.readFileSync(file, "utf8"));
    const paid = orders.find((o) => o.customer.name === "Undo Test");
    if (stockTaken === undefined) delete paid.stockTaken;
    else paid.stockTaken = stockTaken;
    fs.writeFileSync(file, JSON.stringify(orders, null, 2));
    await admin.goto(B + "/admin");
    const question = await ask("Undo Test", "Undo payment");
    await card("Undo Test").getByRole("button", { name: "Yes, undo payment" }).click();
    await card("Undo Test").getByRole("button", { name: "Mark as paid", exact: true }).waitFor();
    return question;
  }
  await setStock(5);
  const older = await payAndUndo(undefined); // marked paid before Undo existed
  check(
    "for an older paid order, Undo says the stock count won't change",
    older.includes("The stock count doesn't change"),
    older,
  );
  check("…and leaves the count alone", (await stockLeft()) === 3);
  const failed = await payAndUndo(null); // the stock change failed when it was paid
  check(
    "when the stock change had failed, Undo says to check the count",
    failed.includes("may not have changed when it was marked paid"),
    failed,
  );
  check("…and leaves the count alone too", (await stockLeft()) === 1);
} else {
  skip("Undo on paid orders that don't know their packs", "needs E2E_DATA_DIR (tests/run.mjs)");
}

check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
