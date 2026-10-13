import Link from "next/link";
import { getDictionary, localePath } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export default async function NotFound() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl" aria-hidden>
        🍂
      </p>
      <h1 className="mt-4 text-3xl font-bold">{t.notFound.title}</h1>
      <p className="mt-2 text-stone-600">{t.notFound.text}</p>
      <Link
        href={localePath(lang, "/shop")}
        className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
      >
        {t.notFound.goToShop}
      </Link>
    </div>
  );
}
