// "Notify me" on coming-soon flavours, the sign-in limit only counting wrong passwords,
// and a dropped background request not signing the admin out. Waiting-list storage is checked in the test server's data/ folder
// (E2E_DATA_DIR, set by tests/run.mjs).
import fs from "node:fs";
import path from "node:path";
import { BASE_URL as B, adminHarness, check, finish, launch, nowS, signToken } from "./lib.mjs";

const b = await launch();
const errs = [];
const waitlistFile = () => {
  const dir = process.env.E2E_DATA_DIR;
  return dir ? JSON.parse(fs.readFileSync(path.join(dir, "waitlist.json"), "utf8")) : null;
};
const adminContext = async () => {
  const c = await b.newContext({ locale: "en-GB" });
  await adminHarness(c);
  await c.addCookies([{ name: "fruidry_admin", value: signToken(nowS()), url: B }]);
  return c;
};

// ---------- 2. Notify me ----------
{
  const c = await b.newContext({ locale: "en-GB" });
  const pg = await c.newPage();
  pg.on("pageerror", (e) => errs.push(e.message));
  await pg.setExtraHTTPHeaders({ "x-real-ip": "10.6.6.1" });
  await pg.goto(B + "/en");
  await pg.waitForTimeout(600);
  check(
    "coming-soon cards say 'Notify me'",
    (await pg.locator("#coming-soon-heading").locator("..").getByText("Notify me").count()) >= 4,
  );
  await pg.goto(B + "/en/shop/mixed-fruit-pack");
  await pg.waitForTimeout(500);
  check(
    "products on sale have no 'Notify me' form",
    (await pg.getByRole("heading", { name: "Want to know when it's here?" }).count()) === 0,
  );
  await pg.goto(B + "/en/shop/mango-pack");
  await pg.waitForTimeout(700);
  const form = pg.locator("form", {
    has: pg.getByRole("heading", { name: "Want to know when it's here?" }),
  });
  check("a coming-soon flavour has the 'Notify me' form", await form.isVisible());
  check(
    "…with the privacy note",
    (await form.textContent()).includes("only to send you that one message, then delete it"),
  );
  await form.getByLabel("WhatsApp number").fill("12345");
  await form.getByRole("button", { name: "Notify me" }).click();
  await pg.waitForTimeout(800);
  check(
    "a wrong number is refused",
    await form.getByText("Enter a Cameroon mobile number").isVisible(),
  );
  check(
    "…and the field is marked and focused",
    (await form.getByLabel("WhatsApp number").getAttribute("aria-invalid")) === "true" &&
      (await pg.evaluate(() => document.activeElement?.name)) === "phone",
  );
  await form.getByLabel("WhatsApp number").fill("6 71 23 45 67");
  await form.getByRole("button", { name: "Notify me" }).click();
  await pg.waitForTimeout(1000);
  check(
    "a good number is saved",
    await pg
      .getByText("Thanks! We'll message you on WhatsApp as soon as you can order Mango.")
      .isVisible(),
  );
  await pg.reload();
  await pg.waitForTimeout(700);
  const f2 = pg.locator("form", {
    has: pg.getByRole("heading", { name: "Want to know when it's here?" }),
  });
  await f2.getByLabel("WhatsApp number").fill("+237 671234567");
  await f2.getByRole("button", { name: "Notify me" }).click();
  await pg.waitForTimeout(1000);
  // A flavour that's on sale now can't be joined (e.g. an old page left open).
  await pg.goto(B + "/en/shop/apple-pack");
  await pg.waitForTimeout(700);
  const f3 = pg.locator("form", {
    has: pg.getByRole("heading", { name: "Want to know when it's here?" }),
  });
  await f3.locator('input[name="slug"]').evaluate((el) => (el.value = "mixed-fruit-pack"));
  await f3.getByLabel("WhatsApp number").fill("699000000");
  await f3.getByRole("button", { name: "Notify me" }).click();
  await pg.waitForTimeout(800);
  check(
    "a flavour already on sale can't be joined",
    await pg.getByText("This flavour is already available").isVisible(),
  );
  await f3.locator('input[name="slug"]').evaluate((el) => (el.value = "apple-pack"));
  await f3.getByLabel("WhatsApp number").fill("699000000");
  await f3.getByRole("button", { name: "Notify me" }).click();
  await pg.waitForTimeout(800);
  await c.close();
  const fc = await b.newContext({ locale: "fr-FR" });
  const fp = await fc.newPage();
  await fp.setExtraHTTPHeaders({ "x-real-ip": "10.6.6.2" });
  await fp.goto(B + "/fr/shop/strawberry-pack");
  await fp.waitForTimeout(700);
  const ff = fp.locator("form", { has: fp.getByRole("heading", { name: /Envie d.être prévenu/ }) });
  await ff.getByLabel("Numéro WhatsApp").fill("+237 699 11 22 33");
  await ff.getByRole("button", { name: "Me prévenir" }).click();
  await fp.waitForTimeout(1000);
  check(
    "in French too",
    await fp
      .getByText(
        /Nous vous écrirons sur WhatsApp dès que la saveur «\u00a0Fraises\u00a0» sera disponible/,
      )
      .isVisible(),
  );
  await fc.close();
  const list = waitlistFile() ?? [];
  check(
    "the same number on the same flavour is kept once",
    list.filter((e) => e.slug === "mango-pack").length === 1,
    JSON.stringify(list.map((e) => `${e.slug}:${e.phone}:${e.lang}`)),
  );
  check(
    "numbers are stored in one format with the language",
    list.some((e) => e.slug === "mango-pack" && e.phone === "671234567" && e.lang === "en") &&
      list.some((e) => e.slug === "strawberry-pack" && e.phone === "699112233" && e.lang === "fr"),
  );

  // Spam limit: 10 sign-ups per hour per network
  const sc = await b.newContext({ locale: "en-GB" });
  const sp = await sc.newPage();
  await sp.setExtraHTTPHeaders({ "x-real-ip": "10.6.6.9" });
  let blocked = false;
  for (let i = 0; i < 11; i++) {
    await sp.goto(B + "/en/shop/pineapple-pack");
    await sp.waitForTimeout(400);
    const fs2 = sp.locator("form", {
      has: sp.getByRole("heading", { name: "Want to know when it's here?" }),
    });
    await fs2
      .getByLabel("WhatsApp number")
      .fill(`69900001${String(i).padStart(1, "0")}`.slice(0, 9));
    await fs2.getByRole("button", { name: "Notify me" }).click();
    await sp.waitForTimeout(500);
    if (i === 10) blocked = await sp.getByText("Too many tries from your network").isVisible();
  }
  check("an 11th sign-up within the hour from one network is refused", blocked);
  await sc.close();

  // Admin: counts, list, messages, remove
  const ac = await adminContext();
  const a = await ac.newPage();
  a.on("pageerror", (e) => errs.push(e.message));
  await a.goto(B + "/admin/products");
  await a.waitForTimeout(900);
  check(
    "the products list shows how many are waiting",
    (await a.locator("li", { hasText: "Mango" }).first().textContent()).includes("🔔 1 waiting"),
  );
  await a.goto(B + "/admin/products/mango-pack");
  await a.waitForTimeout(900);
  const sec = a.locator("section", { has: a.getByRole("heading", { name: /Waiting list/ }) });
  check(
    "the product page lists the waiting numbers",
    (await sec.getByRole("heading").textContent()) === "Waiting list (1)" &&
      (await sec.textContent()).includes("671234567"),
  );
  const tell = await sec.getByRole("link", { name: "Tell them on WhatsApp" }).getAttribute("href");
  const tellText = decodeURIComponent(new URL(tell).searchParams.get("text"));
  check(
    "'Tell them on WhatsApp' has a launch message with the link",
    tell.startsWith("https://wa.me/237671234567") &&
      tellText.includes("you can now order Mango") &&
      tellText.includes("/en/shop/mango-pack"),
    tellText,
  );
  await a.goto(B + "/admin/products/strawberry-pack");
  await a.waitForTimeout(900);
  const fsec = a.locator("section", { has: a.getByRole("heading", { name: /Waiting list/ }) });
  const fTell = decodeURIComponent(
    new URL(
      await fsec.getByRole("link", { name: "Tell them on WhatsApp" }).getAttribute("href"),
    ).searchParams.get("text"),
  );
  check(
    "…in French for French sign-ups",
    fTell
      .replace(/[\u202f\u00a0]/g, " ")
      .startsWith(
        "Bonjour ! Bonne nouvelle de Fruidry : la saveur « Fraises » est maintenant disponible",
      ) && fTell.includes("/fr/shop/strawberry-pack"),
    fTell,
  );
  await a.goto(B + "/admin/products/mango-pack");
  await a.waitForTimeout(900);
  await a
    .locator("section", { has: a.getByRole("heading", { name: /Waiting list/ }) })
    .getByRole("button", { name: "Remove" })
    .click();
  await a.waitForTimeout(1500);
  check(
    "'Remove' takes them off the list",
    (await a.getByRole("heading", { name: /Waiting list/ }).textContent()) === "Waiting list (0)",
  );
  await a.goto(B + "/admin/products/pineapple-pack");
  await a.waitForTimeout(900);
  a.once("dialog", (d) => d.accept());
  await a.getByRole("button", { name: /Remove everyone/ }).click();
  await a.waitForTimeout(1500);
  check(
    "'Remove everyone' empties the list",
    (await a.getByRole("heading", { name: /Waiting list/ }).textContent()) === "Waiting list (0)",
  );
  await a.goto(B + "/admin/products/apple-pack");
  await a.waitForTimeout(900);
  a.once("dialog", (d) => d.accept());
  await a.getByRole("button", { name: "Delete product" }).click();
  await a.waitForTimeout(2000);
  const after = waitlistFile() ?? [];
  check(
    "deleting a product deletes its waiting list",
    !after.some((e) => e.slug === "apple-pack") && after.some((e) => e.slug === "strawberry-pack"),
    JSON.stringify(after.map((e) => e.slug)),
  );
  await ac.close();

  const pp = await (await b.newContext({ locale: "en-GB" })).newPage();
  await pp.goto(B + "/en/privacy");
  await pp.waitForTimeout(500);
  check(
    "the privacy page explains the waiting list",
    (await pp.textContent("body")).includes("If you ask to hear about a new flavour"),
  );
  await pp.goto(B + "/fr/privacy");
  await pp.waitForTimeout(500);
  check(
    "…in French too",
    (await pp.textContent("body")).includes(
      "Si vous demandez à être prévenu d'une nouvelle saveur",
    ),
  );
  await pp.context().close();
}

