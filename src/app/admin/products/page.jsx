import Link from "next/link";
import { Suspense } from "react";
import { ProductImage } from "@/components/ProductImage";
import { getProducts } from "@/lib/catalog";
import { getProductImages } from "@/lib/product-images";
import { formatPrice, isInStock, isLowStock, stockLeft } from "@/lib/products";
import { AdminPage, AdminShell } from "../AdminShell";

export const metadata = { title: "Products", robots: { index: false } };

export default function ProductsPage({ searchParams }) {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="products">
          {async () => {
            const [products, params] = await Promise.all([getProducts(), searchParams]);
            return <ProductList products={products} params={params} />;
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}

function ProductList({ products, params }) {
  const images = getProductImages();
  const notice = params.added
    ? "Product added. It's now in the shop."
    : params.deleted
      ? "Product deleted. It's no longer in the shop."
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
        >
          + Add product
        </Link>
      </div>

      {notice && (
        <p className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800" role="status">
          {notice}
        </p>
      )}

      {products.length === 0 ? (
        <p className="text-stone-600">No products yet. Add your first one.</p>
      ) : (
        <ul className="space-y-3">
          {products.map((product) => (
            <li key={product.slug}>
              <Link
                href={`/admin/products/${product.slug}`}
                className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <ProductImage
                  product={product}
                  src={images[product.slug]}
                  sizes="64px"
                  emojiClassName="text-3xl"
                  className="h-16 w-16 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-stone-500">
                    <span className="font-mono">{product.sku}</span> · {product.weight}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatPrice(product.price)}</p>
                  <StockStatus product={product} />
                </div>
                <span className="text-stone-400" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// "In stock · 12 left", "Running low · 4 left", "Sold out", "Coming soon"...
function StockStatus({ product }) {
  const left = stockLeft(product);
  const count = left === null ? "" : ` · ${left} left`;
  const [label, colour] = product.comingSoon
    ? ["Coming soon", "text-amber-700"]
    : !isInStock(product)
      ? ["Sold out", "text-red-600"]
      : isLowStock(product)
        ? ["Running low", "text-amber-700"]
        : ["In stock", "text-green-700"];
  return (
    <p className={`text-xs font-semibold ${colour}`}>
      {label}
      {product.comingSoon ? "" : count}
    </p>
  );
}
