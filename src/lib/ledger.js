import { randomBytes } from "node:crypto";
import { isPaid } from "./orders";
import { jsonFile, supabaseConfig, supabaseRequest } from "./storage";

// The shop's books, kept in the admin panel (/admin/books): sales made in person, stock
// that arrives and other costs. Website orders aren't copied here: they count from the
// orders themselves once marked as paid.
//
// Each entry has an id, a type, the date it happened (YYYY-MM-DD, Cameroon time) and:
// - sale:    slug, name, sku, quantity, price (per pack), total, payment, note
// - stock:   slug, name, sku, quantity, cost (what the packs cost in all, or null), note
// - expense: category, amount, note

export const PAYMENT_METHODS = { cash: "Cash", momo: "MTN MoMo" };
export const EXPENSE_CATEGORIES = {
  delivery: "Delivery",
  packaging: "Packaging",
  transport: "Transport",
  advertising: "Advertising",
  other: "Other",
};
export const ENTRY_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

const ledgerFile = jsonFile("ledger.json", []);

const newestFirst = (a, b) =>
  b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt));

const supabaseStore = {
  add: (config, entry) =>
    supabaseRequest(config, "ledger", "", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: entry.id,
        type: entry.type,
        entry_date: entry.date,
        created_at: entry.createdAt,
        data: entry,
      }),
    }),
  // Supabase returns at most "Max rows" (1,000 by default) per request: read page by page.
  async list(config) {
    const rows = [];
    for (;;) {
      const page = await supabaseRequest(
        config,
        "ledger",
        `?select=data&order=entry_date.desc,created_at.desc,id.asc&limit=1000&offset=${rows.length}`,
      );
      if (!page?.length) break;
      rows.push(...page);
    }
    return rows.map((row) => row.data);
  },
  async get(config, id) {
    const rows = await supabaseRequest(
      config,
      "ledger",
      `?id=eq.${encodeURIComponent(id)}&select=data`,
    );
    return rows?.[0]?.data ?? null;
  },
  update: (config, entry) =>
    supabaseRequest(config, "ledger", `?id=eq.${encodeURIComponent(entry.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ entry_date: entry.date, data: entry }),
    }),
  // Returns the deleted entry, or null if it was already gone.
  async remove(config, id) {
    const rows = await supabaseRequest(config, "ledger", `?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });
    return rows?.[0]?.data ?? null;
  },
};

const fileStore = {
  add: (entry) => ledgerFile.update((list) => [...list, entry]),
  list: () => ledgerFile.read(),
  get: async (id) => (await ledgerFile.read()).find((e) => e.id === id) ?? null,
  update: (entry) => ledgerFile.update((list) => list.map((e) => (e.id === entry.id ? entry : e))),
  async remove(id) {
    let removed = null;
    await ledgerFile.update((list) => {
      removed = list.find((e) => e.id === id) ?? null;
      return list.filter((e) => e.id !== id);
    });
    return removed;
  },
};

export async function addEntry(fields) {
  const entry = {
    id: randomBytes(9).toString("base64url"),
    createdAt: new Date().toISOString(),
    ...fields,
  };
  const config = supabaseConfig();
  await (config ? supabaseStore.add(config, entry) : fileStore.add(entry));
  return entry;
}

// Every entry, newest first.
export async function listEntries() {
  const config = supabaseConfig();
  const list = config ? await supabaseStore.list(config) : await fileStore.list();
  return list.sort(newestFirst);
}

export async function getEntry(id) {
  if (!ENTRY_ID_PATTERN.test(id)) return null;
  const config = supabaseConfig();
  return config ? supabaseStore.get(config, id) : fileStore.get(id);
}

// Saves changes to an existing entry (the same id).
export async function updateEntry(entry) {
  const config = supabaseConfig();
  return config ? supabaseStore.update(config, entry) : fileStore.update(entry);
}

// Deletes an entry. Returns it, or null if it was already deleted (for example by a
// second press of Delete), so its stock change is only undone once.
export async function deleteEntry(id) {
  if (!ENTRY_ID_PATTERN.test(id)) return null;
  const config = supabaseConfig();
  return config ? supabaseStore.remove(config, id) : fileStore.remove(id);
}

// True when Supabase is set up but the ledger table hasn't been created yet.
export function ledgerTableMissing(error) {
  return /PGRST205|42P01|Could not find the table|does not exist/i.test(error?.message ?? "");
}

// ---------- Dates ----------

// "2026-10-20" for a moment in time, in Cameroon.
export function cameroonDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export const isMonth = (text) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(text ?? ""));

// "2026-10" moved by a number of months.
export function shiftMonth(month, by) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + by, 1));
  return date.toISOString().slice(0, 7);
}

