import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_OPTIONS, ADMIN_ENDED_COOKIE } from "@/lib/admin-auth";
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, hasLocale } from "@/lib/i18n";

// The shop's own domain: SITE_URL, or else the custom domain added in Vercel.
function ownDomain() {
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const address = process.env.SITE_URL || (vercelDomain ? `https://${vercelDomain}` : "");
  try {
    return address ? new URL(address) : null;
  } catch {
    return null;
  }
}

// On the live site, visitors and search engines that arrive at the Vercel address
// (fruidry.vercel.app) are sent to the shop's own domain, so there's only one site to
// find. Preview deployments keep their own address.
function toOwnDomain(request) {
  if (process.env.VERCEL_ENV !== "production") return;
  if (request.method !== "GET" && request.method !== "HEAD") return;
  const host = request.headers.get("host") ?? "";
  const own = ownDomain();
  if (!host.endsWith(".vercel.app") || !own || own.host.endsWith(".vercel.app")) return;
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(new URL(pathname + search, own.origin), 308);
}

// Opening, reloading or coming back to an admin page asks for the password again:
// a full page load ends the admin session. Moving around inside the panel (menu links,
// buttons, the dashboard's auto-refresh) isn't a page load: Next.js fetches those in the
// background. Browsers mark page loads with Sec-Fetch-Dest: document (a header pages
// can't fake); older ones without it are told apart by asking for HTML.
function isPageLoad(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const dest = request.headers.get("sec-fetch-dest");
  if (dest) return dest === "document";
  return (request.headers.get("accept") ?? "").includes("text/html");
}

function adminPageLoad(request) {
  if (!isPageLoad(request) || !request.cookies.has(ADMIN_COOKIE)) return;
  // Not signed in for this page (it shows the sign-in form), nor afterwards.
  request.cookies.delete(ADMIN_COOKIE);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.delete(ADMIN_COOKIE);
  // Same as signing out (see endAdminSession).
  const now = String(Math.floor(Date.now() / 1000));
  response.cookies.set(ADMIN_ENDED_COOKIE, now, ADMIN_COOKIE_OPTIONS);
  return response;
}

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
  const moved = toOwnDomain(request);
  if (moved) return moved;
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (first === "admin") return adminPageLoad(request);
  if (hasLocale(first)) return;

  const url = request.nextUrl.clone();
  // "/FR/shop" (typed by hand, or auto-capitalised on a phone) -> "/fr/shop".
  if (hasLocale(first.toLowerCase())) {
    url.pathname = `/${first.toLowerCase()}${pathname.slice(first.length + 1)}`;
    return NextResponse.redirect(url, 308);
  }
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  const response = NextResponse.redirect(url);
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = {
  // The admin panel, and everything else except Next.js files, uploaded photos, files
  // in public/ (anything with a file extension), and search engine files.
  matcher: [
    "/admin",
    "/admin/:path*",
    "/((?!_next/|admin|uploads/|sitemap\\.xml|robots\\.txt|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
