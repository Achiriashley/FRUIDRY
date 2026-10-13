import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { CheckoutForm } from "./CheckoutForm";

export async function generateMetadata() {
  const t = getDictionary(await getLocale());
  return { title: t.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage() {
  const t = getDictionary(await getLocale());
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-extrabold tracking-tight">{t.checkout.title}</h1>
      <CheckoutForm />
    </div>
  );
}
