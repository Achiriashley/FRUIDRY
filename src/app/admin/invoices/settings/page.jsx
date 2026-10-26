import { Suspense } from "react";
import { getInvoiceSettings } from "@/lib/invoices";
import { AdminPage, AdminShell } from "../../AdminShell";
import { InvoicesNav } from "../InvoicesNav";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Invoice settings", robots: { index: false } };

export default function InvoiceSettingsPage() {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="invoices">
          {async () => (
            <div className="space-y-6">
              <h1 className="text-3xl font-extrabold tracking-tight">Invoice settings</h1>
              <InvoicesNav active="settings" />
              <p className="text-sm text-stone-600">
                New invoices copy these details when they&apos;re made. Invoices already made keep
                the details they were made with.
              </p>
              <SettingsForm settings={await getInvoiceSettings()} />
            </div>
          )}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}
