"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useLocale } from "@/components/LocaleProvider";
import { formatPrice } from "@/lib/products";
import { placeOrder } from "./actions";
import { submitKeepingInput, useFieldErrors } from "@/lib/use-keep-form";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none placeholder:text-stone-500 focus:border-brand focus:ring-2 focus:ring-brand/20";

const LAST_ORDER_KEY = "fruidry-last-order";

const FIELDS = ["name", "phone", "address"];

function FieldError({ id, message, alert = false }) {
  return message ? (
    <p id={id} role={alert ? "alert" : undefined} className="mt-1 text-sm text-red-600">
      {message}
    </p>
  ) : null;
}

// Next.js keeps recently visited pages alive in the background. Keying the form by
// bfcacheId gives a fresh form on each new visit (e.g. a second order), while the
// browser's back button still restores what was typed.
export function CheckoutForm() {
  const { bfcacheId } = useRouter();
  return <CheckoutFormInner key={bfcacheId} />;
}

function CheckoutFormInner() {
  const uid = useId();
  const { items, subtotal, clear } = useCart();
  const { lang, t, href } = useLocale();
  const [state, formAction, pending] = useActionState(placeOrder, { status: "idle" });
  const [lastOrder, setLastOrder] = useState(null);
  const openedUrl = useRef(null);
  const { formRef, errorId, fieldProps } = useFieldErrors(state, uid, FIELDS);

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

  // Only once per order: Next.js re-runs effects when a kept-alive page is shown again.
  useEffect(() => {
    if (state.status === "success" && openedUrl.current !== state.whatsappUrl) {
      openedUrl.current = state.whatsappUrl;
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
        <h2 className="text-2xl font-bold">{t.cart.empty}</h2>
        <Link
          href={href("/shop")}
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          {t.cart.browse}
        </Link>
      </div>
    );
  }

  const cartLines = JSON.stringify(items.map(({ slug, quantity }) => ({ slug, quantity })));

  return (
    <form
      ref={formRef}
      onSubmit={submitKeepingInput(formAction)}
      noValidate
      className="grid items-start gap-8 md:grid-cols-[1fr_18rem]"
    >
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">{t.checkout.yourDetails}</h2>
        <input type="hidden" name="items" value={cartLines} />
        <input type="hidden" name="lang" value={lang} />
        <div>
          <label htmlFor={`${uid}-name`} className="text-sm font-medium">
            {t.checkout.fullName}
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            autoComplete="name"
            className={inputClass}
            {...fieldProps("name")}
          />
          <FieldError id={errorId("name")} message={state.errors?.name} />
        </div>
        <div>
          <label htmlFor={`${uid}-phone`} className="text-sm font-medium">
            {t.checkout.phone}
          </label>
          <input
            id={`${uid}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="6XX XX XX XX"
            className={inputClass}
            {...fieldProps("phone")}
          />
          <FieldError id={errorId("phone")} message={state.errors?.phone} />
        </div>
        <div>
          <label htmlFor={`${uid}-address`} className="text-sm font-medium">
            {t.checkout.address}
          </label>
          <textarea
            id={`${uid}-address`}
            name="address"
            rows={2}
            placeholder={t.checkout.addressPlaceholder}
            className={inputClass}
            {...fieldProps("address")}
          />
          <FieldError id={errorId("address")} message={state.errors?.address} />
        </div>
        <div>
          <label htmlFor={`${uid}-notes`} className="text-sm font-medium">
            {t.checkout.notes}{" "}
            <span className="font-normal text-stone-500">{t.checkout.optional}</span>
          </label>
          <textarea id={`${uid}-notes`} name="notes" rows={2} className={inputClass} />
        </div>
      </div>

      <aside className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">{t.cart.summary}</h2>
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
          <span>{t.cart.total}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-4 rounded-lg bg-brand-light p-3 text-xs text-brand-dark">
          {t.checkout.howItWorks}
        </p>
        <FieldError message={state.errors?.form} alert />
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-full btn-whatsapp py-3 font-semibold disabled:opacity-60"
        >
          {pending ? t.checkout.preparing : t.checkout.orderOnWhatsApp}
        </button>
        <p className="mt-3 text-xs text-stone-500">
          {t.checkout.consent}{" "}
          <Link href={href("/privacy")} className="underline hover:text-brand">
            {t.footer.privacy}
          </Link>
        </p>
      </aside>
    </form>
  );
}

function OrderSent({ state }) {
  const { t, href } = useLocale();
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm" role="status">
      <p className="text-5xl" aria-hidden>
        💬
      </p>
      <h2 className="mt-4 text-2xl font-bold">{t.checkout.almostDone}</h2>
      <p className="mt-2 text-stone-600">
        {t.checkout.readyBefore}
        <span className="font-mono font-semibold">{state.reference}</span>
        {t.checkout.readyMiddle}
        <strong>{t.checkout.readySend}</strong>
        {t.checkout.readyAfter}
      </p>
      <a
        href={state.whatsappUrl}
        className="mt-6 inline-block rounded-full btn-whatsapp px-6 py-3 font-semibold"
      >
        {t.checkout.openAgain}
      </a>
      {state.orderId && (
        <p className="mt-4 text-sm">
          <Link
            href={href(`/order/${state.orderId}`)}
            className="text-stone-600 underline hover:text-brand"
          >
            {t.checkout.viewOrder}
          </Link>{" "}
          <span className="text-stone-500">{t.checkout.receiptHint}</span>
        </p>
      )}
    </div>
  );
}
