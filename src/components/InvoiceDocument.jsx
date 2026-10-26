import { formatDay, getDictionary } from "@/lib/i18n";
import { amountDue, invoiceStatus, numberInWords, paidAmount } from "@/lib/invoice-math";
import { formatPrice } from "@/lib/products";
import { momoPayCode } from "@/lib/shop-config";

// An invoice or proforma as the client sees it (and prints it), always in the invoice's
// own language. Used on the client's page (/invoice/...) and in the admin panel.
export function InvoiceDocument({ invoice }) {
  const lang = invoice.lang === "en" ? "en" : "fr";
  const { invoice: t, colon } = getDictionary(lang);
  const proforma = invoice.kind === "proforma";
  const status = invoiceStatus(invoice);
  const business = invoice.business ?? {};
  const { totals } = invoice;
  const paid = paidAmount(invoice);
  const due = amountDue(invoice);
  const vatRate = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(invoice.vatRate ?? 0);
  const asksForPayment = !proforma && !invoice.cancelled && due > 0;

  return (
    <article
      lang={lang}
      className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 text-sm shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none"
    >
      {(status === "paid" || status === "cancelled") && (
        <p
          className={`pointer-events-none absolute top-24 right-4 rotate-[-12deg] rounded-lg border-4 px-4 py-1 text-2xl font-extrabold uppercase tracking-widest opacity-70 sm:right-10 ${
            status === "paid" ? "border-green-600 text-green-700" : "border-red-500 text-red-600"
          }`}
        >
          {status === "paid" ? t.stampPaid : t.stampCancelled}
        </p>
      )}

      <header className="grid gap-6 border-b border-stone-200 pb-6 sm:grid-cols-2">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-lockup.png"
            alt={business.name || "Fruidry"}
            className="h-10 w-auto"
          />
          <p className="mt-3 font-bold">{business.name}</p>
          <p className="whitespace-pre-line text-stone-600">{business.address}</p>
          {business.phone && (
            <p className="text-stone-600">
              {t.phone}
              {colon} {business.phone}
            </p>
          )}
          {business.email && (
            <p className="text-stone-600">
              {t.email}
              {colon} {business.email}
            </p>
          )}
          {business.niu && (
            <p className="text-stone-600">
              {t.niu}
              {colon} {business.niu}
            </p>
          )}
          {business.rccm && (
            <p className="text-stone-600">
              {t.rccm}
              {colon} {business.rccm}
            </p>
          )}
        </div>
        <div className="sm:text-right">
          <h1 className="text-2xl font-extrabold tracking-tight uppercase">
            {proforma ? t.proforma : t.invoice}
          </h1>
          <p className="mt-1 font-mono text-base font-semibold">
            {t.number} {invoice.number}
          </p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 sm:justify-end">
            <dt className="text-stone-500">{t.issued}</dt>
            <dd>{formatDay(invoice.issueDate, lang)}</dd>
            <dt className="text-stone-500">{proforma ? t.validUntil : t.dueDate}</dt>
            <dd>{formatDay(invoice.dueDate, lang)}</dd>
          </dl>
          {invoice.orderReference && (
            <p className="mt-2 text-stone-600">{t.fromOrder(invoice.orderReference)}</p>
          )}
        </div>
      </header>

      <section className="mt-6">
        <h2 className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
          {t.billTo}
        </h2>
        <p className="mt-1 text-base font-bold">{invoice.client.name}</p>
        {invoice.client.contact && (
          <p>
            {t.attention} {invoice.client.contact}
          </p>
        )}
        {invoice.client.address && (
          <p className="whitespace-pre-line text-stone-600">{invoice.client.address}</p>
        )}
        {invoice.client.phone && (
          <p className="text-stone-600">
            {t.phone}
            {colon} {invoice.client.phone}
          </p>
        )}
        {invoice.client.email && (
          <p className="text-stone-600">
            {t.email}
            {colon} {invoice.client.email}
          </p>
        )}
        {invoice.client.niu && (
          <p className="text-stone-600">
            {t.niu}
            {colon} {invoice.client.niu}
          </p>
        )}
      </section>

      {/* On a phone, quantity × unit price go under each line, so the amount stays in view. */}
      <table className="mt-6 w-full">
        <thead>
          <tr className="border-b-2 border-stone-200 text-left text-stone-500">
            <th scope="col" className="py-2 pr-2 font-medium">
              {t.description}
            </th>
            <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">
              {t.qty}
            </th>
            <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">
              {t.unitPrice}
            </th>
            <th scope="col" className="py-2 pl-2 text-right font-medium">
              {t.amount}
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i} className="border-b border-stone-100 align-top">
              <td className="py-2 pr-2">
                {item.description}
                {item.sku && (
                  <span className="block font-mono text-xs text-stone-500">{item.sku}</span>
                )}
                <span className="block text-stone-600 sm:hidden">
                  {item.quantity} × {formatPrice(item.price)}
                </span>
              </td>
              <td className="hidden px-2 py-2 text-right sm:table-cell">{item.quantity}</td>
              <td className="hidden px-2 py-2 text-right whitespace-nowrap sm:table-cell">
                {formatPrice(item.price)}
              </td>
              <td className="py-2 pl-2 text-right whitespace-nowrap">
                {formatPrice(item.price * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-4 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-y-1 [&>dt]:pr-6">
        {(totals.discount > 0 || totals.vat > 0) && (
          <>
            <dt className="text-stone-600">{t.subtotal}</dt>
            <dd className="text-right whitespace-nowrap">{formatPrice(totals.subtotal)}</dd>
          </>
        )}
        {totals.discount > 0 && (
          <>
            <dt className="text-stone-600">{t.discount}</dt>
            <dd className="text-right whitespace-nowrap">−{formatPrice(totals.discount)}</dd>
          </>
        )}
        {invoice.vatRate > 0 && (
          <>
            <dt className="text-stone-600">{t.totalExclVat}</dt>
            <dd className="text-right whitespace-nowrap">{formatPrice(totals.taxable)}</dd>
            <dt className="text-stone-600">{t.vat(vatRate)}</dt>
            <dd className="text-right whitespace-nowrap">{formatPrice(totals.vat)}</dd>
          </>
        )}
        <dt className="mt-1 border-t border-stone-200 pt-2 pr-6 text-base font-bold">
          {invoice.vatRate > 0 ? t.totalInclVat : t.total}
        </dt>
        <dd className="mt-1 border-t border-stone-200 pt-2 text-right text-base font-bold whitespace-nowrap">
          {formatPrice(totals.total)}
        </dd>
        {!proforma && paid > 0 && (
          <>
            <dt className="text-stone-600">{t.paid}</dt>
            <dd className="text-right whitespace-nowrap">{formatPrice(paid)}</dd>
            <dt className="font-semibold">{t.amountDue}</dt>
            <dd className="text-right font-semibold whitespace-nowrap">{formatPrice(due)}</dd>
          </>
        )}
      </dl>

      <p className="mt-4 text-stone-600 italic">
        {t.inWords(numberInWords(totals.total, lang), proforma)}
      </p>

      {asksForPayment && (business.showMomo || business.paymentInfo) && (
        <section className="mt-6 rounded-xl bg-stone-50 p-4 print:border print:border-stone-200">
          {business.showMomo && (
            <p>
              {t.payWithMomo}{" "}
              <span className="font-mono font-semibold whitespace-nowrap">{momoPayCode(due)}</span>
            </p>
          )}
          {business.paymentInfo && (
            <p className="mt-1 whitespace-pre-line">
              <span className="font-semibold">
                {t.otherPayment}
                {colon}{" "}
              </span>
              {business.paymentInfo}
            </p>
          )}
        </section>
      )}

      {proforma && !invoice.cancelled && <p className="mt-6 text-stone-600">{t.proformaNote}</p>}

      {invoice.notes && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
            {t.notes}
          </h2>
          <p className="mt-1 whitespace-pre-line">{invoice.notes}</p>
        </section>
      )}

      <p className="mt-8 border-t border-stone-200 pt-4 text-center text-xs whitespace-pre-line text-stone-500">
        {business.footer || t.thanks}
      </p>
    </article>
  );
}
