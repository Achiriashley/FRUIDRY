import { ShopGrid } from "@/components/ShopGrid";
import { getProducts } from "@/lib/catalog";
import { getProductImages } from "@/lib/product-images";

export const metadata = {
  title: "Shop",
  description: "Browse every Fruidry freeze-dried fruit snack.",
};

export default async function ShopPage() {
  const products = await getProducts();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-extrabold tracking-tight">Shop</h1>
      <p className="mt-2 mb-8 text-stone-600">
        Every pouch is just fruit, freeze-dried for crunch.
      </p>
      <ShopGrid products={products} images={getProductImages()} />
    </div>
  );
}
