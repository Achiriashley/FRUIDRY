import Link from "next/link";
import { Suspense } from "react";
import { getProducts } from "@/lib/catalog";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  cameroonDate,
  isMonth,
  ledgerTableMissing,
  listEntries,
  monthLabel,
  monthReport,
  shiftMonth,
} from "@/lib/ledger";
import { listOrders } from "@/lib/orders";
import { formatPrice, stockLeft } from "@/lib/products";
import { AdminPage, AdminShell } from "../AdminShell";
import { DownloadButton } from "../DownloadButton";
import { BookForms } from "./BookForms";
import { DeleteEntryButton, EditEntry } from "./EditEntry";

export const metadata = { title: "Books", robots: { index: false } };

export default function BooksPage({ searchParams }) {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="books">
          {async () => {
            const [params, orders, products, ledger] = await Promise.all([
              searchParams,
              listOrders(),
              getProducts(),
              loadEntries(),
            ]);
            return <Books params={params} orders={orders} products={products} {...ledger} />;
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}

// A missing Supabase table shows a setup note instead of breaking the page.
async function loadEntries() {
  try {
    return { entries: await listEntries(), setupNeeded: false };
  } catch (error) {
    if (!ledgerTableMissing(error)) throw error;
    return { entries: [], setupNeeded: true };
  }
}

const packs = (n) => `${n} ${n === 1 ? "pack" : "packs"}`;
const paidOrders = (n) => `${n} paid ${n === 1 ? "order" : "orders"}`;

// "12 Oct 2026"
const dayText = (date) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

function Line({ label, value, strong = false, indent = false }) {
  const look = strong ? "font-bold" : indent ? "pl-4 text-stone-600" : "text-stone-700";
  return (
    <div className={`flex justify-between gap-4 py-1 ${look}`}>
      <dt>{label}</dt>
      <dd className="text-right whitespace-nowrap">{value}</dd>
    </div>
  );
}

function Card({ title, note, children, highlight = false }) {
  return (
    <section
      className={`rounded-2xl p-5 shadow-sm ${highlight ? "bg-brand-light" : "bg-white"}`}
      aria-label={title}
    >
      <h2 className="text-lg font-bold">{title}</h2>
      <dl className="mt-2 text-sm">{children}</dl>
      {note && <p className="mt-2 text-xs text-stone-700">{note}</p>}
    </section>
  );
}

// What an entry is, in a line, with its amount and what deleting it does to the stock.
function describe(entry) {
  const moved = Number.isInteger(entry.stockChange) ? entry.stockChange : null;
  const undoNote = (change) =>
    change > 0
      ? `${packs(change)} will be taken off the stock count.`
      : change < 0
        ? `${packs(-change)} will be put back in the stock count.`
        : "";
  if (entry.type === "sale") {
    return {
      kind: "Sale in person",
      text: `${packs(entry.quantity)} of ${entry.name} at ${formatPrice(entry.price)} · ${
        PAYMENT_METHODS[entry.payment] ?? entry.payment
      }`,
      amount: `+ ${formatPrice(entry.total)}`,
      stockNote: undoNote(moved ?? -entry.quantity),
    };
  }
  if (entry.type === "stock") {
    const perPack = entry.cost
      ? ` (${formatPrice(Math.round(entry.cost / entry.quantity))} per pack)`
      : "";
    return {
      kind: "Stock arrival",
      text: `${packs(entry.quantity)} of ${entry.name}${perPack}`,
      amount: entry.cost === null ? "cost not given" : `− ${formatPrice(entry.cost)}`,
      stockNote: undoNote(moved ?? entry.quantity),
    };
  }
  return {
    kind: "Expense",
    text: EXPENSE_CATEGORIES[entry.category] ?? entry.category,
    amount: `− ${formatPrice(entry.amount)}`,
    stockNote: "",
  };
}

const navLink =
  "rounded-full border border-stone-300 bg-white px-4 py-2 text-sm whitespace-nowrap hover:border-brand";

function Books({ params, orders, products, entries, setupNeeded }) {
  const today = cameroonDate();
  const thisMonth = today.slice(0, 7);
  const month = isMonth(params.month) && params.month <= thisMonth ? params.month : thisMonth;
  const report = monthReport({ month, orders, entries });
  const monthEntries = entries.filter((e) => e.date.startsWith(month));
  const counted = products.filter((p) => stockLeft(p) !== null);
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Books</h1>
        <p className="mt-2 text-sm text-stone-600">
          Record what happens outside the website: sales in person, stock that arrives and other
          costs. Website orders count by themselves once you press <strong>Mark as paid</strong>.
        </p>
        {setupNeeded && (
          <p className="mt-3 rounded-xl bg-yellow-100 p-4 text-sm text-stone-800">
            To turn on the books, run <code className="font-mono">supabase/schema.sql</code> again
            in Supabase (SQL editor). It only adds what&apos;s missing.
          </p>
        )}
      </div>

      <BookForms
        products={products.map((p) => ({ slug: p.slug, name: p.name, price: p.price }))}
        payments={PAYMENT_METHODS}
        categories={EXPENSE_CATEGORIES}
        today={today}
      />

      <div>
        <h2 className="text-center text-2xl font-bold">{monthLabel(month)}</h2>
        <nav aria-label="Other months" className="mt-3 flex justify-between gap-3">
          <Link href={`/admin/books?month=${previous}`} className={navLink}>
            ← {monthLabel(previous, "short")}
          </Link>
          {month < thisMonth && (
            <Link href={`/admin/books?month=${next}`} className={navLink}>
              {monthLabel(next, "short")} →
            </Link>
          )}
        </nav>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Sales">
          <Line
            label={`Website (${paidOrders(report.website.orders)}, ${packs(report.website.packs)})`}
            value={formatPrice(report.website.amount)}
          />
          <Line
            label={`In person (${packs(report.inPerson.packs)})`}
            value={formatPrice(report.inPerson.amount)}
          />
          {Object.entries(PAYMENT_METHODS).map(([method, label]) => (
            <Line
              key={method}
              label={label}
              value={formatPrice(report.inPerson.byPayment[method])}
              indent
            />
          ))}
          <Line label="Total sales" value={formatPrice(report.totalSales)} strong />
        </Card>
        <Card title="Costs">
          <Line
            label={`Stock bought (${packs(report.stockBought.packs)})`}
            value={formatPrice(report.stockBought.cost)}
          />
          {Object.entries(EXPENSE_CATEGORIES).map(([category, label]) =>
            report.expenses.byCategory[category] > 0 ? (
              <Line
                key={category}
                label={label}
                value={formatPrice(report.expenses.byCategory[category])}
              />
            ) : null,
          )}
          <Line
            label="Total costs"
            value={formatPrice(report.stockBought.cost + report.expenses.total)}
            strong
          />
        </Card>
        <Card
          title="Money left this month"
          highlight
          note="Everything that came in, minus everything you paid out this month. Buying a big stock delivery makes this low for that month."
        >
          <Line label="Sales minus costs" value={formatPrice(report.balance)} strong />
        </Card>
        <Card
          title="Estimated profit"
          highlight
          note={
            `Sales, minus what the packs sold cost you (${formatPrice(report.costOfPacksSold)}, ` +
            "from the costs of your stock arrivals up to this month), minus expenses." +
            (report.packsWithoutCost > 0
              ? ` ${packs(report.packsWithoutCost)} sold have no purchase cost recorded yet, so this is too high: add the cost when you record stock arrivals.`
              : "")
          }
        >
          <Line
            label="Profit on what you sold"
            value={formatPrice(report.estimatedProfit)}
            strong
          />
        </Card>
      </div>

      <DownloadButton
        url={`/admin/books/export?month=${encodeURIComponent(month)}`}
        label="⬇ Download for Excel"
        fileName={`fruidry-books-${month}.xlsx`}
      />

      <section>
        <h2 className="mb-3 text-xl font-bold">
          Entries in {monthLabel(month)}{" "}
          <span className="text-stone-600">({monthEntries.length})</span>
        </h2>
        {monthEntries.length === 0 ? (
          <p className="text-sm text-stone-600">Nothing recorded this month.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl bg-white shadow-sm">
            {monthEntries.map((entry) => {
              const { kind, text, amount, stockNote } = describe(entry);
              return (
                <li key={entry.id} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-stone-600">{dayText(entry.date)}</span>
                    <span className="font-semibold whitespace-nowrap">{amount}</span>
                  </div>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">{kind}</span>: {text}
                    {entry.note && <span className="text-stone-600"> · {entry.note}</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    <DeleteEntryButton
                      id={entry.id}
                      what={kind.toLowerCase()}
                      stockNote={stockNote}
                    />
                    <EditEntry
                      entry={entry}
                      payments={PAYMENT_METHODS}
                      categories={EXPENSE_CATEGORIES}
                      today={today}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-stone-600">
          Website orders aren&apos;t listed here: see{" "}
          <Link href="/admin/orders" className="font-semibold text-brand hover:underline">
            Orders
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Stock now</h2>
        {counted.length === 0 ? (
          <p className="text-sm text-stone-600">
            No product has its packs counted. Enter <strong>Packs in stock</strong> on a product
            page to count them.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl bg-white shadow-sm">
            {counted.map((p) => (
              <li key={p.slug} className="flex justify-between gap-4 px-5 py-3 text-sm">
                <Link href={`/admin/products/${p.slug}`} className="font-semibold text-brand">
                  {p.name}
                </Link>
                <span>{packs(stockLeft(p))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
