import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import {
  INVOICE_PAYMENT_METHODS,
  amountDue,
  canEditInvoice,
  invoiceStatus,
  paidAmount,
  todayInCameroon,
} from "@/lib/invoice-math";
import { getInvoice } from "@/lib/invoices";
import { formatPrice } from "@/lib/products";
import { getSiteUrl } from "@/lib/site-url";
import { AdminPage, AdminShell } from "../../AdminShell";
import { ConfirmButton } from "../../ConfirmButton";
import {
  cancelInvoiceAction,
  convertProformaAction,
  deletePaymentAction,
  reopenInvoiceAction,
} from "../actions";
import { InvoiceStatusBadge } from "../InvoicesNav";
import { invoiceLink, reminderMessage, sendInvoiceMessage, whatsAppToClient } from "../whatsapp";
import { CopyLinkButton } from "./CopyLinkButton";
import { PaymentForm } from "./PaymentForm";

export const metadata = { title: "Invoice", robots: { index: false } };

const BUTTON =
  "rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-stone-500";
const UNDO_YES =
  "rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700";

export default function InvoiceAdminPage({ params }) {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="invoices">
          {async () => {
            const { id } = await params;
            const [invoice, siteUrl] = await Promise.all([getInvoice(id), getSiteUrl()]);
            if (!invoice) notFound();
            return <InvoiceDetails invoice={invoice} siteUrl={siteUrl} />;
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}

// A form whose only field is the invoice: its buttons sit directly in the row.
function InvoiceForm({ action, invoice, children }) {
  return (
    <form action={action} className="contents">
      <input type="hidden" name="id" value={invoice.id} />
      {children}
    </form>
  );
}

const packsText = (n) => `${n} ${n === 1 ? "pack" : "packs"}`;

function InvoiceDetails({ invoice, siteUrl }) {
  const today = todayInCameroon();
  const status = invoiceStatus(invoice, today);
  const proforma = invoice.kind === "proforma";
  const due = amountDue(invoice);
  const link = invoiceLink(invoice, siteUrl);
  const toPay = ["unpaid", "part_paid", "overdue"].includes(status);
  const label = proforma ? "proforma" : "invoice";
  const copyHref = `/admin/invoices/new?${proforma ? "kind=proforma&" : ""}copy=${invoice.id}`;
  const packsTaken = Object.values(invoice.stockTaken ?? {}).reduce((t, n) => t + n, 0);

  return (
    <div className="space-y-6">
      <p>
        <Link href="/admin/invoices" className="text-sm text-stone-600 hover:text-brand">
          ← Invoices
        </Link>
      </p>
      <div>
        <h1 className="flex flex-wrap items-center gap-3 text-3xl font-extrabold tracking-tight">
          <span className="font-mono">{invoice.number}</span>
          <InvoiceStatusBadge status={status} />
        </h1>
        <p className="mt-1 text-stone-600">
          {proforma ? "Proforma" : "Invoice"} for {invoice.client.name} ·{" "}
          {formatPrice(invoice.totals.total)}
        </p>
        {invoice.fromProforma && (
          <p className="mt-1 text-sm text-stone-600">
            From proforma{" "}
            <Link
              href={`/admin/invoices/${invoice.fromProforma.id}`}
              className="font-semibold text-brand hover:underline"
            >
              {invoice.fromProforma.number}
            </Link>
          </p>
        )}
        {invoice.convertedTo && (
          <p className="mt-1 text-sm text-stone-600">
            Turned into invoice{" "}
            <Link
              href={`/admin/invoices/${invoice.convertedTo.id}`}
              className="font-semibold text-brand hover:underline"
            >
              {invoice.convertedTo.number}
            </Link>
          </p>
        )}
        {invoice.cancelled && (
          <p className="mt-1 text-sm text-red-700">
            Cancelled{invoice.cancelled.reason ? `: ${invoice.cancelled.reason}` : ""}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!invoice.cancelled && (
          <a
            href={whatsAppToClient(invoice, sendInvoiceMessage(invoice, siteUrl))}
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp rounded-full px-4 py-2 text-sm font-semibold"
          >
            Send on WhatsApp
          </a>
        )}
        {!proforma && toPay && (
          <a
            href={whatsAppToClient(invoice, reminderMessage(invoice, siteUrl))}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#25D366] px-4 py-2 text-sm font-semibold text-brand hover:bg-green-50"
          >
            Remind on WhatsApp
          </a>
        )}
        <CopyLinkButton url={link} />
        {/* In a new tab: coming back to the panel would be a page load, which asks for the password. */}
        <a href={link} target="_blank" rel="noreferrer" className={BUTTON}>
          Open / print
        </a>
        {canEditInvoice(invoice) && (
          <Link href={`/admin/invoices/${invoice.id}/edit`} className={BUTTON}>
            Edit
          </Link>
        )}
        <Link href={copyHref} className={BUTTON}>
          New {label} like this
        </Link>
        {proforma && !invoice.cancelled && !invoice.convertedTo && (
          <InvoiceForm action={convertProformaAction} invoice={invoice}>
            <ConfirmButton
              label="Turn into an invoice"
              question={`Make an invoice from ${invoice.number}?`}
              hint="It gets its own invoice number, today's date and the usual time to pay. The proforma stays as it is."
              yes="Yes, make the invoice"
              no="Not now"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            />
          </InvoiceForm>
        )}
        {!invoice.cancelled && !invoice.convertedTo && invoice.payments.length === 0 && (
          <form action={cancelInvoiceAction} className="flex w-full flex-wrap items-center gap-2">
            {/* Enter in the reason box mustn't cancel without the question. */}
            <button type="submit" disabled hidden aria-hidden="true" tabIndex={-1} />
            <input type="hidden" name="id" value={invoice.id} />
            <input
              name="reason"
              aria-label="Reason for cancelling"
              placeholder="Reason (optional)"
              className="rounded-full border border-stone-300 px-3 py-1.5 text-sm"
            />
            <ConfirmButton
              label={`Cancel ${label}`}
              question={`Cancel ${invoice.number}?`}
              hint={`Its number stays used, and the client's page shows it as cancelled. You can undo this.`}
              yes={`Yes, cancel ${label}`}
              no="Keep it"
              className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              yesClassName="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            />
          </form>
        )}
        {invoice.cancelled && (
          <InvoiceForm action={reopenInvoiceAction} invoice={invoice}>
            <ConfirmButton
              label="Undo cancel"
              question={`Reopen ${invoice.number}?`}
              hint="The client's page no longer shows it as cancelled."
              yes="Yes, reopen"
              no="Keep it cancelled"
              className="text-sm font-semibold text-stone-600 underline hover:text-brand"
              yesClassName={UNDO_YES}
            />
          </InvoiceForm>
        )}
      </div>
      {!invoice.client.phone && !invoice.cancelled && (
        <p className="text-sm text-stone-500">
          No phone number on this {label}: WhatsApp will ask you who to send it to.
        </p>
      )}

      {!proforma && (
        <section
          className="space-y-4 rounded-2xl bg-white p-5 shadow-sm"
          aria-labelledby="payments"
        >
          <h2 id="payments" className="text-xl font-bold">
            Payments
          </h2>
          <p className="text-stone-700">
            Paid {formatPrice(paidAmount(invoice))} of {formatPrice(invoice.totals.total)}
            {due > 0 && !invoice.cancelled && (
              <>
                {" "}
                · <strong>{formatPrice(due)} still to pay</strong>
              </>
            )}
          </p>
          {status === "paid" && (
            <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              ✓ Paid in full.
            </p>
          )}
          {invoice.payments.length > 0 && (
            <ul className="divide-y divide-stone-100">
              {invoice.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="font-semibold">{formatPrice(payment.amount)}</span>
                  <span className="text-stone-600">
                    {payment.date} · {INVOICE_PAYMENT_METHODS[payment.method] ?? payment.method}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </span>
                  <form action={deletePaymentAction} className="contents">
                    <input type="hidden" name="id" value={invoice.id} />
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <ConfirmButton
                      label="Delete"
                      question={`Delete this payment of ${formatPrice(payment.amount)}?`}
                      hint="Only if it was recorded by mistake."
                      yes="Yes, delete it"
                      no="Keep it"
                      className="text-sm font-semibold text-red-700 underline"
                      yesClassName="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    />
                  </form>
                </li>
              ))}
            </ul>
          )}
          {invoice.orderId ? (
            <p className="text-sm text-stone-500">
              Made from website order {invoice.orderReference}: its sale and stock are counted
              through the order, so payments here don&apos;t change Books or the stock count.
            </p>
          ) : invoice.paidAt ? (
            <p className="text-sm text-stone-500">
              Counted in Books on {invoice.paidAt}
              {packsTaken > 0 ? `, and ${packsText(packsTaken)} came off the stock count` : ""}.
            </p>
          ) : (
            <p className="text-sm text-stone-500">
              Once it&apos;s paid in full, it counts as a sale in Books and its packs come off the
              stock count.
            </p>
          )}
          {due > 0 && !invoice.cancelled && (
            <PaymentForm invoiceId={invoice.id} due={due} today={today} />
          )}
        </section>
      )}

      <InvoiceDocument invoice={invoice} />
    </div>
  );
}
