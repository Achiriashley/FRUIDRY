import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
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
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">{t.contact.heading}</h1>
        <p className="mt-4 text-lg text-stone-600">{t.contact.intro}</p>
        <ul className="mt-8 space-y-3 text-stone-700">
          <li>📧 hello@fruidry.example</li>
          <li>🕘 {t.contact.hours}</li>
        </ul>
      </div>
      <ContactForm />
    </div>
  );
}
