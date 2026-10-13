import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import {
  CONTACT,
  SOCIAL_LINKS,
  phoneLink,
  shopWhatsAppNumber,
  whatsAppLink,
} from "@/lib/shop-config";
import { ContactForm } from "./ContactForm";

export async function generateMetadata() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  return pageMetadata(lang, "/contact", {
    title: t.contact.title,
    description: t.contact.description,
  });
}

export default async function ContactPage() {
  const t = getDictionary(await getLocale());
  const whatsApp = shopWhatsAppNumber();
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">{t.contact.heading}</h1>
        <p className="mt-4 text-lg text-stone-600">{t.contact.intro}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {whatsApp && (
            <a
              href={whatsAppLink(whatsApp, t.contact.chatGreeting)}
              className="rounded-full btn-whatsapp px-5 py-2.5 font-semibold"
            >
              {t.contact.chatOnWhatsApp}
            </a>
          )}
          <a
            href={phoneLink(CONTACT.phone)}
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 font-semibold text-stone-800 hover:border-brand hover:text-brand"
          >
            📞 {CONTACT.phone}
          </a>
        </div>
        <p className="mt-6 text-stone-700">📍 {t.contact.location}</p>
        <h2 className="mt-8 font-semibold">{t.contact.followUs}</h2>
        <ul className="mt-2 space-y-1 text-stone-700">
          {SOCIAL_LINKS.map((s) => (
            <li key={s.name}>
              {s.name}
              {t.colon}{" "}
              {s.url ? (
                <a href={s.url} rel="noopener" className="font-medium text-brand hover:underline">
                  {s.handle}
                </a>
              ) : (
                <span className="font-medium">{s.handle}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <ContactForm />
    </div>
  );
}
