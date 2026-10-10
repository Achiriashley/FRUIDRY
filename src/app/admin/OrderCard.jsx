import Link from "next/link";
import { ORDER_STATUS, STATUS_LABELS, formatOrderDate, isPaid } from "@/lib/orders";
import { whatsAppLink } from "@/lib/shop-config";
import { formatPrice } from "@/lib/products";
import { confirmPayment, markDelivered, rejectPayment } from "./actions";

const STATUS_STYLES = {
  awaiting_payment: "bg-stone-100 text-stone-700",
  payment_submitted: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function receiptMessage(order, siteUrl) {
  return (
    `Hello ${order.customer.name}, your Fruidry payment of ${formatPrice(order.total)} ` +
    `for order ${order.reference} is confirmed. Your receipt: ${siteUrl}/order/${order.id}`
  );
}

function customerMessage(order) {
  return `Hello ${order.customer.name}, this is Fruidry about your order ${order.reference}.`;
}

export function OrderCard({ order, siteUrl }) {
  const canDecide = !isPaid(order);
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono font-semibold">{order.reference}</p>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-lg font-bold">{formatPrice(order.total)}</p>
      </div>
      <p className="mt-1 text-xs text-stone-500">{formatOrderDate(order.createdAt)}</p>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <p className="font-semibold">{order.customer.name}</p>
          <a href={`tel:+237${order.customer.phone}`} className="text-brand hover:underline">
            {order.customer.phone}
          </a>
          <p className="text-stone-600">{order.customer.address}</p>
          {order.customer.notes && (
            <p className="mt-1 text-stone-500">Note: {order.customer.notes}</p>
          )}
        </div>
        <ul className="text-stone-700">
          {order.items.map((item) => (
            <li key={item.slug}>
              {item.name} × {item.quantity}
              {item.sku && (
                <span className="ml-2 font-mono text-xs text-stone-500">{item.sku}</span>
              )}
            </li>
          ))}
        </ul>
        <div>
          {order.payment?.transactionId && (
            <>
              <p className="text-stone-500">Transaction ID</p>
              <p className="font-mono font-semibold break-all">{order.payment.transactionId}</p>
            </>
          )}
          {order.receipt && <p className="mt-1 text-stone-500">Receipt {order.receipt.number}</p>}
          {order.delivery && (
            <p className="text-stone-500">
              Delivered {formatOrderDate(order.delivery.deliveredAt)}
            </p>
          )}
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
                Mark as paid
              </button>
            </form>
            <form action={rejectPayment} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="orderId" value={order.id} />
              <input
                name="reason"
                aria-label="Reason for cancelling"
                placeholder="Reason (optional)"
                className="rounded-full border border-stone-300 px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Cancel order
              </button>
            </form>
          </>
        )}
        {order.status === ORDER_STATUS.confirmed && (
          <form action={markDelivered}>
            <input type="hidden" name="orderId" value={order.id} />
            <button
              type="submit"
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
            >
              Mark as delivered
            </button>
          </form>
        )}
        <a
          href={whatsAppLink(`237${order.customer.phone}`, customerMessage(order))}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-[#25D366] px-4 py-2 text-sm font-semibold text-[#128C4B] hover:bg-green-50"
        >
          Message on WhatsApp
        </a>
        {isPaid(order) && (
          <a
            href={whatsAppLink(`237${order.customer.phone}`, receiptMessage(order, siteUrl))}
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
          {isPaid(order) ? "View receipt" : "View customer page"}
        </Link>
      </div>
    </article>
  );
}
