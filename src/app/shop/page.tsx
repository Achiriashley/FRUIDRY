import type { Metadata } from "next";
import { ShopGrid } from "@/components/ShopGrid";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse every Fruidry dried fruit snack.",
};

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-extrabold tracking-tight">Shop</h1>
      <p className="mt-2 mb-8 text-stone-600">
        Every pouch is made from just fruit, dried slowly.
      </p>
      <ShopGrid />
    </div>
  );
}
