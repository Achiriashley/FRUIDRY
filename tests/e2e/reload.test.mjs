// Every full page load of the admin panel (opening, reloading, a new tab, the Back
// button, a typed address) asks for the password; working inside the panel doesn't.
//
// Runs WITHOUT the admin harness: real browser page loads are what's being tested.
// Each sign-in comes from its own address (X-Real-IP), so the 5-attempt sign-in limit
// isn't reached.
import { ADMIN_PASSWORD, BASE_URL as B, check, finish, launch } from "./lib.mjs";

const b = await launch();
const errs = [];
let ip = 10;
const signIn = async (pg) => {
  await pg.setExtraHTTPHeaders({ "x-real-ip": `10.9.8.${ip++}` }); // own rate-limit bucket per sign-in
  await pg.locator('input[name="password"]:visible').first().fill(ADMIN_PASSWORD);
  await pg.getByRole("button", { name: "Sign in" }).first().click();
  await pg.getByRole("button", { name: "Sign out" }).first().waitFor();
};
const signedIn = (pg) => pg.getByRole("button", { name: "Sign out" }).first().isVisible();
const passwordShown = async (pg) =>
  (await pg.locator('input[name="password"]:visible').count()) === 1;
const hasCookie = async (c) => (await c.cookies()).some((x) => x.name === "fruidry_admin");

const c = await b.newContext({ locale: "en-GB" });
const pg = await c.newPage();
pg.on("pageerror", (e) => errs.push(e.message));
await pg.goto(B + "/admin");
await pg.waitForTimeout(600);
check("opening the admin panel asks for the password", await passwordShown(pg));
check(
  "…and explains when it's needed",
  await pg.getByText("each time the admin panel is opened or reloaded").isVisible(),
);
// The eye button shows and hides the password.
{
  const field = pg.locator('input[name="password"]:visible').first();
  await field.fill("peek-123");
  check("the password starts hidden", (await field.getAttribute("type")) === "password");
  await pg.getByRole("button", { name: "Show password" }).click();
  check(
    "the eye shows it",
    (await field.getAttribute("type")) === "text" &&
      (await field.inputValue()) === "peek-123" &&
      (await pg.getByRole("button", { name: "Hide password" }).getAttribute("aria-pressed")) ===
        "true",
  );
  await pg.getByRole("button", { name: "Hide password" }).click();
  check("…and hides it again", (await field.getAttribute("type")) === "password");
  await pg.getByRole("button", { name: "Show password" }).click();
  await pg.setExtraHTTPHeaders({ "x-real-ip": "10.9.7.1" });
  await pg.getByRole("button", { name: "Sign in" }).first().click();
  await pg.getByText("Wrong password.").waitFor();
  check("a sign-in attempt hides it again", (await field.getAttribute("type")) === "password");
  await field.fill("");
}
await signIn(pg);
check("signing in shows the panel", await signedIn(pg));
for (const name of ["Orders", "Products", "Dashboard"]) {
  await pg.getByRole("link", { name }).first().click();
  await pg.waitForTimeout(1200);
}
check(
  "moving around the panel keeps you signed in",
  (await signedIn(pg)) && (await hasCookie(c)),
  pg.url(),
);
await pg.getByRole("link", { name: "Products" }).first().click();
await pg.waitForURL("**/admin/products");
await pg
  .getByRole("link", { name: /Mixed Fruit Pack/ })
  .first()
  .click();
