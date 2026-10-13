import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { getProductImages } from "@/lib/product-images";
import { getProducts } from "@/lib/catalog";
import { getDictionary, localePath, localizeProduct } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { formatPrice } from "@/lib/products";
import { JsonLd, pageMetadata, siteOrigin } from "@/lib/seo";

export async function generateMetadata() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  return pageMetadata(lang, "/", { description: t.meta.siteDescription });
}

export default async function Home() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  const products = (await getProducts()).map((p) => localizeProduct(p, lang));
  const images = getProductImages();
  const origin = siteOrigin();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Fruidry",
          url: origin,
          description: t.meta.siteDescription,
          areaServed: { "@type": "Country", name: "Cameroon" },
        }}
      />
      <section className="bg-gradient-to-br from-orange-100 via-amber-50 to-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
              {t.home.badge}
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-stone-900 sm:text-5xl">
              {t.home.titleBefore}
              <span className="text-brand">{t.home.titleHighlight}</span>
              {t.home.titleAfter}
            </h1>
            <p className="mt-4 max-w-md text-lg text-stone-600">{t.home.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={localePath(lang, "/shop")}
                className="rounded-full bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
              >
                {t.home.shopNow}
              </Link>
              <Link
                href={localePath(lang, "/about")}
                className="rounded-full border border-stone-300 bg-white px-6 py-3 font-semibold text-stone-800 transition hover:border-brand hover:text-brand"
              >
                {t.home.ourStory}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-5xl sm:text-6xl" aria-hidden>
            {["🍓", "🥭", "🫐", "🍎", "🍍", "🍌", "🍑", "🍒", "🍇"].map((e) => (
              <div
                key={e}
                className="flex aspect-square items-center justify-center rounded-2xl bg-white/70 shadow-sm"
              >
                {e}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {t.home.values.map((v) => (
            <div key={v.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="text-3xl" aria-hidden>
                {v.icon}
              </div>
              <h2 className="mt-3 text-lg font-semibold">{v.title}</h2>
              <p className="mt-1 text-sm text-stone-600">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        {products.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-stone-600 shadow-sm">
            {t.home.comingSoon}
          </p>
        ) : products.length === 1 ? (
          <FeaturedProduct
            product={products[0]}
            image={images[products[0].slug]}
            lang={lang}
            t={t}
          />
        ) : (
          <>
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="text-3xl font-bold tracking-tight">{t.home.ourRange}</h2>
              <Link
                href={localePath(lang, "/shop")}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {t.home.viewAll}
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.slug} product={product} image={images[product.slug]} />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

function FeaturedProduct({ product, image, lang, t }) {
  return (
    <div className="grid items-center gap-10 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-2 md:p-10">
      <ProductImage
        product={product}
        src={image}
        sizes="(min-width: 768px) 50vw, 100vw"
        emojiClassName="text-[8rem]"
        className="aspect-square rounded-2xl"
      />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          {t.home.ourPack}
        </p>
        <h2 className="mt-1 text-3xl font-extrabold tracking-tight">{product.name}</h2>
        <p className="mt-2 text-lg text-stone-600">{product.tagline}</p>
        <p className="mt-4 text-3xl font-bold">
          {formatPrice(product.price)}{" "}
          <span className="text-base font-normal text-stone-500">/ {product.weight}</span>
        </p>
        <p className="mt-4 text-stone-700">{product.description}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {product.highlights.map((h) => (
            <li key={h} className="rounded-full bg-orange-50 px-3 py-1 text-sm text-stone-700">
              ✓ {h}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <AddToCartButton slug={product.slug} inStock={product.inStock} withQuantity />
          <Link
            href={localePath(lang, `/shop/${product.slug}`)}
            className="text-sm font-semibold text-brand hover:underline"
          >
            {t.home.moreDetails}
          </Link>
        </div>
      </div>
    </div>
  );
}
