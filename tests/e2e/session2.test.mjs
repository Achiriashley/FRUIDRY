// Admin sessions: browser-session cookies, the 30-minute idle limit, the 8-hour limit,
// activity check-ins, several tabs, signing out (also with a slow network or offline),
// and the /admin/session endpoint.
import { ADMIN_PASSWORD, BASE_URL as B, check, finish, launch, nowS, signToken } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const errs = [];

// 1. Signing in sets a browser-session cookie (no expiry date)
const c1 = await b.newContext({ locale: "en-GB" });
const p1 = await c1.newPage();
p1.on("pageerror", (e) => errs.push(e.message));
await p1.goto(B + "/admin");
await p1.waitForTimeout(500);
await p1.locator('input[name="password"]:visible').fill(ADMIN_PASSWORD);
await p1.getByRole("button", { name: "Sign in" }).first().click();
await p1.getByRole("button", { name: "Sign out" }).first().waitFor();
const ck = (await c1.cookies()).find((c) => c.name === "fruidry_admin");
check(
  "sign-in cookie ends with the browser session",
  ck && ck.expires === -1 && ck.httpOnly,
  `expires ${ck?.expires}`,
);
check("cookie uses the new short-session format", /^v3\.\d+\.\d+\./.test(ck?.value ?? ""));

// 2. Closing the browser = new context without the cookie → sign in again
const c1b = await b.newContext();
const p1b = await c1b.newPage();
await p1b.goto(B + "/admin/orders");
await p1b.waitForTimeout(600);
check(
  "a new browser session asks for the password",
  (await p1b.locator('input[name="password"]:visible').count()) === 1,
);

// 3. Activity keeps the session going: a 25-minute-old session is refreshed by a click
const c2 = await b.newContext({ locale: "en-GB" });
const old = nowS() - 25 * 60;
await c2.addCookies([{ name: "fruidry_admin", value: signToken(old), url: B }]);
const p2 = await c2.newPage();
p2.on("pageerror", (e) => errs.push(e.message));
await p2.goto(B + "/admin/products");
await p2.waitForTimeout(800);
await p2.mouse.click(5, 300);
await p2.waitForTimeout(1500);
const refreshed = (await c2.cookies()).find((c) => c.name === "fruidry_admin")?.value ?? "";
const last = Number(refreshed.split(".")[2]);
check(
  "activity refreshes the session's last-activity time",
  nowS() - last < 30 && refreshed.split(".")[1] === String(old),
  `last activity ${nowS() - last}s ago`,
);

// 4. 30 minutes without activity on an open page → signed out. The server's clock is
// real, so the cookie is ~6 s from its idle limit and the page's clock is fast-forwarded.
const c3 = await b.newContext({ locale: "en-GB" });
const nearIdle = nowS() - (30 * 60 - 6);
const nearIdleTok = signToken(nearIdle);
await c3.addCookies([{ name: "fruidry_admin", value: nearIdleTok, url: B }]);
const p3 = await c3.newPage();
p3.on("pageerror", (e) => errs.push(e.message));
await p3.clock.install();
await p3.goto(B + "/admin/orders");
await p3.waitForTimeout(800);
check(
  "open admin page starts signed in",
  await p3.getByRole("button", { name: "Sign out" }).first().isVisible(),
);
check("no 8-hour warning on a fresh session", (await p3.getByText("signed out at").count()) === 0);
await p3.clock.fastForward("31:00");
await p3
  .locator('input[name="password"]:visible')
  .first()
  .waitFor({ timeout: 30000 })
  .catch(() => {});
check(
  "after 30 idle minutes the page shows the sign-in form",
  (await p3.locator('input[name="password"]:visible').count()) === 1,
);
const c3b = await b.newContext();
await c3b.addCookies([{ name: "fruidry_admin", value: nearIdleTok, url: B }]);
const p3b = await c3b.newPage();
await p3b.goto(B + "/admin");
await p3b.waitForTimeout(600);
check(
  "…and the old cookie no longer works",
  (await p3b.locator('input[name="password"]:visible').count()) === 1,
);