await pg.waitForTimeout(1500);
check(
  "opening a product from the list keeps you signed in",
  (await signedIn(pg)) && /\/admin\/products\/mixed-fruit-pack$/.test(pg.url()),
  pg.url(),
);
await pg.getByRole("link", { name: "Dashboard" }).first().click();
await pg.waitForTimeout(36000); // dashboard auto-refreshes every 30 s
check(
  "the dashboard's auto-refresh keeps you signed in",
  (await signedIn(pg)) && (await hasCookie(c)),
);
await pg.reload();
await pg.waitForTimeout(800);
check("reloading asks for the password", await passwordShown(pg));
check("…and the old sign-in is gone", !(await hasCookie(c)));
await signIn(pg);
const pg2 = await c.newPage();
pg2.on("pageerror", (e) => errs.push(e.message));
await pg2.goto(B + "/admin/orders");
await pg2.waitForTimeout(800);
check("opening the panel in a new tab asks for the password", await passwordShown(pg2));
await pg2.close();
await pg.bringToFront();
await pg.mouse.click(5, 300);
await pg.waitForTimeout(2500);
check("…and the first tab then asks for it too", await passwordShown(pg));
await signIn(pg);
await pg.goto(B + "/en");
await pg.waitForTimeout(800);
await pg.goBack();
await pg.waitForTimeout(1500);
check("coming back with the Back button asks for the password", await passwordShown(pg), pg.url());
await signIn(pg);
const t = await c.newPage();
await t.goto(B + "/admin/products/new");
await t.waitForTimeout(500);
check("a typed address to a deep admin page asks for the password", await passwordShown(t));
// Everyday admin work doesn't ask for the password: search, filters, Mark as paid, saving a product
{
  const shop = await (await b.newContext({ locale: "en-GB" })).newPage();
  await shop.context().route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
  await shop.goto(B + "/en/shop/mixed-fruit-pack");
  await shop.waitForTimeout(500);
  await shop.evaluate(() =>
    localStorage.setItem(
      "fruidry-cart",
      JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 1 }]),
    ),
  );
  await shop.goto(B + "/en/checkout");
  await shop.waitForTimeout(800);
  const f = shop.locator("form:visible", { has: shop.locator('input[name="phone"]') }).first();
  await f.getByLabel("Full name").fill("Reload Test");
  await f.getByLabel("Phone number").fill("677999888");
  await f.getByLabel("Delivery address").fill("Yaoundé");
  const nav = shop.waitForURL("https://wa.me/**", { timeout: 6000 }).catch(() => {});
  await f.getByRole("button", { name: "Order on WhatsApp" }).click();
  await nav;
  await shop.context().close();

  const ctx = await b.newContext({ locale: "en-GB" });
  const a = await ctx.newPage();
  a.on("pageerror", (e) => errs.push(e.message));
  await a.goto(B + "/admin/orders");
  await a.waitForTimeout(600);
  await signIn(a);
  await a.getByLabel("Search orders").fill("Reload Test");
  await a.getByRole("button", { name: "Search" }).click();
  await a.waitForURL(/q=Reload/);
  await a.waitForTimeout(1200);
  check(
    "searching orders keeps you signed in",
    (await signedIn(a)) && (await a.getByText("Reload Test").count()) > 0,
    a.url(),
  );
  await a.getByRole("link", { name: /^New/ }).first().click();
  await a.waitForTimeout(1200);
  check("status filters keep you signed in", await signedIn(a), a.url());
  await a.getByLabel("Search orders").fill("Reload Test");
  await a.getByRole("button", { name: "Search" }).click();
  await a.waitForTimeout(1200);
  await a.getByRole("button", { name: "Mark as paid" }).first().click();
  await a.getByRole("button", { name: "Yes, mark as paid" }).click();
  await a.waitForTimeout(2000);
  const stillIn = await signedIn(a);
  await a.getByRole("link", { name: /^All/ }).first().click();
  await a.waitForTimeout(1500);
  check(
    "Mark as paid works and keeps you signed in",
    stillIn && (await signedIn(a)) && (await a.getByText(/RC-[A-Z0-9]{8}/).count()) > 0,
    a.url(),
  );
  await a.getByRole("link", { name: "Products" }).first().click();
  await a.waitForURL("**/admin/products");
  await a
    .getByRole("link", { name: /Mixed Fruit Pack/ })
    .first()
    .click();
  await a.waitForTimeout(1500);
  await a.getByRole("button", { name: /^Save/ }).first().click();
  await a.waitForTimeout(2500);
  check(
    "saving a product keeps you signed in",
    (await signedIn(a)) && (await hasCookie(ctx)),
    a.url(),
  );
  await ctx.close();
}

check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
