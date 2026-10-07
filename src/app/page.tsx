import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getProductImages } from "@/lib/product-images";
import { products } from "@/lib/products";

const featuredSlugs = ["golden-mango-slices", "wild-blueberries", "tropical-trail-mix"];

const values = [
  { icon: "☀️", title: "Slow dried", text: "Low-temperature drying keeps the flavour, colour and nutrients in." },
  { icon: "🌱", title: "Nothing added", text: "No added sugar, sulphites or preservatives. Just fruit." },
  { icon: "♻️", title: "Kind packaging", text: "Resealable pouches made from compostable materials." },
];

export default function Home() {
  const images = getProductImages();
  const featured = products.filter((p) => featuredSlugs.includes(p.slug));

  return (
    <>
      <section className="bg-gradient-to-br from-orange-100 via-amber-50 to-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
              100% fruit · 0% fuss
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-stone-900 sm:text-5xl">
              Dried fruit, <span className="text-brand">naturally</span> delicious.
            </h1>
            <p className="mt-4 max-w-md text-lg text-stone-600">
              Fruidry dries ripe fruit slowly so you get real flavour in every
              bite, with nothing added.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="rounded-full bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark">
                Shop now
              </Link>
              <Link href="/about" className="rounded-full border border-stone-300 bg-white px-6 py-3 font-semibold text-stone-800 transition hover:border-brand hover:text-brand">
                Our story
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-5xl sm:text-6xl" aria-hidden>
            {["🥭", "🍓", "🍍", "🍎", "🫐", "🍌", "🍑", "🍒", "🥥"].map((e) => (
              <div key={e} className="flex aspect-square items-center justify-center rounded-2xl bg-white/70 shadow-sm">
                {e}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="text-3xl" aria-hidden>{v.icon}</div>
              <h2 className="mt-3 text-lg font-semibold">{v.title}</h2>
              <p className="mt-1 text-sm text-stone-600">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Customer favourites</h2>
          <Link href="/shop" className="text-sm font-semibold text-brand hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.slug} product={product} image={images[product.slug]} />
          ))}
        </div>
      </section>
    </>
  );
}
