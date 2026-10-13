"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, hasLocale, otherLocale } from "@/lib/i18n";
import { useLocale } from "./LocaleProvider";

// Switches to the same page in the other language and remembers the choice.
// The link itself points at the other language's home page (search engines find
// each page's translation through its hreflang links instead).
export function LanguageSwitch() {
  const { lang, t } = useLocale();
  const router = useRouter();
  const target = otherLocale(lang);

  function handleClick(event) {
    document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const { pathname, search } = window.location;
    const [, first, ...rest] = pathname.split("/");
    const path = hasLocale(first) ? `/${[target, ...rest].join("/")}` : `/${target}`;
    router.push(path + search);
  }

  return (
    <Link
      href={`/${target}`}
      hrefLang={target}
      lang={target}
      onClick={handleClick}
      aria-label={t.language.switchLabel}
      className="rounded-md px-2 py-1 text-sm font-semibold text-stone-700 hover:text-brand"
    >
      {target.toUpperCase()}
    </Link>
  );
}
