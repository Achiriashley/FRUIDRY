import Link from "next/link";
import { Suspense } from "react";
import { ORDER_STATUS, STATUS_LABELS, listOrders } from "@/lib/orders";
import { getSiteUrl } from "@/lib/site-url";
import { AdminPage, AdminShell } from "../AdminShell";
import { OrderCard } from "../OrderCard";

export const metadata = { title: "Orders", robots: { index: false } };

const FILTERS = [
  { id: "all", label: "All" },
  ...[
    ORDER_STATUS.paymentSubmitted,
    ORDER_STATUS.confirmed,
    ORDER_STATUS.awaitingPayment,
    ORDER_STATUS.delivered,
    ORDER_STATUS.rejected,
  ].map((id) => ({ id, label: STATUS_LABELS[id] })),
];

export default function OrdersPage({ searchParams }) {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="orders" autoRefresh>
          {async () => {
            const [params, orders, siteUrl] = await Promise.all([
              searchParams,
              listOrders(),
              getSiteUrl(),
            ]);
            return <OrdersList params={params} orders={orders} siteUrl={siteUrl} />;
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}

function filterHref(status, q) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return `/admin/orders${query ? `?${query}` : ""}`;
}

function OrdersList({ params, orders, siteUrl }) {
  const status = FILTERS.some((f) => f.id === params.status) ? params.status : "all";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const needle = q.toLowerCase().replace(/\s/g, "");

  const counts = Object.fromEntries(
    FILTERS.map((f) => [
      f.id,
      f.id === "all" ? orders.length : orders.filter((o) => o.status === f.id).length,
    ]),
  );

  const visible = orders.filter((o) => {
    if (status !== "all" && o.status !== status) return false;
    if (!needle) return true;
    return [o.reference, o.customer.name, o.customer.phone, o.payment?.transactionId]
      .filter(Boolean)
      .some((value) => value.toLowerCase().replace(/\s/g, "").includes(needle));
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Orders</h1>

      <form action="/admin/orders" className="flex flex-wrap gap-2">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          aria-label="Search orders"
          placeholder="Search by order, name, phone or transaction ID"
          className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      <nav className="flex flex-wrap gap-2" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={filterHref(f.id, q)}
            aria-current={status === f.id ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              status === f.id
                ? "border-brand bg-brand text-white"
                : "border-stone-300 bg-white text-stone-700 hover:border-brand"
            }`}
          >
            {f.label} <span className="opacity-70">({counts[f.id]})</span>
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="text-sm text-stone-500">No orders found.</p>
      ) : (
        <div className="space-y-4">
          {visible.map((order) => (
            <OrderCard key={order.id} order={order} siteUrl={siteUrl} />
          ))}
        </div>
      )}
    </div>
  );
}
