import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { CONTACT, phoneLink } from "@/lib/shop-config";

export async function generateMetadata() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  return pageMetadata(lang, "/privacy", {
    title: t.privacy.title,
    description: t.privacy.description,
  });
}

// Each section shows its intro, then its list, then its paragraphs.
// "{phone}" in the texts becomes a tap-to-call link.
function WithPhone({ text }) {
  const [before, after] = text.split("{phone}");
  if (after === undefined) return text;
  return (
    <>
      {before}
      <a href={phoneLink(CONTACT.phone)} className="whitespace-nowrap text-brand underline">
        {CONTACT.phone}
      </a>
      {after}
    </>
  );
}

export default async function PrivacyPage() {
  const t = getDictionary(await getLocale());
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-extrabold tracking-tight">{t.privacy.title}</h1>
      <p className="mt-2 text-sm text-stone-500">{t.privacy.updated}</p>
      <div className="mt-8 space-y-8">
        {t.privacy.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold text-brand-deep">{section.heading}</h2>
            {section.intro && <p className="mt-2 text-stone-700">{section.intro}</p>}
            {section.items && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-700">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.paragraphs?.map((p) => (
              <p key={p} className="mt-2 text-stone-700">
                <WithPhone text={p} />
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
