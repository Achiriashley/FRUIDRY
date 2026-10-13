import { ImageResponse } from "next/og";
import { getDictionary } from "@/lib/i18n";
import { OG_SIZE, OgCard } from "@/lib/og-card";

export const alt = "Fruidry";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }) {
  const { lang } = await params;
  const t = getDictionary(lang);
  return new ImageResponse(
    (
      <OgCard
        title={`${t.home.titleBefore}${t.home.titleHighlight}${t.home.titleAfter}`}
        subtitle={t.footer.promises.slice(0, 2).join(" · ")}
        footer={t.home.badge}
      />
    ),
    size,
  );
}