// 5. An action after the session ended goes back to sign-in instead of crashing
const shop = await (await b.newContext({ locale: "en-GB" })).newPage();
await shop.context().route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
await shop.goto(B + "/en/shop/mixed-fruit-pack");
await shop.waitForTimeout(500);
await shop.evaluate(() =>
  localStorage.setItem("fruidry-cart", JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 1 }])),
);
await shop.goto(B + "/en/checkout");
await shop.waitForTimeout(800);
const f = shop.locator("form:visible", { has: shop.locator('input[name="phone"]') }).first();
await f.getByLabel("Full name").fill("Session Test");
await f.getByLabel("Phone number").fill("677123456");
await f.getByLabel("Delivery address").fill("Douala");
const nav = shop.waitForURL("https://wa.me/**", { timeout: 6000 }).catch(() => {});
await f.getByRole("button", { name: "Order on WhatsApp" }).click();
await nav;
const c4 = await b.newContext({ locale: "en-GB" });
await c4.addCookies([{ name: "fruidry_admin", value: signToken(nowS()), url: B }]);
const p4 = await c4.newPage();
p4.on("pageerror", (e) => errs.push(e.message));
await p4.goto(B + "/admin/orders");
await p4.waitForTimeout(900);
const expired = nowS() - 40 * 60;
await c4.addCookies([{ name: "fruidry_admin", value: signToken(expired), url: B }]);
await p4.getByRole("button", { name: "Mark as paid" }).first().click();
await p4.getByRole("button", { name: "Yes, mark as paid" }).click();
await p4.waitForTimeout(2000);
check(
  "Mark as paid with an ended session shows the sign-in form",
  (await p4.locator('input[name="password"]:visible').count()) === 1,
  p4.url(),
);
const c5 = await b.newContext();
await c5.addCookies([{ name: "fruidry_admin", value: signToken(nowS()), url: B }]);
const html = await (
  await (await c5.newPage()).goto(B + "/admin/orders?status=awaiting_payment")
).text();
check("…and the order was not marked paid", html.includes("Session Test"));
// 6. Two tabs: one in use, one left alone. The idle tab must not sign out the busy one.
{
  const c = await b.newContext({ locale: "en-GB" });
  const t0 = nowS();
  await c.addCookies([{ name: "fruidry_admin", value: signToken(t0), url: B }]);
  await c.clock.install();
  const busy = await c.newPage();
  busy.on("pageerror", (e) => errs.push(e.message));
  const idle = await c.newPage();
  idle.on("pageerror", (e) => errs.push(e.message));
  const actions = [];
  for (const [name, pg] of [
    ["busy", busy],
    ["idle", idle],
  ]) {
    pg.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith("/admin/session")) actions.push(name);
    });
  }
  await idle.goto(B + "/admin");
  await busy.goto(B + "/admin/products/new");
  await busy.waitForTimeout(800);
  const name = busy.getByLabel("Name", { exact: true }).first();
  for (let i = 0; i < 7; i++) {
    await name.pressSequentially("ab");
    await c.clock.fastForward("05:00");
    await busy.waitForTimeout(400);
  }
  await idle.bringToFront();
  await idle.waitForTimeout(300);
  await idle.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await busy.waitForTimeout(16000); // let both pages' 15 s checks run
  const cookie = (await c.cookies()).find((x) => x.name === "fruidry_admin");
  check(
    "an idle tab leaves the busy tab signed in",
    Boolean(cookie) && (await busy.getByRole("button", { name: "Sign out" }).first().isVisible()),
    `actions: ${actions.join(",")}`,
  );
  check(
    "…and keeps what was typed",
    (await name.inputValue()).length === 14,
    await name.inputValue(),
  );
  check(
    "…and the idle tab itself stays signed in (the session is in use)",
    await idle.getByRole("button", { name: "Sign out" }).first().isVisible(),
  );
  await c.close();
}

// 7. A page Next.js kept in memory, shown again after 30+ minutes on another page
{
  const c = await b.newContext({ locale: "en-GB" });
  const t0 = nowS();
  await c.addCookies([{ name: "fruidry_admin", value: signToken(t0), url: B }]);
  await c.clock.install();
  const pg = await c.newPage();
  pg.on("pageerror", (e) => errs.push(e.message));
  await pg.goto(B + "/admin");
  await pg.waitForTimeout(800);
  await pg.getByRole("link", { name: "Products" }).first().click();
  await pg.waitForURL("**/admin/products");
  await pg.waitForTimeout(800);
  for (let i = 0; i < 17; i++) {
    await c.clock.fastForward("02:00");
    await pg.mouse.click(5, 400);
    await pg.waitForTimeout(150);
  }
  await pg.getByRole("link", { name: "Dashboard" }).first().click();
  await pg.waitForURL(/\/admin$/);
  await pg.waitForTimeout(2500);
  const cookie = (await c.cookies()).find((x) => x.name === "fruidry_admin");
  check(
    "going back to a page kept in memory doesn't sign out",
    Boolean(cookie) && (await pg.getByRole("button", { name: "Sign out" }).first().isVisible()),
  );
  await c.close();
}

