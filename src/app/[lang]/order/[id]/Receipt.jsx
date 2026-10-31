import Link from "next/link";
import { formatDate, getDictionary, localePath } from "@/lib/i18n";
import { formatPrice } from "@/lib/products";
import { PrintButton } from "@/components/PrintButton";

export function Receipt({ order, lang }) {
  const { receipt: t, footer } = getDictionary(lang);
  return (
    <div className="space-y-6">
      <div className="text-center print:hidden">
        <p className="text-5xl" aria-hidden>
          ✅
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{t.paymentConfirmed}</h1>
        <p className="mt-1 text-stone-600">
          {order.delivery
            ? t.thanksDelivered(order.customer.name, formatDate(order.delivery.deliveredAt, lang))
            : t.thanks(order.customer.name)}
        </p>
        {/* Once delivered: a link to review each product (reviews are checked before
            they're shown). */}
        {order.delivery && (
          <div className="mt-4 text-sm">
            <p className="text-stone-700">{t.reviewPrompt}</p>
            <ul className="mt-1 space-y-1">
              {[...new Map(order.items.map((item) => [item.slug, item])).values()].map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`${localePath(lang, `/shop/${item.slug}`)}#reviews-heading`}
                    className="font-semibold text-brand hover:underline"
                  >
                    {t.reviewLink(item.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mx-auto mt-4 max-w-md text-sm text-stone-600">
          {t.problem}{" "}
          <Link
            href={localePath(lang, "/returns")}
            className="font-semibold whitespace-nowrap text-brand hover:underline"
          >
            {footer.returns}
          </Link>
        </p>
      </div>

      <article className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b border-dashed border-stone-300 pb-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-lockup.png" alt="Fruidry" className="h-10 w-auto" />
            <p className="text-xs text-stone-500">{t.brandLine}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-wider">{t.receipt}</p>
            <p className="font-mono text-sm">{order.receipt.number}</p>
          </div>
        </header>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-stone-500">{t.order}</dt>
          <dd className="text-right font-mono">{order.reference}</dd>
          <dt className="text-stone-500">{t.paidOn}</dt>
          <dd className="text-right">{formatDate(order.receipt.confirmedAt, lang)}</dd>
          <dt className="text-stone-500">{t.customer}</dt>
          <dd className="text-right">{order.customer.name}</dd>
          <dt className="text-stone-500">{t.phone}</dt>
          <dd className="text-right">{order.customer.phone}</dd>
          <dt className="text-stone-500">{t.deliverTo}</dt>
          <dd className="text-right">{order.customer.address}</dd>
        </dl>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="py-2 font-medium">{t.item}</th>
              <th className="py-2 text-center font-medium">{t.qty}</th>
              <th className="py-2 text-right font-medium">{t.amount}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.slug} className="border-b border-stone-100">
                <td className="py-2">
                  {item.name}
                  {item.sku && (
                    <span className="block font-mono text-xs text-stone-500">{item.sku}</span>
                  )}
                </td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">{formatPrice(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 font-bold" colSpan={2}>
                {t.totalPaid}
              </td>
              <td className="pt-3 text-right text-lg font-bold">{formatPrice(order.total)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 border-t border-dashed border-stone-300 pt-4 text-xs text-stone-500">
          {t.confirmedBy}
          {order.payment?.transactionId && (
            <>
              {" "}
              · {t.transactionId} <span className="font-mono">{order.payment.transactionId}</span>
            </>
          )}
        </p>
      </article>

      <div className="text-center">
        <PrintButton label={t.print} />
      </div>
    </div>
  );
}
