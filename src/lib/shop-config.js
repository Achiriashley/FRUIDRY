// Business settings for checkout.

// Your WhatsApp number in international format, e.g. 2376XXXXXXXX (237 is
// Cameroon). Set WHATSAPP_NUMBER in .env.local and in your host's settings.
export function shopWhatsAppNumber() {
  return normalizeWhatsAppNumber(process.env.WHATSAPP_NUMBER);
}

// Accepts +237 6XX XX XX XX, 2376XXXXXXXX or a local 6XXXXXXXX number.
export function normalizeWhatsAppNumber(input) {
  const digits = String(input ?? "").replace(/[^\d]/g, "");
  if (/^6\d{8}$/.test(digits)) return `237${digits}`;
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

// Accepts 6XXXXXXXX with an optional +237 / 237 prefix and spaces.
export function normalizeCameroonPhone(input) {
  const digits = String(input ?? "")
    .replace(/[\s.-]/g, "")
    .replace(/^\+?237/, "");
  return /^6\d{8}$/.test(digits) ? digits : null;
}

export function whatsAppLink(number, text) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
