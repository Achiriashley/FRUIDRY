import Image from "next/image";
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
        <Link href={localePath(lang)} className="shrink-0">
          <Image
            src="/brand/logo-lockup.png"
            alt="Fruidry"
            width={1107}
            height={360}
            preload
            sizes="(min-width: 640px) 136px, 123px"
            className="h-8 w-auto min-[360px]:h-10 sm:h-11"
          />
        </Link>
        <div className="flex items-center gap-1 sm:gap-4">
          <nav aria-label={t.nav.label} className="hidden items-center gap-4 sm:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2 py-1 text-sm font-medium text-stone-700 hover:text-brand"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {languageSwitch && <LanguageSwitch />}
          <CartLink />
        </div>
      </div>
      <nav
        aria-label={t.nav.label}
        className="flex justify-center gap-6 border-t border-stone-200 py-2 text-sm sm:hidden"
      >
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="font-medium text-stone-700">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
