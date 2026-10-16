// A check-in that never gets an answer (bad connection) must not stop the page from
// signing out at the 30-minute idle limit.
import { BASE_URL as B, check, finish, launch, nowS, signToken } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const c = await b.newContext({ locale: "en-GB" });
// Session about 20 s from its idle limit; the first check stalls (bad connection).
const t = nowS() - (30 * 60 - 20);
await c.addCookies([{ name: "fruidry_admin", value: signToken(t), url: B }]);
let seen = 0;
await c.route("**/admin/session", (route) => {
  seen++;
  if (seen === 1) return;
  /* never answered */ route.continue();
});
const pg = await c.newPage();
const errs = [];
pg.on("pageerror", (e) => errs.push(e.message));
await pg.clock.install();
await pg.goto(B + "/admin/products");
await pg.waitForTimeout(1000);
await pg.clock.fastForward("31:00"); // the page now thinks it's been idle for 31 minutes
await pg
  .locator('input[name="password"]:visible')
  .first()
  .waitFor({ timeout: 60000 })
  .catch(() => {});
const ok = (await pg.locator('input[name="password"]:visible').count()) === 1;
check(
  "after a stalled check, the page still signs out at the idle limit",
  ok,
  `${seen} session requests`,
);
check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
