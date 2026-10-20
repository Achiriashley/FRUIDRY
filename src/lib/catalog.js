import { cacheTag } from "next/cache";
import { defaultProducts } from "./products";
import { jsonFile, supabaseConfig, supabaseRequest } from "./storage";

// Products shown in the shop. The starting products come from products.js;
// anything changed, added or deleted in the admin panel is stored (in Supabase
// or data/products.json) and applied on top:
//   - a stored row for a starting product holds its edited fields
//   - a stored row for any other slug is a product added in the admin panel
//   - a row with { deleted: true } hides that product

export const PRODUCTS_TAG = "products";

export const EDITABLE_FIELDS = [
  "sku",
  "name",
  "tagline",
  "description",
  "price",
  "weight",
  "highlights",
  "nameFr",
  "taglineFr",
  "descriptionFr",
  "highlightsFr",
  "inStock",
  "stock",
  "lowStockAt",
  "comingSoon",
  "image",
];

// Look of products added in the admin panel (they have no hand-picked colours).
const NEW_PRODUCT_DEFAULTS = {
  category: "mixes",
  emoji: "🍓",
  color: "from-sun-light to-brand-light",
  tagline: "",
  highlights: [],
  inStock: true,
  comingSoon: false,
};

const STARTING = new Map(defaultProducts.map((p) => [p.slug, p]));
const storedFile = jsonFile("products.json", {});

async function readStored() {
  const config = supabaseConfig();
  if (!config) return storedFile.read();
  const rows = await supabaseRequest(config, "products", "?select=slug,data");
  return Object.fromEntries(rows.map((row) => [row.slug, row.data]));
}

async function writeStored(slug, data) {
  const config = supabaseConfig();
  if (config) {
    await supabaseRequest(config, "products", "", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ slug, data, updated_at: new Date().toISOString() }),
    });
  } else {
    await storedFile.update((stored) => ({ ...stored, [slug]: data }));
  }
}

function pickEditable(data) {
  return Object.fromEntries(
    EDITABLE_FIELDS.filter((field) => data?.[field] !== undefined).map((field) => [
      field,
      data[field],
    ]),
  );
}

export async function getProducts() {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  const stored = await readStored();

  const starting = defaultProducts
    .filter((p) => !stored[p.slug]?.deleted)
    .map((p) => withoutOldSearchNames(p, { ...p, ...pickEditable(stored[p.slug]) }));

  const added = Object.entries(stored)
    .filter(([slug, data]) => !STARTING.has(slug) && !data.deleted && data.name)
    .sort(([, a], [, b]) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .map(([slug, data]) => ({ ...NEW_PRODUCT_DEFAULTS, ...pickEditable(data), slug }));

  return [...starting, ...added];
}

// The search-result name of a starting product ("Freeze-dried Mango") describes its
// original name; once it's renamed in the admin panel, the new name is used instead.
function withoutOldSearchNames(original, product) {
  const result = { ...product };
  if (product.name !== original.name) delete result.searchName;
  if (product.nameFr !== original.nameFr) delete result.searchNameFr;
  return result;
}

export async function getProduct(slug) {
  const products = await getProducts();
  return products.find((p) => p.slug === slug);
}

function slugify(text) {
  return (
    String(text)
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "product"
  );
}

// Adds a product and returns its slug (the part of its web address after /shop/).
export async function createProduct(fields) {
  const stored = await readStored();
  const taken = (slug) => STARTING.has(slug) || stored[slug] !== undefined;
  const base = slugify(fields.name);
  let slug = base;
  for (let n = 2; taken(slug); n++) slug = `${base}-${n}`;

  await writeStored(slug, { ...pickEditable(fields), createdAt: new Date().toISOString() });
  return slug;
}

export async function updateProduct(slug, fields) {
  const stored = await readStored();
  const existing = stored[slug];
  if ((!STARTING.has(slug) && !existing) || existing?.deleted) {
    throw new Error(`Unknown product ${slug}`);
  }
  await writeStored(slug, { ...existing, ...pickEditable(fields) });
}

// Changes the stock count of each product whose packs are counted by `delta` packs,
// never going below 0. Returns { slug: { before, after } } for those products.
async function adjustStock(changes) {
  const stored = await readStored();
  const counts = {};
  for (const { slug, delta } of changes) {
    const current = { ...STARTING.get(slug), ...pickEditable(stored[slug]) };
    if (stored[slug]?.deleted || !Number.isInteger(current.stock)) continue;
    const stock = Math.max(0, current.stock + delta);
    stored[slug] = { ...stored[slug], stock };
    await writeStored(slug, stored[slug]);
    counts[slug] = { before: current.stock, after: stock };
  }
  return counts;
}

// Takes sold packs off the stock count. Returns the slugs whose count changed.
export async function subtractStock(items) {
  const counts = await adjustStock(items.map(({ slug, quantity }) => ({ slug, delta: -quantity })));
  return Object.keys(counts);
}

// Changes one product's counted stock by `delta` packs (the Books page). Returns
// { before, after }, or null if its packs aren't counted.
export async function changeStock(slug, delta) {
  return (await adjustStock([{ slug, delta }]))[slug] ?? null;
}

// Hides the product from the shop. Past orders keep their own copy of its details.
export async function deleteProduct(slug) {
  await writeStored(slug, { deleted: true, deletedAt: new Date().toISOString() });
}
