// What search engines and link previews see: page titles and descriptions, product
// pages readable without JavaScript, real 404s for addresses that aren't pages, and
// redirects for capitalised language codes.
import { ADMIN_PASSWORD, BASE_URL as B, check, finish, launch } from "./lib.mjs";

const html = async (path) => (await fetch(B + path)).text();
const meta = (page, attr, name) =>
  page.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1]?.replace(/\s+/g, " ");
// French puts a no-break space before ":" and "?": compared with plain spaces.
const title = (page) => page.match(/<title>([^<]*)<\/title>/)?.[1]?.replace(/\s+/g, " ");

// ---------- Titles and descriptions ----------

const expectedTitles = {
  "/fr": "Fruidry | Snacks de fruits lyophilisés au Cameroun",
  "/en": "Fruidry | Freeze-dried fruit snacks in Cameroon",
  "/fr/shop": "Boutique de fruits lyophilisés | Fruidry",
  "/en/about": "Our story and how freeze-drying works | Fruidry",
  "/fr/shop/mixed-fruit-pack": "Mélange de fruits lyophilisés 50 g | Fruidry",
  "/en/shop/mixed-fruit-pack": "Freeze-dried Mixed Fruit Pack 50 g | Fruidry",
  "/fr/shop/mango-pack": "Mangue lyophilisée 50 g | Fruidry",
  "/fr/guide": "Fruits lyophilisés au Cameroun : prix et conseils | Fruidry",
  "/en/guide": "Freeze-dried fruit in Cameroon: price and tips | Fruidry",
};
for (const [path, expected] of Object.entries(expectedTitles)) {
  const page = await html(path);
  check(`title of ${path}`, title(page) === expected, title(page));
  const og = meta(page, "property", "og:title");
  check(`link-preview title of ${path} carries the brand`, og === expected, og);
  const description = meta(page, "name", "description") ?? "";
  check(
    `description of ${path} is a useful length`,
    description.length >= 80 && description.length <= 160,
    `${description.length}: ${description}`,
  );
}
{
  const page = await html("/fr/shop/mixed-fruit-pack");
  const description = meta(page, "name", "description");
  check(
    "product description gives the price, the highlights and delivery",
    /2\s500\sFCFA \/ 50 g/.test(description) &&
      description.includes("Sans sucre ajouté") &&
      description.includes("livraison partout au Cameroun"),
    description,
  );
  check(
    "the page heading keeps the product's plain name",
    /<h1[^>]*>Mélange de fruits<\/h1>/.test(page),
  );
}

// ---------- Product data for Google ----------

const jsonLd = (page) =>
  [...page.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1]),
  );
{
  const product = jsonLd(await html("/fr/shop/mixed-fruit-pack")).find(
    (d) => d["@type"] === "Product",
  );
  const offer = product?.offers ?? {};
  const shipping = offer.shippingDetails ?? {};
  const time = shipping.deliveryTime ?? {};
  check(
    "product data: price in XAF, in stock",
    offer.price === 2500 && offer.priceCurrency === "XAF" && /InStock$/.test(offer.availability),
    JSON.stringify(offer).slice(0, 160),
  );
  check(
    "product data: delivery anywhere in Cameroon in 2 to 5 days, with no made-up fee",
    shipping.shippingDestination?.addressCountry === "CM" &&
      time.handlingTime.minValue + time.transitTime.minValue === 2 &&
      time.handlingTime.maxValue + time.transitTime.maxValue === 5 &&
      time.transitTime.unitCode === "DAY" &&
      shipping.shippingRate === undefined,
    JSON.stringify(shipping),
  );
  check(
    "product data: returns policy for Cameroon, with a link to the returns page",
    offer.hasMerchantReturnPolicy?.applicableCountry === "CM" &&
      /MerchantReturnNotPermitted$/.test(offer.hasMerchantReturnPolicy?.returnPolicyCategory) &&
      /^https?:\/\/[^/]+\/fr\/returns$/.test(offer.hasMerchantReturnPolicy?.merchantReturnLink),
    JSON.stringify(offer.hasMerchantReturnPolicy),
  );
  check(
    "no ratings or reviews are claimed",
    !("aggregateRating" in product) && !("review" in product),
  );
  const soon = jsonLd(await html("/fr/shop/mango-pack"));
  check(
    "a coming-soon product has no product data (it has no price yet)",
    !soon.some((d) => d["@type"] === "Product"),
  );
}

// ---------- Questions page ----------

