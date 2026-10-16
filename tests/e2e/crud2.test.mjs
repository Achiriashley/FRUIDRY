// Adding, editing, ordering and deleting a product from the admin panel, with photos.
import { ADMIN_PASSWORD, BASE_URL as B, artifact, check, finish, fixture, launch } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const ctx = await b.newContext({ locale: "en-GB", viewport: { width: 1100, height: 900 } });
const errs = [];
const waUrls = [];
const uploadSizes = [];
await ctx.route("https://wa.me/**", (r) => {
  waUrls.push(r.request().url());
  r.fulfill({ status: 200, body: "wa" });
});
const a = await ctx.newPage();
a.on("pageerror", (e) => errs.push("admin " + a.url() + " " + e.message.slice(0, 80)));
// Sizes of the admin form posts that carry a photo
a.on("request", (r) => {
  const body = r.method() === "POST" && r.url().includes("/admin") ? r.postDataBuffer() : null;
  if (body && /Content-Type: image\//i.test(body.toString("latin1"))) uploadSizes.push(body.length);
});
const one = (loc) => loc.first();
const V = (pg) =>
  pg
    .locator("form:visible", { has: pg.locator('input[name="price"], input[name="phone"]') })
    .first();
const listText = async () =>
  (await a.locator("main li").allInnerTexts()).map((t) => t.replace(/\n/g, " ")).join(" || ");
// "3 200 FCFA", with any kind of space (\s includes no-break spaces)
const price = (n) => new RegExp(String(n).replace(/(\d)(\d{3})$/, "$1\\s?$2") + "\\s?FCFA");

await a.goto(B + "/admin/products");
await a.locator('input[name="password"]:visible').fill(ADMIN_PASSWORD);
await a.getByRole("button", { name: "Sign in" }).click();
await one(a.getByRole("heading", { name: "Products" })).waitFor();
await a.waitForTimeout(800);
{
  const list = await listText();
  check("signed in, the product list shows the catalogue", list.includes("Mixed Fruit Pack"), list);
}

// Create with validation errors first
await one(a.getByRole("link", { name: "+ Add product" })).click();
await one(a.getByRole("heading", { name: "Add product" })).waitFor();
await a.waitForTimeout(600);
await V(a).getByLabel("Name", { exact: true }).fill("Guava Pack");
await V(a)
  .getByLabel(/Item code/)
  .fill("FD-MIX-50");
await V(a).locator('input[type="file"]').setInputFiles(fixture("mango.jpg"));
await a.waitForTimeout(1200);
await one(a.getByRole("button", { name: "Add product" })).click();
await one(a.getByText("already uses this item code")).waitFor();
{
  const shown = (await a.locator("p.text-red-600").allInnerTexts()).join(" | ");
  check(
    "a duplicate item code and missing fields are refused with messages",
    shown.includes("already uses this item code") && shown.includes("This can't be empty"),
    shown,
  );
  const name = await V(a).getByLabel("Name", { exact: true }).inputValue();
  check("…and what was typed is kept", name === "Guava Pack", name);
}
await V(a)
  .getByLabel(/Item code/)
  .fill("fd-guava-50");
await V(a).getByLabel("Price (FCFA)", { exact: true }).fill("3000");
await V(a).getByLabel("Pack size", { exact: true }).fill("50 g");
await V(a).getByLabel("Short tagline", { exact: true }).fill("Golden, crunchy mango.");
await V(a)
  .getByLabel("Description", { exact: true })
  .fill("Freeze-dried mango slices, crunchy and sweet.");
await V(a)
  .getByLabel("Highlights (one per line)", { exact: true })
  .fill("100% mango\nNo added sugar");
await one(a.getByRole("button", { name: "Add product" })).click();
await a.waitForURL("**/admin/products?added=1");
await one(a.getByText("Product added")).waitFor();
await a.waitForTimeout(600);
{
  const list = await listText();
  check("the new product is in the admin list", list.includes("Guava Pack"), list);
}

await one(a.getByRole("link", { name: "+ Add product" })).click();
await one(a.getByRole("heading", { name: "Add product" })).waitFor();
await a.waitForTimeout(800);
{
  const name = await V(a).getByLabel("Name", { exact: true }).inputValue();
  check("opening Add product again shows an empty form", name === "", JSON.stringify(name));
}
await a.goto(B + "/admin/products");
await a.waitForTimeout(600);

// Shop shows it with photo
const c = await ctx.newPage();
c.on("pageerror", (e) => errs.push("shop " + c.url() + " " + e.message.slice(0, 80)));
await c.goto(B + "/en/shop");
await c.waitForTimeout(800);
{
  const cards = (await c.locator("article h3").allInnerTexts()).join(", ");
  check(
    "the shop lists the new product with its photo",
    cards.includes("Guava Pack") &&
      (await c.locator('article img[alt="Guava Pack"]').count()) === 1,
    cards,
  );
  const imgOk = await c
    .locator('article img[alt="Guava Pack"]')
    .evaluate((i) => i.complete && i.naturalWidth > 0);
  check("…and the photo loads", imgOk);
}
await c.goto(B + "/en");
await c.waitForTimeout(800);
{
  const cards = (await c.locator("article h3").allInnerTexts()).join(", ");
  check("the home page shows the new product", cards.includes("Guava Pack"), cards);
}
await c.screenshot({ path: artifact("crud-home.png"), fullPage: true });

// Edit: price + new photo
await a
  .getByRole("link", { name: /Guava Pack/ })
  .first()
  .click();
await a.waitForURL("**/admin/products/guava-pack");
await a.waitForTimeout(800);
await V(a).getByLabel("Price (FCFA)", { exact: true }).fill("3200");
await V(a).locator('input[type="file"]').setInputFiles(fixture("new.png"));
await a.waitForTimeout(1200);
await one(a.getByRole("button", { name: "Save changes" })).click();
await one(a.getByText("Saved ✓")).waitFor();
await a.screenshot({ path: artifact("crud-edit.png"), fullPage: true });
await c.goto(B + "/en/shop/guava-pack");
await c.waitForTimeout(800);
{
  const shownPrice = await c.locator("p.text-3xl").first().innerText();
  const code = await c.getByText("Item code").first().innerText();
  check(
    "the product page shows the new price and the item code in capitals",
    price(3200).test(shownPrice) && code.includes("FD-GUAVA-50"),
    `${shownPrice} | ${code}`,
  );
}

// Order the new product on WhatsApp
await c.getByRole("button", { name: "Buy now" }).first().click();
await c.waitForURL("**/checkout");
await V(c).getByLabel("Full name", { exact: true }).fill("Marie");
await V(c).getByLabel("Phone number", { exact: true }).fill("677123456");
await V(c).getByLabel("Delivery address", { exact: true }).fill("Douala");
await one(c.getByRole("button", { name: "Order on WhatsApp" })).click();
await c.waitForURL("https://wa.me/**");
{
  const line =
    new URL(waUrls[0]).searchParams
      .get("text")
      .split("\n")
      .find((l) => l.startsWith("•")) ?? "";
  check(
    "the WhatsApp order has the new product at its new price",
    line.includes("Guava Pack") && line.includes("FD-GUAVA-50") && price(3200).test(line),
    line,
  );
}

await c.goBack();
await c.waitForTimeout(1200);
await c.goto(B + "/en/shop/guava-pack");
await c.waitForTimeout(800);
await c.getByRole("button", { name: "Add to cart" }).first().click();
await c.getByRole("link", { name: /Cart/ }).first().click();
await one(c.getByRole("link", { name: "Checkout" })).click();
await c.waitForURL("**/checkout");
await c.waitForTimeout(1000);
check(
  "a second checkout shows the order form again",
  (await c.locator("form:visible").count()) > 0 &&
    (await c.getByRole("button", { name: "Order on WhatsApp" }).count()) === 1,
);

// Delete
await a.goto(B + "/admin/products/guava-pack");
await a.waitForTimeout(800);
let confirmText = "";
a.once("dialog", (d) => {
  confirmText = d.message();
  d.accept();
});
await one(a.getByRole("button", { name: "Delete product" })).click();
await a.waitForURL("**/admin/products?deleted=1");
await a.waitForTimeout(600);
check(
  "deleting asks for confirmation, naming the product",
  confirmText.includes("Guava Pack"),
  confirmText,
);
{
  const list = await listText();
  check(
    "the deleted product is gone from the admin list",
    !list.includes("Guava Pack") && list.includes("Mixed Fruit Pack"),
    list,
  );
}
await c.goto(B + "/en/shop/guava-pack");
await c.waitForTimeout(800);
{
  const h1 = await c.locator("h1").first().innerText();
  check("the deleted product's page says it's not found", /not found/i.test(h1), h1);
}
await c.goto(B + "/en/shop");
await c.waitForTimeout(800);
{
  const cards = (await c.locator("article h3").allInnerTexts()).join(", ");
  check(
    "the shop no longer lists it",
    !cards.includes("Guava Pack") && cards.includes("Mixed Fruit Pack"),
    cards,
  );
}
check(
  "photos are sent resized, under the 4 MB upload limit",
  uploadSizes.length >= 2 && uploadSizes.every((n) => n < 4 * 1024 * 1024),
  uploadSizes.map((n) => `${Math.round(n / 1024)} KB`).join(", "),
);
check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
