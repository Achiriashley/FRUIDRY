"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/products";
import { shopConfig } from "@/lib/shop-config";
import { placeOrder } from "./actions";
import { submitKeepingInput } from "@/lib/use-keep-form";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-orange-200";

function FieldError({ message }) {
  return message ? <p className="mt-1 text-sm text-red-600">{message}</p> : null;
}

export function CheckoutForm() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(placeOrder, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") {
      clear();
      router.push(`/order/${state.orderId}`);
    }
  }, [state, clear, router]);

  if (state.status === "success") {
    return <p className="text-stone-600">Placing your order…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <h2 className="text-2xl font-bold">Your cart is empty</h2>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  const cartLines = JSON.stringify(items.map(({ slug, quantity }) => ({ slug, quantity })));

  return (
    <form
      onSubmit={submitKeepingInput(formAction)}
      noValidate
      className="grid items-start gap-8 md:grid-cols-[1fr_18rem]"
    >
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Your details</h2>
        <input type="hidden" name="items" value={cartLines} />
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            Full name
          </label>
          <input id="name" name="name" autoComplete="name" className={inputClass} />
          <FieldError message={state.errors?.name} />
        </div>
        <div>
          <label htmlFor="phone" className="text-sm font-medium">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="6XX XX XX XX"
            className={inputClass}
          />
          <FieldError message={state.errors?.phone} />
        </div>
        <div>
          <label htmlFor="address" className="text-sm font-medium">
            Delivery address
          </label>
          <textarea
            id="address"
            name="address"
            rows={2}
            placeholder="Town, neighbourhood and a landmark"
            className={inputClass}
          />
          <FieldError message={state.errors?.address} />
        </div>
        <div>
          <label htmlFor="notes" className="text-sm font-medium">
            Notes <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <textarea id="notes" name="notes" rows={2} className={inputClass} />
        </div>
      </div>

      <aside className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {items.map(({ product, quantity }) => (
            <li key={product.slug} className="flex justify-between gap-2">
              <span>
                {product.name} × {quantity}
              </span>
              <span>{formatPrice(product.price * quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-stone-200 pt-3 text-base font-bold">
          <span>Total</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-4 rounded-lg bg-orange-50 p-3 text-xs text-brand-dark">
          Next you&apos;ll pay with {shopConfig.momo.provider}. We&apos;ll call you to arrange
          delivery.
        </p>
        <FieldError message={state.errors?.form} />
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-full bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Placing order…" : "Place order"}
        </button>
      </aside>
    </form>
  );
}
