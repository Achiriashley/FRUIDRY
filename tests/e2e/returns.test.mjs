// The returns and refunds page (/fr/returns, /en/returns) and the links to it: footer,
// product pages, the questions page, checkout, the sitemap. The receipt's line is checked
// in wa2.test.mjs, Google's return policy data in seo.test.mjs.
import { BASE_URL as B, artifact, check, finish, launch } from "./lib.mjs";

const b = await launch();
const p = await (
  await b.newContext({ locale: "fr-FR", viewport: { width: 390, height: 844 } })
).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
const plain = (text) => text.replace(/[\s  ]+/g, " ").trim();
const main = async () => plain(await p.locator("main").innerText());

await p.goto(B + "/fr/returns");
await p.getByRole("heading", { name: "Retours et remboursements", level: 1 }).waitFor();
{
  const text = await main();
  check(
    "French page: what's covered, 4 days to tell us, photos and videos",
    ["un sachet arrive abîmé", "n'est pas celui que vous avez commandé", "un sachet manque"].every(
      (t) => text.includes(t),
    ) &&
      text.includes("dans les 4 jours suivant la livraison") &&
      text.includes("des photos et des vidéos des sachets"),
    text.slice(0, 400),
  );
  check(
    "…replacement delivered at our cost, or a MoMo refund within 2 days",
    text.includes("la livraison est à nos frais") &&
      text.includes("par MTN Mobile Money (MoMo), dans les 2 jours"),
  );
  check(
    "…opened packs aren't taken back, and a paid order can't be cancelled",
    text.includes("Les sachets ouverts") &&
      text.includes("Une fois payée, votre commande ne peut plus être annulée"),
  );
  check(
    "…the three steps are numbered and the phone number is a tap-to-call link",
    (await p.locator("main ol > li").count()) === 3 &&
      (await p.locator('main a[href="tel:+237671820032"]').count()) === 2,
  );
}
check(
  "it has its own title and description for search engines",
  (await p.title()).startsWith("Retours et remboursements") &&
    (await p.locator('meta[name="description"]').getAttribute("content")).includes(
      "dans les 4 jours",
    ),
);
check(
  "the footer links to it, next to the privacy policy",
  (await p.locator('footer a[href="/fr/returns"]').count()) === 1 &&
    (await p.locator('footer a[href="/fr/privacy"]').count()) === 1,
);
await p.screenshot({ path: artifact("returns-phone.png"), fullPage: true });

await p.goto(B + "/en/returns");
await p.getByRole("heading", { name: "Returns and refunds", level: 1 }).waitFor();
{
  const text = await main();
  check(
    "English page",
    text.includes("within 4 days of delivery") &&
      text.includes("we pay for the delivery") &&
      text.includes("within 2 days of seeing your photos and videos") &&
      text.includes("Once you've paid, your order can't be cancelled"),
    text.slice(0, 300),
  );
}

await p.goto(B + "/fr/shop/mixed-fruit-pack");
await p.getByRole("heading", { name: "Livraison et retours" }).waitFor();
check(
  "a product page says what to do within 4 days and links to the policy",
  (await p.getByText(/Prévenez-nous dans les 4 jours suivant la livraison/).isVisible()) &&
    (await p.getByRole("link", { name: "Notre politique de retour →" }).getAttribute("href")) ===
      "/fr/returns",
);

await p.goto(B + "/fr/guide");
await p.getByText("Puis-je retourner un sachet ?").first().waitFor();
check(
  "the questions page answers with the 4 days and links to the policy",
  (await main()).includes("dans les 4 jours suivant la livraison, avec des photos") &&
    (await p.locator('main a[href="/fr/returns"]').count()) === 1,
);

await p.evaluate(() =>
  localStorage.setItem("fruidry-cart", JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 1 }])),
);
await p.goto(B + "/en/checkout");
await p.getByText("Once paid, an order can't be cancelled.").first().waitFor();
check(
  "checkout says a paid order can't be cancelled, with a link to the policy",
  (await p.locator('main a[href="/en/returns"]:visible').count()) === 1,
);

const sitemap = await (await fetch(B + "/sitemap.xml")).text();
check(
  "the sitemap lists it in both languages",
  sitemap.includes("/fr/returns</loc>") && sitemap.includes("/en/returns</loc>"),
);

check("no page errors", errs.length === 0, errs.join(" | "));
await b.close();
finish();
