import Link from "next/link";
import { getDictionary, localePath } from "@/lib/i18n";

export function Footer({ lang }) {
  const t = getDictionary(lang);
  return (
    <footer className="mt-auto print:hidden border-t border-stone-200 bg-stone-900 text-stone-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-white">🍊 Fruidry</p>
          <p className="mt-2 text-sm">{t.footer.tagline}</p>
        </div>
        <div>
          <p className="font-semibold text-white">{t.footer.explore}</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link href={localePath(lang, "/shop")} className="hover:text-white">
                {t.footer.shopAll}
              </Link>
            </li>
            <li>
              <Link href={localePath(lang, "/about")} className="hover:text-white">
                {t.nav.about}
              </Link>
            </li>
            <li>
              <Link href={localePath(lang, "/contact")} className="hover:text-white">
                {t.nav.contact}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">{t.footer.promise}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {t.footer.promises.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="border-t border-stone-800 py-4 text-center text-xs">
        © 2026 Fruidry. {t.footer.rights}
      </p>
    </footer>
  );
}