// 8. The 8-hour limit: a warning first, then the sign-in form
{
  const c = await b.newContext({ locale: "en-GB" });
  const t = nowS();
  await c.addCookies([{ name: "fruidry_admin", value: signToken(t - 8 * 3600 + 10, t), url: B }]);
  const pg = await c.newPage();
  pg.on("pageerror", (e) => errs.push(e.message));
  await pg.goto(B + "/admin/products");
  await pg.waitForTimeout(1500);
  check(
    "a warning shows before the 8-hour limit",
    await pg.getByText("signed out at").first().isVisible(),
  );
  await pg
    .locator('input[name="password"]:visible')
    .first()
    .waitFor({ timeout: 35000 })
    .catch(() => {});
  check(
    "…and at the limit the page shows the sign-in form",
    (await pg.locator('input[name="password"]:visible').count()) === 1,
  );
  await c.close();
}

// 9. Check-ins: only real activity counts, and they don't reload the page's data
{
  const c = await b.newContext({ locale: "en-GB" });
  const t = nowS() - 60;
  const tok = signToken(t);
  await c.addCookies([{ name: "fruidry_admin", value: tok, url: B }]);
  const pg = await c.newPage();
  pg.on("pageerror", (e) => errs.push(e.message));
  const reqs = [];
  pg.on("request", (r) =>
    reqs.push(`${r.method()} ${r.url().replace(B, "")} ${r.headers()["rsc"] ? "rsc" : ""}`),
  );
  await pg.goto(B + "/admin/orders");
  await pg.waitForTimeout(1500);
  for (let i = 0; i < 10; i++) {
    await pg.evaluate((y) => window.scrollTo(0, y), i % 2 ? 400 : 0);
    await pg.waitForTimeout(150);
  }
  await pg.waitForTimeout(800);
  const afterScroll = (await c.cookies()).find((x) => x.name === "fruidry_admin")?.value;
  check("the page scrolling by itself doesn't count as activity", afterScroll === tok);
  reqs.length = 0;
  await pg.mouse.click(5, 300);
  await pg.waitForTimeout(1500);
  const afterClick = (await c.cookies()).find((x) => x.name === "fruidry_admin")?.value;
  check(
    "a click counts as activity",
    afterClick && afterClick !== tok && afterClick.split(".")[1] === String(t),
  );
  const rsc = reqs.filter((r) => r.endsWith("rsc") || r.includes("_rsc"));
  check(
    "the check-in doesn't reload the page's data",
    reqs.some((r) => r.startsWith("POST /admin/session")) && rsc.length === 0,
    reqs.join(" | "),
  );
  // Sign out: back to the sign-in form, cookie gone, pages kept in memory cleared
  await pg.getByRole("link", { name: "Products" }).first().click();
  await pg.waitForURL("**/admin/products");
  await pg.waitForTimeout(500);
  await pg.getByRole("button", { name: "Sign out" }).first().click();
  await pg
    .locator('input[name="password"]:visible')
    .first()
    .waitFor({ timeout: 10000 })
    .catch(() => {});
  check(
    "Sign out shows the sign-in form and removes the cookie",
    (await pg.locator('input[name="password"]:visible').count()) === 1 &&
      !(await c.cookies()).some((x) => x.name === "fruidry_admin"),
  );
  const html = await pg.content();
  check(
    "…and no order or admin data stays in the page",
    !html.includes("Mark as paid") &&
      !html.includes("Add product") &&
      !html.includes("Session Test"),
  );
  await c.close();
}

