"use client";

import Link from "next/link";
import { useLocale } from "./LocaleProvider";

// A link to a product page in the current language.
export function ProductLink({ slug, ...props }) {
  const { href } = useLocale();
  return <Link href={href(`/shop/${slug}`)} {...props} />;
}
