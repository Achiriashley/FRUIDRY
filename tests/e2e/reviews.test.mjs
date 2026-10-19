// Customer reviews: leaving one on a product page, approving it in the admin panel, the
// stars and average on the page and in Google's product data, removing one, and the
// protections (checks on what's typed, a hidden field for robots, a limit per
// connection, text shown as text).
import { ADMIN_PASSWORD, BASE_URL as B, check, finish, launch } from "./lib.mjs";

const PRODUCT = "/fr/shop/mixed-fruit-pack";
const html = async (path) => (await fetch(B + path)).text();
const productData = async (path) =>
  [...(await html(path)).matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]))
    .find((d) => d["@type"] === "Product");
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Waits for the product page to show (or stop showing) a text after a change.
async function pageShows(path, text, expected = true) {
  for (let i = 0; i < 20; i++) {
    if ((await html(path)).includes(text) === expected) return true;
    await pause(500);
  }
  return false;
}

const b = await launch({ adminHarness: true });
const errs = [];

async function reviewPage(ip, options = {}) {
  const ctx = await b.newContext({ locale: "fr-FR", ...options });
  await ctx.setExtraHTTPHeaders({ "x-real-ip": ip });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(B + PRODUCT);
  await p.getByRole("heading", { name: "Donner votre avis" }).waitFor();
  await p.waitForTimeout(600);
  return p;
}

const form = (p) =>
  p.locator("form", { has: p.getByRole("heading", { name: "Donner votre avis" }) });
const star = (p, n) =>
  form(p)
    .locator("label")
    .filter({ has: p.getByRole("radio", { name: n === 1 ? "1 étoile" : `${n} étoiles` }) });

async function fillReview(p, { stars, name, comment }) {
  if (stars) await star(p, stars).click();
  await form(p).getByLabel("Votre prénom").fill(name);
  await form(p).getByLabel("Votre avis").fill(comment);
}

// ---------- Before any review ----------

{
  const page = await html(PRODUCT);
  check("the product page has a reviews section", page.includes("Avis clients"));
  check("…saying there are no reviews yet", page.includes("Pas encore d"));
  const data = await productData(PRODUCT);
  check("no rating is given to Google yet", !data.aggregateRating && !data.review);
  check(
    "a coming-soon flavour has no reviews section",
    !(await html("/fr/shop/mango-pack")).includes("Avis clients"),
  );
}

// ---------- Leaving reviews ----------

const p = await reviewPage("10.31.0.1");
await form(p).getByRole("button", { name: "Envoyer mon avis" }).click();
await form(p).getByText("Choisissez une note.").waitFor();
{
  const text = await form(p).innerText();
  check(
    "an empty review shows what's missing",
    text.includes("Choisissez une note.") &&
      text.includes("Indiquez votre prénom.") &&
      text.includes("Écrivez quelques mots"),
    text.slice(0, 200),
  );
  const focused = await p.evaluate(() => document.activeElement?.getAttribute("name"));
  check("…and the cursor goes to the stars", focused === "rating", focused);
}
await fillReview(p, {
  stars: 4,
  name: "Aïcha T.",
  comment: "Très croquant, parfait avec un yaourt.\n\nJe recommande !",
});
await form(p).getByRole("button", { name: "Envoyer mon avis" }).click();
await p.getByText("Merci ! Votre avis apparaîtra ici après vérification.").waitFor();
check("a review is sent and the visitor is thanked", true);
check("…but it isn't shown before it's approved", !(await html(PRODUCT)).includes("Aïcha T."));

// Text that looks like code is shown as text.
const p2 = await reviewPage("10.31.0.2");
await fillReview(p2, {
  stars: 5,
  name: "<b>Bob</b>",
  comment:
    'Super bon <script>window.__xss = 1</script></script><img src=x onerror="window.__xss=2">',
});
await form(p2).getByRole("button", { name: "Envoyer mon avis" }).click();
await p2.getByText("Merci !").first().waitFor();

// A robot filling in the hidden field is told it worked, but nothing is kept.
const p3 = await reviewPage("10.31.0.3");
await fillReview(p3, { stars: 1, name: "Spam Bot", comment: "Cheap pills at example.com" });
await p3.locator('input[name="website"]').fill("https://example.com", { force: true });
await form(p3).getByRole("button", { name: "Envoyer mon avis" }).click();
await p3.getByText("Merci !").first().waitFor();

// Without JavaScript, the form still sends the review.
{
  const p4 = await reviewPage("10.31.0.4", { javaScriptEnabled: false });
  await star(p4, 3).click();
  await form(p4).getByLabel("Votre prénom").fill("Paul");
  await form(p4).getByLabel("Votre avis").fill("Bon goût, sachet pratique.");
  await form(p4).getByRole("button", { name: "Envoyer mon avis" }).click();
  await p4.waitForLoadState("load");
  check(
    "without JavaScript, a review is sent too",
    // French puts a narrow space before "!": compare with plain spaces.
    (await p4.locator("body").innerText())
      .replace(/\s+/g, " ")
      .includes("Merci ! Votre avis apparaîtra ici"),
    p4.url(),
  );
}