{
  const page = await html("/fr/guide");
  const faq = jsonLd(page).find((d) => d["@type"] === "FAQPage");
  const answers = (faq?.mainEntity ?? []).map((q) => `${q.name} ${q.acceptedAnswer.text}`);
  check(
    "the questions page answers price, delivery, storage and flavours, with FAQ data",
    answers.length === 13 &&
      answers.some((a) => a.includes("MTN Mobile Money")) &&
      answers.some((a) => a.includes("remplaçons ou vous remboursons")) &&
      answers.some((a) => a.includes("fruits secs ou déshydratés")) &&
      answers.some((a) => /Mélange de fruits coûte 2\s500\sFCFA le sachet de 50 g/.test(a)) &&
      answers.some((a) => a.includes("Douala, Yaoundé, Buea, Limbé et Bamenda")) &&
      answers.some((a) => a.includes("2 à 5 jours")) &&
      answers.some((a) => a.includes("fermeture zip")) &&
      answers.some((a) => a.includes("Bientôt disponible") && a.includes("Mangue lyophilisée")),
    answers.length,
  );
  check(
    "…with its heading, in the page itself",
    /<h1[^>]*>Fruits lyophilisés au Cameroun/.test(page) && page.includes("Qu&#x27;est-ce qu"),
  );
  const sitemap = await html("/sitemap.xml");
  check(
    "the sitemap lists the questions page in both languages",
    sitemap.includes("/fr/guide</loc>") && sitemap.includes("/en/guide</loc>"),
  );
  for (const path of ["/fr", "/fr/shop/mixed-fruit-pack", "/fr/about"]) {
    check(`${path} links to the questions page`, (await html(path)).includes('href="/fr/guide"'));
  }
}

// ---------- Pages say where Fruidry is and how it delivers ----------

{
  const text = (page) =>
    page
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
  const main = (page) => text(page.slice(page.indexOf("<main"), page.indexOf("</main>")));
  const home = main(await html("/fr"));
  check(
    "the home page body says Douala, the cities and the delivery time, and links to the guide",
    home.includes("Fruits lyophilisés à Douala et partout au Cameroun") &&
      home.includes("Bonabéri") &&
      home.includes("en 2 à 5 jours") &&
      (await html("/fr")).includes('href="/fr/guide"'),
    home.slice(0, 300),
  );
  const product = main(await html("/fr/shop/mixed-fruit-pack"));
  check(
    "the product page shows delivery, storage and returns",
    product.includes("Livraison et retours") &&
      product.includes("en 2 à 5 jours selon la distance") &&
      product.includes("refermable par zip") &&
      product.includes("nous le remplaçons ou vous remboursons"),
    product.slice(0, 300),
  );
  const shop = main(await html("/fr/shop"));
  check(
    "the shop page heading and intro say what and where",
    shop.includes("Boutique de fruits lyophilisés") && shop.includes("en 2 à 5 jours"),
  );
  const mango = await html("/fr/shop/mango-pack");
  check(
    "a coming-soon fruit says it's already in the mix, with a link and no price",
    /fait déjà partie de notre <a[^>]*href="\/fr\/shop\/mixed-fruit-pack"[^>]*>Mélange de fruits lyophilisés<\/a>/.test(
      mango,
    ),
  );
  const about = main(await html("/fr/about"));
  check("the story page says where Fruidry is", about.includes("Bonabéri, à Douala"));
}

// ---------- Business and product data ----------

{
  const graph = jsonLd(await html("/fr")).find((d) => d["@graph"])?.["@graph"] ?? [];
  const store = graph.find((d) => d["@type"] === "OnlineStore");
  const site = graph.find((d) => d["@type"] === "WebSite");
  check(
    "the home page describes Fruidry as an online store in Douala, and names the site",
    store?.["@id"]?.endsWith("/#organization") &&
      store.address?.addressLocality === "Douala" &&
      store.contactPoint?.telephone === "+237 671 820 032" &&
      site?.name === "Fruidry" &&
      site.publisher?.["@id"] === store["@id"],
    JSON.stringify(graph).slice(0, 200),
  );
  const product = jsonLd(await html("/fr/shop/mixed-fruit-pack")).find(
    (d) => d["@type"] === "Product",
  );
  check(
    "the product data uses the fuller name and names the seller",
    product?.name === "Mélange de fruits lyophilisés" &&
      product.offers?.seller?.["@id"] === store?.["@id"],
    product?.name,
  );
  const sitemap = await html("/sitemap.xml");
  check(
    "the sitemap lists product photos",
    /<loc>[^<]*\/fr\/shop\/mixed-fruit-pack<\/loc>[\s\S]*?<image:loc>[^<]*\/products\/mixed-fruit-pack\.png<\/image:loc>/.test(
      sitemap,
    ),
  );
  const head = await html("/fr");
  const xDefault = (page) =>
    page.match(/<link rel="alternate" hrefLang="x-default" href="([^"]*)"/)?.[1];
  const shopHead = await html("/en/shop");
  check(
    "the home page's x-default is the bare address (it redirects by language); other pages use French",
    /^https?:\/\/[^/]+\/?$/.test(xDefault(head) ?? "") &&
      /^https?:\/\/[^/]+\/?$/.test(xDefault(await html("/en")) ?? "") &&
      /\/fr\/shop$/.test(xDefault(shopHead) ?? "") &&
      /hreflang="x-default" href="[^"]*\/"\s*\/>/.test(sitemap) &&
      /hreflang="x-default" href="[^"]*\/fr\/shop"\s*\/>/.test(sitemap),
    `${xDefault(head)} | ${xDefault(shopHead)}`,
  );
  check(
    "pages allow large image previews, while the cart stays noindex",
    /<meta name="robots" content="max-image-preview:large"/.test(head) &&
      /<meta name="robots" content="noindex/.test(await html("/fr/cart")),
  );
  const photo = await fetch(B + "/_next/image?url=%2Fproducts%2Fmixed-fruit-pack.png&w=640&q=75", {
    headers: { Accept: "image/avif,image/webp,*/*" },
  });
  check(
    "photos are served as AVIF to browsers that take it",
    photo.headers.get("content-type") === "image/avif",
    photo.headers.get("content-type"),
  );
}

