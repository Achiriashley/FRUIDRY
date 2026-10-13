"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { useLocale } from "@/components/LocaleProvider";
import { ProductImage } from "@/components/ProductImage";
import { formatPrice } from "@/lib/products";

export function CartView({ images }) {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { t, href } = useLocale();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-5xl" aria-hidden>
          🧺
        </p>
        <h2 className="mt-4 text-2xl font-bold">{t.cart.empty}</h2>
        <p className="mt-2 text-stone-600">{t.cart.emptyHint}</p>
        <Link
          href={href("/shop")}
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          {t.cart.browse}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 md:grid-cols-[1fr_18rem]">
      <ul className="divide-y divide-stone-200 rounded-2xl bg-white shadow-sm">
        {items.map(({ product, quantity }) => (
          <li key={product.slug} className="flex items-center gap-4 p-4">
            <ProductImage
              product={product}
              src={images[product.slug]}
              sizes="64px"
              emojiClassName="text-3xl"
              className="h-16 w-16 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <Link href={href(`/shop/${product.slug}`)} className="font-semibold hover:text-brand">
                {product.name}
              </Link>
              <p className="text-sm text-stone-500">
                {formatPrice(product.price)} · {product.weight}
              </p>
              <button
                type="button"
                onClick={() => removeItem(product.slug)}
                className="mt-1 text-xs text-stone-500 underline hover:text-red-600"
              >
                {t.cart.remove}
              </button>
            </div>
            <div className="flex items-center rounded-full border border-stone-300">
              <button
                type="button"
                aria-label={t.cart.decrease(product.name)}
                className="px-3 py-1"
                onClick={() => updateQuantity(product.slug, quantity - 1)}
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                aria-label={t.cart.increase(product.name)}
                className="px-3 py-1"
                onClick={() => updateQuantity(product.slug, quantity + 1)}
              >
                +
              </button>
            </div>
            <p className="hidden w-20 text-right font-semibold sm:block">
              {formatPrice(product.price * quantity)}
            </p>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">{t.cart.summary}</h2>
        <div className="mt-4 flex justify-between text-base font-bold">
          <span>{t.cart.total}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-4 rounded-lg bg-orange-50 p-3 text-xs text-brand-dark">
          {t.cart.howItWorks}
        </p>
        <Link
          href={href("/checkout")}
          className="mt-6 block w-full rounded-full bg-brand py-3 text-center font-semibold text-white hover:bg-brand-dark"
        >
          {t.cart.checkout}
        </Link>
      </aside>
    </div>
  );
}
