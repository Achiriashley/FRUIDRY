import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { canEditInvoice } from "@/lib/invoice-math";
import { getInvoice } from "@/lib/invoices";
import { AdminPage, AdminShell } from "../../../AdminShell";
import { InvoiceForm } from "../../InvoiceForm";
import { SetupNeeded } from "../../InvoicesNav";
import { loadFormData } from "../../load";

export const metadata = { title: "Edit invoice", robots: { index: false } };

export default function EditInvoicePage({ params }) {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="invoices">
          {async () => {
            const { id } = await params;
            const [invoice, data] = await Promise.all([getInvoice(id), loadFormData()]);
            if (!invoice) notFound();
            if (data.setupNeeded) return <SetupNeeded />;
            const back = (
              <p>
                <Link
                  href={`/admin/invoices/${invoice.id}`}
                  className="text-sm text-stone-600 hover:text-brand"
                >
                  ← {invoice.number}
                </Link>
              </p>
            );
            if (!canEditInvoice(invoice)) {
              return (
                <div className="space-y-4">
                  {back}
                  <p className="rounded-2xl bg-white p-6 text-stone-700 shadow-sm">
                    {invoice.number} can&apos;t be changed any more: it has payments, or it was
                    cancelled or turned into an invoice. Make a new one instead.
                  </p>
                </div>
              );
            }
            const clientKnown = data.clients.some((c) => c.id === invoice.client.id);
            return (
              <div className="space-y-6">
                {back}
                <h1 className="text-3xl font-extrabold tracking-tight">
                  Edit <span className="font-mono">{invoice.number}</span>
                </h1>
                <InvoiceForm
                  kind={invoice.kind}
                  editingId={invoice.id}
                  initial={{
                    ...invoice,
                    client: { ...invoice.client, id: clientKnown ? invoice.client.id : "" },
                  }}
                  clients={data.clients}
                  products={data.products}
                  dueDays={
                    invoice.kind === "proforma" ? data.settings.proformaDays : data.settings.dueDays
                  }
                  vatRate={invoice.vatRate}
                />
              </div>
            );
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}
