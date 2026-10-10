import Link from "next/link";
import { Suspense } from "react";
import { ORDER_STATUS, isPaid, listOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
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
            const [orders, siteUrl] = await Promise.all([listOrders(), getSiteUrl()]);
            return <Dashboard orders={orders} siteUrl={siteUrl} />;
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
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

function Dashboard({ orders, siteUrl }) {
  const paid = orders.filter(isPaid);
  const thisMonth = monthKey(new Date().toISOString());
  const paidThisMonth = paid.filter((o) => monthKey(o.receipt.confirmedAt) === thisMonth);
  const sum = (list) => list.reduce((total, o) => total + o.total, 0);
  const packs = (list) =>
    list.reduce((total, o) => total + o.items.reduce((n, item) => n + item.quantity, 0), 0);

  const toCheck = orders.filter((o) => o.status === ORDER_STATUS.paymentSubmitted);
  const toDeliver = orders.filter((o) => o.status === ORDER_STATUS.confirmed);
  const awaiting = orders.filter((o) => o.status === ORDER_STATUS.awaitingPayment);

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Payments to check"
          value={toCheck.length}
          href="/admin/orders?status=payment_submitted"
          highlight={toCheck.length > 0}
        />
        <Stat
          label="Paid, to deliver"
          value={toDeliver.length}
          href="/admin/orders?status=confirmed"
        />
        <Stat
          label="Sales this month"
          value={formatPrice(sum(paidThisMonth))}
          hint={`${packs(paidThisMonth)} packs · ${paidThisMonth.length} orders`}
        />
        <Stat
          label="Total sales"
          value={formatPrice(sum(paid))}
          hint={`${packs(paid)} packs · ${paid.length} orders`}
        />
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">
          Payments to check <span className="text-stone-400">({toCheck.length})</span>
        </h2>
        {toCheck.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing to check right now.</p>
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
        {awaiting.length} order{awaiting.length === 1 ? " is" : "s are"} waiting for the customer to
        pay.{" "}
        <Link href="/admin/orders" className="font-semibold text-brand hover:underline">
          See all orders →
        </Link>
      </p>
    </div>
  );
}
