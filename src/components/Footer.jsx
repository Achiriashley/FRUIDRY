import Image from "next/image";
import Link from "next/link";
import { getDictionary, localePath } from "@/lib/i18n";
import { CONTACT, SOCIAL_LINKS, phoneLink } from "@/lib/shop-config";

export function Footer({ lang }) {
  const t = getDictionary(lang);
  return (
    <footer className="mt-auto print:hidden bg-brand-deep text-stone-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <Image
            src="/brand/logo-lockup-cream.png"
            alt="Fruidry"
            width={1107}
            height={360}
            sizes="148px"
            className="h-12 w-auto"
          />
          <p className="mt-2 text-sm">{t.footer.tagline}</p>
          <ul className="mt-4 space-y-1 text-sm">
            <li>
              <a href={phoneLink(CONTACT.phone)} className="hover:text-white">
                {CONTACT.phone}
              </a>
            </li>
            {SOCIAL_LINKS.filter((s) => s.url).map((s) => (
              <li key={s.name}>
                <a href={s.url} rel="noopener" className="hover:text-white">
                  {s.name} {s.handle}
                </a>
              </li>
            ))}
          </ul>
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
      <p className="border-t border-white/10 py-4 text-center text-xs">
        © 2026 Fruidry. {t.footer.rights} ·{" "}
        <Link href={localePath(lang, "/privacy")} className="underline hover:text-white">
          {t.footer.privacy}
        </Link>
      </p>
    </footer>
  );
}
