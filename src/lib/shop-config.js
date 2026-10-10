// Business settings for checkout. Edit these to match your shop.
export const shopConfig = {
  // Mobile Money payment. "{amount}" is replaced with the order total in FCFA.
  momo: {
    provider: "MTN Mobile Money",
    ussdTemplate: "*126*16*747434*{amount}#",
  },
};

export function ussdCode(amount) {
  return shopConfig.momo.ussdTemplate.replace("{amount}", String(amount));
}

// tel: links need "#" encoded, otherwise phones drop everything after it.
export function ussdHref(amount) {
  return `tel:${ussdCode(amount).replace(/#/g, "%23")}`;
}

// Accepts 6XXXXXXXX with an optional +237 / 237 prefix and spaces.
export function normalizeCameroonPhone(input) {
  const digits = String(input ?? "")
    .replace(/[\s.-]/g, "")
    .replace(/^\+?237/, "");
  return /^6\d{8}$/.test(digits) ? digits : null;
}
