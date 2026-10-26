import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { addDays, todayInCameroon, VAT_RATE } from "@/lib/invoice-math";
import { getInvoice, listInvoicesIfSetUp } from "@/lib/invoices";
import { getOrder } from "@/lib/orders";
import { AdminPage, AdminShell } from "../../AdminShell";
import { InvoiceForm } from "../InvoiceForm";
import { SetupNeeded } from "../InvoicesNav";
import { loadFormData } from "../load";

export const metadata = { title: "New invoice", robots: { index: false } };

// /admin/invoices/new                      a new invoice
//   ?kind=proforma                          a new proforma
//   ?order=<order id>                       an invoice for a website order
//   ?copy=<invoice id>                      a new one like an existing invoice
//   ?client=<client id>                     for a saved client
export default function NewInvoicePage({ searchParams }) {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="invoices">
          {async () => {
            const params = await searchParams;
            const kind = params.kind === "proforma" ? "proforma" : "invoice";
            const [data, order, copy] = await Promise.all([
              loadFormData(),
              params.order ? getOrder(String(params.order)) : null,
              params.copy ? getInvoice(String(params.copy)) : null,
            ]);
            if (data.setupNeeded) return <SetupNeeded />;

            // An order gets one invoice: open it if it already has one.
            if (order && kind === "invoice") {
              const existing = (await listInvoicesIfSetUp()).find(
                (i) => i.orderId === order.id && i.kind === "invoice" && !i.cancelled,
              );
              if (existing) redirect(`/admin/invoices/${existing.id}`);
            }

            const today = todayInCameroon();
            const days = kind === "proforma" ? data.settings.proformaDays : data.settings.dueDays;
            const savedClient = data.clients.find((c) => c.id === params.client);
            const initial = {
              lang: "fr",
              issueDate: today,
              dueDate: addDays(today, days),
              ...(savedClient ? { client: savedClient } : {}),
              ...(copy
                ? {
                    lang: copy.lang,
                    // The copy's client, if they're still in the list.
                    client: {
                      ...copy.client,
                      id: data.clients.some((c) => c.id === copy.client.id) ? copy.client.id : "",
                    },
                    items: copy.items,
                    discount: copy.discount,
                    notes: copy.notes,
                  }
                : {}),
              ...(order
                ? {
                    lang: order.lang === "en" ? "en" : "fr",
                    orderId: order.id,
                    client: {
                      name: order.customer.name,
                      phone: order.customer.phone,
                      address: order.customer.address,
                    },
                    items: order.items.map((item) => ({
                      slug: data.products.some((p) => p.slug === item.slug) ? item.slug : "",
                      description: item.name,
                      quantity: item.quantity,
                      price: item.price,
                    })),
                  }
                : {}),
            };
            return (
              <div className="space-y-6">
                <p>
                  <Link href="/admin/invoices" className="text-sm text-stone-600 hover:text-brand">
                    ← Invoices
                  </Link>
                </p>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {kind === "proforma" ? "New proforma" : "New invoice"}
                  {order && (
                    <span className="block text-base font-medium text-stone-600">
                      For website order {order.reference}
                    </span>
                  )}
                </h1>
                {kind === "proforma" && (
                  <p className="text-sm text-stone-600">
                    A proforma is a quote a client can take to their company before paying. When
                    they accept it, turn it into an invoice in one tap.
                  </p>
                )}
                <InvoiceForm
                  kind={kind}
                  initial={initial}
                  clients={data.clients}
                  products={data.products}
                  dueDays={days}
                  vatRate={data.settings.vat ? VAT_RATE : 0}
                />
              </div>
            );
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}
