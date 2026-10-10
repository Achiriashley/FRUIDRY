import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ORDER_STATUS, formatOrderDate, getOrder, isPaid } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { shopConfig, ussdCode, ussdHref } from "@/lib/shop-config";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PaymentForm } from "./PaymentForm";
import { Receipt } from "./Receipt";

export const metadata = { title: "Your order", robots: { index: false } };

export default function OrderPage({ params }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Suspense fallback={<p className="text-stone-600">Loading your order…</p>}>
        <OrderDetails params={params} />
      </Suspense>
    </div>
  );
}

async function OrderDetails({ params }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  if (isPaid(order)) {
    return <Receipt order={order} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          Order {order.reference}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          {order.status === ORDER_STATUS.paymentSubmitted
            ? "We're checking your payment"
            : "Pay for your order"}
        </h1>
        <p className="mt-1 text-sm text-stone-500">Placed {formatOrderDate(order.createdAt)}</p>
      </div>

      <OrderSummary order={order} />

      {order.status === ORDER_STATUS.paymentSubmitted ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm" role="status">
          <p className="text-4xl" aria-hidden>
            ⏳
          </p>
          <p className="mt-3 font-semibold">Thanks! We received your payment details.</p>
          <p className="mt-1 text-stone-600">
            We&apos;ll confirm your payment shortly and your receipt will appear on this page. Keep
            this page open or save the link to come back later.
          </p>
          <p className="mt-3 text-sm text-stone-500">
            Transaction ID: <span className="font-mono">{order.payment.transactionId}</span>
          </p>
          <AutoRefresh />
        </div>
      ) : (
        <PaymentSteps order={order} />
      )}
    </div>
  );
}

function OrderSummary({ order }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <ul className="space-y-2 text-sm">
        {order.items.map((item) => (
          <li key={item.slug} className="flex justify-between gap-2">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between border-t border-stone-200 pt-3 text-lg font-bold">
        <span>Total to pay</span>
        <span>{formatPrice(order.total)}</span>
      </div>
    </div>
  );
}

function PaymentSteps({ order }) {
  const code = ussdCode(order.total);
  return (
    <div className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
      {order.status === ORDER_STATUS.rejected && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          <p className="font-semibold">We couldn&apos;t confirm your payment.</p>
          <p className="mt-1">{order.rejection?.reason}</p>
        </div>
      )}

      <section>
        <h2 className="font-bold">1. Pay with {shopConfig.momo.provider}</h2>
        <p className="mt-1 text-sm text-stone-600">
          Tap the button to open your phone&apos;s dialer with the payment code ready, then press
          call and enter your Mobile Money PIN to confirm.
        </p>
        <a
          href={ussdHref(order.total)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-yellow-400 px-6 py-3 font-bold text-stone-900 hover:bg-yellow-300"
        >
          <span aria-hidden>📱</span> Pay {formatPrice(order.total)} now
        </a>
        <p className="mt-3 text-sm text-stone-600">
          Not on your phone? Dial{" "}
          <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono font-semibold">{code}</span>{" "}
          from the phone you pay with.
        </p>
      </section>

      <section>
        <h2 className="font-bold">2. Tell us your transaction ID</h2>
        <p className="mt-1 text-sm text-stone-600">
          After paying you&apos;ll get an SMS with a transaction ID. Enter it below so we can match
          your payment.
        </p>
        <PaymentForm orderId={order.id} defaultPhone={order.customer.phone} />
      </section>
    </div>
  );
}
