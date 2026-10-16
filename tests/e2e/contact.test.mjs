// Contact and About pages: contact links, the WhatsApp message form, and the shop's
// Organization data for search engines.
import { BASE_URL as B, artifact, check, finish, launch } from "./lib.mjs";

const b = await launch({ adminHarness: true });
const ctx = await b.newContext({ locale: "fr-FR", viewport: { width: 390, height: 844 } });
await ctx.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(B + "/fr/contact");
await p.waitForTimeout(700);
check("phone link", (await p.locator('main a[href="tel:+237671820032"]').count()) === 1);
{
  const n = await p.locator('main a[href^="https://wa.me/237600000000?text=Bonjour"]').count();
  check("WhatsApp chat link uses the shop number", n === 1, "count " + n);
}
check(
  "Instagram and TikTok links",
  (await p.locator('main a[href="https://www.instagram.com/fruidry.cm"]').count()) === 1 &&
    (await p.locator('main a[href="https://www.tiktok.com/@fruidry"]').count()) === 1,
);
check(
  "no placeholder email or invented hours",
  !(await p.content()).includes("fruidry.example") &&
    !(await p.getByText(/9 h – 17 h|9am/).count()),
);
await p.screenshot({ path: artifact("contact-phone.png"), fullPage: true });
const f = p.locator("form:visible", { has: p.locator('textarea[name="message"]') }).first();
await f.getByLabel("Nom").fill("Awa");
await f.getByLabel("Message").fill("Bonjour, livrez-vous à Yaoundé ?");
const nav = p.waitForURL("https://wa.me/**", { timeout: 8000 });
await f.getByRole("button", { name: "Envoyer sur WhatsApp" }).click();
await nav;
const text = new URL(p.url()).searchParams.get("text");
check(
  "message goes to WhatsApp, in French, email optional",
  text.replace(/[  ]/g, " ") ===
    "Bonjour Fruidry !\n\nBonjour, livrez-vous à Yaoundé ?\n\nDe la part de Awa",
  JSON.stringify(text),
);
await p.goBack();
await p.waitForTimeout(800);
check(
  "confirmation shown after coming back",
  await p
    .getByText("Votre message est prêt dans WhatsApp")
    .first()
    .isVisible()
    .catch(() => false),
);
await p.goto(B + "/fr/about");
await p.waitForTimeout(500);
check(
  "about page states import from China",
  await p.getByText(/producteur partenaire en Chine/).isVisible(),
);
await p.screenshot({ path: artifact("about-phone.png"), fullPage: true });
const html = await (await fetch(B + "/en")).text();
check(
  "Organization data has phone and social links",
  html.includes('"telephone":"+237 671 820 032"') && html.includes("instagram.com/fruidry.cm"),
);
check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
