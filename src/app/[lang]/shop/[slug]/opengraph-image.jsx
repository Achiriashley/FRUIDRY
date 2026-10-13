import { ImageResponse } from "next/og";
import { getProduct } from "@/lib/catalog";
import { getDictionary, localizeProduct } from "@/lib/i18n";
import { OG_SIZE, OgCard, publicImage } from "@/lib/og-card";
import { getProductImages } from "@/lib/product-images";
import { formatPrice } from "@/lib/products";

export const alt = "Fruidry";
export const size = OG_SIZE;
export const contentType = "image/png";

// Uploaded photos are already full web addresses; photos in public/products are
// read from disk.
async function photoSource(product) {
  if (product.image?.startsWith("https://")) return product.image;
  return publicImage(getProductImages()[product.slug]);
}

export default async function Image({ params }) {
  const { lang, slug } = await params;
  const found = await getProduct(slug);
  if (!found) {
    return new ImageResponse(await OgCard({ title: "Fruidry" }), size);
  }
  const product = localizeProduct(found, lang);
  const t = getDictionary(lang);
  return new ImageResponse(
    await OgCard({
      title: product.name,
      subtitle: product.tagline,
      footer: product.comingSoon
        ? t.comingSoon.badge
        : `${formatPrice(product.price)} · ${product.weight}`,
      photo: await photoSource(product),
    }),
    size,
  );
}