// ---------- Product pages without JavaScript ----------

const b = await launch({ adminHarness: true });
{
  const ctx = await b.newContext({ javaScriptEnabled: false, locale: "fr-FR" });
  const p = await ctx.newPage();
  await p.goto(B + "/fr/shop/mixed-fruit-pack");
  const main = await p.locator("main").innerText();
  check(
    "without JavaScript, the product page shows its name, price and description",
    main.includes("Mélange de fruits") && /2\s500\sFCFA/.test(main) && main.includes("kiwi"),
    main.slice(0, 120),
  );
  const raw = await html("/fr/shop/mixed-fruit-pack");
  const [mainStart, mainEnd] = [raw.indexOf("<main"), raw.indexOf("</main>")];
  const at = (needle) => raw.indexOf(needle);
  check(
    "the heading and product data are inside <main> in the page's HTML",
    mainStart < at("<h1") &&
      at("<h1") < mainEnd &&
      mainStart < at("application/ld+json") &&
      at("application/ld+json") < mainEnd,
  );
  check(
    "the photo is described with the fuller name",
    (await p.locator("main img").first().getAttribute("alt")) === "Mélange de fruits lyophilisés",
  );
  check(
    "the product page links to how freeze-drying works",
    (await p.locator('main a[href="/fr/about"]').count()) === 1,
  );
  check(
    "the footer says where Fruidry is",
    (await p.locator("footer").innerText()).includes("Bonabéri, Douala, Cameroun"),
  );
  await ctx.close();
}

// ---------- 404s and redirects ----------

for (const path of ["/fr/shop/no-such-pack", "/index.html", "/wp-login.php", "/fr.html"]) {
  const res = await fetch(B + path, { redirect: "manual" });
  check(`${path} is a real 404`, res.status === 404, res.status);
}
{
  const res = await fetch(B + "/fr/shop/no-such-pack-2", {
    headers: { "User-Agent": "WhatsApp/2.23.20.0" },
  });
  check("an unknown product is a 404 for link previews too", res.status === 404, res.status);
}
for (const [from, to] of [
  ["/FR", "/fr"],
  ["/En/shop/mixed-fruit-pack?ref=bio", "/en/shop/mixed-fruit-pack?ref=bio"],
]) {
  const res = await fetch(B + from, { redirect: "manual" });
  const location = res.headers.get("location") ?? "";
  check(
    `${from} redirects permanently to ${to}`,
    res.status === 308 && location.endsWith(to),
    `${res.status} ${location}`,
  );
}

// ---------- Renaming a product in the admin panel ----------

{
  const ctx = await b.newContext({ locale: "en-GB" });
  const a = await ctx.newPage();
  await a.goto(B + "/admin/products/apple-pack");
  await a.locator('input[name="password"]:visible').fill(ADMIN_PASSWORD);
  await a.getByRole("button", { name: "Sign in" }).click();
  const form = a.locator("form:visible", { has: a.locator('input[name="price"]') }).first();
  await form.getByLabel("Name", { exact: true }).waitFor();
  await a.waitForTimeout(600);
  await form.getByLabel("Name", { exact: true }).fill("Apple Rings");
  await a.getByRole("button", { name: "Save changes" }).click();
  await a.getByText("Saved ✓").first().waitFor();
  await ctx.close();

  let en = "";
  for (let i = 0; i < 10 && !en.includes("Apple Rings"); i++) {
    en = title(await html("/en/shop/apple-pack")) ?? "";
    if (!en.includes("Apple Rings")) await new Promise((r) => setTimeout(r, 500));
  }
  check("a renamed product's title uses its new name", en === "Apple Rings 50 g | Fruidry", en);
  const fr = title(await html("/fr/shop/apple-pack"));
  check(
    "…while its unchanged French name keeps the fuller one",
    fr === "Pomme lyophilisée 50 g | Fruidry",
    fr,
  );
}

await b.close();
finish();
