import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ComingSoon } from "@/components/ComingSoon";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { getProductImages } from "@/lib/product-images";
import { getProducts } from "@/lib/catalog";
import { getDictionary, localePath, localizeProduct } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { formatPrice, isOrderable } from "@/lib/products";
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
  const forSale = products.filter((p) => !p.comingSoon);
  const upcoming = products.filter((p) => p.comingSoon);
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
          logo: `${origin}/brand/logo-lockup.png`,
          description: t.meta.siteDescription,
          areaServed: { "@type": "Country", name: "Cameroon" },
        }}
      />
      <Hero products={forSale} images={images} lang={lang} t={t} />

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

      <section className="mx-auto max-w-6xl px-4 pb-16">
        {forSale.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-stone-600 shadow-sm">
            {t.home.comingSoon}
          </p>
        ) : forSale.length === 1 ? (
          <FeaturedProduct
            product={forSale[0]}
            image={images[forSale[0].slug]}
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
              {forSale.map((product) => (
                <ProductCard key={product.slug} product={product} image={images[product.slug]} />
              ))}
            </div>
          </>
        )}
      </section>

      {upcoming.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 pb-20">
          <ComingSoon products={upcoming} images={images} t={t} />
        </div>
      )}
    </>
  );
}

// The first thing visitors see: what Fruidry is, the price, and a way to order.
function Hero({ products, images, lang, t }) {
  const featured = products.find(isOrderable) ?? products[0];
  const single = products.length === 1;
  const photo = featured && (featured.image || images[featured.slug]);
  const lowestPrice = Math.min(...products.map((p) => p.price));
  const orderHref = localePath(lang, single ? `/shop/${featured.slug}` : "/shop");

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-sun-light via-cream to-brand-light">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 -z-10 h-[28rem] w-[28rem] rounded-full bg-sun/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 -z-10 h-[26rem] w-[26rem] rounded-full bg-brand/10 blur-3xl"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-[1.1fr_1fr] md:gap-12 md:py-20">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-sun" aria-hidden />
            {t.home.eyebrow}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-brand-deep sm:text-5xl lg:text-6xl">
            {t.home.titleBefore}
            <span className="relative isolate whitespace-nowrap text-brand">
              <span
                aria-hidden
                className="absolute inset-x-[-0.12em] bottom-[0.08em] -z-10 h-[0.42em] -rotate-1 rounded-sm bg-sun/80"
              />
              {t.home.titleHighlight}
            </span>
            {t.home.titleAfter}
          </h1>
          <p className="mt-4 max-w-md text-lg text-stone-700">{t.home.intro}</p>

          {featured && (
            <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-bold text-brand-deep">
                {single ? formatPrice(featured.price) : t.home.priceFrom(formatPrice(lowestPrice))}
              </span>
              {single && (
                <span className="text-sm text-stone-600">
                  {featured.name} · {featured.weight}
                </span>
              )}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={featured ? orderHref : localePath(lang, "/shop")}
              className="rounded-full bg-brand px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              {featured ? t.home.orderNow : t.home.shopNow}
            </Link>
            <Link
              href={localePath(lang, "/about")}
              className="rounded-full border border-stone-300 bg-white px-6 py-3 font-semibold text-stone-800 transition hover:border-brand hover:text-brand"
            >
              {t.home.ourStory}
            </Link>
          </div>
          {featured && (
            <p className="mt-4 flex items-center gap-2 text-sm text-stone-600">
              <span aria-hidden>💬</span>
              {t.home.orderHint}
            </p>
          )}
        </div>

        <div className="relative mx-auto w-48 sm:w-60 md:w-72 lg:w-80">
          <div
            aria-hidden
            className="absolute inset-[6%] -z-10 rounded-full bg-gradient-to-br from-sun/50 to-brand/20 blur-2xl"
          />
          {photo ? (
            <Image
              src={photo}
              alt={featured.name}
              width={557}
              height={900}
              preload
              sizes="(min-width: 1024px) 320px, (min-width: 768px) 288px, (min-width: 640px) 240px, 192px"
              className="h-auto w-full -rotate-3 drop-shadow-2xl"
            />
          ) : (
            <Image
              src="/brand/emblem.png"
              alt=""
              width={443}
              height={658}
              preload
              className="mx-auto h-auto w-3/4"
            />
          )}
        </div>
      </div>
    </section>
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
            <li key={h} className="rounded-full bg-brand-light px-3 py-1 text-sm text-stone-700">
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
