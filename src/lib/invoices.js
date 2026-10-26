import { randomBytes } from "node:crypto";
import { readSettings, writeSettings } from "./settings";
import { CONTACT } from "./shop-config";
import {
  jsonFile,
  supabaseConfig,
  supabaseListAll,
  supabaseRequest,
  tableMissing,
} from "./storage";

// Invoices and proformas (admin panel → Invoices). Each has an unguessable id (the
// address of its page, which the client receives) and a number following on from the
// last one of its kind that year: FAC-2026-0001 for invoices, PRO-2026-0001 for
// proformas. Numbers are never reused: an invoice sent by mistake is cancelled, not
// deleted.
//
// An invoice keeps its own copy of everything it shows (the client's details, the
// lines, the shop's details from the invoice settings), so later changes elsewhere
// don't change invoices already sent. Fields:
//   id, number, kind ("invoice" | "proforma"), lang ("fr" | "en"), issueDate and
//   dueDate (for a proforma: valid until), client { id, name, contact, phone, email,
//   address, niu }, items [{ slug (null for a free line), sku, description, quantity,
//   price }], discount, vatRate, totals, notes, business { … }, payments [{ id, date,
//   amount, method, note }], orderId and orderReference (made from a website order),
//   fromProforma and convertedTo ({ id, number }), cancelled ({ at, reason }), paidAt
//   and stockTaken (once fully paid: counted in Books, packs taken off the stock count),
//   createdAt, updatedAt.

export const INVOICE_ID_PATTERN = /^[A-Za-z0-9_-]{16,40}$/;
const PREFIX = { invoice: "FAC", proforma: "PRO" };

const invoicesFile = jsonFile("invoices.json", []);
const newestFirst = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt));

