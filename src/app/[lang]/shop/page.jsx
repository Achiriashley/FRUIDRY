import Link from "next/link";
import { ComingSoon } from "@/components/ComingSoon";
import { ShopGrid } from "@/components/ShopGrid";
import { getProducts } from "@/lib/catalog";
import { getDictionary, localePath, localizeProduct } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getProductImages } from "@/lib/product-images";
import { pageMetadata } from "@/lib/seo";
import { DELIVERY_DAYS } from "@/lib/shop-config";

export async function generateMetadata() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  return pageMetadata(lang, "/shop", {
    title: t.shop.metaTitle,
    description: t.shop.description,
  });
}

export default async function ShopPage() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  const products = (await getProducts()).map((p) => localizeProduct(p, lang));
  const images = getProductImages();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl font-extrabold tracking-tight">{t.shop.title}</h1>
      <p className="mt-2 mb-8 max-w-3xl text-stone-600">{t.shop.intro(DELIVERY_DAYS)}</p>
      <h2 className="sr-only">{t.home.ourRange}</h2>
      <ShopGrid products={products.filter((p) => !p.comingSoon)} images={images} />
      <div className="mt-16">
        <ComingSoon products={products.filter((p) => p.comingSoon)} images={images} t={t} />
      </div>
      <Link
        href={localePath(lang, "/guide")}
        className="mt-10 inline-block text-sm font-semibold text-brand hover:underline"
      >
        {t.guide.linkLabel} →
      </Link>
    </div>
  );
}
