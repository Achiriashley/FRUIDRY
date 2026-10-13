import fs from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getProduct } from "@/lib/catalog";
import { localizeProduct } from "@/lib/i18n";
import { OG_SIZE, OgCard } from "@/lib/og-card";
import { getProductImages } from "@/lib/product-images";
import { formatPrice } from "@/lib/products";

export const alt = "Fruidry";
export const size = OG_SIZE;
export const contentType = "image/png";

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

// The product photo as something the image renderer can use: uploaded photos are
// already full web addresses; photos in public/products are read from disk.
async function photoSource(product) {
  if (product.image?.startsWith("https://")) return product.image;
  const local = getProductImages()[product.slug];
  const type = local && MIME[path.extname(local).toLowerCase()];
  if (!type) return null;
  const bytes = await fs.readFile(path.join(process.cwd(), "public", local));
  return `data:${type};base64,${bytes.toString("base64")}`;
}

export default async function Image({ params }) {
  const { lang, slug } = await params;
  const found = await getProduct(slug);
  if (!found) {
    return new ImageResponse(<OgCard title="Fruidry" />, size);
  }
  const product = localizeProduct(found, lang);
  return new ImageResponse(
    (
      <OgCard
        title={product.name}
        subtitle={product.tagline}
        footer={`${formatPrice(product.price)} · ${product.weight}`}
        photo={await photoSource(product)}
      />
    ),
    size,
  );
}
