import { isAdmin } from "@/lib/admin-auth";
import { getProducts } from "@/lib/catalog";
import { listClients } from "@/lib/clients";
import {
  INVOICE_PAYMENT_METHODS,
  INVOICE_STATUS_LABELS,
  amountDue,
  invoiceStatus,
  paidAmount,
} from "@/lib/invoice-math";
import { listInvoices } from "@/lib/invoices";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  cameroonDate,
  ledgerTableMissing,
  listEntries,
} from "@/lib/ledger";
import { STATUS_LABELS, listOrders } from "@/lib/orders";
import { DEFAULT_LOW_STOCK_AT } from "@/lib/products";
import { listReviews, reviewsTableMissing } from "@/lib/reviews";
import { getSiteUrl } from "@/lib/site-url";
import { tableMissing } from "@/lib/storage";
import { listWaitlist, waitlistTableMissing } from "@/lib/waitlist";
import { buildXlsx } from "@/lib/xlsx";

// A full copy of the shop as one Excel file (Dashboard → Download a full copy): every
// order with the customer's details, every Books entry, the products, the reviews, the
// waiting list, every invoice and proforma, and the saved clients. Only for a signed-in admin, and never cached: it holds customers'
// personal details.
export async function GET() {
  if (!(await isAdmin())) {
    return new Response("Please sign in to the admin panel.", { status: 401 });
  }
  const [orders, books, products, reviews, waitlist, invoices, clients, siteUrl] =
    await Promise.all([
      listOrders(),
      readTable(listEntries, ledgerTableMissing),
      getProducts(),
      readTable(listReviews, reviewsTableMissing),
      readTable(() => listWaitlist(), waitlistTableMissing),
      readTable(listInvoices, tableMissing),
      readTable(listClients, tableMissing),
      getSiteUrl(),
    ]);
  const now = new Date();
  const productName = (slug) => products.find((p) => p.slug === slug)?.name ?? slug;
  const language = (lang) => (lang === "fr" ? "French" : lang === "en" ? "English" : "");
  const packs = (items) => items.reduce((total, item) => total + item.quantity, 0);

  const about = [
    ["Fruidry: full copy of the shop"],
    ["Made on", { date: cameroonDate(now) }, timeOfDay(now)],
    [],
    { bold: true, cells: ["What's inside", "Rows"] },
    ["Orders", orders.length],
    ["Books", books.rows.length],
    ["Products", products.length],
    ["Reviews", reviews.rows.length],
    ["Waiting list", waitlist.rows.length],
    ["Invoices and proformas", invoices.rows.length],
    ["Clients", clients.rows.length],
    [],
    ["This file holds customers' names, phone numbers and addresses. Keep it private, don't"],
    ["forward it, and delete older copies once you have a newer one."],
    ...[
      [books, "Books"],
      [reviews, "Reviews"],
      [waitlist, "Waiting list"],
      [invoices, "Invoices"],
      [clients, "Clients"],
    ]
      .filter(([table]) => table.missing)
      .map(([, name]) => [`${name}: its table isn't set up in Supabase yet, so it's empty.`]),
  ];

  const orderRows = [
    [
      "Date",
      "Time",
      "Order",
      "Status",
      "Customer",
      "Phone",
      "Delivery address",
      "Notes",
      "Items",
      "Packs",
      "Total (FCFA)",
      "Language",
      "Receipt",
      "Paid on",
      "Delivered on",
      "Cancelled because",
      "Customer's page",
    ],
    ...orders.map((o) => [
      { date: cameroonDate(o.createdAt) },
      timeOfDay(o.createdAt),
      o.reference,
      STATUS_LABELS[o.status] ?? o.status,
      o.customer?.name,
      o.customer?.phone,
      o.customer?.address,
      o.customer?.notes,
      o.items.map((item) => `${item.sku ?? item.slug} ${item.name} × ${item.quantity}`).join(", "),
      packs(o.items),
      o.total,
      language(o.lang),
      o.receipt?.number,
      o.receipt ? { date: cameroonDate(o.receipt.confirmedAt) } : "",
      o.delivery ? { date: cameroonDate(o.delivery.deliveredAt) } : "",
      o.rejection?.reason,
      `${siteUrl}${o.lang ? `/${o.lang}` : ""}/order/${o.id}`,
    ]),
  ];

  const ENTRY_TYPES = { sale: "Sale in person", stock: "Stock arrival", expense: "Expense" };
  const bookRows = [
    [
      "Date",
      "Type",
      "Product",
      "Item code",
      "Packs",
      "Price per pack",
      "Paid by",
      "Amount (FCFA)",
      "Expense for",
      "Note",
    ],
    ...books.rows.map((e) => [
      { date: e.date },
      ENTRY_TYPES[e.type] ?? e.type,
      e.name,
      e.sku,
      e.quantity,
      e.price,
      PAYMENT_METHODS[e.payment] ?? e.payment,
      e.type === "sale" ? e.total : e.type === "stock" ? e.cost : e.amount,
      EXPENSE_CATEGORIES[e.category] ?? e.category,
      e.note,
    ]),
  ];

  const productRows = [
    [
      "Product",
      "French name",
      "Item code",
      "Price (FCFA)",
      "Pack size",
      "Shown as",
      "In stock",
      "Packs in stock",
      "Warn me at",
      "Shop page",
    ],
    ...products.map((p) => [
      p.name,
      p.nameFr,
      p.sku,
      p.price,
      p.weight,
      p.comingSoon ? "Coming soon" : "For sale",
      p.inStock ? "Yes" : "No",
      Number.isInteger(p.stock) ? p.stock : "Not counted",
      Number.isInteger(p.stock) ? (p.lowStockAt ?? DEFAULT_LOW_STOCK_AT) : "",
      `${siteUrl}/fr/shop/${p.slug}`,
    ]),
  ];

  const reviewRows = [
    ["Date", "Product", "First name", "Stars", "Review", "Language", "Status", "Published on"],
    ...reviews.rows.map((r) => [
      { date: cameroonDate(r.createdAt) },
      productName(r.slug),
      r.name,
      r.rating,
      r.comment,
      language(r.lang),
      r.status === "approved" ? "Published" : "Waiting",
      r.approvedAt ? { date: cameroonDate(r.approvedAt) } : "",
    ]),
  ];

  const waitlistRows = [
    ["Date", "Flavour", "WhatsApp number", "Language"],
    ...waitlist.rows.map((w) => [
      { date: cameroonDate(w.createdAt) },
      productName(w.slug),
      w.phone,
      language(w.lang),
    ]),
  ];

  const invoiceRows = [
    [
      "Number",
      "Type",
      "Status",
      "Date",
      "Pay by / valid until",
      "Client",
      "Contact",
      "Phone",
      "Email",
      "Address",
      "Client NIU",
      "Lines",
      "Discount (FCFA)",
      "VAT (FCFA)",
      "Total (FCFA)",
      "Paid (FCFA)",
      "Still to pay (FCFA)",
      "Payments",
      "Language",
      "Website order",
      "Notes",
      "Client's page",
    ],
    ...invoices.rows.map((i) => [
      i.number,
      i.kind === "proforma" ? "Proforma" : "Invoice",
      INVOICE_STATUS_LABELS[invoiceStatus(i)],
      { date: i.issueDate },
      { date: i.dueDate },
      i.client.name,
      i.client.contact,
      i.client.phone,
      i.client.email,
      i.client.address,
      i.client.niu,
      i.items.map((item) => `${item.description} × ${item.quantity} @ ${item.price}`).join(", "),
      i.totals.discount,
      i.totals.vat,
      i.totals.total,
      i.kind === "invoice" ? paidAmount(i) : "",
      i.kind === "invoice" && !i.cancelled ? amountDue(i) : "",
      i.payments
        .map(
          (p) =>
            `${p.date} ${p.amount} ${INVOICE_PAYMENT_METHODS[p.method] ?? p.method}` +
            (p.note ? ` (${p.note})` : ""),
        )
        .join("; "),
      language(i.lang),
      i.orderReference,
      i.notes,
      `${siteUrl}/${i.lang === "en" ? "en" : "fr"}/invoice/${i.id}`,
    ]),
  ];

  const clientRows = [
    ["Name", "Contact", "Phone", "Email", "Address", "NIU", "Note", "Added on"],
    ...clients.rows.map((c) => [
      c.name,
      c.contact,
      c.phone,
      c.email,
      c.address,
      c.niu,
      c.note,
      { date: cameroonDate(c.createdAt) },
    ]),
  ];

  const file = buildXlsx([
    { name: "About this copy", rows: about },
    { name: "Orders", rows: orderRows },
    { name: "Books", rows: bookRows },
    { name: "Products", rows: productRows },
    { name: "Reviews", rows: reviewRows },
    { name: "Waiting list", rows: waitlistRows },
    { name: "Invoices", rows: invoiceRows },
    { name: "Clients", rows: clientRows },
  ]);
  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fruidry-backup-${cameroonDate(now)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

// A table that isn't set up in Supabase yet counts as empty (the file says so).
async function readTable(list, tableMissing) {
  try {
    return { rows: await list() };
  } catch (error) {
    if (tableMissing(error)) return { rows: [], missing: true };
    throw error;
  }
}

// "14:05", Cameroon time.
function timeOfDay(date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Douala",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
