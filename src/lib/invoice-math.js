// Invoices and proformas: amounts, status and labels. Plain functions with no server
// code, so the invoice form can show its totals while you type.

export const INVOICE_KINDS = { invoice: "Invoice", proforma: "Proforma" };

// Cameroon's VAT (TVA) rate, used only when it's switched on in the invoice settings.
export const VAT_RATE = 0.1925;

export const INVOICE_PAYMENT_METHODS = {
  momo: "MTN MoMo",
  cash: "Cash",
  bank: "Bank transfer",
  other: "Other",
};

export const INVOICE_STATUS_LABELS = {
  unpaid: "Unpaid",
  part_paid: "Part paid",
  overdue: "Overdue",
  paid: "Paid",
  cancelled: "Cancelled",
  open: "Open",
  invoiced: "Invoiced",
  expired: "Expired",
};

// Whole FCFA amounts from the lines, the discount and the VAT rate.
export function invoiceTotals({ items, discount = 0, vatRate = 0 }) {
  const subtotal = items.reduce((total, item) => total + item.quantity * item.price, 0);
  const off = Math.min(Math.max(0, discount), subtotal);
  const taxable = subtotal - off;
  const vat = Math.round(taxable * vatRate);
  return { subtotal, discount: off, taxable, vat, total: taxable + vat };
}

export const paidAmount = (invoice) =>
  (invoice.payments ?? []).reduce((total, payment) => total + payment.amount, 0);

export const amountDue = (invoice) => Math.max(0, invoice.totals.total - paidAmount(invoice));

export const isFullyPaid = (invoice) =>
  invoice.kind === "invoice" && !invoice.cancelled && paidAmount(invoice) >= invoice.totals.total;

// Invoices: unpaid, part_paid, overdue, paid or cancelled. Proformas: open, invoiced
// (turned into an invoice), expired or cancelled. `today` is "YYYY-MM-DD".
export function invoiceStatus(invoice, today = todayInCameroon()) {
  if (invoice.cancelled) return "cancelled";
  if (invoice.kind === "proforma") {
    if (invoice.convertedTo) return "invoiced";
    return invoice.dueDate < today ? "expired" : "open";
  }
  const paid = paidAmount(invoice);
  if (paid >= invoice.totals.total) return "paid";
  if (invoice.dueDate < today) return "overdue";
  return paid > 0 ? "part_paid" : "unpaid";
}

// Invoices and proformas whose content can still change: nothing paid, not cancelled,
// and (for a proforma) not turned into an invoice yet.
export const canEditInvoice = (invoice) =>
  !invoice.cancelled && !invoice.convertedTo && (invoice.payments ?? []).length === 0;

// ---------- Dates ----------

// "2026-10-26": today in Cameroon.
export function todayInCameroon(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// "2026-10-26" + 15 days -> "2026-11-10".
export function addDays(date, days) {
  const time = Date.parse(`${date}T00:00:00Z`) + days * 86_400_000;
  return new Date(time).toISOString().slice(0, 10);
}

// A real calendar day written YYYY-MM-DD (so not 2026-02-30).
export function isDay(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(text ?? ""))) return false;
  const time = Date.parse(`${text}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === text;
}

// ---------- Amount in words ("Arrêtée la présente facture à la somme de …") ----------

const UNITS_FR = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
];
const TENS_FR = { 2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante" };

function below100Fr(n) {
  if (n < 17) return UNITS_FR[n];
  if (n < 20) return `dix-${UNITS_FR[n - 10]}`;
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  if (tens < 7)
    return TENS_FR[tens] + (unit === 0 ? "" : unit === 1 ? " et un" : `-${UNITS_FR[unit]}`);
  if (tens === 7) return unit === 1 ? "soixante et onze" : `soixante-${below100Fr(n - 60)}`;
  return n === 80 ? "quatre-vingts" : `quatre-vingt-${below100Fr(n - 80)}`;
}

// `ending`: false before "mille", where "cents" and "quatre-vingts" lose their s.
function below1000Fr(n, ending = true) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const words = [];
  if (hundreds > 0) {
    words.push(
      (hundreds > 1 ? `${UNITS_FR[hundreds]} ` : "") +
        (hundreds > 1 && rest === 0 && ending ? "cents" : "cent"),
    );
  }
  if (rest > 0) words.push(rest === 80 && !ending ? "quatre-vingt" : below100Fr(rest));
  return words.join(" ");
}

export function numberInWordsFr(amount) {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return "zéro";
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const thousands = Math.floor((n % 1e6) / 1000);
  const rest = n % 1000;
  const words = [];
  if (billions) words.push(`${below1000Fr(billions)} milliard${billions > 1 ? "s" : ""}`);
  if (millions) words.push(`${below1000Fr(millions)} million${millions > 1 ? "s" : ""}`);
  if (thousands) words.push(thousands === 1 ? "mille" : `${below1000Fr(thousands, false)} mille`);
  if (rest) words.push(below1000Fr(rest));
  return words.join(" ");
}

const ONES_EN = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS_EN = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

function below100En(n) {
  if (n < 20) return ONES_EN[n];
  const unit = n % 10;
  return TENS_EN[Math.floor(n / 10)] + (unit ? `-${ONES_EN[unit]}` : "");
}

function below1000En(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundreds) return below100En(rest);
  return `${ONES_EN[hundreds]} hundred${rest ? ` and ${below100En(rest)}` : ""}`;
}

export function numberInWordsEn(amount) {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return "zero";
  const groups = [
    [Math.floor(n / 1e9), "billion"],
    [Math.floor((n % 1e9) / 1e6), "million"],
    [Math.floor((n % 1e6) / 1000), "thousand"],
  ];
  const words = groups
    .filter(([value]) => value)
    .map(([value, name]) => `${below1000En(value)} ${name}`);
  const rest = n % 1000;
  // "two thousand and fifty", as written in British English.
  if (rest) words.push(`${words.length && rest < 100 ? "and " : ""}${below1000En(rest)}`);
  return words.join(" ");
}

export const numberInWords = (amount, lang) =>
  lang === "fr" ? numberInWordsFr(amount) : numberInWordsEn(amount);
