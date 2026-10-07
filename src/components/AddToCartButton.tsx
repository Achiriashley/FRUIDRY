"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

export function AddToCartButton({
  slug,
  withQuantity = false,
}: {
  slug: string;
  withQuantity?: boolean;
}) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(slug, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex items-center gap-3">
      {withQuantity && (
        <div className="flex items-center rounded-full border border-stone-300">
          <button
            type="button"
            aria-label="Decrease quantity"
            className="px-3 py-2 text-lg disabled:opacity-40"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="w-8 text-center font-semibold" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            className="px-3 py-2 text-lg"
            onClick={() => setQuantity((q) => q + 1)}
          >
            +
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        {added ? "Added ✓" : "Add to cart"}
      </button>
    </div>
  );
}
