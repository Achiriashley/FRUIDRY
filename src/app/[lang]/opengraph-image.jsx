import { ImageResponse } from "next/og";
import { getProducts } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n";
import { OG_SIZE, OgCard, publicImage } from "@/lib/og-card";
import { getProductImages } from "@/lib/product-images";

export const alt = "Fruidry";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }) {
  const { lang } = await params;
  const t = getDictionary(lang);
  // Show the first product on sale (its photo from public/products).
  const products = await getProducts();
  const featured = products.find((p) => !p.comingSoon) ?? products[0];
  const photo = featured ? await publicImage(getProductImages()[featured.slug]) : null;
  return new ImageResponse(
    await OgCard({
      title: `${t.home.titleBefore}${t.home.titleHighlight}${t.home.titleAfter}`,
      subtitle: t.footer.promises.slice(0, 2).join(" · "),
      footer: t.home.eyebrow,
      photo,
    }),
    size,
  );
}
