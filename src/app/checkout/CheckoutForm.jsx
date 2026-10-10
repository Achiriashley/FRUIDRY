"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/products";
import { placeOrder } from "./actions";
import { submitKeepingInput } from "@/lib/use-keep-form";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-orange-200";

const LAST_ORDER_KEY = "fruidry-last-order";

function FieldError({ message }) {
  return message ? <p className="mt-1 text-sm text-red-600">{message}</p> : null;
}

export function CheckoutForm() {
  const { items, subtotal, clear } = useCart();
  const [state, formAction, pending] = useActionState(placeOrder, { status: "idle" });
  const [lastOrder, setLastOrder] = useState(null);

  // If the customer comes back from WhatsApp and the page reloads, show the order they sent.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(LAST_ORDER_KEY) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved?.whatsappUrl) setLastOrder(saved);
    } catch {
      // Storage unavailable; nothing to restore.
    }
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      try {
        window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(state));
      } catch {
        // Storage unavailable; the confirmation still shows until the page reloads.
      }
      clear();
      // Opens the WhatsApp app on phones, or WhatsApp Web on computers.
      window.location.href = state.whatsappUrl;
    }
  }, [state, clear]);

  if (state.status === "success") {
    return <OrderSent state={state} />;
  }

  if (items.length === 0 && lastOrder) {
    return <OrderSent state={lastOrder} />;
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
          Your order opens in WhatsApp with everything filled in. Just press send, and we&apos;ll
          reply to arrange payment and delivery.
        </p>
        <FieldError message={state.errors?.form} />
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-full bg-[#25D366] py-3 font-semibold text-white hover:bg-[#1ebe5a] disabled:opacity-60"
        >
          {pending ? "Preparing your order…" : "Order on WhatsApp"}
        </button>
      </aside>
    </form>
  );
}

function OrderSent({ state }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm" role="status">
      <p className="text-5xl" aria-hidden>
        💬
      </p>
      <h2 className="mt-4 text-2xl font-bold">Almost done!</h2>
      <p className="mt-2 text-stone-600">
        Your order <span className="font-mono font-semibold">{state.reference}</span> is ready in
        WhatsApp. Press <strong>send</strong> there to place it, and we&apos;ll reply to arrange
        payment and delivery.
      </p>
      <a
        href={state.whatsappUrl}
        className="mt-6 inline-block rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white hover:bg-[#1ebe5a]"
      >
        Open WhatsApp again
      </a>
      {state.orderId && (
        <p className="mt-4 text-sm">
          <Link
            href={`/order/${state.orderId}`}
            className="text-stone-600 underline hover:text-brand"
          >
            View your order
          </Link>{" "}
          <span className="text-stone-500">
            (your receipt appears there once we confirm payment)
          </span>
        </p>
      )}
    </div>
  );
}
