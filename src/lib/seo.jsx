import { DEFAULT_LOCALE, LOCALES, getDictionary, localePath } from "./i18n";

// The site's public address, used for canonical links, the sitemap and link previews.
// Set SITE_URL once you have your own domain; on Vercel the production address is
// used automatically.
export function siteOrigin() {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url =
    process.env.SITE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}

// Links to the same page in every language, for search engines.
export function languageAlternates(path) {
  return {
    ...Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])),
    "x-default": localePath(DEFAULT_LOCALE, path),
  };
}

// Title, description, canonical address and link-preview details for a shop page.
// Pages with their own opengraph-image file pass ownOgImage; the others get the
// site's preview card (setting openGraph here would otherwise leave them without one).
export function pageMetadata(lang, path, { title, description, ownOgImage = false }) {
  const t = getDictionary(lang);
  return {
    // Left out when not given, so the home page keeps the site's default title.
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: localePath(lang, path), languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: "Fruidry",
      title: title ?? t.meta.siteTitle,
      description,
      url: localePath(lang, path),
      locale: t.meta.ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== lang).map((l) => getDictionary(l).meta.ogLocale),
      ...(ownOgImage
        ? {}
        : {
            images: [
              {
                url: `/${lang}/opengraph-image`,
                width: 1200,
                height: 630,
                type: "image/jpeg",
                alt: "Fruidry",
              },
            ],
          }),
    },
  };
}

// Renders structured data for search engines. "<" is escaped so text can't close the tag.
export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
