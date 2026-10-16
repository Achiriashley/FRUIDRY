import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProduct } from "@/lib/catalog";
import { getProductImages } from "@/lib/product-images";
import { getSiteUrl } from "@/lib/site-url";
import { listWaitlist, waitlistTableMissing } from "@/lib/waitlist";
import { AdminPage, AdminShell } from "../../AdminShell";
import { DeleteProductButton } from "../DeleteProductButton";
import { ProductForm } from "../ProductForm";
import { WaitlistSection } from "../WaitlistSection";

export const metadata = { title: "Edit product", robots: { index: false } };

// This product's waiting list. A missing Supabase table shows a setup note instead of
// breaking the page.
async function loadWaitlist(slug) {
  try {
    const entries = (await listWaitlist()).filter((entry) => entry.slug === slug);
    return { entries, setupNeeded: false };
  } catch (error) {
    if (!waitlistTableMissing(error))
      console.error("Couldn't load the waiting list", error.message);
    return { entries: [], setupNeeded: waitlistTableMissing(error) };
  }
}

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
            const waitlist = await loadWaitlist(slug);
            return (
              <div className="space-y-6">
                <Link href="/admin/products" className="text-sm text-stone-600 hover:text-brand">
                  ← All products
                </Link>
                <ProductForm product={{ ...product, image: product.image || fallbackImage }} />
                {(product.comingSoon || waitlist.entries.length > 0 || waitlist.setupNeeded) && (
                  <WaitlistSection
                    product={product}
                    entries={waitlist.entries}
                    setupNeeded={waitlist.setupNeeded}
                    siteUrl={await getSiteUrl()}
                  />
                )}
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
