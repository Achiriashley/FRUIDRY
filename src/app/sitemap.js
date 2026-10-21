import { getProducts } from "@/lib/catalog";
import { LOCALES, localePath } from "@/lib/i18n";
import { getProductImages } from "@/lib/product-images";
import { languageAlternates, siteOrigin } from "@/lib/seo";

// Every public page, in both languages, for search engines.
export default async function sitemap() {
  const origin = siteOrigin();
  const products = await getProducts();
  const paths = [
    "/",
    "/shop",
    "/about",
    "/guide",
    "/contact",
    "/privacy",
    ...products.map((p) => `/shop/${p.slug}`),
  ];
  const absolute = (path) => `${origin}${path}`;
  // Each product page's photo, for Google Images (uploaded photos are already full URLs).
  const files = getProductImages();
  const photos = Object.fromEntries(
    products
      .map((p) => [p.slug, p.image || files[p.slug]])
      .filter(([, src]) => src)
      .map(([slug, src]) => [`/shop/${slug}`, src.startsWith("http") ? src : absolute(src)]),
  );

  return paths.flatMap((path) =>
    LOCALES.map((lang) => ({
      url: absolute(localePath(lang, path)),
      changeFrequency: path.startsWith("/shop") ? "weekly" : "monthly",
      priority: path === "/" ? 1 : path.startsWith("/shop") ? 0.8 : 0.5,
      ...(photos[path] ? { images: [photos[path]] } : {}),
      alternates: {
        languages: Object.fromEntries(
          Object.entries(languageAlternates(path)).map(([key, value]) => [key, absolute(value)]),
        ),
      },
    })),
  );
}