// ---------- Approving in the admin panel ----------

const actx = await b.newContext({ locale: "en-GB", viewport: { width: 1100, height: 900 } });
const a = await actx.newPage();
a.on("pageerror", (e) => errs.push("admin " + e.message));
a.on("dialog", (d) => d.accept());
await a.goto(B + "/admin");
await a.locator('input[name="password"]:visible').fill(ADMIN_PASSWORD);
await a.getByRole("button", { name: "Sign in" }).click();
await a.getByRole("heading", { name: "Dashboard" }).waitFor();
await a.waitForTimeout(800);
{
  const text = await a.locator("main").innerText();
  check(
    "the dashboard says there are new reviews",
    text.includes("3 new reviews"),
    text.slice(0, 300),
  );
}
await a.getByRole("link", { name: "Reviews" }).first().click();
await a.getByRole("heading", { name: "Waiting for you (3)" }).waitFor();
const item = (name) => a.locator("main li").filter({ hasText: name });
{
  const text = await a.locator("main").innerText();
  check(
    "the admin panel lists the 3 reviews (not the robot's)",
    text.includes("Aïcha T.") &&
      text.includes("<b>Bob</b>") &&
      text.includes("Paul") &&
      !text.includes("Spam Bot"),
    text.slice(0, 400),
  );
}
await item("Aïcha T.").getByRole("button", { name: "Publish" }).click();
await a.getByRole("heading", { name: "Published (1)" }).waitFor();

check("an approved review appears on the product page", await pageShows(PRODUCT, "Aïcha T."));
{
  const page = await html(PRODUCT);
  check("…with the average and count", page.includes("4 sur 5 · 1 avis"));
  check(
    "…and on the English page too",
    (await html("/en/shop/mixed-fruit-pack")).includes("4 out of 5 · 1 review"),
  );
  const data = await productData(PRODUCT);
  check(
    "Google gets the rating and the review",
    data.aggregateRating?.ratingValue === 4 &&
      data.aggregateRating?.reviewCount === 1 &&
      data.review?.[0]?.author?.name === "Aïcha T." &&
      data.review?.[0]?.reviewRating?.ratingValue === 4 &&
      data.review?.[0]?.reviewBody.includes("Je recommande"),
    JSON.stringify(data.aggregateRating),
  );
}

await item("<b>Bob</b>").getByRole("button", { name: "Publish" }).click();
await a.getByRole("heading", { name: "Published (2)" }).waitFor();
check("a second review updates the average", await pageShows(PRODUCT, "4,5 sur 5 · 2 avis"));
{
  const pg = await reviewPage("10.31.0.5");
  await pg.waitForTimeout(500);
  const shown = await pg.locator("#reviews-heading ~ div li").allInnerTexts();
  check(
    "text that looks like code is shown as plain text and never runs",
    shown.some(
      (t) => t.includes("<b>Bob</b>") && t.includes("<script>window.__xss = 1</script>"),
    ) &&
      (await pg.evaluate(() => window.__xss)) === undefined &&
      (await pg.locator("#reviews-heading ~ div li img").count()) === 0,
    shown.join(" | ").slice(0, 300),
  );
  const data = await productData(PRODUCT);
  check(
    "Google's product data stays valid with that text",
    data.aggregateRating?.ratingValue === 4.5 && data.review.length === 2,
  );
}

await item("Aïcha T.").getByRole("button", { name: "Remove from shop" }).click();
await a.getByRole("heading", { name: "Published (1)" }).waitFor();
check("a removed review disappears from the page", await pageShows(PRODUCT, "Aïcha T.", false));
check("…and from the rating", (await productData(PRODUCT)).aggregateRating?.reviewCount === 1);
await item("Paul").getByRole("button", { name: "Delete" }).click();
await a.getByRole("heading", { name: "Waiting for you (0)" }).waitFor();
check("a waiting review can be deleted", true);

// ---------- Limit per connection ----------

{
  const pg = await reviewPage("10.31.0.9");
  let blocked = "";
  for (let i = 1; i <= 6 && !blocked; i++) {
    await fillReview(pg, { stars: 5, name: `Test ${i}`, comment: "Très bon produit." });
    await form(pg).getByRole("button", { name: "Envoyer mon avis" }).click();
    const result = pg.getByText(/Merci|Trop d'avis/).first();
    await result.waitFor();
    if ((await result.innerText()).includes("Trop d'avis")) blocked = `after ${i - 1}`;
    else {
      await pg.reload();
      await form(pg).getByRole("heading", { name: "Donner votre avis" }).waitFor();
      await pg.waitForTimeout(600);
    }
  }
  check("a connection can send at most 5 reviews an hour", blocked === "after 5", blocked);
}

check("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
finish();
