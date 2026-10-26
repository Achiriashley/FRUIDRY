import { siteOrigin } from "@/lib/seo";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-visitor pages that shouldn't appear in search results.
      // Cart and checkout aren't listed: they carry "noindex", which crawlers can only
      // see if they're allowed to fetch the page.
      disallow: ["/admin", "/fr/order/", "/en/order/", "/fr/invoice/", "/en/invoice/"],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
