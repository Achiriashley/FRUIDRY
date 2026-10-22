// When WhatsApp doesn't open after "Order on WhatsApp" (for example inside the Instagram
// or TikTok app): the "Almost done!" screen offers the order to copy, the shop's number,
// and says the shop will get in touch, in English and French.
import { BASE_URL as B, check, finish, launch } from "./lib.mjs";

const b = await launch();
const errs = [];
const plain = (text) => text.replace(/[\s  ]+/g, " ");

// A phone where WhatsApp links do nothing: the browser stays on the shop (204 No Content).
async function phone({ locale, copyBlocked = false }) {
  const ctx = await b.newContext({ locale, viewport: { width: 390, height: 844 } });
  await ctx.route("https://wa.me/**", (route) => route.fulfill({ status: 204 }));
  if (copyBlocked) {
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("Not allowed")) },
      });
    });
  } else {
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: B });
  }
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(e.message));
  return page;
}

async function order(page, lang, labels) {
  await page.goto(`${B}/${lang}/shop/mixed-fruit-pack`);
  // After the page has started (it saves its own cart when it does).
  await page.waitForLoadState("networkidle");
  await page.evaluate(() =>
    localStorage.setItem(
      "fruidry-cart",
      JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 2 }]),
    ),
  );
  await page.goto(`${B}/${lang}/checkout`);
  await page.getByLabel(labels.name).fill("Awa Fotso");
  await page.getByLabel(labels.phone).fill("677 12 34 56");
  await page.getByLabel(labels.address).fill("Douala, Akwa");
  await page.getByRole("button", { name: labels.send }).click();
  await page.getByRole("heading", { name: labels.notOpened }).waitFor();
  return plain(await page.locator("main").innerText());
}

// ---------- English, copying allowed ----------
{
  const page = await phone({ locale: "en-GB" });
  const main = await order(page, "en", {
    name: "Full name",
    phone: "Phone number",
    address: "Delivery address",
    send: "Order on WhatsApp",
    notOpened: "WhatsApp didn't open?",
  });
  const reference = main.match(/FD-[A-Z0-9]{6}/)?.[0];
  check(
    "the screen gives the shop's WhatsApp number to send the order to",
    main.includes("send it to us on WhatsApp at +237 600 00 00 00.") &&
      (await page.locator('a[href="tel:+237600000000"]').count()) === 1,
    main,
  );
  check(
    "it says the order was received and that the shop will contact the customer",
    Boolean(reference) &&
      main.includes(
        `We've received order ${reference}. If you can't send it, don't worry: we'll contact you on 677 12 34 56.`,
      ),
    main,
  );
  await page.getByRole("button", { name: "Copy my order" }).click();
  await page.getByText("Copied! Paste it into a WhatsApp message to us.").waitFor();
  const copied = plain(await page.evaluate(() => navigator.clipboard.readText()));
  check(
    "Copy my order copies the same message WhatsApp would have sent",
    copied.includes(`*Order ${reference}*`) &&
      copied.includes("FD-MIX-50 · Mixed Fruit Pack × 2 = 5 000 FCFA") &&
      copied.includes("Awa Fotso") &&
      copied.includes("Douala, Akwa"),
    copied,
  );
  check(
    "the order is still saved for the shop",
    (await page.getByRole("link", { name: "View your order" }).count()) === 1,
  );
  // Coming back later (the page reloads) still shows the help.
  await page.reload();
  await page.getByRole("heading", { name: "WhatsApp didn't open?" }).waitFor();
  check(
    "the help is still there after the page reloads",
    (await page.getByRole("button", { name: "Copy my order" }).count()) === 1,
  );
}

// ---------- French, copying blocked by the browser ----------
{
  const page = await phone({ locale: "fr-FR", copyBlocked: true });
  const main = await order(page, "fr", {
    name: "Nom complet",
    phone: "Numéro de téléphone",
    address: "Adresse de livraison",
    send: "Commander sur WhatsApp",
    notOpened: /WhatsApp ne s'est pas ouvert/,
  });
  const reference = main.match(/FD-[A-Z0-9]{6}/)?.[0];
  check(
    "in French: the number and the promise to get in touch",
    main.includes("envoyez-la-nous sur WhatsApp au +237 600 00 00 00.") &&
      main.includes(
        `Nous avons bien reçu la commande ${reference}. Si vous n'arrivez pas à l'envoyer, pas d'inquiétude : nous vous contacterons au 677 12 34 56.`,
      ),
    main,
  );
  await page.getByRole("button", { name: "Copier ma commande" }).click();
  const box = page.getByLabel(/Sélectionnez le texte ci-dessous/);
  await box.waitFor();
  const text = plain(await box.inputValue());
  const selected = await box.evaluate((el) => el.selectionEnd - el.selectionStart);
  check(
    "when copying is blocked, the order is shown ready to copy by hand",
    text.includes(`*Commande ${reference}*`) &&
      text.includes("Mélange de fruits × 2") &&
      selected === (await box.inputValue()).length,
    `${text} | selected ${selected}`,
  );
}

check("no page errors", errs.length === 0, errs.join(" | "));
finish();
await b.close();
