// The full copy of the shop (Dashboard): the reminder when no copy was saved on this
// device or the last one is over a month old, the download itself (every order with the
// customer's details, Books, products, reviews, waiting list), and that it's only for
// the signed-in admin.
import { ADMIN_PASSWORD, BASE_URL as B, check, finish, launch, unzip } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const errs = [];
const plain = (text) => text.replace(/[\s  ]+/g, " ").trim();

// Some data to copy: an order, a sale in person and a waiting-list number (more below).
const shop = await b.newContext({ locale: "en-GB" });
await shop.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
const customer = await shop.newPage();
customer.on("pageerror", (e) => errs.push("shop " + e.message));
await customer.goto(B + "/en/shop/mixed-fruit-pack");
// After the page has started (it saves its own cart when it does).
await customer.waitForLoadState("networkidle");
await customer.evaluate(() =>
  localStorage.setItem("fruidry-cart", JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 3 }])),
);
await customer.goto(B + "/en/checkout");
await customer.getByLabel("Full name").fill("Backup Tester");
await customer.getByLabel("Phone number").fill("699 88 77 66");
await customer.getByLabel("Delivery address").fill("Yaoundé, Bastos & Co <2>");
await customer.getByRole("button", { name: "Order on WhatsApp" }).click();
await customer.waitForURL("https://wa.me/**");
await customer.goto(B + "/en/shop/mango-pack");
{
  const notify = customer.locator("form", {
    has: customer.getByRole("heading", { name: "Want to know when it's here?" }),
  });
  await notify.getByLabel("WhatsApp number").fill("655 44 33 22");
  await notify.getByRole("button", { name: "Notify me" }).click();
  await customer.getByText(/We'll message you on WhatsApp/).waitFor();
}

const a = await (await b.newContext({ locale: "en-GB", acceptDownloads: true })).newPage();
a.on("pageerror", (e) => errs.push("admin " + e.message));
await a.goto(B + "/admin");
await a.locator('input[name="password"]:visible').fill(ADMIN_PASSWORD);
await a.getByRole("button", { name: "Sign in" }).first().click();
await a.getByRole("heading", { name: "Dashboard" }).waitFor();

await a.goto(B + "/admin/books");
{
  const sale = a
    .locator("details")
    .filter({ has: a.locator("summary", { hasText: "Sale in person" }) })
    .first();
  if (!(await sale.evaluate((el) => el.open))) await sale.locator("summary").click();
  await sale.getByLabel("Product").selectOption("mixed-fruit-pack");
  await sale.getByLabel("Packs sold").fill("2");
  await sale.getByLabel("Paid by").selectOption("cash");
  await sale.getByLabel(/Note/).fill("Market stall");
  await sale.getByRole("button", { name: "Record sale" }).click();
  await a.locator("li", { hasText: "Market stall" }).first().waitFor();
}

// ---------- The reminder ----------
await a.getByRole("link", { name: "Dashboard" }).first().click();
await a.getByRole("heading", { name: "Dashboard" }).waitFor();
const reminder = a.getByRole("region", { name: "Time to save a copy of your shop" });
await reminder.waitFor();
check(
  "with no copy saved on this device, the dashboard reminds you at the top",
  plain(await reminder.innerText()).includes("You haven't saved a full copy on this device yet.") &&
    (await a.getByRole("region", { name: "Full copy of your shop" }).count()) === 0,
);
const [download] = await Promise.all([
  a.waitForEvent("download"),
  reminder.getByRole("button", { name: "⬇ Download a full copy" }).click(),
]);
check(
  "the button downloads one Excel file named with today's date",
  /^fruidry-backup-\d{4}-\d{2}-\d{2}\.xlsx$/.test(download.suggestedFilename()),
  download.suggestedFilename(),
);
await a.getByText("Your full copy is downloading.").waitFor();
const bottom = a.getByRole("region", { name: "Full copy of your shop" });
check(
  "after saving, the reminder says so and the button moves to the bottom",
  (await a.getByRole("region", { name: "Time to save a copy of your shop" }).count()) === 0 &&
    plain(await bottom.innerText()).includes("Last copy on this device: today"),
);
// A copy saved 40 days ago brings the reminder back.
await a.evaluate(() => {
  localStorage.setItem(
    "fruidry-last-full-copy",
    new Date(Date.now() - 40 * 86_400_000).toISOString(),
  );
  window.dispatchEvent(new Event("fruidry-full-copy-saved"));
});
await reminder.waitFor();
check(
  "a copy older than a month brings the reminder back",
  plain(await reminder.innerText()).includes("Your last full copy on this device is 40 days old."),
);

// ---------- More to copy: a published review, paid/delivered and cancelled orders ----------
await customer.goto(B + "/en/shop/mixed-fruit-pack");
{
  const review = customer.locator("form", {
    has: customer.getByRole("heading", { name: "Leave a review" }),
  });
  await review
    .locator("label")
    .filter({ has: customer.getByRole("radio", { name: "5 stars" }) })
    .click();
  await review.getByLabel("Your first name").fill("Nadia");
  await review.getByLabel("Your review").fill("Crunchy and sweet, my kids love it.");
  await review.getByRole("button", { name: "Send my review" }).click();
  await customer.getByText(/Your review will appear here/).waitFor();
}
await customer.waitForLoadState("networkidle");
await customer.evaluate(() =>
  localStorage.setItem("fruidry-cart", JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 1 }])),
);
await customer.goto(B + "/en/checkout");
await customer.getByLabel("Full name").fill("Cancelled Buyer");
await customer.getByLabel("Phone number").fill("688 00 11 22");
await customer.getByLabel("Delivery address").fill("Buea");
await customer.getByRole("button", { name: "Order on WhatsApp" }).click();
await customer.waitForURL("https://wa.me/**");