// 10. The session endpoint: JSON only, nothing without a valid cookie
{
  const r1 = await fetch(B + "/admin/session", {
    method: "POST",
    body: "active=true",
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  check("session endpoint refuses form posts", r1.status === 415, String(r1.status));
  const r2 = await fetch(B + "/admin/session", {
    method: "POST",
    body: '{"active":true}',
    headers: { "content-type": "application/json" },
  });
  check(
    "session endpoint without a cookie returns null and sets no cookie",
    r2.status === 200 && (await r2.text()) === "null" && !r2.headers.get("set-cookie"),
  );
  const old = nowS() - 31 * 60;
  const r3 = await fetch(B + "/admin/session", {
    method: "POST",
    body: '{"active":true}',
    headers: { "content-type": "application/json", cookie: `fruidry_admin=${signToken(old)}` },
  });
  check(
    "…nor with an idle-expired cookie",
    (await r3.text()) === "null" && !r3.headers.get("set-cookie"),
  );
  const t = nowS() - 100;
  const r4 = await fetch(B + "/admin/session", {
    method: "POST",
    body: '{"active":false}',
    headers: {
      "content-type": "application/json",
      cookie: `fruidry_admin=${signToken(t - 1000, t)}`,
    },
  });
  const j4 = await r4.json();
  check(
    "status without activity doesn't extend the session",
    !r4.headers.get("set-cookie") && j4.idleSeconds >= 99 && j4.secondsLeft <= 8 * 3600 - 1099,
    JSON.stringify(j4),
  );
  const r5 = await fetch(B + "/admin/session", {
    method: "POST",
    body: '{"active":true}',
    headers: {
      "content-type": "application/json",
      cookie: `fruidry_admin=${signToken(t - 1000, t)}`,
    },
  });
  const sc = r5.headers.get("set-cookie") ?? "";
  check(
    "activity re-issues the cookie (same sign-in time, HttpOnly, no expiry)",
    sc.includes(`fruidry_admin=v3.${t - 1000}.`) &&
      /HttpOnly/i.test(sc) &&
      !/expires|max-age/i.test(sc),
    sc.replace(/=v3\.[^;]+/, "=…"),
  );
}

// 11. Sign out while a check-in from the same click is still on its way (slow network)
{
  let leftSignedIn = 0;
  for (let i = 0; i < 6; i++) {
    const c = await b.newContext({ locale: "en-GB" });
    const t = nowS() - 180;
    await c.addCookies([{ name: "fruidry_admin", value: signToken(t), url: B }]);
    await c.route("**/admin/session", async (route) => {
      const r = await route.fetch();
      await new Promise((ok) => setTimeout(ok, 300));
      route.fulfill({ response: r });
    });
    const pg = await c.newPage();
    pg.on("pageerror", (e) => errs.push(e.message));
    await pg.goto(B + "/admin");
    await pg.waitForTimeout(1200);
    const btn = pg.getByRole("button", { name: "Sign out" }).first();
    if (i % 2) {
      await btn.focus();
      await pg.keyboard.press("Enter");
    } else {
      await btn.click();
    }
    await pg.waitForTimeout(2500);
    if ((await c.cookies()).some((x) => x.name === "fruidry_admin")) leftSignedIn++;
    await c.close();
  }
  check(
    "signing out works even with a check-in on its way",
    leftSignedIn === 0,
    `${leftSignedIn}/6 left signed in`,
  );
}

// 12. Sign out while offline: it says so and finishes once the connection is back
{
  const c = await b.newContext({ locale: "en-GB" });
  const t = nowS();
  await c.addCookies([{ name: "fruidry_admin", value: signToken(t), url: B }]);
  const pg = await c.newPage();
  pg.on("pageerror", (e) => errs.push(e.message));
  await pg.goto(B + "/admin");
  await pg.waitForTimeout(1200);
  await c.setOffline(true);
  await pg.getByRole("button", { name: "Sign out" }).first().click();
  await pg.waitForTimeout(1500);
  check(
    "offline sign-out says it's signing out (it waits for the connection)",
    await pg.getByRole("button", { name: "Signing out…" }).first().isVisible(),
  );
  await c.setOffline(false);
  await pg
    .locator('input[name="password"]:visible')
    .first()
    .waitFor({ timeout: 10000 })
    .catch(() => {});
  check(
    "…and finishes once back online",
    (await pg.locator('input[name="password"]:visible').count()) === 1 &&
      !(await c.cookies()).some((x) => x.name === "fruidry_admin"),
  );
  await c.close();
}

check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
