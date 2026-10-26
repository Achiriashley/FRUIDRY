import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { PrintButton } from "@/components/PrintButton";
import { getDictionary } from "@/lib/i18n";
import { getInvoice, getInvoiceSettings, withShopDetails } from "@/lib/invoices";
import { getLocale } from "@/lib/locale";

// An invoice or proforma sent to a client: its private address is the only way to see
// it (like an order's page). Printable, or saved as a PDF from the browser.
export async function generateMetadata() {
  const t = getDictionary(await getLocale());
  return { title: t.invoice.pageTitle, robots: { index: false } };
}

export default async function InvoicePage({ params }) {
  const t = getDictionary(await getLocale());
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 print:max-w-none print:p-0">
      <Suspense fallback={<p className="text-stone-600">{t.order.loading}</p>}>
        <InvoiceDetails params={params} />
      </Suspense>
    </div>
  );
}

async function InvoiceDetails({ params }) {
  const { id } = await params;
  const [found, settings] = await Promise.all([getInvoice(id), getInvoiceSettings()]);
  if (!found) notFound();
  const invoice = withShopDetails(found, settings);
  const t = getDictionary(invoice.lang === "en" ? "en" : "fr").invoice;
  if (invoice.cancelled) return <InvoiceDocument invoice={invoice} hideIfCancelled />;
  return (
    <div className="space-y-6">
      <InvoiceDocument invoice={invoice} />
      <div className="text-center">
        {/* Named after the invoice, which also names the PDF it's saved as. */}
        <PrintButton
          label={t.print}
          documentTitle={`${invoice.kind === "proforma" ? t.proforma : t.invoice} ${invoice.number}`}
        />
      </div>
    </div>
  );
}
