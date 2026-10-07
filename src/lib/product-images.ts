import fs from "node:fs";
import path from "node:path";
import { products } from "./products";

export type ProductImages = Record<string, string>;

const IMAGE_DIR = path.join(process.cwd(), "public", "products");
const EXTENSIONS = [".webp", ".avif", ".jpg", ".jpeg", ".png"];

/**
 * Finds a photo for each product in public/products, named after the
 * product slug (e.g. golden-mango-slices.jpg). Products without a photo
 * are left out and fall back to their emoji tile.
 */
export function getProductImages(): ProductImages {
  let files: string[];
  try {
    files = fs.readdirSync(IMAGE_DIR);
  } catch {
    return {};
  }

  const images: ProductImages = {};
  for (const { slug } of products) {
    const file = EXTENSIONS.map((ext) => `${slug}${ext}`).find((name) =>
      files.some((f) => f.toLowerCase() === name),
    );
    if (file) {
      const actual = files.find((f) => f.toLowerCase() === file)!;
      images[slug] = `/products/${actual}`;
    }
  }
  return images;
}
