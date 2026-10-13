import { lang as langParam } from "next/root-params";
import { hasLocale } from "./i18n";

// The language of the page being rendered (from /fr/... or /en/...).
// Admin pages have no language in their address and use English.
export async function getLocale() {
  const lang = await langParam();
  return hasLocale(lang) ? lang : "en";
}
