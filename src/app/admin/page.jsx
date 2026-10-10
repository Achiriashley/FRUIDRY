import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { adminPasswordConfigured, isAdmin } from "@/lib/admin-auth";
import { ORDER_STATUS, formatOrderDate, listOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { confirmPayment, logout, rejectPayment } from "./actions";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Orders admin", robots: { index: false } };

const SECTIONS = [
  { status: ORDER_STATUS.paymentSubmitted, title: "Payment to check", empty: "Nothing to check." },
  { status: ORDER_STATUS.awaitingPayment, title: "Waiting for payment", empty: "None." },
  { status: ORDER_STATUS.rejected, title: "Payment rejected", empty: "None." },
  { status: ORDER_STATUS.confirmed, title: "Confirmed", empty: "None yet." },
];

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminContent />
      </Suspense>
    </div>
  );
}

async function AdminContent() {
  // Read the password and orders at request time, not when the site is built.
  await connection();
  if (!adminPasswordConfigured()) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Admin is not set up</h1>
        <p className="mt-2 text-stone-600">
          Set the <code className="font-mono">ADMIN_PASSWORD</code> environment variable and restart
          the site to use this page.
        </p>
      </div>
    );
  }
  if (!(await isAdmin())) return <LoginForm />;

  const [orders, siteUrl] = await Promise.all([listOrders(), getSiteUrl()]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Orders</h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-stone-600 underline hover:text-brand">
            Sign out
          </button>
        </form>
      </div>
      <AutoRefresh intervalMs={30000} />
      {SECTIONS.map((section) => {
        const matching = orders.filter((o) => o.status === section.status);
        return (
          <section key={section.status}>
            <h2 className="mb-4 text-xl font-bold">
              {section.title} <span className="text-stone-400">({matching.length})</span>
            </h2>
            {matching.length === 0 ? (
              <p className="text-sm text-stone-500">{section.empty}</p>
            ) : (
              <div className="space-y-4">
                {matching.map((order) => (
                  <OrderCard key={order.id} order={order} siteUrl={siteUrl} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

async function getSiteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function whatsappLink(order, siteUrl) {
  const text =
    `Hello ${order.customer.name}, your Fruidry payment of ${formatPrice(order.total)} ` +
    `for order ${order.reference} is confirmed. Your receipt: ${siteUrl}/order/${order.id}`;
  return `https://wa.me/237${order.customer.phone}?text=${encodeURIComponent(text)}`;
}

function OrderCard({ order, siteUrl }) {
  const canDecide = order.status !== ORDER_STATUS.confirmed;
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono font-semibold">{order.reference}</p>
          <p className="text-xs text-stone-500">{formatOrderDate(order.createdAt)}</p>
        </div>
        <p className="text-lg font-bold">{formatPrice(order.total)}</p>
      </div>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <p className="font-semibold">{order.customer.name}</p>
          <p>{order.customer.phone}</p>
          <p className="text-stone-600">{order.customer.address}</p>
          {order.customer.notes && (
            <p className="mt-1 text-stone-500">Note: {order.customer.notes}</p>
          )}
        </div>
        <ul className="text-stone-700">
          {order.items.map((item) => (
            <li key={item.slug}>
              {item.name} × {item.quantity}
            </li>
          ))}
        </ul>
        <div>
          {order.payment ? (
            <>
              <p className="text-stone-500">Transaction ID</p>
              <p className="font-mono font-semibold">{order.payment.transactionId}</p>
              <p className="text-stone-500">Paid from {order.payment.payerPhone}</p>
            </>
          ) : (
            <p className="text-stone-500">No payment details yet.</p>
          )}
          {order.receipt && <p className="mt-1 text-stone-500">Receipt {order.receipt.number}</p>}
          {order.rejection && (
            <p className="mt-1 text-red-600">Rejected: {order.rejection.reason}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
        {canDecide && (
          <>
            <form action={confirmPayment}>
              <input type="hidden" name="orderId" value={order.id} />
              <button
                type="submit"
                className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Confirm payment
              </button>
            </form>
            <form action={rejectPayment} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="orderId" value={order.id} />
              <input
                name="reason"
                placeholder="Reason (optional)"
                className="rounded-full border border-stone-300 px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Reject
              </button>
            </form>
          </>
        )}
        {order.status === ORDER_STATUS.confirmed && (
          <a
            href={whatsappLink(order, siteUrl)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Send receipt on WhatsApp
          </a>
        )}
        <Link
          href={`/order/${order.id}`}
          className="text-sm text-stone-600 underline hover:text-brand"
        >
          {order.status === ORDER_STATUS.confirmed ? "View receipt" : "View customer page"}
        </Link>
      </div>
    </article>
  );
}
