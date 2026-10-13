"use client";

import { useState } from "react";
import { categories } from "@/lib/products";
import { useLocale } from "./LocaleProvider";
import { ProductCard } from "./ProductCard";

export function ShopGrid({ products, images }) {
  const { t } = useLocale();
  const [active, setActive] = useState("all");
  const visible = active === "all" ? products : products.filter((p) => p.category === active);

  // Only offer filters for categories that have products in them.
  const present = categories.filter((c) => products.some((p) => p.category === c.id));
  const filters = [
    { id: "all", label: t.shop.all },
    ...present.map((c) => ({ id: c.id, label: t.categories[c.id] ?? c.label })),
  ];

  return (
    <div>
      {present.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label={t.shop.filterLabel}>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={active === f.id}
              onClick={() => setActive(f.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                active === f.id
                  ? "border-brand bg-brand text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:border-brand hover:text-brand"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      {visible.length === 0 && (
        <p className="rounded-2xl bg-white p-8 text-center text-stone-600 shadow-sm">
          {t.home.comingSoon}
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => (
          <ProductCard key={product.slug} product={product} image={images[product.slug]} />
        ))}
      </div>
    </div>
  );
}
