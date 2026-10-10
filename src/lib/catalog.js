import { cacheTag } from "next/cache";
import { defaultProducts } from "./products";
import { jsonFile, supabaseConfig, supabaseRequest } from "./storage";

// Product details shown in the shop: the defaults from products.js with any
// edits made in the admin panel applied on top.

export const PRODUCTS_TAG = "products";

export const EDITABLE_FIELDS = [
  "name",
  "tagline",
  "description",
  "price",
  "weight",
  "highlights",
  "inStock",
];

const editsFile = jsonFile("products.json", {});

async function readEdits() {
  const config = supabaseConfig();
  if (!config) return editsFile.read();
  const rows = await supabaseRequest(config, "products", "?select=slug,data");
  return Object.fromEntries(rows.map((row) => [row.slug, row.data]));
}

function pickEditable(edits) {
  return Object.fromEntries(
    EDITABLE_FIELDS.filter((field) => edits?.[field] !== undefined).map((field) => [
      field,
      edits[field],
    ]),
  );
}

export async function getProducts() {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  const edits = await readEdits();
  return defaultProducts.map((product) => ({
    ...product,
    ...pickEditable(edits[product.slug]),
  }));
}

export async function getProduct(slug) {
  const products = await getProducts();
  return products.find((p) => p.slug === slug);
}

export async function saveProductEdits(slug, fields) {
  if (!defaultProducts.some((p) => p.slug === slug)) throw new Error(`Unknown product ${slug}`);
  const data = pickEditable(fields);
  const config = supabaseConfig();
  if (config) {
    await supabaseRequest(config, "products", "", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ slug, data, updated_at: new Date().toISOString() }),
    });
  } else {
    await editsFile.update((edits) => ({ ...edits, [slug]: data }));
  }
}
