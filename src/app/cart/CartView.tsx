"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { ProductImage } from "@/components/ProductImage";
import type { ProductImages } from "@/lib/product-images";
import { formatPrice } from "@/lib/products";

const FREE_SHIPPING_THRESHOLD = 35;
const SHIPPING_FEE = 4.99;

export function CartView({ images }: { images: ProductImages }) {
  const { items, subtotal, updateQuantity, removeItem, clear } = useCart();
  const [ordered, setOrdered] = useState(false);

  if (ordered) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-5xl" aria-hidden>🎉</p>
        <h2 className="mt-4 text-2xl font-bold">Thanks for your order!</h2>
        <p className="mt-2 text-stone-600">
          This is a demo checkout, so no payment was taken.
        </p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">
          Keep shopping
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-5xl" aria-hidden>🧺</p>
        <h2 className="mt-4 text-2xl font-bold">Your cart is empty</h2>
        <p className="mt-2 text-stone-600">Find a snack you love in the shop.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">
          Browse the shop
        </Link>
      </div>
    );
  }

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;

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
              <Link href={`/shop/${product.slug}`} className="font-semibold hover:text-brand">
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
                Remove
              </button>
            </div>
            <div className="flex items-center rounded-full border border-stone-300">
              <button
                type="button"
                aria-label={`Decrease ${product.name} quantity`}
                className="px-3 py-1"
                onClick={() => updateQuantity(product.slug, quantity - 1)}
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                aria-label={`Increase ${product.name} quantity`}
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
        <h2 className="text-lg font-bold">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
        </dl>
        {remaining > 0 && (
          <p className="mt-4 rounded-lg bg-orange-50 p-3 text-xs text-brand-dark">
            Add {formatPrice(remaining)} more for free shipping.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            clear();
            setOrdered(true);
          }}
          className="mt-6 w-full rounded-full bg-brand py-3 font-semibold text-white hover:bg-brand-dark"
        >
          Checkout
        </button>
      </aside>
    </div>
  );
}
