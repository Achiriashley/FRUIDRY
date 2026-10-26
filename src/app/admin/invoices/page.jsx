import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { formatDay } from "@/lib/i18n";
import { amountDue, invoiceStatus, todayInCameroon } from "@/lib/invoice-math";
import { listInvoices } from "@/lib/invoices";
import { formatPrice } from "@/lib/products";
import { tableMissing } from "@/lib/storage";
import { AdminPage, AdminShell } from "../AdminShell";
import { InvoiceStatusBadge, InvoicesNav, SetupNeeded } from "./InvoicesNav";

export const metadata = { title: "Invoices", robots: { index: false } };

// Which invoices each filter shows.
const FILTERS = [
  { id: "all", label: "All", keep: () => true },
  {
    id: "unpaid",
    label: "To be paid",
    keep: (i, s) => ["unpaid", "part_paid", "overdue"].includes(s),
  },
  { id: "overdue", label: "Overdue", keep: (i, s) => s === "overdue" },
  { id: "paid", label: "Paid", keep: (i, s) => s === "paid" },
  { id: "proforma", label: "Proformas", keep: (i) => i.kind === "proforma" },
  { id: "cancelled", label: "Cancelled", keep: (i, s) => s === "cancelled" },
];

export default function InvoicesPage({ searchParams }) {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="invoices">
          {async () => {
            const [params, loaded] = await Promise.all([searchParams, loadInvoices()]);
            return <InvoiceList params={params} {...loaded} />;
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}

async function loadInvoices() {
  try {
    return { invoices: await listInvoices(), setupNeeded: false };
  } catch (error) {
    if (!tableMissing(error)) throw error;
    return { invoices: [], setupNeeded: true };
  }
}

function filterHref(filter, q) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (q) params.set("q", q);
  const query = params.toString();
  return `/admin/invoices${query ? `?${query}` : ""}`;
}

function Stat({ label, value, hint, href, highlight }) {
  return (
    <Link
      href={href}
      className={`block min-w-0 rounded-2xl p-5 shadow-sm transition hover:shadow-md ${
        highlight ? "bg-yellow-100" : "bg-white"
      }`}
    >
      <p className="text-sm text-stone-600">{label}</p>
      <p className="mt-1 text-2xl font-extrabold break-words">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
    </Link>
  );
}

const countText = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function InvoiceList({ params, invoices, setupNeeded }) {
  const today = todayInCameroon();
  const withStatus = invoices.map((invoice) => ({
    invoice,
    status: invoiceStatus(invoice, today),
  }));
  const filter = FILTERS.find((f) => f.id === params.status) ?? FILTERS[0];
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const needle = q.toLowerCase().replace(/\s/g, "");
  const clientId = typeof params.client === "string" ? params.client : "";
  const visible = withStatus.filter(({ invoice, status }) => {
    if (!filter.keep(invoice, status)) return false;
    if (clientId && invoice.client.id !== clientId) return false;
    if (!needle) return true;
    return [invoice.number, invoice.client.name, invoice.client.contact, invoice.client.phone]
      .filter(Boolean)
      .some((value) => value.toLowerCase().replace(/\s/g, "").includes(needle));
  });

  const toBePaid = withStatus.filter(({ status }) =>
    ["unpaid", "part_paid", "overdue"].includes(status),
  );
  const overdue = toBePaid.filter(({ status }) => status === "overdue");
  const month = today.slice(0, 7);
  // Payments of website orders' invoices are left out: Books count them with the order.
  const received = invoices
    .flatMap((invoice) => (invoice.cancelled ? [] : invoice.payments))
    .filter((p) => !p.fromOrder)
    .filter((p) => p.date.startsWith(month))
    .reduce((total, p) => total + p.amount, 0);
  const due = (list) => list.reduce((total, { invoice }) => total + amountDue(invoice), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Invoices</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/invoices/new"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + New invoice
          </Link>
          <Link
            href="/admin/invoices/new?kind=proforma"
            className="rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand hover:bg-brand-light"
          >
            + New proforma
          </Link>
        </div>
      </div>
      <InvoicesNav active="invoices" />

      {setupNeeded ? (
        <SetupNeeded />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="To be paid"
              value={formatPrice(due(toBePaid))}
              hint={countText(toBePaid.length, "invoice")}
              href={filterHref("unpaid", "")}
            />
            <Stat
              label="Overdue"
              value={formatPrice(due(overdue))}
              hint={countText(overdue.length, "invoice")}
              href={filterHref("overdue", "")}
              highlight={overdue.length > 0}
            />
            <Stat
              label="Received this month"
              value={formatPrice(received)}
              hint="Payments recorded on invoices"
              href={filterHref("paid", "")}
            />
          </div>

          {/* Searches without reloading the page (a reload asks for the password again). */}
          <Form action="/admin/invoices" className="flex flex-wrap gap-2">
            {filter.id !== "all" && <input type="hidden" name="status" value={filter.id} />}
            <input
              name="q"
              defaultValue={q}
              aria-label="Search invoices"
              placeholder="Number or client"
              className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-base"
            />
            <button
              type="submit"
              className="rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-700"
            >
              Search
            </button>
          </Form>

          <nav aria-label="Filter invoices" className="flex flex-wrap gap-2 text-sm">
            {FILTERS.map((f) => (
              <Link
                key={f.id}
                href={filterHref(f.id, q)}
                aria-current={f.id === filter.id ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 font-medium ${
                  f.id === filter.id
                    ? "bg-brand text-white"
                    : "bg-white text-stone-700 shadow-sm hover:text-brand"
                }`}
              >
                {f.label} (
                {withStatus.filter(({ invoice, status }) => f.keep(invoice, status)).length})
              </Link>
            ))}
          </nav>

          {visible.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-stone-600 shadow-sm">
              {invoices.length === 0
                ? "No invoices yet. Make your first one with + New invoice."
                : "No invoices match."}
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map(({ invoice, status }) => (
                <li key={invoice.id}>
                  <Link
                    href={`/admin/invoices/${invoice.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold">{invoice.number}</span>
                        <InvoiceStatusBadge status={status} />
                      </span>
                      <span className="mt-1 block truncate font-medium">{invoice.client.name}</span>
                      <span className="block text-xs text-stone-500">
                        {formatDay(invoice.issueDate, "en")} ·{" "}
                        {invoice.kind === "proforma" ? "valid until" : "due"}{" "}
                        {formatDay(invoice.dueDate, "en")}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-bold">{formatPrice(invoice.totals.total)}</span>
                      {["part_paid", "overdue"].includes(status) && (
                        <span className="block text-xs text-stone-600">
                          {formatPrice(amountDue(invoice))} to pay
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
