import Link from "next/link";
import { Suspense } from "react";
import { AdminPage, AdminShell } from "../../AdminShell";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "Add product", robots: { index: false } };

export default function NewProductPage() {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="products">
          {async () => (
            <div className="space-y-6">
              <Link href="/admin/products" className="text-sm text-stone-600 hover:text-brand">
                ← All products
              </Link>
              <h1 className="text-3xl font-extrabold tracking-tight">Add product</h1>
              <ProductForm />
            </div>
          )}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}
