import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getProductImages } from "@/lib/product-images";
import { CartView } from "./CartView";

export async function generateMetadata() {
  const t = getDictionary(await getLocale());
  return { title: t.cart.title, robots: { index: false } };
}

export default async function CartPage() {
  const t = getDictionary(await getLocale());
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-extrabold tracking-tight">{t.cart.title}</h1>
      <CartView images={getProductImages()} />
    </div>
  );
}
