import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProduct } from "@/lib/catalog";
import { getProductImages } from "@/lib/product-images";
import { AdminPage, AdminShell } from "../../AdminShell";
import { DeleteProductButton } from "../DeleteProductButton";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "Edit product", robots: { index: false } };

export default function EditProductPage({ params }) {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="products">
          {async () => {
            const { slug } = await params;
            const product = await getProduct(slug);
            if (!product) notFound();
            // Show a photo from public/products in the form if no photo was uploaded.
            const fallbackImage = getProductImages()[slug];
            return (
              <div className="space-y-6">
                <Link href="/admin/products" className="text-sm text-stone-600 hover:text-brand">
                  ← All products
                </Link>
                <ProductForm product={{ ...product, image: product.image || fallbackImage }} />
                <div className="rounded-2xl border border-red-200 bg-white p-6">
                  <h2 className="font-bold text-red-700">Delete this product</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    It disappears from the shop. Past orders and receipts keep their details.
                  </p>
                  <DeleteProductButton slug={product.slug} name={product.name} />
                </div>
              </div>
            );
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}
