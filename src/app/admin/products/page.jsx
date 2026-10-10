import { Suspense } from "react";
import { getProducts } from "@/lib/catalog";
import { AdminPage, AdminShell } from "../AdminShell";
import { ProductForm } from "./ProductForm";

export const metadata = { title: "Product", robots: { index: false } };

export default function ProductsPage() {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="products">
          {async () => {
            const products = await getProducts();
            return (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">Product</h1>
                  <p className="mt-1 text-stone-600">
                    Changes show on the shop as soon as you save. To change the photo, replace the
                    file in <code className="font-mono">public/products/</code>.
                  </p>
                </div>
                {products.map((product) => (
                  <ProductForm key={product.slug} product={product} />
                ))}
              </div>
            );
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}
