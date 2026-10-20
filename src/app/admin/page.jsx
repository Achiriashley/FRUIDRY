import Link from "next/link";
import { Suspense } from "react";
import { ORDER_STATUS, isNew, isPaid, listOrders } from "@/lib/orders";
import { getProducts } from "@/lib/catalog";
import { listEntries } from "@/lib/ledger";
import { formatPrice, isLowStock, stockLeft } from "@/lib/products";
import { listReviews } from "@/lib/reviews";
import { getSiteUrl } from "@/lib/site-url";
import { AdminPage, AdminShell } from "./AdminShell";
import { OrderCard } from "./OrderCard";

export const metadata = { title: "Admin dashboard", robots: { index: false } };

export default function DashboardPage() {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="dashboard" autoRefresh>
          {async () => {
            const [orders, siteUrl, products, reviewsWaiting, inPersonSales] = await Promise.all([
              listOrders(),
              getSiteUrl(),
              getProducts(),
              countReviewsWaiting(),
              loadInPersonSales(),
            ]);
            return (
              <Dashboard
                orders={orders}
                siteUrl={siteUrl}
                lowStock={products.filter(isLowStock)}
                reviewsWaiting={reviewsWaiting}
                inPersonSales={inPersonSales}
              />
            );
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}

// Reviews customers have sent that aren't published yet (0 if they can't be read).
async function countReviewsWaiting() {
  try {
    return (await listReviews()).filter((r) => r.status !== "approved").length;
  } catch {
    return 0;
  }
}

// Sales recorded on the Books page (none if they can't be read).
async function loadInPersonSales() {
  try {
    return (await listEntries()).filter((e) => e.type === "sale");
  } catch {
    return [];
  }
}

// Calendar month in Cameroon time, e.g. "2026-10".
function monthKey(iso) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
  }).format(new Date(iso));
}

function Stat({ label, value, hint, href, highlight = false }) {
  const body = (
    <div
      className={`h-full rounded-2xl p-5 shadow-sm ${highlight ? "bg-yellow-100" : "bg-white"} ${
        href ? "transition hover:shadow-md" : ""
      }`}
    >
      <p className="text-sm text-stone-600">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Dashboard({ orders, siteUrl, lowStock, reviewsWaiting, inPersonSales }) {
  const paid = orders.filter(isPaid);
  const thisMonth = monthKey(new Date().toISOString());
  const paidThisMonth = paid.filter((o) => monthKey(o.receipt.confirmedAt) === thisMonth);
  const soldThisMonth = inPersonSales.filter((e) => e.date.startsWith(thisMonth));
  const sum = (list) => list.reduce((total, o) => total + o.total, 0);
  const packs = (list) =>
    list.reduce((total, o) => total + o.items.reduce((n, item) => n + item.quantity, 0), 0);
  const inPersonPacks = (list) => list.reduce((total, e) => total + e.quantity, 0);
  // Website orders, plus sales in person recorded on the Books page.
  const salesHint = (orderList, saleList) =>
    `${packs(orderList) + inPersonPacks(saleList)} packs · ${orderList.length} website ` +
    (orderList.length === 1 ? "order" : "orders") +
    (saleList.length > 0 ? `, ${saleList.length} in person` : "");

  const toCheck = orders.filter(isNew);
  const toDeliver = orders.filter((o) => o.status === ORDER_STATUS.confirmed);

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="New orders"
          value={toCheck.length}
          href="/admin/orders?status=awaiting_payment"
          highlight={toCheck.length > 0}
        />
        <Stat
          label="Paid, to deliver"
          value={toDeliver.length}
          href="/admin/orders?status=confirmed"
        />
        <Stat
          label="Sales this month"
          value={formatPrice(sum(paidThisMonth) + sum(soldThisMonth))}
          hint={salesHint(paidThisMonth, soldThisMonth)}
          href="/admin/books"
        />
        <Stat
          label="Total sales"
          value={formatPrice(sum(paid) + sum(inPersonSales))}
          hint={salesHint(paid, inPersonSales)}
        />
      </div>

      {reviewsWaiting > 0 && (
        <section className="rounded-2xl bg-yellow-100 p-5 shadow-sm">
          <h2 className="text-xl font-bold">
            {reviewsWaiting === 1 ? "1 new review" : `${reviewsWaiting} new reviews`}
          </h2>
          <p className="mt-1 text-sm text-stone-700">
            Customers are waiting to see their review on the shop.{" "}
            <Link href="/admin/reviews" className="font-semibold text-brand hover:underline">
              Check and publish →
            </Link>
          </p>
        </section>
      )}

      {lowStock.length > 0 && (
        <section className="rounded-2xl bg-yellow-100 p-5 shadow-sm">
          <h2 className="text-xl font-bold">Running low</h2>
          <p className="mt-1 text-sm text-stone-700">
            Time to reorder. When new stock arrives, record it under{" "}
            <Link href="/admin/books" className="font-semibold text-brand hover:underline">
              Books → Stock arrival
            </Link>
            : it adds the packs to the count.
          </p>
          <ul className="mt-3 space-y-1">
            {lowStock.map((product) => (
              <li key={product.slug}>
                <Link
                  href={`/admin/products/${product.slug}`}
                  className="font-semibold text-brand hover:underline"
                >
                  {product.name}
                </Link>{" "}
                <span className={stockLeft(product) === 0 ? "font-semibold text-red-700" : ""}>
                  {stockLeft(product) === 0 ? "sold out" : `${stockLeft(product)} left`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold">
          New orders <span className="text-stone-400">({toCheck.length})</span>
        </h2>
        {toCheck.length === 0 ? (
          <p className="text-sm text-stone-500">No new orders right now.</p>
        ) : (
          <div className="space-y-4">
            {toCheck.map((order) => (
              <OrderCard key={order.id} order={order} siteUrl={siteUrl} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">
          Paid, to deliver <span className="text-stone-400">({toDeliver.length})</span>
        </h2>
        {toDeliver.length === 0 ? (
          <p className="text-sm text-stone-500">No deliveries waiting.</p>
        ) : (
          <div className="space-y-4">
            {toDeliver.map((order) => (
              <OrderCard key={order.id} order={order} siteUrl={siteUrl} />
            ))}
          </div>
        )}
      </section>

      <p className="text-sm text-stone-600">
        <Link href="/admin/orders" className="font-semibold text-brand hover:underline">
          See all orders →
        </Link>
      </p>
    </div>
  );
}
