import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/AutoRefresh";
import { formatDate, getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { ORDER_STATUS, getOrder, isPaid } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { shopWhatsAppNumber, whatsAppLink } from "@/lib/shop-config";
import { orderMessage } from "@/lib/whatsapp-order";
import { PayWithMomo } from "@/components/PayWithMomo";
import { Receipt } from "./Receipt";

export async function generateMetadata() {
  const t = getDictionary(await getLocale());
  return { title: t.order.title, robots: { index: false } };
}

export default async function OrderPage({ params }) {
  const t = getDictionary(await getLocale());
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Suspense fallback={<p className="text-stone-600">{t.order.loading}</p>}>
        <OrderDetails params={params} />
      </Suspense>
    </div>
  );
}

async function OrderDetails({ params }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const lang = await getLocale();
  const t = getDictionary(lang);

  if (isPaid(order)) {
    return <Receipt order={order} lang={lang} />;
  }

  const cancelled = order.status === ORDER_STATUS.rejected;
  const shopNumber = shopWhatsAppNumber();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          {t.order.order} {order.reference}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          {cancelled ? t.order.cancelled : t.order.received}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          {t.order.placed} {formatDate(order.createdAt, lang)}
        </p>
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
          <span>{t.order.total}</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {order.status === ORDER_STATUS.awaitingPayment && (
        <PayWithMomo
          total={order.total}
          proofUrl={shopNumber && whatsAppLink(shopNumber, t.pay.proofMessage(order.reference))}
        />
      )}

      {cancelled ? (
        <div className="rounded-2xl bg-red-50 p-6 text-red-700" role="alert">
          <p>{order.rejection?.reason}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow-sm" role="status">
          <p className="text-stone-700">{t.order.nextSteps}</p>
          {shopNumber && (
            <a
              href={whatsAppLink(shopNumber, orderMessage(order))}
              className="mt-4 inline-block rounded-full btn-whatsapp px-6 py-3 font-semibold"
            >
              {t.order.sendAgain}
            </a>
          )}
          <AutoRefresh />
        </div>
      )}
    </div>
  );
}
