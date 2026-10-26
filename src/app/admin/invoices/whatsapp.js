import { formatDay, frenchSpacing } from "@/lib/i18n";
import { amountDue, todayInCameroon } from "@/lib/invoice-math";
import { formatPrice } from "@/lib/products";
import { momoPayCode, whatsAppLink } from "@/lib/shop-config";

// WhatsApp messages about an invoice, in the invoice's language: sending it, and a
// reminder for an unpaid one (with the MoMo code for what's left to pay).

// A client's phone number as WhatsApp needs it (country code, digits only), or null:
// "677 12 34 56" and "+237 677 12 34 56" -> "237677123456"; other countries with "+".
export function invoiceWhatsAppNumber(phone) {
  const typed = String(phone ?? "").trim();
  const digits = typed.replace(/[^\d]/g, "");
  if (/^[26]\d{8}$/.test(digits)) return `237${digits}`;
  if (/^237[26]\d{8}$/.test(digits)) return digits;
  if (/^(\+|00)/.test(typed)) {
    const international = typed.startsWith("00") ? digits.slice(2) : digits;
    if (/^\d{8,15}$/.test(international)) return international;
  }
  return null;
}

export const invoiceLink = (invoice, siteUrl) =>
  `${siteUrl}/${invoice.lang === "en" ? "en" : "fr"}/invoice/${invoice.id}`;

// A WhatsApp link to the client (or, without a number, one where you choose the chat).
export const whatsAppToClient = (invoice, message) =>
  whatsAppLink(invoiceWhatsAppNumber(invoice.client.phone) ?? "", message);

const greeting = (invoice) => invoice.client.contact || invoice.client.name;

export function sendInvoiceMessage(invoice, siteUrl) {
  const link = invoiceLink(invoice, siteUrl);
  const total = formatPrice(invoice.totals.total);
  const date = formatDay(invoice.dueDate, invoice.lang);
  const proforma = invoice.kind === "proforma";
  if (invoice.lang === "en") {
    return proforma
      ? `Hello ${greeting(invoice)}, here is your Fruidry proforma invoice ${invoice.number} ` +
          `for ${total}, valid until ${date}: ${link}`
      : `Hello ${greeting(invoice)}, here is your Fruidry invoice ${invoice.number} for ` +
          `${total}, to pay by ${date}: ${link}\nThank you for your business!`;
  }
  // French puts a no-break space before ":" and "!" (frenchSpacing).
  return frenchSpacing(
    proforma
      ? `Bonjour ${greeting(invoice)}, voici votre facture proforma Fruidry ${invoice.number} ` +
          `d'un montant de ${total}, valable jusqu'au ${date} : ${link}`
      : `Bonjour ${greeting(invoice)}, voici votre facture Fruidry ${invoice.number} d'un ` +
          `montant de ${total}, à régler au plus tard le ${date} : ${link}\n` +
          "Merci pour votre confiance !",
  );
}

// The MoMo code is between ``` so WhatsApp shows its * as typed (not as bold).
export function reminderMessage(invoice, siteUrl) {
  const link = invoiceLink(invoice, siteUrl);
  const due = formatPrice(amountDue(invoice));
  const date = formatDay(invoice.dueDate, invoice.lang);
  const late = invoice.dueDate < todayInCameroon();
  const code = "```" + momoPayCode(amountDue(invoice)) + "```";
  const momo = invoice.business?.showMomo;
  if (invoice.lang === "en") {
    return [
      `Hello ${greeting(invoice)}, a reminder about Fruidry invoice ${invoice.number}: ` +
        `${due} is still to pay${late ? ` (it was due on ${date})` : `, by ${date}`}.`,
      `Your invoice: ${link}`,
      ...(momo ? ["", "Pay with MTN Mobile Money by dialling:", code] : []),
      "",
      "Thank you!",
    ].join("\n");
  }
  return frenchSpacing(
    [
      `Bonjour ${greeting(invoice)}, petit rappel au sujet de la facture Fruidry ` +
        `${invoice.number} : il reste ${due} à payer` +
        (late ? ` (échue depuis le ${date}).` : `, au plus tard le ${date}.`),
      `Votre facture : ${link}`,
      ...(momo ? ["", "Payez par MTN Mobile Money en composant :", code] : []),
      "",
      "Merci !",
    ].join("\n"),
  );
}
