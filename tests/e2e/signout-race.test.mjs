// Signing out right after a click, while that click's check-in is still on its way
// (slow mobile network), must still sign out. Tried 10 times, by mouse and keyboard.
import { BASE_URL as B, check, finish, launch, nowS, signToken } from "./lib.mjs";

const N = 10;
const b = await launch({ adminHarness: true });
let survived = 0;
const errs = [];
for (let i = 0; i < N; i++) {
  const c = await b.newContext({ locale: "en-GB" });
  const t = nowS() - 180;
  await c.addCookies([{ name: "fruidry_admin", value: signToken(t), url: B }]);
  const pg = await c.newPage();
  pg.on("pageerror", (e) => errs.push(e.message));
  // Slow the check-in response a little, as on a mobile network.
  await c.route("**/admin/session", async (route) => {
    const r = await route.fetch();
    await new Promise((s) => setTimeout(s, 300));
    route.fulfill({ response: r });
  });
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
  const ck = (await c.cookies()).some((x) => x.name === "fruidry_admin");
  const signedIn = await pg
    .getByRole("button", { name: "Sign out" })
    .first()
    .isVisible()
    .catch(() => false);
  if (ck || signedIn) survived++;
  await c.close();
}
check(
  "sign-outs work with a check-in on its way",
  survived === 0,
  `${survived}/${N} sign-outs left the owner signed in`,
);
check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