// ---------- 2b. "Notify me" pressed before the page's JavaScript has loaded ----------
{
  const c = await b.newContext({ locale: "en-GB" });
  const pg = await c.newPage();
  pg.on("pageerror", (e) => errs.push(e.message));
  await pg.setExtraHTTPHeaders({ "x-real-ip": "10.6.6.30" });
  const docs = [];
  pg.on("request", (r) => {
    if (r.resourceType() === "document") docs.push(`${r.method()} ${r.url()}`);
  });
  let hold = true;
  await c.route(/\/_next\/static\/chunks\/.*\.js/, async (route) => {
    while (hold) await new Promise((ok) => setTimeout(ok, 100));
    return route.continue();
  });
  await pg.goto(B + "/en/shop/pineapple-pack", { waitUntil: "commit" });
  const phone = pg.locator('input[name="phone"]').first();
  await phone.waitFor({ state: "attached", timeout: 15000 });
  await phone.fill("677555444", { force: true });
  await pg
    .locator('form:has(input[name="phone"]) button[type="submit"]')
    .first()
    .click({ force: true, noWaitAfter: true });
  await pg.waitForTimeout(1500);
  hold = false;
  await pg.waitForTimeout(3000);
  check(
    "pressing 'Notify me' before the page has loaded never puts the number in the address",
    !docs.some((d) => d.includes("677555444")),
    docs.join(" | "),
  );
  const saved = waitlistFile();
  if (saved) {
    check(
      "…and the number is saved",
      saved.some((e) => e.slug === "pineapple-pack" && e.phone === "677555444"),
    );
  }
  await c.close();
}

