import { isAdmin } from "@/lib/admin-auth";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  cameroonDate,
  isMonth,
  ledgerTableMissing,
  listEntries,
  monthLabel,
  monthReport,
  salesRows,
} from "@/lib/ledger";
import { listInvoicesIfSetUp } from "@/lib/invoices";
import { listOrders } from "@/lib/orders";
import { buildXlsx } from "@/lib/xlsx";

// The month's books as an Excel file (Books page → Download for Excel): a summary, then
// every sale, stock arrival and expense. Only for a signed-in admin.
export async function GET(request) {
  if (!(await isAdmin())) {
    return new Response("Please sign in to the admin panel.", { status: 401 });
  }
  const requested = new URL(request.url).searchParams.get("month");
  const month = isMonth(requested) ? requested : cameroonDate().slice(0, 7);

  let entries = [];
  try {
    entries = await listEntries();
  } catch (error) {
    if (!ledgerTableMissing(error)) throw error;
  }
  const [orders, invoices] = await Promise.all([listOrders(), listInvoicesIfSetUp()]);
  const report = monthReport({ month, orders, entries, invoices });
  const inMonth = (type) => entries.filter((e) => e.type === type && e.date.startsWith(month));

  const summary = [
    ["Fruidry books", monthLabel(month)],
    [],
    { bold: true, cells: ["Sales", "FCFA", "Packs"] },
    [
      `Website (${report.website.orders} paid ${report.website.orders === 1 ? "order" : "orders"})`,
      report.website.amount,
      report.website.packs,
    ],
    ["In person", report.inPerson.amount, report.inPerson.packs],
    ...Object.entries(PAYMENT_METHODS).map(([method, label]) => [
      `   of which ${label}`,
      report.inPerson.byPayment[method],
    ]),
    [`Invoices (${report.invoiced.invoices} paid)`, report.invoiced.amount, report.invoiced.packs],
    { bold: true, cells: ["Total sales", report.totalSales] },
    [],
    { bold: true, cells: ["Costs", "FCFA", "Packs"] },
    ["Stock bought", report.stockBought.cost, report.stockBought.packs],
    ...Object.entries(EXPENSE_CATEGORIES).map(([category, label]) => [
      `Expenses: ${label}`,
      report.expenses.byCategory[category],
    ]),
    { bold: true, cells: ["Total costs", report.stockBought.cost + report.expenses.total] },
    [],
    { bold: true, cells: ["Money left (sales minus costs)", report.balance] },
    ["Cost of the packs sold (from stock costs)", report.costOfPacksSold],
    { bold: true, cells: ["Estimated profit", report.estimatedProfit] },
    ...(report.packsWithoutCost > 0
      ? [[`${report.packsWithoutCost} packs sold have no purchase cost recorded`]]
      : []),
  ];

  const sales = [
    [
      "Date",
      "Where",
      "Order",
      "Product",
      "Item code",
      "Packs",
      "Price per pack",
      "Total",
      "Paid by",
      "Note",
    ],
    ...salesRows({ month, orders, entries, invoices }).map((r) => [
      { date: r.date },
      r.channel,
      r.reference,
      r.product,
      r.sku,
      r.quantity,
      r.price,
      r.total,
      r.payment,
      r.note,
    ]),
  ];
  const stock = [
    ["Date", "Product", "Item code", "Packs", "Cost (FCFA)", "Note"],
    ...inMonth("stock")
      .reverse()
      .map((e) => [{ date: e.date }, e.name, e.sku, e.quantity, e.cost ?? "", e.note]),
  ];
  const expenses = [
    ["Date", "For", "Amount (FCFA)", "Note"],
    ...inMonth("expense")
      .reverse()
      .map((e) => [
        { date: e.date },
        EXPENSE_CATEGORIES[e.category] ?? e.category,
        e.amount,
        e.note,
      ]),
  ];

  const file = buildXlsx([
    { name: "Summary", rows: summary },
    { name: "Sales", rows: sales },
    { name: "Stock arrivals", rows: stock },
    { name: "Expenses", rows: expenses },
  ]);
  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fruidry-books-${month}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