await a.goto(B + "/admin/reviews");
await a.getByRole("button", { name: "Publish" }).first().click();
await a.getByRole("button", { name: "Publish" }).waitFor({ state: "detached" });
await a.goto(B + "/admin");
{
  const paid = a.locator("article", { hasText: "Backup Tester" }).first();
  await paid.getByRole("button", { name: "Mark as paid", exact: true }).click();
  await paid.getByRole("button", { name: "Yes, mark as paid" }).click();
  await paid.getByRole("button", { name: "Mark as delivered", exact: true }).click();
  await paid.getByRole("button", { name: "Yes, mark as delivered" }).click();
  await paid.waitFor({ state: "detached" });
  const cancel = a.locator("article", { hasText: "Cancelled Buyer" }).first();
  await cancel.getByLabel("Reason for cancelling").fill("Changed their mind");
  await cancel.getByRole("button", { name: "Cancel order", exact: true }).click();
  await cancel.getByRole("button", { name: "Yes, cancel order" }).click();
  await cancel.waitFor({ state: "detached" });
}

// ---------- What's in the file ----------
const files = unzip(Buffer.from(await (await a.request.get(B + "/admin/backup")).body()));
const sheet = (n) => files[`xl/worksheets/sheet${n}.xml`] ?? "";
check(
  "the file has a sheet for each part of the shop",
  /About this copy.*Orders.*Books.*Products.*Reviews.*Waiting list/.test(
    files["xl/workbook.xml"] ?? "",
  ),
  files["xl/workbook.xml"],
);
check(
  "Orders has the customer's details and the order's link",
  ["Backup Tester", "699887766", "Yaoundé, Bastos &amp; Co &lt;2&gt;"].every((t) =>
    sheet(2).includes(t),
  ) &&
    /FD-[A-Z0-9]{6}/.test(sheet(2)) &&
    /\/en\/order\/[A-Za-z0-9_-]{16}/.test(sheet(2)) &&
    sheet(2).includes("<v>7500</v>"),
);
check(
  "…with each order's status, receipt, delivery date and cancel reason",
  [">Delivered</t>", ">Cancelled</t>", ">Changed their mind</t>", "Cancelled Buyer"].every((t) =>
    sheet(2).includes(t),
  ) &&
    /RC-[A-Z0-9]{8}/.test(sheet(2)) &&
    (sheet(2).match(/<row /g) ?? []).length === 3,
);
check(
  "Reviews has the published review",
  ["Nadia", "Crunchy and sweet, my kids love it.", "Published", "Mixed Fruit Pack"].every((t) =>
    sheet(5).includes(t),
  ) && sheet(5).includes("<v>5</v>"),
);
check(
  "Books has the sale in person",
  sheet(3).includes("Sale in person") &&
    sheet(3).includes("Market stall") &&
    sheet(3).includes("Cash"),
);
check(
  "Products and the waiting list are there too",
  sheet(4).includes("Mixed Fruit Pack") &&
    sheet(4).includes("FD-MIX-50") &&
    sheet(6).includes("655443322") &&
    sheet(6).includes("Mango"),
);
check(
  "the first sheet says what's inside and to keep it private",
  sheet(1).includes("Keep it private") &&
    /Orders<\/t><\/is><\/c><c r="B\d+"[^>]*><v>2<\/v>/.test(sheet(1)),
);

// ---------- Only for the admin ----------
const res = await a.request.get(B + "/admin/backup");
check("the file is never cached", res.headers()["cache-control"] === "no-store");
const anon = await fetch(B + "/admin/backup");
check("it can't be downloaded without signing in", anon.status === 401, anon.status);

check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
