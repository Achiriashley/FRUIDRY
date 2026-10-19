// Privacy policy pages, consent lines on forms, and analytics only on shop pages.
//
// Vercel Analytics is only added to builds made on Vercel, so the "analytics script
// loads" check is skipped unless EXPECT_ANALYTICS is set (for a run against a Vercel
// deployment).
import { BASE_URL as B, artifact, check, finish, launch, skip } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const ctx = await b.newContext({ locale: "fr-FR", viewport: { width: 390, height: 844 } });
// Stand-in for Vercel's analytics script: records that it was loaded.
await ctx.route("**/_vercel/insights/script.js", (r) => {
  r.fulfill({ status: 200, contentType: "text/javascript", body: "window.__vaLoaded = true;" });
});
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => {
  if (/Content Security Policy|Refused/.test(m.text())) errs.push(m.text().slice(0, 120));
});
await p.goto(B + "/fr/privacy");
await p.waitForTimeout(800);
check(
  "French privacy page renders all sections, reviews included",
  (await p.locator("main h2").count()) === 10 &&
    (await p.getByRole("heading", { name: "Politique de confidentialité" }).isVisible()) &&
    (await p.getByRole("heading", { name: "Si vous donnez votre avis" }).isVisible()),
);
check(
  "phone number is a tap-to-call link",
  (await p.locator('main a[href="tel:+237671820032"]').count()) === 1,
);
check(
  "cookies section lists the language cookie and cart",
  (await p.getByText(/cookie qui retient/).isVisible()) &&
    (await p.getByText(/Votre panier, enregistré/).isVisible()),
);
await p.screenshot({ path: artifact("privacy-phone.png"), fullPage: true });
check(
  "footer links to privacy page",
  (await p.locator('footer a[href="/fr/privacy"]').count()) === 1,
);
if (process.env.EXPECT_ANALYTICS) {
  check("analytics script loads on shop pages", await p.evaluate(() => window.__vaLoaded === true));
} else {
  skip(
    "analytics script loads on shop pages",
    "only built in on Vercel; set EXPECT_ANALYTICS=1 when testing a Vercel deployment",
  );
}
await p.goto(B + "/en/privacy");
await p.waitForTimeout(600);
check(
  "English privacy page",
  (await p.getByRole("heading", { name: "Privacy policy" }).isVisible()) &&
    (await p.locator("main h2").count()) === 10 &&
    (await p.getByRole("heading", { name: "If you leave a review" }).isVisible()),
);
// Checkout and contact show the consent line with a privacy link
await p.goto(B + "/en/shop/mixed-fruit-pack");
await p.waitForTimeout(500);
await p.getByRole("button", { name: "Add to cart" }).first().click();
await p.waitForTimeout(300);
await p.goto(B + "/en/checkout");
await p.waitForTimeout(700);
check(
  "checkout consent line + privacy link",
  (await p
    .getByText(/By ordering, you agree/)
    .first()
    .isVisible()) && (await p.locator('main a[href="/en/privacy"]:visible').count()) === 1,
);
await p.goto(B + "/fr/contact");
await p.waitForTimeout(700);
check(
  "contact consent line + privacy link",
  (await p
    .getByText(/rien n'est enregistré sur notre site/)
    .first()
    .isVisible()) && (await p.locator('main a[href="/fr/privacy"]:visible').count()) === 1,
);
// Admin: no analytics
const a = await (await b.newContext()).newPage();
await a.route("**/_vercel/insights/script.js", (r) =>
  r.fulfill({ status: 200, contentType: "text/javascript", body: "window.__vaLoaded = true;" }),
);
await a.goto(B + "/admin");
await a.waitForTimeout(800);
check("no analytics on admin pages", !(await a.evaluate(() => window.__vaLoaded === true)));
const sm = await (await fetch(B + "/sitemap.xml")).text();
check("sitemap lists privacy pages", sm.includes("/fr/privacy") && sm.includes("/en/privacy"));
check("no errors or CSP violations", errs.length === 0, errs.join(" | "));
finish();
await b.close();
