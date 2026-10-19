import Link from "next/link";
import { getDictionary, localePath } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  return pageMetadata(lang, "/about", {
    title: t.about.metaTitle,
    description: t.about.description,
  });
}

export default async function AboutPage() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-extrabold tracking-tight">{t.about.title}</h1>
      <div className="mt-6 space-y-4 text-lg text-stone-700">
        {t.about.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>

      <h2 className="mt-14 text-2xl font-bold">{t.about.howWeMakeIt}</h2>
      <ol className="mt-6 grid gap-6 sm:grid-cols-2">
        {t.about.steps.map((s) => (
          <li key={s.n} className="rounded-2xl bg-white p-6 shadow-sm">
            <span className="text-sm font-bold text-brand">{s.n}</span>
            <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
            <p className="mt-1 text-stone-600">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-14 rounded-2xl bg-gradient-to-br from-sun-light to-brand-light p-8 text-center">
        <h2 className="text-2xl font-bold">{t.about.tasteTheDifference}</h2>
        <Link
          href={localePath(lang, "/shop")}
          className="mt-4 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          {t.about.shopTheRange}
        </Link>
      </div>
    </div>
  );
}
