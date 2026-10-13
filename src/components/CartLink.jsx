"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { useLocale } from "./LocaleProvider";

export function CartLink() {
  const { count } = useCart();
  const { t, href } = useLocale();
  return (
    <Link
      href={href("/cart")}
      className="relative inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
    >
      <span aria-hidden>🛒</span>
      <span>{t.nav.cart}</span>
      {count > 0 && (
        <span className="rounded-full bg-white px-2 text-xs font-bold text-brand">{count}</span>
      )}
    </Link>
  );
}
