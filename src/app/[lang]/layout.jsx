import { SiteFrame } from "@/components/SiteFrame";
import { LOCALES, getDictionary } from "@/lib/i18n";
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
  return <SiteFrame lang={await getLocale()}>{children}</SiteFrame>;
}
