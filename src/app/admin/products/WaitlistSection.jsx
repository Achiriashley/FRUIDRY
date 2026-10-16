import { formatOrderDate } from "@/lib/orders";
import { whatsAppLink } from "@/lib/shop-config";
import { removeWaitlistEntries } from "../actions";
import { RemoveAllButton } from "./RemoveAllButton";

// The launch message, in the language the person used on the site.
function launchMessage(product, lang, siteUrl) {
  const link = `${siteUrl}/${lang}/shop/${product.slug}`;
  return lang === "fr"
    ? `Bonjour ! Bonne nouvelle de Fruidry : ${product.nameFr || product.name} est maintenant ` +
        `disponible 🎉 Commandez ici : ${link}`
    : `Hello! Good news from Fruidry: ${product.name} is now available 🎉 Order here: ${link}`;
}

// People waiting to hear when this flavour is available ("Notify me" on its shop page).
export function WaitlistSection({ product, entries, siteUrl, setupNeeded }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm" aria-labelledby="waitlist-heading">
      <h2 id="waitlist-heading" className="text-xl font-bold">
        Waiting list ({entries.length})
      </h2>
      {setupNeeded ? (
        <p className="mt-2 text-sm text-amber-800">
          To turn on the waiting list, run <code className="font-mono">supabase/schema.sql</code>{" "}
          again in Supabase (SQL editor). It only adds what&apos;s missing.
        </p>
      ) : entries.length === 0 ? (
        <p className="mt-2 text-sm text-stone-600">
          Nobody yet. Visitors can leave their WhatsApp number on this flavour&apos;s shop page
          while it&apos;s coming soon.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-stone-600">
            {product.comingSoon
              ? "When it's ready, untick Coming soon and save, then message each person here. "
              : "Message each person, then remove them. "}
            The privacy page promises their number is deleted once they&apos;ve been told.
          </p>
          <ul className="mt-4 divide-y divide-stone-100">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <a href={`tel:+237${entry.phone}`} className="font-mono text-brand hover:underline">
                  {entry.phone}
                </a>
                <span className="text-xs text-stone-500">
                  {entry.lang === "fr" ? "French" : "English"} · {formatOrderDate(entry.createdAt)}
                </span>
                <span className="flex flex-1 flex-wrap justify-end gap-2">
                  <a
                    href={whatsAppLink(
                      `237${entry.phone}`,
                      launchMessage(product, entry.lang, siteUrl),
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[#25D366] px-3 py-1.5 text-sm font-semibold text-brand hover:bg-green-50"
                  >
                    Tell them on WhatsApp
                  </a>
                  <form action={removeWaitlistEntries}>
                    <input type="hidden" name="id" value={entry.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:border-red-300 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
          {entries.length > 1 && <RemoveAllButton ids={entries.map((entry) => entry.id)} />}
        </>
      )}
    </section>
  );
}
