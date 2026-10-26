import Link from "next/link";
import { Suspense } from "react";
import { listClients } from "@/lib/clients";
import { listInvoicesIfSetUp } from "@/lib/invoices";
import { tableMissing } from "@/lib/storage";
import { AdminPage, AdminShell } from "../../AdminShell";
import { ConfirmButton } from "../../ConfirmButton";
import { deleteClientAction } from "../actions";
import { InvoicesNav, SetupNeeded } from "../InvoicesNav";
import { ClientForm } from "./ClientForm";

export const metadata = { title: "Clients", robots: { index: false } };

export default function ClientsPage() {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="invoices">
          {async () => {
            try {
              const [clients, invoices] = await Promise.all([listClients(), listInvoicesIfSetUp()]);
              return <Clients clients={clients} invoices={invoices} />;
            } catch (error) {
              if (!tableMissing(error)) throw error;
              return <Clients setupNeeded />;
            }
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}

function Clients({ clients = [], invoices = [], setupNeeded = false }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Clients</h1>
      <InvoicesNav active="clients" />
      {setupNeeded ? (
        <SetupNeeded />
      ) : (
        <>
          <details className="group rounded-2xl bg-white shadow-sm">
            <summary className="cursor-pointer list-none rounded-2xl px-5 py-4 font-bold hover:bg-stone-50">
              <span className="mr-2 inline-block transition group-open:rotate-45" aria-hidden>
                +
              </span>
              Add a client
            </summary>
            <div className="border-t border-stone-100 px-5 pt-4 pb-5">
              <ClientForm />
            </div>
          </details>

          {clients.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-stone-600 shadow-sm">
              No saved clients yet. Add one here, or tick &quot;Save to my clients&quot; when you
              make an invoice.
            </p>
          ) : (
            <ul className="space-y-3">
              {clients.map((client) => {
                const count = invoices.filter((i) => i.client.id === client.id).length;
                return (
                  <li key={client.id} className="rounded-2xl bg-white p-5 shadow-sm">
                    <p className="font-bold">{client.name}</p>
                    <p className="text-sm text-stone-600">
                      {[
                        client.contact,
                        client.phone,
                        client.email,
                        client.niu && `NIU ${client.niu}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {client.address && <p className="text-sm text-stone-600">{client.address}</p>}
                    {client.note && (
                      <p className="mt-1 text-sm text-stone-500">Note: {client.note}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <Link
                        href={`/admin/invoices/new?client=${client.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        + Invoice
                      </Link>
                      <Link
                        href={`/admin/invoices/new?kind=proforma&client=${client.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        + Proforma
                      </Link>
                      {count > 0 && (
                        <Link
                          href={`/admin/invoices?q=${encodeURIComponent(client.name)}`}
                          className="text-stone-600 hover:text-brand"
                        >
                          {count} {count === 1 ? "invoice" : "invoices"}
                        </Link>
                      )}
                      <form action={deleteClientAction} className="contents">
                        <input type="hidden" name="id" value={client.id} />
                        <ConfirmButton
                          label="Delete"
                          question={`Delete ${client.name} from your clients?`}
                          hint="Invoices already made keep their details."
                          yes="Yes, delete"
                          no="Keep"
                          className="font-semibold text-red-700 underline"
                          yesClassName="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        />
                      </form>
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-stone-700">
                        Edit details
                      </summary>
                      <div className="mt-3">
                        <ClientForm client={client} />
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
