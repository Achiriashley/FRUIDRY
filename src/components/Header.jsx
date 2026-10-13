import Link from "next/link";
import { getDictionary, localePath } from "@/lib/i18n";
import { CartLink } from "./CartLink";
import { LanguageSwitch } from "./LanguageSwitch";

export function Header({ lang, languageSwitch }) {
  const t = getDictionary(lang);
  const nav = [
    { href: localePath(lang, "/shop"), label: t.nav.shop },
    { href: localePath(lang, "/about"), label: t.nav.about },
    { href: localePath(lang, "/contact"), label: t.nav.contact },
  ];
  return (
    <header className="sticky top-0 z-20 print:hidden border-b border-stone-200 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={localePath(lang)}
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-brand"
        >
          <span aria-hidden>🍊</span> Fruidry
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hidden rounded-md px-2 py-1 text-sm font-medium text-stone-700 hover:text-brand sm:inline"
            >
              {item.label}
            </Link>
          ))}
          {languageSwitch && <LanguageSwitch />}
          <CartLink />
        </nav>
      </div>
      <nav className="flex justify-center gap-6 border-t border-stone-200 py-2 text-sm sm:hidden">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="font-medium text-stone-700">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
