import { CONTACT, phoneLink } from "@/lib/shop-config";

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

// A page of policy texts from i18n.js (privacy, returns): a title, the date it was last
// changed, then sections. Each section shows its heading (if any), its intro, its list
// (`items`, or numbered `steps`), then its paragraphs.
export function PolicyPage({ title, updated, sections }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-stone-600">{updated}</p>
      <div className="mt-8 space-y-8">
        {sections.map((section, index) => (
          <section key={section.heading ?? index}>
            {section.heading && (
              <h2 className="text-xl font-bold text-brand-deep">{section.heading}</h2>
            )}
            {section.intro && <p className="mt-2 text-stone-700">{section.intro}</p>}
            {section.items && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-700">
                {section.items.map((item) => (
                  <li key={item}>
                    <WithPhone text={item} />
                  </li>
                ))}
              </ul>
            )}
            {section.steps && (
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-stone-700">
                {section.steps.map((step) => (
                  <li key={step}>
                    <WithPhone text={step} />
                  </li>
                ))}
              </ol>
            )}
            {section.paragraphs?.map((p) => (
              <p key={p} className={`text-stone-700 ${section.heading ? "mt-2" : "text-lg"}`}>
                <WithPhone text={p} />
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
