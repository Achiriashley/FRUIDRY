import { PolicyPage } from "@/components/PolicyPage";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

// Returns and refunds: what to do when a pack arrives damaged, wrong or missing. The texts
// are in i18n.js (`returns`).
export async function generateMetadata() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  return pageMetadata(lang, "/returns", {
    title: t.returns.title,
    description: t.returns.description,
  });
}

export default async function ReturnsPage() {
  const { returns } = getDictionary(await getLocale());
  return <PolicyPage {...returns} />;
}
