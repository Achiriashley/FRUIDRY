"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./CartProvider";

export function AddToCartButton({ slug, inStock = true, withQuantity = false, size = "md" }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const buttonSize = size === "sm" ? "px-4 py-2 text-sm" : "px-6 py-3";

  if (!inStock) {
    return (
      <p className="inline-block rounded-full bg-stone-200 px-5 py-2 text-sm font-semibold text-stone-600">
        Sold out
      </p>
    );
  }

  function handleAdd() {
    addItem(slug, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function handleBuyNow() {
    addItem(slug, quantity);
    router.push("/checkout");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {withQuantity && (
        <div className="flex items-center rounded-full border border-stone-300 bg-white">
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
        className={`rounded-full border-2 border-brand bg-white font-semibold text-brand transition hover:bg-orange-50 ${buttonSize}`}
      >
        {added ? "Added ✓" : "Add to cart"}
      </button>
      <button
        type="button"
        onClick={handleBuyNow}
        className={`rounded-full border-2 border-brand bg-brand font-semibold text-white transition hover:border-brand-dark hover:bg-brand-dark ${buttonSize}`}
      >
        Buy now
      </button>
    </div>
  );
}
