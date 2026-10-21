import Link from "next/link";
import { getProducts } from "@/lib/catalog";
import { getDictionary, localePath, localizeProduct, searchName } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { formatPrice, isOrderable } from "@/lib/products";
import { JsonLd, pageMetadata } from "@/lib/seo";
import { shopWhatsAppNumber, whatsAppLink } from "@/lib/shop-config";

// Questions people ask (and search for) about freeze-dried fruit in Cameroon, with
// Fruidry's answers. Prices come from the products in the shop.

// The product whose price is quoted: the first one on sale.
async function loadProducts(lang) {
  const products = (await getProducts()).map((p) => localizeProduct(p, lang));
  const onSale = products.filter((p) => !p.comingSoon);
  const quoted = onSale.find(isOrderable) ?? onSale[0];
  const facts = quoted
    ? {
        name: quoted.name,
        fullName: searchName(quoted),
        slug: quoted.slug,
        price: formatPrice(quoted.price),
        weight: quoted.weight,
      }
    : {};
  return { onSale, comingSoon: products.filter((p) => p.comingSoon), facts };
}

// Texts and links can depend on the quoted product (see i18n.js guide).
const resolve = (value, facts) => (typeof value === "function" ? value(facts) : value);

export async function generateMetadata() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  const { facts } = await loadProducts(lang);
  return pageMetadata(lang, "/guide", {
    title: t.guide.metaTitle,
    description: t.guide.description(facts),
  });
}

export default async function GuidePage() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  const g = t.guide;
  const { onSale, comingSoon, facts } = await loadProducts(lang);
  const whatsApp = shopWhatsAppNumber();
  // Flavours by their fuller names ("Mangue lyophilisée"), as people search them.
  const list = (products) => products.map(searchName).join(", ");
  const flavoursText = [
    onSale.length > 0 && `${g.flavours.available} ${list(onSale)}.`,
    comingSoon.length > 0 && `${g.flavours.soon} ${list(comingSoon)}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const questions = g.questions.map((item) => ({
    ...item,
    paragraphs: item.a.map((p) => resolve(p, facts)),
    link: item.link && {
      path: resolve(item.link.path, facts),
      label: resolve(item.link.label, facts),
    },
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            ...questions.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.paragraphs.join(" ") },
            })),
            ...(flavoursText
              ? [
                  {
                    "@type": "Question",
                    name: g.flavours.q,
                    acceptedAnswer: { "@type": "Answer", text: flavoursText },
                  },
                ]
              : []),
          ],
        }}
      />
      <h1 className="text-4xl font-extrabold tracking-tight text-balance">{g.title}</h1>
      <p className="mt-4 text-lg text-stone-700">{g.intro}</p>

      <div className="mt-10 space-y-4">
        {questions.map((item) => (
          <section key={item.q} className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{item.q}</h2>
            {item.paragraphs.map((p) => (
              <p key={p} className="mt-2 text-stone-700">
                {p}
              </p>
            ))}
            {item.link && (
              <Link
                href={localePath(lang, item.link.path)}
                className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
              >
                {item.link.label} →
              </Link>
            )}
          </section>
        ))}

        {flavoursText && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{g.flavours.q}</h2>
            {[
              [g.flavours.available, onSale],
              [g.flavours.soon, comingSoon],
            ].map(([label, products]) =>
              products.length > 0 ? (
                <p key={label} className="mt-2 text-stone-700">
                  {label}{" "}
                  {products.map((p, i) => (
                    <span key={p.slug}>
                      {i > 0 && ", "}
                      <Link
                        href={localePath(lang, `/shop/${p.slug}`)}
                        className="font-semibold text-brand hover:underline"
                      >
                        {searchName(p)}
                      </Link>
                    </span>
                  ))}
                  .
                </p>
              ) : null,
            )}
          </section>
        )}
      </div>

      <div className="mt-12 rounded-2xl bg-gradient-to-br from-sun-light to-brand-light p-8 text-center">
        <h2 className="text-2xl font-bold">{t.about.tasteTheDifference}</h2>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            href={localePath(lang, "/shop")}
            className="rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            {t.about.shopTheRange}
          </Link>
          {whatsApp && (
            <a
              href={whatsAppLink(whatsApp, t.contact.chatGreeting)}
              className="rounded-full btn-whatsapp px-6 py-3 font-semibold"
            >
              {t.contact.chatOnWhatsApp}
            </a>
          )}
        </div>
        <p className="mt-3 text-sm text-stone-700">{g.moreQuestions}</p>
      </div>
    </div>
  );
}
