import Link from "next/link";
import { formatPrice, type Product } from "@/lib/products";
import { AddToCartButton } from "./AddToCartButton";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
      <Link href={`/shop/${product.slug}`} className="block">
        <div
          className={`flex aspect-square items-center justify-center bg-gradient-to-br ${product.color} text-7xl transition group-hover:scale-[1.02]`}
          aria-hidden
        >
          {product.emoji}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/shop/${product.slug}`}>
            <h3 className="font-semibold text-stone-900 hover:text-brand">{product.name}</h3>
          </Link>
          <span className="font-semibold text-brand">{formatPrice(product.price)}</span>
        </div>
        <p className="text-sm text-stone-600">{product.tagline}</p>
        <p className="text-xs text-stone-500">{product.weight}</p>
        <div className="mt-auto pt-2">
          <AddToCartButton slug={product.slug} />
        </div>
      </div>
    </article>
  );
}
