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

// MTN Mobile Money "MoMo Pay" merchant code. Customers pay by dialling the code below
// with the amount; the admin panel puts it in the payment request it sends on WhatsApp.
export const MOMO_MERCHANT_CODE = "747434";

export function momoPayCode(amount) {
  return `*126*16*${MOMO_MERCHANT_CODE}*${Math.round(amount)}#`;
}

// Contact details shown on the site (from the packaging). Change them here.
export const CONTACT = {
  phone: "+237 671 820 032",
  instagram: "fruidry.cm",
  facebook: "Fruidry Cmr",
  tiktok: "fruidry",
};

export const SOCIAL_LINKS = [
  {
    name: "Instagram",
    handle: `@${CONTACT.instagram}`,
    url: `https://www.instagram.com/${CONTACT.instagram}`,
  },
  {
    name: "TikTok",
    handle: `@${CONTACT.tiktok}`,
    url: `https://www.tiktok.com/@${CONTACT.tiktok}`,
  },
  // No link yet: add the page's address as url once you have it.
  { name: "Facebook", handle: CONTACT.facebook, url: null },
];

// "+237 671 820 032" -> "tel:+237671820032"
export function phoneLink(phone) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
