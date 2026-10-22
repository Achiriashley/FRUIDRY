// Signing out with several admin tabs open: a slow answer from another tab can't sign
// back in; signing in again right after signing out works; and pressing Sign in before
// the page has finished loading still signs in.
//
// Only the tabs opened with a minted sign-in use the admin harness; the sign-in tests
// use real page loads, each from its own address (X-Real-IP).
import {
  ADMIN_PASSWORD,
  BASE_URL as B,
  adminHarness,
  check,
  finish,
  launch,
  nowS,
  signToken,
} from "./lib.mjs";

const b = await launch();
const errs = [];

// 1. Tab B's slow request (sent before sign-out, answered after) can't bring the sign-in back
for (const kind of ["check-in", "Mark as paid"]) {
  const c = await b.newContext({ locale: "en-GB" });
  await adminHarness(c);
  const t = nowS() - 180;
  await c.addCookies([{ name: "fruidry_admin", value: signToken(t), url: B }]);
  const A = await c.newPage();
  A.on("pageerror", (e) => errs.push(e.message));
  const Bp = await c.newPage();
  Bp.on("pageerror", (e) => errs.push(e.message));
  await A.goto(B + "/admin");
  await Bp.goto(B + "/admin/orders");
  await Bp.waitForTimeout(1200);
  // B's requests reach the server at once but their answers arrive 2.5 s later.
  await Bp.route("**/admin/**", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const r = await route.fetch();
    await new Promise((ok) => setTimeout(ok, 2500));
    return route.fulfill({ response: r });
  });
  if (kind === "check-in") await Bp.mouse.click(5, 400);
  else {
    const paid = Bp.getByRole("button", { name: "Mark as paid" }).first();
    if (await paid.count()) {
      await paid.click();
      await Bp.getByRole("button", { name: "Yes, mark as paid" }).click();
    } else await Bp.mouse.click(5, 400);
  }
  await A.waitForTimeout(400);
  await A.bringToFront();
  await A.getByRole("button", { name: "Sign out" }).first().click();
  await A.waitForTimeout(4500); // B's late answer has arrived by now
  const back = (await c.cookies()).find((x) => x.name === "fruidry_admin");
  const status = await (
    await c.request.post(B + "/admin/session", {
      headers: { "content-type": "application/json" },
      data: { active: false },
    })
  ).text();
  check(
    `after sign-out, a late ${kind} answer from another tab doesn't sign back in`,
    status === "null",
    `cookie ${back ? "came back" : "gone"}, session: ${status}`,
  );
  await Bp.unroute("**/admin/**");
  await Bp.getByRole("link", { name: "Dashboard" })
    .first()
    .click()
    .catch(() => {});
  await Bp.locator('input[name="password"]:visible')
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  check(
    `…and the other tab asks for the password too`,
    (await Bp.locator('input[name="password"]:visible').count()) === 1,
  );
  await c.close();
}

// 2. Signing in again after signing out works (the sign-out marker doesn't get in the way)
{
  const c = await b.newContext({ locale: "en-GB" });
  const pg = await c.newPage();
  pg.on("pageerror", (e) => errs.push(e.message));
  await pg.setExtraHTTPHeaders({ "x-real-ip": "10.7.7.1" });
  await pg.goto(B + "/admin");
  await pg.waitForTimeout(500);
  await pg.locator('input[name="password"]:visible').first().fill(ADMIN_PASSWORD);
  await pg.getByRole("button", { name: "Sign in" }).first().click();
  await pg.getByRole("button", { name: "Sign out" }).first().waitFor();
  await pg.getByRole("button", { name: "Sign out" }).first().click();
  await pg.locator('input[name="password"]:visible').first().waitFor();
  await pg.locator('input[name="password"]:visible').first().fill(ADMIN_PASSWORD);
  await pg.getByRole("button", { name: "Sign in" }).first().click();
  await pg
    .getByRole("button", { name: "Sign out" })
    .first()
    .waitFor({ timeout: 10000 })
    .catch(() => {});
  await pg.getByRole("link", { name: "Orders" }).first().click();
  await pg.waitForTimeout(1500);
  check(
    "signing in right after signing out works",
    await pg.getByRole("button", { name: "Sign out" }).first().isVisible(),
  );
  await c.close();
}

// 3. Pressing Sign in before the page has finished loading
{
  const c = await b.newContext({ locale: "en-GB" });
  const pg = await c.newPage();
  pg.on("pageerror", (e) => errs.push(e.message));
  await pg.setExtraHTTPHeaders({ "x-real-ip": "10.7.7.2" });
  let hold = true;
  await c.route(/\/_next\/static\/chunks\/.*\.js/, async (route) => {
    while (hold) await new Promise((ok) => setTimeout(ok, 100));
    route.continue();
  });
  await pg.goto(B + "/admin", { waitUntil: "commit" });
  await pg.locator('input[name="password"]').first().waitFor({ state: "attached", timeout: 15000 });
  const visible = await pg.locator('input[name="password"]').first().isVisible();
  await pg.locator('input[name="password"]').first().fill(ADMIN_PASSWORD, { force: true });
  // The form can arrive a moment before it's shown; the page's scripts are still held.
  const signIn = pg.locator('button[type="submit"]').first();
  await signIn.waitFor({ state: "visible", timeout: 15000 });
  await signIn.click({ noWaitAfter: true, force: true });
  await pg.waitForTimeout(800);
  hold = false;
  await pg
    .getByRole("button", { name: "Sign out" })
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  check(
    "Sign in pressed before the page finished loading still signs in",
    await pg.getByRole("button", { name: "Sign out" }).first().isVisible(),
    `${pg.url()} (password box visible before scripts loaded: ${visible})`,
  );
  await c.close();
}
check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
