"use client";

import { useState } from "react";
import { categories, products } from "@/lib/products";
import { ProductCard } from "./ProductCard";

export function ShopGrid({ images }) {
  const [active, setActive] = useState("all");
  const visible = active === "all" ? products : products.filter((p) => p.category === active);

  const filters = [{ id: "all", label: "All" }, ...categories];

  return (
    <div>
      {categories.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => (
          <ProductCard key={product.slug} product={product} image={images[product.slug]} />
        ))}
      </div>
    </div>
  );
}
