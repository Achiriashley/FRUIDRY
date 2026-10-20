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
import { BookForms } from "./BookForms";
import { DeleteEntryButton } from "./DeleteEntryButton";
import { DownloadButton } from "./DownloadButton";

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

function Line({ label, value, strong = false, indent = false }) {
  const look = strong ? "font-bold" : indent ? "pl-4 text-stone-500" : "text-stone-700";
  return (
    <div className={`flex justify-between gap-4 py-1 ${look}`}>
      <dt>{label}</dt>
      <dd className="text-right whitespace-nowrap">{value}</dd>
    </div>
  );
}

function Card({ title, children, highlight = false }) {
  return (
    <section
      className={`rounded-2xl p-5 shadow-sm ${highlight ? "bg-brand-light" : "bg-white"}`}
      aria-label={title}
    >
      <h2 className="text-lg font-bold">{title}</h2>
      <dl className="mt-2 text-sm">{children}</dl>
    </section>
  );
}

function describe(entry) {
  if (entry.type === "sale") {
    return {
      kind: "Sale in person",
      text: `${packs(entry.quantity)} of ${entry.name} at ${formatPrice(entry.price)} · ${
        PAYMENT_METHODS[entry.payment] ?? entry.payment
      }`,
      amount: `+ ${formatPrice(entry.total)}`,
    };
  }
  if (entry.type === "stock") {
    return {
      kind: "Stock arrival",
      text: `${packs(entry.quantity)} of ${entry.name}`,
      amount: entry.cost === null ? "cost not given" : `− ${formatPrice(entry.cost)}`,
    };
  }
  return {
    kind: "Expense",
    text: EXPENSE_CATEGORIES[entry.category] ?? entry.category,
    amount: `− ${formatPrice(entry.amount)}`,
  };
}

function Books({ params, orders, products, entries, setupNeeded }) {
  const thisMonth = cameroonDate().slice(0, 7);
  const month = isMonth(params.month) && params.month <= thisMonth ? params.month : thisMonth;
  const report = monthReport({ month, orders, entries });
  const monthEntries = entries.filter((e) => e.date.startsWith(month));
  const counted = products.filter((p) => stockLeft(p) !== null);

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
        today={cameroonDate()}
      />

      <nav aria-label="Month" className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/books?month=${shiftMonth(month, -1)}`}
          className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm hover:border-brand"
        >
          ← {monthLabel(shiftMonth(month, -1))}
        </Link>
        <h2 className="text-2xl font-bold">{monthLabel(month)}</h2>
        {month < thisMonth ? (
          <Link
            href={`/admin/books?month=${shiftMonth(month, 1)}`}
            className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm hover:border-brand"
          >
            {monthLabel(shiftMonth(month, 1))} →
          </Link>
        ) : (
          <span className="w-24" />
        )}
      </nav>

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
        <Card title="Money left this month" highlight>
          <Line label="Sales minus costs" value={formatPrice(report.balance)} strong />
          <p className="mt-2 text-xs text-stone-600">
            Everything that came in, minus everything you paid out this month. Buying a big stock
            delivery makes this low for that month.
          </p>
        </Card>
        <Card title="Estimated profit" highlight>
          <Line
            label="Profit on what you sold"
            value={formatPrice(report.estimatedProfit)}
            strong
          />
          <p className="mt-2 text-xs text-stone-600">
            Sales, minus what the packs sold cost you ({formatPrice(report.costOfPacksSold)}, from
            the costs of your stock arrivals), minus expenses.
            {report.packsWithoutCost > 0 &&
              ` ${packs(report.packsWithoutCost)} sold have no purchase cost recorded yet, so this is too high: add the cost when you record stock arrivals.`}
          </p>
        </Card>
      </div>

      <DownloadButton month={month} />

      <section>
        <h2 className="mb-3 text-xl font-bold">
          Entries in {monthLabel(month)}{" "}
          <span className="text-stone-400">({monthEntries.length})</span>
        </h2>
        {monthEntries.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing recorded this month.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl bg-white shadow-sm">
            {monthEntries.map((entry) => {
              const { kind, text, amount } = describe(entry);
              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"
                >
                  <span className="w-24 text-sm text-stone-500">{entry.date}</span>
                  <span className="flex-1 text-sm">
                    <span className="font-semibold">{kind}</span>: {text}
                    {entry.note && <span className="text-stone-500"> · {entry.note}</span>}
                  </span>
                  <span className="text-sm font-semibold whitespace-nowrap">{amount}</span>
                  <DeleteEntryButton id={entry.id} what={kind.toLowerCase()} />
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-stone-500">
          Website orders aren&apos;t listed here: see <Link href="/admin/orders">Orders</Link>.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Stock now</h2>
        {counted.length === 0 ? (
          <p className="text-sm text-stone-500">
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
