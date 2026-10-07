import type { Metadata } from "next";
import { getProductImages } from "@/lib/product-images";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-extrabold tracking-tight">Your cart</h1>
      <CartView images={getProductImages()} />
    </div>
  );
}
