import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getProducts } from "@/lib/catalog";
import { localizeProduct } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Only used for order numbers and item codes, so it isn't preloaded.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

// The page shell shared by the shop (in each language) and the admin panel.
// Visitor statistics (Vercel Web Analytics) use no cookies and only run on Vercel.
const analyticsEnabled = Boolean(process.env.VERCEL);

export async function SiteFrame({ lang, languageSwitch = true, analytics = true, children }) {
  const products = (await getProducts()).map((p) => localizeProduct(p, lang));
  return (
    <html lang={lang} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <LocaleProvider lang={lang}>
          <CartProvider products={products}>
            <Header lang={lang} languageSwitch={languageSwitch} />
            <main className="flex-1">{children}</main>
            <Footer lang={lang} />
          </CartProvider>
        </LocaleProvider>
        {analytics && analyticsEnabled && <SiteAnalytics />}
      </body>
    </html>
  );
}
