import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { getProductImages } from "@/lib/product-images";
import { categories, formatPrice, getProduct, products } from "@/lib/products";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Product not found" };
  return { title: product.name, description: product.tagline };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const images = getProductImages();
  const categoryLabel = categories.find((c) => c.id === product.category)?.label;
  const related = products
    .filter((p) => p.category === product.category && p.slug !== product.slug)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Link href="/shop" className="text-sm font-medium text-stone-600 hover:text-brand">
        ← Back to shop
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
          <p className="mt-4 text-3xl font-bold">
            {formatPrice(product.price)}{" "}
            <span className="text-base font-normal text-stone-500">/ {product.weight}</span>
          </p>
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
            <AddToCartButton slug={product.slug} withQuantity />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-2xl font-bold">You might also like</h2>
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
