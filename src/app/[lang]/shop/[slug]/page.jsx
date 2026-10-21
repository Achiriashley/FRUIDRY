import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { getProductImages } from "@/lib/product-images";
import { getProduct, getProducts } from "@/lib/catalog";
import { getDictionary, localePath, localizeProduct, searchName } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { formatPrice, isInStock, isOrderable } from "@/lib/products";
import { getApprovedReviews, ratingSummary } from "@/lib/reviews";
import { JsonLd, organizationId, pageMetadata, siteOrigin } from "@/lib/seo";
import { DELIVERY_DAYS } from "@/lib/shop-config";
import { NotifyForm } from "./NotifyForm";
import { ProductReviews } from "./ProductReviews";

// Each product page is built ahead of time, with its text in the page itself, so
// search engines and link previews read it without running any JavaScript. A product
// added later is built on its first visit, and an unknown one gets a real 404.
export const ensureStatic = "navigation";

// A number of days, as structured data for search engines.
const days = (minValue, maxValue) => ({
  "@type": "QuantitativeValue",
  minValue,
  maxValue,
  unitCode: "DAY",
});

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const lang = await getLocale();
  const t = getDictionary(lang);
  const found = await getProduct(slug);
  if (!found) return { title: t.product.notFound };
  const product = localizeProduct(found, lang);
  // "Mangue lyophilisée 50 g", then e.g. "Un mélange croquant de fruits lyophilisés.
  // 100 % fruit · Sans sucre ajouté · Sans conservateurs. 2 500 FCFA / 50 g, livraison
  // partout au Cameroun." Everything comes from the product's own details.
  const sentence = (text) => (text && !/[.!?…]$/.test(text) ? `${text}.` : text);
  const detail = product.comingSoon
    ? `${t.comingSoon.badge}.`
    : t.product.metaPrice([formatPrice(product.price), product.weight].filter(Boolean).join(" / "));
  return pageMetadata(lang, `/shop/${slug}`, {
    ownOgImage: true,
    title: [searchName(product), product.weight].filter(Boolean).join(" "),
    description: [
      sentence(product.tagline?.trim()),
      sentence(product.highlights?.slice(0, 3).join(" · ")),
      detail,
    ]
      .filter(Boolean)
      .join(" "),
  });
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const lang = await getLocale();
  const t = getDictionary(lang);
  const found = await getProduct(slug);
  if (!found) notFound();
  const product = localizeProduct(found, lang);
  const products = (await getProducts()).map((p) => localizeProduct(p, lang));
  // The mix on sale, mentioned on coming-soon fruits that are already in it.
  const mix = products.find((p) => p.category === "mixes" && isOrderable(p));

  const images = getProductImages();
  const categoryLabel = t.categories[product.category];
  const origin = siteOrigin();
  const pageUrl = `${origin}${localePath(lang, `/shop/${product.slug}`)}`;
  const photo = product.image || images[product.slug];
  // Reviews only for products on sale: nobody has tried a coming-soon flavour yet.
  const reviews = product.comingSoon ? [] : await getApprovedReviews(product.slug);
  const summary = ratingSummary(reviews);
  // Products customers can order first, then same-category ones.
  const related = products
    .filter((p) => p.slug !== product.slug)
    .sort(
      (a, b) =>
        isOrderable(b) - isOrderable(a) ||
        (b.category === product.category) - (a.category === product.category),
    )
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Products that aren't on sale yet have no price, so no product data for Google. */}
      {!product.comingSoon && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Product",
            // The fuller name, as in the page title ("Mélange de fruits lyophilisés").
            name: searchName(product),
            description: product.description,
            sku: product.sku,
            image: photo ? new URL(photo, origin).href : `${pageUrl}/opengraph-image`,
            brand: { "@type": "Brand", name: "Fruidry" },
            offers: {
              "@type": "Offer",
              seller: { "@type": "OnlineStore", "@id": organizationId(origin), name: "Fruidry" },
              url: pageUrl,
              price: product.price,
              priceCurrency: "XAF",
              itemCondition: "https://schema.org/NewCondition",
              availability: isInStock(product)
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              // Delivery anywhere in Cameroon in 2 to 5 days in all (sent within a day,
              // then on the road); no fee, as it depends on the rider.
              shippingDetails: {
                "@type": "OfferShippingDetails",
                shippingDestination: { "@type": "DefinedRegion", addressCountry: "CM" },
                deliveryTime: {
                  "@type": "ShippingDeliveryTime",
                  handlingTime: days(0, 1),
                  transitTime: days(DELIVERY_DAYS.min, DELIVERY_DAYS.max - 1),
                },
              },
              hasMerchantReturnPolicy: {
                "@type": "MerchantReturnPolicy",
                applicableCountry: "CM",
                returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
              },
            },
            // Only real, approved reviews shown on this page (Google's rules).
            ...(summary.count > 0 && {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: summary.average,
                reviewCount: summary.count,
                bestRating: 5,
                worstRating: 1,
              },
              review: reviews.slice(0, 10).map((r) => ({
                "@type": "Review",
                author: { "@type": "Person", name: r.name },
                datePublished: r.createdAt.slice(0, 10),
                reviewBody: r.comment,
                reviewRating: {
                  "@type": "Rating",
                  ratingValue: r.rating,
                  bestRating: 5,
                  worstRating: 1,
                },
              })),
            }),
          }}
        />
      )}
      <Link
        href={localePath(lang, "/shop")}
        className="text-sm font-medium text-stone-600 hover:text-brand"
      >
        {t.product.backToShop}
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <ProductImage
          product={product}
          src={images[product.slug]}
          sizes="(min-width: 768px) 50vw, 100vw"
          emojiClassName="text-[9rem]"
          className="aspect-square rounded-3xl"
          preload
        />
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">
            {categoryLabel}
          </p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight">{product.name}</h1>
          <p className="mt-2 text-lg text-stone-600">{product.tagline}</p>
          {product.comingSoon ? (
            <p className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-sun px-3 py-1 text-sm font-bold text-brand-deep">
                {t.comingSoon.badge}
              </span>
              <span className="text-lg text-stone-600">{product.weight}</span>
            </p>
          ) : (
            <p className="mt-4 text-3xl font-bold">
              {formatPrice(product.price)}{" "}
              <span className="text-base font-normal text-stone-600">/ {product.weight}</span>
            </p>
          )}
          {product.sku && (
            <p className="mt-1 text-sm text-stone-600">
              {/* The phone's own monospace font: no extra font download for one code. */}
              {t.product.itemCode}{" "}
              <span className="[font-family:ui-monospace,monospace]">{product.sku}</span>
            </p>
          )}
          <p className="mt-6 text-stone-700">{product.description}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {product.highlights.map((h) => (
              <li
                key={h}
                className="rounded-full bg-white px-3 py-1 text-sm text-stone-700 shadow-sm"
              >
                ✓ {h}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
            <Link href={localePath(lang, "/about")} className="text-brand hover:underline">
              {t.about.howWeMakeIt} →
            </Link>
            <Link href={localePath(lang, "/guide")} className="text-brand hover:underline">
              {t.guide.linkLabel} →
            </Link>
          </p>
          <div className="mt-8">
            {product.comingSoon ? (
              <div className="space-y-4">
                <p className="text-pretty text-stone-600">{t.comingSoon.notYet}</p>
                {product.inMix && mix && (
                  <p className="text-pretty text-stone-700">
                    {t.comingSoon.inMixBefore}
                    <Link
                      href={localePath(lang, `/shop/${mix.slug}`)}
                      className="font-semibold text-brand hover:underline"
                    >
                      {searchName(mix)}
                    </Link>
                    {t.comingSoon.inMixAfter}
                  </p>
                )}
                <NotifyForm slug={product.slug} />
              </div>
            ) : (
              <AddToCartButton slug={product.slug} inStock={isInStock(product)} withQuantity />
            )}
          </div>
          {!product.comingSoon && (
            <section aria-labelledby="delivery-heading" className="mt-8">
              <h2
                id="delivery-heading"
                className="text-sm font-semibold uppercase tracking-wider text-brand"
              >
                {t.product.deliveryHeading}
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
                {t.product.deliveryInfo.map(({ icon, text }) => {
                  const line = typeof text === "function" ? text(DELIVERY_DAYS) : text;
                  return (
                    <li key={line} className="flex gap-2">
                      <span aria-hidden>{icon}</span>
                      <span>{line}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>

      {!product.comingSoon && (
        <ProductReviews slug={product.slug} reviews={reviews} summary={summary} lang={lang} t={t} />
      )}

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-2xl font-bold">{t.product.related}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} image={images[p.slug]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
