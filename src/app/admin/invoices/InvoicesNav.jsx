import Link from "next/link";
import { INVOICE_STATUS_LABELS } from "@/lib/invoice-math";

const TABS = [
  { href: "/admin/invoices", label: "Invoices", id: "invoices" },
  { href: "/admin/invoices/clients", label: "Clients", id: "clients" },
  { href: "/admin/invoices/settings", label: "Settings", id: "settings" },
];

// The Invoices section's own menu: invoices, saved clients and settings.
export function InvoicesNav({ active }) {
  return (
    <nav aria-label="Invoices" className="flex flex-wrap gap-2 text-sm">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active === tab.id ? "page" : undefined}
          className={`rounded-full border px-4 py-1.5 font-semibold ${
            active === tab.id
              ? "border-stone-900 bg-stone-900 text-white"
              : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

const STATUS_STYLES = {
  unpaid: "bg-stone-100 text-stone-700",
  part_paid: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-stone-200 text-stone-600 line-through",
  open: "bg-blue-100 text-blue-800",
  invoiced: "bg-green-100 text-green-800",
  expired: "bg-stone-200 text-stone-600",
};

export function InvoiceStatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}

// Shown instead of the section when Supabase doesn't have the invoice tables yet.
export function SetupNeeded() {
  return (
    <section className="rounded-2xl bg-yellow-100 p-5 shadow-sm">
      <h2 className="text-xl font-bold">One step to set up invoices</h2>
      <p className="mt-1 text-sm text-stone-700">
        Your database doesn&apos;t have the invoice tables yet. In Supabase, open{" "}
        <strong>SQL Editor</strong>, paste the contents of{" "}
        <code className="font-mono">supabase/schema.sql</code> and press <strong>Run</strong>
        (it only adds what&apos;s missing). Then reload this page.
      </p>
    </section>
  );
}
