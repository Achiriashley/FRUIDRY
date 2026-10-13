import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, hasLocale } from "@/lib/i18n";

// The language a visitor should see: their earlier choice, then their browser's
// preferred language, then French.
function preferredLocale(request) {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (hasLocale(saved)) return saved;
  const accepted = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.slice(0, 2).toLowerCase(), q: q === undefined ? 1 : Number(q) };
    })
    .filter((entry) => LOCALES.includes(entry.lang) && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  return accepted[0]?.lang ?? DEFAULT_LOCALE;
}

// Shop pages live under /fr and /en. Addresses without a language (including links
// shared before the site was bilingual, like /shop or /order/...) are sent to the
// visitor's language.
export function proxy(request) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (hasLocale(first)) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  const response = NextResponse.redirect(url);
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = {
  // Everything except Next.js files, the admin panel, uploaded photos, files in
  // public/ (anything with a file extension), and search engine files.
  matcher: ["/((?!_next/|admin|uploads/|sitemap\\.xml|robots\\.txt|.*\\.[a-zA-Z0-9]+$).*)"],
};
