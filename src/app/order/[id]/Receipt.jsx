import { formatOrderDate } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { shopConfig } from "@/lib/shop-config";
import { PrintButton } from "./PrintButton";

export function Receipt({ order }) {
  return (
    <div className="space-y-6">
      <div className="text-center print:hidden">
        <p className="text-5xl" aria-hidden>
          ✅
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Payment confirmed</h1>
        <p className="mt-1 text-stone-600">
          {order.delivery
            ? `Thank you, ${order.customer.name}! Your order was delivered on ${formatOrderDate(order.delivery.deliveredAt)}.`
            : `Thank you, ${order.customer.name}! We'll call you to arrange delivery.`}
        </p>
      </div>

      <article className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b border-dashed border-stone-300 pb-4">
          <div>
            <p className="text-xl font-extrabold text-brand">🍊 Fruidry</p>
            <p className="text-xs text-stone-500">Freeze-dried fruit</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-wider">Receipt</p>
            <p className="font-mono text-sm">{order.receipt.number}</p>
          </div>
        </header>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-stone-500">Order</dt>
          <dd className="text-right font-mono">{order.reference}</dd>
          <dt className="text-stone-500">Paid on</dt>
          <dd className="text-right">{formatOrderDate(order.receipt.confirmedAt)}</dd>
          <dt className="text-stone-500">Customer</dt>
          <dd className="text-right">{order.customer.name}</dd>
          <dt className="text-stone-500">Phone</dt>
          <dd className="text-right">{order.customer.phone}</dd>
          <dt className="text-stone-500">Deliver to</dt>
          <dd className="text-right">{order.customer.address}</dd>
        </dl>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-center font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.slug} className="border-b border-stone-100">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">{formatPrice(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 font-bold" colSpan={2}>
                Total paid
              </td>
              <td className="pt-3 text-right text-lg font-bold">{formatPrice(order.total)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 border-t border-dashed border-stone-300 pt-4 text-xs text-stone-500">
          Paid with {shopConfig.momo.provider} · Transaction ID{" "}
          <span className="font-mono">{order.payment?.transactionId ?? "—"}</span>
        </p>
      </article>

      <div className="text-center">
        <PrintButton />
      </div>
    </div>
  );
}
