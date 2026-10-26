// The cookie notice at the bottom of the shop: shown on a first visit, in the visitor's
// language, with a link to the privacy policy; "Got it" closes it for good on that
// device. Never shown in the admin panel.
import { BASE_URL as B, adminHarness, artifact, check, finish, launch } from "./lib.mjs";

const b = await launch({ cookieNotice: true });
const ctx = await b.newContext({ locale: "fr-FR", viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));

const notice = () => p.getByRole("region", { name: "Cookies" });

await p.goto(B + "/fr");
await notice()
  .waitFor({ timeout: 8000 })
  .catch(() => {});
check(
  "shown in French on a first visit",
  (await notice().isVisible()) &&
    (await notice()
      .getByText(/Ni publicité, ni suivi/)
      .isVisible()) &&
    (await notice().getByRole("button", { name: "J'ai compris" }).isVisible()),
);
check(
  "links to the French privacy policy",
  (await notice()
    .getByRole("link", { name: "Politique de confidentialité" })
    .getAttribute("href")) === "/fr/privacy",
);
const box = await notice().boundingBox();
check(
  "fits on a phone screen, at the bottom",
  box !== null &&
    box.x >= 0 &&
    box.x + box.width <= 390 &&
    box.y + box.height <= 844 &&
    box.y > 400,
);
await p.screenshot({ path: artifact("cookie-notice-phone.png") });
const ok = notice().getByRole("button", { name: "J'ai compris" });
await ok.focus();
await p.keyboard.press("Shift+Tab");
await p.keyboard.press("Tab");
await p.waitForTimeout(400); // the button's colour transition
const outline = await ok.evaluate((el) => getComputedStyle(el).outlineColor);
check(
  "keyboard focus shows a yellow outline on the dark notice",
  outline === "rgb(246, 197, 24)",
  outline,
);

await notice().getByRole("button", { name: "J'ai compris" }).click();
check("“J'ai compris” closes it", await notice().isHidden());
await p.goto(B + "/fr/shop");
await p.waitForTimeout(800);
check("stays closed on the next page", await notice().isHidden());
await p.reload();
await p.waitForTimeout(800);
check("stays closed after a reload", await notice().isHidden());

// English, on a fresh device
const en = await (
  await b.newContext({ locale: "en-GB", viewport: { width: 1280, height: 800 } })
).newPage();
await en.goto(B + "/en");
const enNotice = en.getByRole("region", { name: "Cookies" });
await enNotice.waitFor({ timeout: 8000 }).catch(() => {});
check(
  "shown in English with “Got it”",
  (await enNotice.getByText(/No ads, no tracking/).isVisible()) &&
    (await enNotice.getByRole("button", { name: "Got it" }).isVisible()) &&
    (await enNotice.getByRole("link", { name: "Privacy policy" }).getAttribute("href")) ===
      "/en/privacy",
);
await en.screenshot({ path: artifact("cookie-notice-desktop.png") });

// Not in the admin panel
const adminCtx = await b.newContext({ locale: "en-GB" });
await adminHarness(adminCtx);
const a = await adminCtx.newPage();
await a.goto(B + "/admin");
await a.waitForTimeout(1200);
check("not shown in the admin panel", await a.getByRole("region", { name: "Cookies" }).isHidden());

check("no page errors", errs.length === 0);
await b.close();
finish();
