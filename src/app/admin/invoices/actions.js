"use server";

import { randomBytes } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { touchAdminSession } from "@/lib/admin-auth";
import { PRODUCTS_TAG, getProducts, returnStock, subtractStock } from "@/lib/catalog";
import { addClient, deleteClient, getClient, updateClient } from "@/lib/clients";
import {
  INVOICE_PAYMENT_METHODS,
  VAT_RATE,
  addDays,
  amountDue,
  canEditInvoice,
  invoiceTotals,
  isDay,
  isFullyPaid,
  todayInCameroon,
} from "@/lib/invoice-math";
import {
  INVOICE_SETTINGS_DEFAULTS,
  createInvoice,
  getInvoice,
  getInvoiceSettings,
  saveInvoice,
  saveInvoiceSettings,
} from "@/lib/invoices";
import { getOrder, isPaid } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { tableMissing } from "@/lib/storage";
import { invoiceWhatsAppNumber } from "./whatsapp";

const SIGN_IN_AGAIN = { status: "error", errors: { form: "Please sign in again." } };
const SETUP_NEEDED =
  "Your database doesn't have the invoice tables yet: run supabase/schema.sql in Supabase's SQL Editor, then try again.";
const MAX_LINES = 50;
const MAX_AMOUNT = 1_000_000_000; // FCFA
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A whole number from a form field: null when empty, undefined when it isn't a whole
// number between min and max.
function wholeNumber(raw, min, max) {
  const text = String(raw ?? "")
    .replace(/[\s  ]/g, "")
    .trim();
  if (text === "") return null;
  const value = Number(text);
  return Number.isInteger(value) && value >= min && value <= max ? value : undefined;
}

// A text field, trimmed, with an error if it's longer than `max` (or empty when required).
function text(formData, name, max, errors, { required = "", label = "this" } = {}) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value && required) errors[name] = required;
  else if (value.length > max) errors[name] = `Keep ${label} under ${max} characters.`;
  return value;
}

// ---------- Clients ----------

// The client's details from a form (the invoice form and the Clients page use the
// same field names).
function clientDetails(formData, errors) {
  const client = {
    name: text(formData, "name", 120, errors, {
      required: "Enter the client's name (business or person).",
      label: "the name",
    }),
    contact: text(formData, "contact", 100, errors, { label: "the contact name" }),
    phone: text(formData, "phone", 30, errors, { label: "the phone number" }),
    email: text(formData, "email", 120, errors, { label: "the email" }),
    address: text(formData, "address", 300, errors, { label: "the address" }),
    niu: text(formData, "niu", 30, errors, { label: "the NIU" }),
  };
  if (client.phone && !errors.phone && !invoiceWhatsAppNumber(client.phone)) {
    errors.phone = "Enter a phone number, e.g. 6XX XX XX XX or +237 6XX XX XX XX.";
  }
  if (client.email && !errors.email && !EMAIL.test(client.email)) {
    errors.email = "Enter an email address like name@example.com, or leave it empty.";
  }
  return client;
}

export async function saveClientAction(_prev, formData) {
  if (!(await touchAdminSession())) return SIGN_IN_AGAIN;
  const errors = {};
  const details = clientDetails(formData, errors);
  const note = text(formData, "note", 500, errors, { label: "the note" });
  if (Object.keys(errors).length > 0) return { status: "error", errors };
  const id = String(formData.get("id") ?? "");
  if (id) {
    const existing = await getClient(id);
    if (!existing) return { status: "error", errors: { form: "This client no longer exists." } };
    await updateClient({ ...existing, ...details, note });
  } else {
    await addClient({ ...details, note });
  }
  refresh();
  return { status: "success", message: `${details.name} saved.` };
}

export async function deleteClientAction(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  await deleteClient(String(formData.get("id") ?? ""));
  refresh();
}

// ---------- Invoices ----------

