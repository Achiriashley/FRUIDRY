import { siteOrigin } from "@/lib/seo";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-visitor pages that shouldn't appear in search results.
      disallow: ["/admin", "/fr/cart", "/en/cart", "/fr/checkout", "/en/checkout", "/fr/order/", "/en/order/"],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