// ---------- 3. Correct passwords don't use up sign-in attempts ----------
{
  const c = await b.newContext({ locale: "en-GB" });
  const pg = await c.newPage();
  pg.on("pageerror", (e) => errs.push(e.message));
  await pg.setExtraHTTPHeaders({ "x-real-ip": "10.7.1.1" });
  let ok = 0;
  for (let i = 0; i < 7; i++) {
    await pg.goto(B + "/admin");
    await pg.waitForTimeout(400);
    await pg.locator('input[name="password"]:visible').first().fill("test-pass-123");
    await pg.getByRole("button", { name: "Sign in" }).first().click();
    if (
      await pg
        .getByRole("button", { name: "Sign out" })
        .first()
        .waitFor({ timeout: 5000 })
        .then(
          () => true,
          () => false,
        )
    )
      ok++;
  }
  check("signing in 7 times in a row (reloads) is never blocked", ok === 7, `${ok}/7`);
  let blocked = false;
  for (let i = 0; i < 6; i++) {
    await pg.goto(B + "/admin");
    await pg.waitForTimeout(300);
    await pg
      .locator('input[name="password"]:visible')
      .first()
      .fill("wrong-" + i);
    await pg.getByRole("button", { name: "Sign in" }).first().click();
    await pg.waitForTimeout(900);
    if (i === 5) blocked = await pg.getByText("Too many sign-in attempts").isVisible();
  }
  check("…but wrong passwords are still limited to 5", blocked);
  await c.close();
}

// ---------- 4. A dropped background request waits and retries (no sign-out) ----------
{
  const c = await adminContext();
  const pg = await c.newPage();
  pg.on("pageerror", (e) => errs.push(e.message));
  await pg.goto(B + "/admin");
  await pg.waitForTimeout(1000);
  await c.unrouteAll(); // from here on, a page load would ask for the password
  const docs = [];
  pg.on("request", (r) => {
    if (r.resourceType() === "document") docs.push(r.url());
  });
  let dropped = false;
  await c.route("**/admin/orders**", (route) => {
    if (!dropped && route.request().headers()["rsc"]) {
      dropped = true;
      return route.abort("internetdisconnected");
    }
    return route.fallback();
  });
  await pg.getByRole("link", { name: "Orders" }).first().click();
  await pg.waitForTimeout(4000);
  check(
    "after one dropped request, the click still works and you stay signed in",
    dropped &&
      docs.length === 0 &&
      /\/admin\/orders/.test(pg.url()) &&
      (await pg.getByRole("button", { name: "Sign out" }).first().isVisible()),
    `dropped=${dropped} docs=${docs.join(",")} url=${pg.url()}`,
  );
  await c.close();
}

check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