// "October 2026", or "Oct 2026" with style "short".
export function monthLabel(month, style = "long") {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: style,
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, m - 1, 1)));
}

// ---------- Reports ----------

// What each pack of a product cost on average, from the stock arrivals recorded with a
// cost up to the end of the month. A later delivery at a new price doesn't change past
// months. Products with no earlier costed arrival use their later ones; products with
// none at all are left out.
export function costPerPack(entries, month) {
  const average = (arrivals) => {
    const totals = {};
    for (const e of arrivals) {
      const t = (totals[e.slug] ??= { cost: 0, packs: 0 });
      t.cost += e.cost;
      t.packs += e.quantity;
    }
    return Object.fromEntries(Object.entries(totals).map(([slug, t]) => [slug, t.cost / t.packs]));
  };
  const costed = entries.filter(
    (e) => e.type === "stock" && Number.isInteger(e.cost) && e.quantity > 0,
  );
  return {
    ...average(costed),
    ...average(costed.filter((e) => e.date.slice(0, 7) <= month)),
  };
}

// Website orders paid in the month (by the day payment was confirmed, Cameroon time).
export function paidOrdersIn(orders, month) {
  return orders.filter(
    (o) =>
      isPaid(o) && o.receipt?.confirmedAt && cameroonDate(o.receipt.confirmedAt).startsWith(month),
  );
}

const sum = (list, value) => list.reduce((total, item) => total + value(item), 0);
const orderPacks = (order) => sum(order.items, (item) => item.quantity);

// Every sale in the month, one row per product: website orders and sales in person.
export function salesRows({ month, orders, entries }) {
  const rows = [];
  for (const order of paidOrdersIn(orders, month)) {
    for (const item of order.items) {
      rows.push({
        date: cameroonDate(order.receipt.confirmedAt),
        channel: "Website",
        reference: order.reference,
        slug: item.slug,
        product: item.name,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        payment: "Website order",
        note: "",
      });
    }
  }
  for (const e of entries) {
    if (e.type !== "sale" || !e.date.startsWith(month)) continue;
    rows.push({
      date: e.date,
      channel: "In person",
      reference: "",
      slug: e.slug,
      product: e.name,
      sku: e.sku,
      quantity: e.quantity,
      price: e.price,
      total: e.total,
      payment: PAYMENT_METHODS[e.payment] ?? e.payment,
      note: e.note ?? "",
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

// The month's figures: sales by channel and payment, stock bought, expenses, money left
// and an estimated profit.
export function monthReport({ month, orders, entries }) {
  const paid = paidOrdersIn(orders, month);
  const inMonth = entries.filter((e) => e.date.startsWith(month));
  const sales = inMonth.filter((e) => e.type === "sale");
  const arrivals = inMonth.filter((e) => e.type === "stock");
  const expenses = inMonth.filter((e) => e.type === "expense");

  const website = {
    orders: paid.length,
    packs: sum(paid, orderPacks),
    amount: sum(paid, (o) => o.total),
  };
  const inPerson = {
    sales: sales.length,
    packs: sum(sales, (e) => e.quantity),
    amount: sum(sales, (e) => e.total),
    byPayment: Object.fromEntries(
      Object.keys(PAYMENT_METHODS).map((method) => [
        method,
        sum(
          sales.filter((e) => e.payment === method),
          (e) => e.total,
        ),
      ]),
    ),
  };
  const stockBought = {
    packs: sum(arrivals, (e) => e.quantity),
    cost: sum(arrivals, (e) => e.cost ?? 0),
  };
  const spent = {
    total: sum(expenses, (e) => e.amount),
    byCategory: Object.fromEntries(
      Object.keys(EXPENSE_CATEGORIES).map((category) => [
        category,
        sum(
          expenses.filter((e) => e.category === category),
          (e) => e.amount,
        ),
      ]),
    ),
  };
  const totalSales = website.amount + inPerson.amount;

  // Estimated profit: sales, minus what the packs sold cost you, minus expenses.
  const costs = costPerPack(entries, month);
  let costOfPacksSold = 0;
  let packsWithoutCost = 0;
  for (const row of salesRows({ month, orders, entries })) {
    if (costs[row.slug] === undefined) packsWithoutCost += row.quantity;
    else costOfPacksSold += costs[row.slug] * row.quantity;
  }
  costOfPacksSold = Math.round(costOfPacksSold);

  return {
    month,
    website,
    inPerson,
    totalSales,
    stockBought,
    expenses: spent,
    // Money in minus money out this month.
    balance: totalSales - stockBought.cost - spent.total,
    costOfPacksSold,
    packsWithoutCost,
    estimatedProfit: totalSales - costOfPacksSold - spent.total,
  };
}
