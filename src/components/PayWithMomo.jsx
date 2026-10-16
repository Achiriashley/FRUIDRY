"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/products";
import { momoPayCode } from "@/lib/shop-config";
import { useLocale } from "./LocaleProvider";

// How to pay an order: the MTN Mobile Money code with the order's exact amount, then a
// screenshot of the confirmation sent on WhatsApp (proofUrl opens that chat).
export function PayWithMomo({ total, proofUrl }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const code = momoPayCode(total);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the code stays on screen to type in.
    }
  }

  return (
    <section
      aria-labelledby="pay-heading"
      className="rounded-2xl border-2 border-sun bg-white p-4 text-left shadow-sm sm:p-6"
    >
      <h2 id="pay-heading" className="text-xl font-bold">
        {t.pay.title}
      </h2>
      <p className="mt-2 text-stone-700">{t.pay.intro(formatPrice(total))}</p>
      {/* On one line, so the amount can't look split (e.g. "5" / "000#"). */}
      <p
        translate="no"
        className="mt-3 overflow-x-auto rounded-xl bg-cream px-3 py-3 text-center font-mono text-base font-bold whitespace-nowrap select-all min-[400px]:text-lg sm:text-xl"
      >
        {code}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {/* Opens the phone's dialer with the code ready (Android; iPhones block it). */}
        <a
          href={`tel:${encodeURIComponent(code)}`}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          {t.pay.dial}
        </a>
        <button
          type="button"
          onClick={copy}
          className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold hover:border-brand"
        >
          {copied ? t.pay.copied : t.pay.copy}
        </button>
      </div>
      <p className="mt-2 text-sm text-stone-600">{t.pay.delivery}</p>
      <p className="mt-4 text-stone-700">{t.pay.then}</p>
      {proofUrl && (
        <a
          href={proofUrl}
          className="mt-4 inline-block rounded-full btn-whatsapp px-6 py-3 font-semibold"
        >
          {t.pay.sendProof}
        </a>
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? t.pay.copied : ""}
      </span>
    </section>
  );
}
