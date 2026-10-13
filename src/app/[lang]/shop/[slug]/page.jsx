import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { getProductImages } from "@/lib/product-images";
import { getProduct, getProducts } from "@/lib/catalog";
import { getDictionary, localePath, localizeProduct } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { formatPrice, isInStock, isOrderable } from "@/lib/products";
import { JsonLd, pageMetadata, siteOrigin } from "@/lib/seo";

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
  const detail = product.comingSoon
    ? `${t.comingSoon.badge}.`
    : `${formatPrice(product.price)} / ${product.weight}.`;
  return pageMetadata(lang, `/shop/${slug}`, {
    title: product.name,
    description: `${product.tagline} ${detail}`.trim(),
  });
}

export default function ProductPage({ params }) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[60vh] max-w-6xl px-4 py-12" />}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }) {
  const { slug } = await params;
  const lang = await getLocale();
  const t = getDictionary(lang);
  const found = await getProduct(slug);
  if (!found) notFound();
  const product = localizeProduct(found, lang);
  const products = (await getProducts()).map((p) => localizeProduct(p, lang));

  const images = getProductImages();
  const categoryLabel = t.categories[product.category];
  const origin = siteOrigin();
  const pageUrl = `${origin}${localePath(lang, `/shop/${product.slug}`)}`;
  const photo = product.image || images[product.slug];
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
            name: product.name,
            description: product.description,
            sku: product.sku,
            image: photo ? new URL(photo, origin).href : `${pageUrl}/opengraph-image`,
            brand: { "@type": "Brand", name: "Fruidry" },
            offers: {
              "@type": "Offer",
              url: pageUrl,
              price: product.price,
              priceCurrency: "XAF",
              itemCondition: "https://schema.org/NewCondition",
              availability: isInStock(product)
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
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
              <span className="text-lg text-stone-500">{product.weight}</span>
            </p>
          ) : (
            <p className="mt-4 text-3xl font-bold">
              {formatPrice(product.price)}{" "}
              <span className="text-base font-normal text-stone-500">/ {product.weight}</span>
            </p>
          )}
          {product.sku && (
            <p className="mt-1 text-sm text-stone-500">
              {t.product.itemCode} <span className="font-mono">{product.sku}</span>
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
          <div className="mt-8">
            {product.comingSoon ? (
              <p className="text-pretty text-stone-600">{t.comingSoon.notYet}</p>
            ) : (
              <AddToCartButton slug={product.slug} inStock={isInStock(product)} withQuantity />
            )}
          </div>
        </div>
      </div>

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
