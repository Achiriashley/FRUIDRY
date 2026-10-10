import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ORDER_STATUS, formatOrderDate, getOrder, isPaid } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { shopWhatsAppNumber, whatsAppLink } from "@/lib/shop-config";
import { orderMessage } from "@/lib/whatsapp-order";
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

  const cancelled = order.status === ORDER_STATUS.rejected;
  const shopNumber = shopWhatsAppNumber();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          Order {order.reference}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          {cancelled ? "This order was cancelled" : "We've got your order"}
        </h1>
        <p className="mt-1 text-sm text-stone-500">Placed {formatOrderDate(order.createdAt)}</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <ul className="space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.slug} className="flex justify-between gap-2">
              <span>
                {item.name} × {item.quantity}
                {item.sku && (
                  <span className="ml-2 font-mono text-xs text-stone-500">{item.sku}</span>
                )}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-stone-200 pt-3 text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {cancelled ? (
        <div className="rounded-2xl bg-red-50 p-6 text-red-700" role="alert">
          <p>{order.rejection?.reason}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow-sm" role="status">
          <p className="text-stone-700">
            We&apos;ll reply on WhatsApp to arrange payment and delivery. Once your payment is
            confirmed, your receipt will appear on this page.
          </p>
          {shopNumber && (
            <a
              href={whatsAppLink(shopNumber, orderMessage(order))}
              className="mt-4 inline-block rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white hover:bg-[#1ebe5a]"
            >
              Send the order on WhatsApp again
            </a>
          )}
          <AutoRefresh />
        </div>
      )}
    </div>
  );
}
