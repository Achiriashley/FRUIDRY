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

// Delivery and returns, given to Google with each product on sale (product page).
// - Delivery: 2 to 5 days after payment, anywhere in Cameroon. The fee depends on what
//   the rider charges for the address, so no fee is given.
// - Returns: packs aren't taken back. A damaged or wrong pack is replaced, which
//   Google's format can't say ("returns accepted" or "no returns" only).
export const DELIVERY_DAYS = { min: 2, max: 5 };

// Longest first name and review text accepted from the review form.
export const REVIEW_LIMITS = { name: 40, comment: 1000 };

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

// A number as people write it: "671820032" -> "671 82 00 32",
// "237671820032" -> "+237 671 82 00 32". Other numbers are left as they are.
export function formatPhone(digits) {
  const text = String(digits ?? "");
  const group = (local) => local.replace(/^(\d{3})(\d{2})(\d{2})(\d{2})$/, "$1 $2 $3 $4");
  if (/^6\d{8}$/.test(text)) return group(text);
  if (/^2376\d{8}$/.test(text)) return `+237 ${group(text.slice(3))}`;
  return text;
}
