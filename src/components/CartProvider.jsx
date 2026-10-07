"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProduct } from "@/lib/products";

const STORAGE_KEY = "fruidry-cart";

const CartContext = createContext(null);

function readStoredCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line) =>
        typeof line?.slug === "string" &&
        typeof line?.quantity === "number" &&
        line.quantity > 0 &&
        getProduct(line.slug) !== undefined,
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Hydrate from localStorage after mount so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(readStoredCart());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage may be unavailable (private mode); the cart still works in memory.
    }
  }, [lines, loaded]);

  const addItem = useCallback((slug, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.slug === slug);
      if (existing) {
        return prev.map((l) => (l.slug === slug ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { slug, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((slug, quantity) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.slug !== slug)
        : prev.map((l) => (l.slug === slug ? { ...l, quantity } : l)),
    );
  }, []);

  const removeItem = useCallback((slug) => {
    setLines((prev) => prev.filter((l) => l.slug !== slug));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const items = lines.flatMap((line) => {
      const product = getProduct(line.slug);
      return product ? [{ ...line, product }] : [];
    });
    return {
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + i.quantity * i.product.price, 0),
      addItem,
      updateQuantity,
      removeItem,
      clear,
    };
  }, [lines, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