const supabaseStore = {
  insert: (config, invoice) =>
    supabaseRequest(config, "invoices", "", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: invoice.id,
        number: invoice.number,
        kind: invoice.kind,
        issue_date: invoice.issueDate,
        created_at: invoice.createdAt,
        data: invoice,
      }),
    }),
  update: (config, invoice) =>
    supabaseRequest(config, "invoices", `?id=eq.${encodeURIComponent(invoice.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ issue_date: invoice.issueDate, data: invoice }),
    }),
  async get(config, id) {
    const rows = await supabaseRequest(
      config,
      "invoices",
      `?id=eq.${encodeURIComponent(id)}&select=data`,
    );
    return rows?.[0]?.data ?? null;
  },
  list: async (config) =>
    (await supabaseListAll(config, "invoices", "select=data&order=created_at.desc,id.asc")).map(
      (row) => row.data,
    ),
};

const fileStore = {
  list: async () => (await invoicesFile.read()).sort(newestFirst),
  get: async (id) => (await invoicesFile.read()).find((i) => i.id === id) ?? null,
  update: (invoice) =>
    invoicesFile.update((list) => {
      const index = list.findIndex((i) => i.id === invoice.id);
      if (index === -1) throw new Error(`Invoice ${invoice.id} not found`);
      list[index] = invoice;
      return list;
    }),
};

// The number after the highest one of this kind and year: "FAC-2026-0007".
export function nextInvoiceNumber(invoices, kind, year) {
  const prefix = `${PREFIX[kind]}-${year}-`;
  const highest = invoices
    .filter((i) => i.number?.startsWith(prefix))
    .reduce((max, i) => Math.max(max, Number(i.number.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

// Saves a new invoice or proforma with the next number. Returns it.
export async function createInvoice(fields) {
  const now = new Date().toISOString();
  const base = {
    ...fields,
    id: randomBytes(12).toString("base64url"),
    payments: fields.payments ?? [],
    createdAt: now,
    updatedAt: now,
  };
  const year = fields.issueDate.slice(0, 4);
  const config = supabaseConfig();
  if (!config) {
    let created;
    await invoicesFile.update((list) => {
      created = { ...base, number: nextInvoiceNumber(list, fields.kind, year) };
      return [...list, created];
    });
    return created;
  }
  // Two invoices saved at the same moment could pick the same number: the database
  // refuses the second (numbers are unique), which then takes the next one.
  for (let attempt = 1; ; attempt++) {
    const list = await supabaseStore.list(config);
    const invoice = { ...base, number: nextInvoiceNumber(list, fields.kind, year) };
    try {
      await supabaseStore.insert(config, invoice);
      return invoice;
    } catch (error) {
      if (attempt >= 5 || !/\(409\)/.test(error.message)) throw error;
    }
  }
}

export async function saveInvoice(invoice) {
  const updated = { ...invoice, updatedAt: new Date().toISOString() };
  const config = supabaseConfig();
  await (config ? supabaseStore.update(config, updated) : fileStore.update(updated));
  return updated;
}

export async function getInvoice(id) {
  if (!INVOICE_ID_PATTERN.test(String(id ?? ""))) return null;
  const config = supabaseConfig();
  return config ? supabaseStore.get(config, id) : fileStore.get(id);
}

// Every invoice and proforma, newest first.
export async function listInvoices() {
  const config = supabaseConfig();
  return config ? supabaseStore.list(config) : fileStore.list();
}

// Every invoice, or none if the table isn't set up in Supabase yet (for pages that
// only show invoices alongside other things, such as the dashboard and Books).
export async function listInvoicesIfSetUp() {
  try {
    return await listInvoices();
  } catch (error) {
    if (tableMissing(error)) return [];
    throw error;
  }
}

// Each website order's invoice (not cancelled), by order id.
export function invoicesByOrder(invoices) {
  return Object.fromEntries(
    invoices
      .filter((i) => i.orderId && i.kind === "invoice" && !i.cancelled)
      .map((i) => [i.orderId, i]),
  );
}

// ---------- Settings ----------

// The shop's details printed on invoices, and how invoices are made (admin panel →
// Invoices → Settings). Stored with the other settings (settings.js).
export const INVOICE_SETTINGS_DEFAULTS = {
  businessName: "Fruidry",
  address: "Bonabéri, Douala, Cameroun",
  phone: CONTACT.phone,
  email: "",
  // Taxpayer number (Numéro d'Identifiant Unique) and trade register number.
  niu: "",
  rccm: "",
  // Shows the MTN MoMo code to dial, with the amount due, on unpaid invoices.
  showMomo: true,
  // Other ways to pay (e.g. a bank account), printed on every invoice.
  paymentInfo: "",
  // Days to pay an invoice, and how long a proforma is valid.
  dueDays: 15,
  proformaDays: 30,
  // Adds TVA (VAT_RATE) to new invoices. Only for shops registered to collect VAT.
  vat: false,
  // Printed at the bottom of every invoice.
  footer: "",
};

// What an invoice shows of the shop, copied from the settings when it's made.
export const businessFromSettings = (s) => ({
  name: s.businessName,
  address: s.address,
  phone: s.phone,
  email: s.email,
  niu: s.niu,
  rccm: s.rccm,
  showMomo: s.showMomo,
  paymentInfo: s.paymentInfo,
  footer: s.footer,
});

// An invoice with the shop's details it was made with, completed from today's settings
// where it had none: NIU, RCCM or bank details added after it was made then show on it.
// Details it already had (a former address, say) stay as they were.
export function withShopDetails(invoice, settings) {
  const current = businessFromSettings(settings);
  const business = { ...invoice.business };
  for (const [key, value] of Object.entries(current)) {
    if (typeof value === "string" ? !business[key] && value : business[key] === undefined) {
      business[key] = value;
    }
  }
  return { ...invoice, business };
}

export async function getInvoiceSettings() {
  return { ...INVOICE_SETTINGS_DEFAULTS, ...(await readSettings("invoices")) };
}

export const saveInvoiceSettings = (settings) => writeSettings("invoices", settings);
