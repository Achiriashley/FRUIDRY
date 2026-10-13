"use client";

import { createContext, useContext } from "react";
import { getDictionary, localePath } from "@/lib/i18n";

const LocaleContext = createContext("en");

export function LocaleProvider({ lang, children }) {
  return <LocaleContext.Provider value={lang}>{children}</LocaleContext.Provider>;
}

// The current language, its texts, and a helper for links in that language.
export function useLocale() {
  const lang = useContext(LocaleContext);
  return { lang, t: getDictionary(lang), href: (path) => localePath(lang, path) };
}
