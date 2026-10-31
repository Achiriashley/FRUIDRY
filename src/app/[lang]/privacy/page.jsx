import { PolicyPage } from "@/components/PolicyPage";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const lang = await getLocale();
  const t = getDictionary(lang);
  return pageMetadata(lang, "/privacy", {
    title: t.privacy.title,
    description: t.privacy.description,
  });
}

export default async function PrivacyPage() {
  const { privacy } = getDictionary(await getLocale());
  return <PolicyPage {...privacy} />;
}
