import { notFound } from "next/navigation";
import { lang as langParam } from "next/root-params";
import { SiteFrame } from "@/components/SiteFrame";
import { LOCALES, getDictionary, hasLocale } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { siteOrigin } from "@/lib/seo";
import "../globals.css";

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata() {
  const t = getDictionary(await getLocale());
  return {
    metadataBase: new URL(siteOrigin()),
    title: { default: t.meta.siteTitle, template: "%s | Fruidry" },
    description: t.meta.siteDescription,
    applicationName: "Fruidry",
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }) {
  // Addresses that look like files (/index.html, /wp-login.php...) skip the language
  // redirect in src/proxy.js and would otherwise show the home page: they're not pages.
  if (!hasLocale(await langParam())) notFound();
  return <SiteFrame lang={await getLocale()}>{children}</SiteFrame>;
}