// The invoice's lines from the form (sent as JSON by the invoice form). Product lines
// take the item code from the catalogue; prices and descriptions are as typed.
function parseLines(raw, products, errors) {
  let lines;
  try {
    lines = JSON.parse(String(raw ?? "[]"));
  } catch {
    lines = null;
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    errors.items = "Add at least one line.";
    return [];
  }
  if (lines.length > MAX_LINES) {
    errors.items = `An invoice can have up to ${MAX_LINES} lines.`;
    return [];
  }
  const items = [];
  for (const [index, line] of lines.entries()) {
    const at = `Line ${index + 1}: `;
    const slug = typeof line?.slug === "string" && line.slug ? line.slug : null;
    const product = slug && products.find((p) => p.slug === slug);
    const description = String(line?.description ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const quantity = wholeNumber(line?.quantity, 1, 1_000_000);
    const price = wholeNumber(line?.price, 0, MAX_AMOUNT);
    if (slug && !product) errors.items = `${at}this product no longer exists. Choose another one.`;
    else if (!description) errors.items = `${at}write what it is.`;
    else if (description.length > 200) errors.items = `${at}keep it under 200 characters.`;
    else if (!quantity) errors.items = `${at}enter a whole number of 1 or more for the quantity.`;
    else if (price === null || price === undefined) errors.items = `${at}enter the price in FCFA.`;
    if (errors.items) return [];
    items.push({ slug, sku: product?.sku ?? null, description, quantity, price });
  }
  return items;
}

// What the invoice shows of the shop, copied from the settings when it's made.
const businessSnapshot = (s) => ({
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

// Creates (no id) or updates an invoice or proforma from the invoice form.
export async function saveInvoiceAction(_prev, formData) {
  if (!(await touchAdminSession())) return SIGN_IN_AGAIN;
  const errors = {};
  const id = String(formData.get("id") ?? "");
  const existing = id ? await getInvoice(id) : null;
  if (id && !existing)
    return { status: "error", errors: { form: "This invoice no longer exists." } };
  if (existing && !canEditInvoice(existing)) {
    return {
      status: "error",
      errors: { form: "This invoice can't be changed any more (it has payments or was closed)." },
    };
  }
  const kind = existing?.kind ?? (formData.get("kind") === "proforma" ? "proforma" : "invoice");
  const lang = formData.get("lang") === "en" ? "en" : "fr";

  const client = clientDetails(formData, errors);
  const savedClient = await getClient(String(formData.get("clientId") ?? ""));
  const products = await getProducts();
  const items = parseLines(formData.get("items"), products, errors);

  const issueDate = String(formData.get("issueDate") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  if (!isDay(issueDate) || issueDate < "2020-01-01") errors.issueDate = "Choose the date.";
  if (!isDay(dueDate)) errors.dueDate = "Choose the date.";
  else if (!errors.issueDate && dueDate < issueDate) {
    errors.dueDate = "This date can't be before the invoice date.";
  }

  const vatRate = existing ? existing.vatRate : (await getInvoiceSettings()).vat ? VAT_RATE : 0;
  const subtotal = invoiceTotals({ items }).subtotal;
  const typedDiscount = wholeNumber(formData.get("discount"), 0, MAX_AMOUNT);
  const discount = typedDiscount === null ? 0 : typedDiscount;
  if (discount === undefined || discount > subtotal) {
    errors.discount = `Enter a discount between 0 and ${formatPrice(subtotal)}, or leave it empty.`;
  }
  const notes = text(formData, "notes", 1000, errors, { label: "the notes" });
  const totals = invoiceTotals({ items, discount: discount || 0, vatRate });
  if (!errors.items && totals.total <= 0) errors.items = "The total must be more than 0 FCFA.";

  const order = existing ? null : await getOrder(String(formData.get("orderId") ?? ""));
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  // A new client is added to the list when asked; a chosen one keeps its details
  // up to date with what was typed.
  let clientId = savedClient?.id ?? null;
  if (savedClient) {
    const changed = Object.keys(client).some((key) => client[key] !== (savedClient[key] ?? ""));
    if (changed) await updateClient({ ...savedClient, ...client });
  } else if (formData.get("saveClient") === "on") {
    clientId = (await addClient({ ...client, note: "" })).id;
  }

  const content = {
    lang,
    issueDate,
    dueDate,
    client: { id: clientId, ...client },
    items,
    discount,
    vatRate,
    totals,
    notes,
    business: businessSnapshot(await getInvoiceSettings()),
  };

  let saved;
  if (existing) {
    saved = await saveInvoice({ ...existing, ...content });
  } else {
    saved = await createInvoice({
      kind,
      ...content,
      // Made from a website order: it's already counted in Books and the stock, and
      // a paid order arrives already paid.
      ...(order
        ? {
            orderId: order.id,
            orderReference: order.reference,
            payments:
              kind === "invoice" && isPaid(order) && order.receipt
                ? [
                    {
                      id: randomBytes(6).toString("base64url"),
                      date: todayInCameroon(new Date(order.receipt.confirmedAt)),
                      amount: Math.min(order.total, totals.total),
                      method: "momo",
                      note: `Website order ${order.reference}`,
                    },
                  ]
                : [],
          }
        : {}),
    });
  }
  redirect(`/admin/invoices/${saved.id}`);
}

// ---------- Payments, Books and stock ----------

const productLines = (invoice) =>
  invoice.items
    .filter((item) => item.slug)
    .map((item) => ({ slug: item.slug, quantity: item.quantity }));

// Runs a stock change (subtractStock or returnStock). Returns the packs that really
// moved, { slug: +added or -taken off }, or null if it failed (logged).
async function moveStock(change) {
  try {
    const counts = await change();
    if (Object.keys(counts).length > 0) updateTag(PRODUCTS_TAG);
    return Object.fromEntries(
      Object.entries(counts).map(([slug, { before, after }]) => [slug, after - before]),
    );
  } catch (error) {
    console.error("The stock count couldn't be updated for an invoice", error);
    return null;
  }
}

const negate = (packs) => Object.fromEntries(Object.entries(packs).map(([s, n]) => [s, -n]));
const asItems = (packs) => Object.entries(packs).map(([slug, quantity]) => ({ slug, quantity }));

// Saves an invoice whose payments changed. Once fully paid it counts as a sale in Books
// (on the day of its last payment) and its packs come off the stock count; when it
// stops being fully paid (a payment deleted), the packs go back. Invoices made from a
// website order are already counted through the order, so they change neither.
async function saveWithBooks(invoice) {
  const counts = invoice.kind === "invoice" && !invoice.orderId;
  const paidNow = counts && isFullyPaid(invoice);
  if (paidNow && !invoice.paidAt) {
    const paidAt = invoice.payments
      .map((p) => p.date)
      .sort()
      .at(-1);
    const moved = await moveStock(() => subtractStock(productLines(invoice)));
    // null when the stock change failed: deleting a payment then leaves the count alone.
    const stockTaken = moved && negate(moved);
    try {
      return await saveInvoice({ ...invoice, paidAt, stockTaken });
    } catch (error) {
      if (stockTaken) await moveStock(() => returnStock(stockTaken));
      throw error;
    }
  }
  if (!paidNow && invoice.paidAt) {
    const { paidAt, stockTaken, ...rest } = invoice;
    const returned = stockTaken ? await moveStock(() => returnStock(stockTaken)) : {};
    if (!returned) throw new Error("The packs couldn't be put back in stock. Please try again.");
    try {
      return await saveInvoice(rest);
    } catch (error) {
      if (Object.keys(returned).length > 0) {
        await moveStock(() => subtractStock(asItems(returned)));
      }
      throw error;
    }
  }
  return saveInvoice(invoice);
}

export async function recordPaymentAction(_prev, formData) {
  if (!(await touchAdminSession())) return SIGN_IN_AGAIN;
  const invoice = await getInvoice(String(formData.get("id") ?? ""));
  if (!invoice || invoice.kind !== "invoice") {
    return { status: "error", errors: { form: "This invoice no longer exists." } };
  }
  if (invoice.cancelled) {
    return { status: "error", errors: { form: "This invoice is cancelled." } };
  }
  const errors = {};
  const due = amountDue(invoice);
  const amount = wholeNumber(formData.get("amount"), 1, due);
  if (due === 0) errors.amount = "This invoice is already paid in full.";
  else if (!amount) errors.amount = `Enter an amount between 1 and ${formatPrice(due)}.`;
  const date = String(formData.get("date") ?? "");
  if (!isDay(date) || date < "2020-01-01") errors.date = "Choose the date.";
  else if (date > todayInCameroon()) errors.date = "This date is in the future.";
  const method = String(formData.get("method") ?? "");
  if (!Object.hasOwn(INVOICE_PAYMENT_METHODS, method)) errors.method = "Choose how they paid.";
  const note = text(formData, "note", 200, errors, { label: "the note" });
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const payment = { id: randomBytes(6).toString("base64url"), date, amount, method, note };
  const saved = await saveWithBooks({ ...invoice, payments: [...invoice.payments, payment] });
  refresh();
  return {
    status: "success",
    message: isFullyPaid(saved)
      ? `${formatPrice(amount)} recorded: ${saved.number} is paid in full.`
      : `${formatPrice(amount)} recorded. Still to pay: ${formatPrice(amountDue(saved))}.`,
  };
}

export async function deletePaymentAction(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  const invoice = await getInvoice(String(formData.get("id") ?? ""));
  const paymentId = String(formData.get("paymentId") ?? "");
  if (invoice?.payments.some((p) => p.id === paymentId)) {
    await saveWithBooks({
      ...invoice,
      payments: invoice.payments.filter((p) => p.id !== paymentId),
    });
  }
  refresh();
}

// ---------- Cancel, reopen, turn a proforma into an invoice ----------

export async function cancelInvoiceAction(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  const invoice = await getInvoice(String(formData.get("id") ?? ""));
  // An invoice with payments isn't cancelled: delete its payments first.
  if (invoice && !invoice.cancelled && !invoice.convertedTo && invoice.payments.length === 0) {
    const reason = String(formData.get("reason") ?? "")
      .trim()
      .slice(0, 300);
    await saveInvoice({ ...invoice, cancelled: { at: new Date().toISOString(), reason } });
  }
  refresh();
}

export async function reopenInvoiceAction(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  const invoice = await getInvoice(String(formData.get("id") ?? ""));
  if (invoice?.cancelled) {
    const { cancelled, ...rest } = invoice;
    await saveInvoice(rest);
  }
  refresh();
}

export async function convertProformaAction(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  const proforma = await getInvoice(String(formData.get("id") ?? ""));
  if (!proforma || proforma.kind !== "proforma" || proforma.cancelled) redirect("/admin/invoices");
  if (proforma.convertedTo) redirect(`/admin/invoices/${proforma.convertedTo.id}`);
  const settings = await getInvoiceSettings();
  const issueDate = todayInCameroon();
  const invoice = await createInvoice({
    kind: "invoice",
    lang: proforma.lang,
    issueDate,
    dueDate: addDays(issueDate, settings.dueDays),
    client: proforma.client,
    items: proforma.items,
    discount: proforma.discount,
    vatRate: proforma.vatRate,
    totals: proforma.totals,
    notes: proforma.notes,
    business: businessSnapshot(settings),
    fromProforma: { id: proforma.id, number: proforma.number },
  });
  await saveInvoice({ ...proforma, convertedTo: { id: invoice.id, number: invoice.number } });
  redirect(`/admin/invoices/${invoice.id}`);
}

// ---------- Settings ----------

export async function saveInvoiceSettingsAction(_prev, formData) {
  if (!(await touchAdminSession())) return SIGN_IN_AGAIN;
  const errors = {};
  const settings = {
    businessName: text(formData, "businessName", 120, errors, {
      required: "Enter the name shown on invoices.",
      label: "the name",
    }),
    address: text(formData, "address", 300, errors, { label: "the address" }),
    phone: text(formData, "phone", 40, errors, { label: "the phone number" }),
    email: text(formData, "email", 120, errors, { label: "the email" }),
    niu: text(formData, "niu", 30, errors, { label: "the NIU" }),
    rccm: text(formData, "rccm", 40, errors, { label: "the RCCM number" }),
    showMomo: formData.get("showMomo") === "on",
    paymentInfo: text(formData, "paymentInfo", 500, errors, { label: "the payment details" }),
    dueDays: wholeNumber(formData.get("dueDays"), 0, 365),
    proformaDays: wholeNumber(formData.get("proformaDays"), 1, 365),
    vat: formData.get("vat") === "on",
    footer: text(formData, "footer", 300, errors, { label: "the footer" }),
  };
  if (settings.email && !errors.email && !EMAIL.test(settings.email)) {
    errors.email = "Enter an email address like name@example.com, or leave it empty.";
  }
  if (settings.dueDays === null || settings.dueDays === undefined) {
    errors.dueDays = "Enter a number of days from 0 to 365.";
  }
  if (!settings.proformaDays) errors.proformaDays = "Enter a number of days from 1 to 365.";
  if (Object.keys(errors).length > 0) return { status: "error", errors };
  try {
    await saveInvoiceSettings({ ...INVOICE_SETTINGS_DEFAULTS, ...settings });
  } catch (error) {
    if (!tableMissing(error)) throw error;
    return { status: "error", errors: { form: SETUP_NEEDED } };
  }
  refresh();
  return { status: "success", message: "Settings saved. New invoices will use them." };
}
