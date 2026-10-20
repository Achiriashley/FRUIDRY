"use server";

import { refresh, revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  endAdminSession,
  passwordMatches,
  startAdminSession,
  touchAdminSession,
} from "@/lib/admin-auth";
import {
  PRODUCTS_TAG,
  addStock,
  createProduct,
  deleteProduct as removeProduct,
  getProduct,
  getProducts,
  subtractStock,
  takeStock,
  updateProduct,
} from "@/lib/catalog";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  addEntry,
  cameroonDate,
  deleteEntry,
  getEntry,
} from "@/lib/ledger";
import { ORDER_STATUS, getOrder, isPaid, newReceiptNumber, saveOrder } from "@/lib/orders";
import { DEFAULT_LOW_STOCK_AT } from "@/lib/products";
import { forgetRateLimit, rateLimit, retryMessage } from "@/lib/rate-limit";
import { detectImageType, saveImage } from "@/lib/storage";
import { REVIEWS_TAG, approveReview, deleteProductReviews, deleteReview } from "@/lib/reviews";
import { removeFromWaitlist, removeProductFromWaitlist } from "@/lib/waitlist";

export async function login(_prev, formData) {
  // Every attempt counts, so password guessing is capped at a few tries per 15 minutes.
  const limit = await rateLimit("adminLogin");
  if (!limit.allowed) {
    return {
      error: `Too many sign-in attempts. Try again in ${retryMessage(limit.retryAfterSeconds)}.`,
    };
  }
  if (!passwordMatches(String(formData.get("password") ?? "").slice(0, 1000))) {
    // A short pause makes automated guessing slower still.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "Wrong password." };
  }
  await startAdminSession();
  // Only wrong passwords count towards the limit.
  await forgetRateLimit("adminLogin");
  refresh();
  return { error: null };
}

export async function logout() {
  await endAdminSession();
  refresh();
}

// Applies change() to the order and saves it. Returns the saved order, or null if
// change() made no change.
async function updateOrder(formData, change) {
  // Every admin action also counts as activity; a session that has ended goes back
  // to the sign-in form.
  if (!(await touchAdminSession())) redirect("/admin");
  const order = await getOrder(String(formData.get("orderId") ?? ""));
  if (!order) throw new Error("Order not found");
  const updated = change(order);
  if (updated) await saveOrder(updated);
  refresh();
  return updated;
}

export async function confirmPayment(formData) {
  const confirmed = await updateOrder(formData, (order) =>
    isPaid(order)
      ? null
      : {
          ...order,
          status: ORDER_STATUS.confirmed,
          receipt: { number: newReceiptNumber(), confirmedAt: new Date().toISOString() },
          rejection: null,
        },
  );
  // A paid order takes its packs off the stock count.
  if (confirmed) {
    try {
      if ((await subtractStock(confirmed.items)).length > 0) updateTag(PRODUCTS_TAG);
    } catch (error) {
      console.error("Payment confirmed, but the stock count couldn't be updated", error);
    }
  }
}

// Shown to the customer when no reason is typed, in the language they ordered in.
const DEFAULT_CANCEL_REASON = {
  en: "This order was cancelled. Message us on WhatsApp if you have any questions.",
  fr: "Cette commande a été annulée. Écrivez-nous sur WhatsApp si vous avez des questions.",
};

export async function rejectPayment(formData) {
  const typed = String(formData.get("reason") ?? "")
    .trim()
    .slice(0, 300);
  await updateOrder(formData, (order) =>
    isPaid(order)
      ? null
      : {
          ...order,
          status: ORDER_STATUS.rejected,
          rejection: {
            reason: typed || DEFAULT_CANCEL_REASON[order.lang] || DEFAULT_CANCEL_REASON.en,
            rejectedAt: new Date().toISOString(),
          },
        },
  );
}

export async function markDelivered(formData) {
  await updateOrder(formData, (order) =>
    order.status !== ORDER_STATUS.confirmed
      ? null
      : {
          ...order,
          status: ORDER_STATUS.delivered,
          delivery: { deliveredAt: new Date().toISOString() },
        },
  );
}

const LIMITS = { sku: 30, name: 80, tagline: 120, description: 1000, weight: 30 };
// French versions are optional; the French shop shows the English text where they're empty.
const FRENCH_LIMITS = { nameFr: 80, taglineFr: 120, descriptionFr: 1000 };
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

// A whole number from a form field: null when the field is empty, undefined when it
// isn't a whole number between min and max.
function wholeNumber(raw, min, max) {
  const text = String(raw ?? "").trim();
  if (text === "") return null;
  const value = Number(text);
  return Number.isInteger(value) && value >= min && value <= max ? value : undefined;
}

// Adds a product (no slug) or updates one (slug), with an optional new photo.
export async function saveProduct(_prev, formData) {
  if (!(await touchAdminSession())) {
    return { status: "error", errors: { form: "Please sign in again." } };
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const text = (field) => String(formData.get(field) ?? "").trim();
  const lines = (field) =>
    text(field)
      .split("\n")
      .map((line) => line.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 8);
  const fields = {
    sku: text("sku").toUpperCase(),
    name: text("name"),
    tagline: text("tagline"),
    description: text("description"),
    weight: text("weight"),
    price: Number(text("price")),
    highlights: lines("highlights"),
    nameFr: text("nameFr"),
    taglineFr: text("taglineFr"),
    descriptionFr: text("descriptionFr"),
    highlightsFr: lines("highlightsFr"),
    inStock: formData.get("inStock") === "on",
    // Empty means "don't count stock for this product".
    stock: wholeNumber(formData.get("stock"), 0, 1_000_000),
    lowStockAt: wholeNumber(formData.get("lowStockAt") || DEFAULT_LOW_STOCK_AT, 0, 1_000_000),
    comingSoon: formData.get("comingSoon") === "on",
  };

  const errors = {};
  for (const [field, max] of Object.entries(LIMITS)) {
    if (!fields[field]) errors[field] = "This can't be empty.";
    else if (fields[field].length > max) errors[field] = `Keep this under ${max} characters.`;
  }
  for (const [field, max] of Object.entries(FRENCH_LIMITS)) {
    if (fields[field].length > max) errors[field] = `Keep this under ${max} characters.`;
  }
  if (!errors.sku && !/^[A-Z0-9-]+$/.test(fields.sku)) {
    errors.sku = "Use only letters, numbers and dashes, e.g. FD-MIX-50.";
  }
  if (!errors.sku) {
    const products = await getProducts();
    const clash = products.find((p) => p.sku === fields.sku && p.slug !== slug);
    if (clash) errors.sku = `${clash.name} already uses this item code.`;
  }
  if (fields.stock === undefined)
    errors.stock = "Enter a whole number of packs, e.g. 40, or leave it empty.";
  if (fields.lowStockAt === undefined)
    errors.lowStockAt = "Enter a whole number of packs, e.g. 10.";
  if (!Number.isInteger(fields.price) || fields.price < 1) {
    errors.price = "Enter a whole number of FCFA, e.g. 2500.";
  }

  const photo = formData.get("photo");
  const hasPhoto = photo && typeof photo === "object" && photo.size > 0;
  if (hasPhoto && photo.size > MAX_PHOTO_BYTES) errors.photo = "This photo is too big.";
  if (
    hasPhoto &&
    !errors.photo &&
    !detectImageType(Buffer.from(await photo.slice(0, 16).arrayBuffer()))
  ) {
    errors.photo = "Use a JPG, PNG or WebP photo.";
  }
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  try {
    if (hasPhoto) fields.image = await saveImage(photo);
    if (slug) {
      await updateProduct(slug, fields);
    } else {
      await createProduct(fields);
    }
  } catch (error) {
    console.error("Failed to save product", error);
    return {
      status: "error",
      errors: { form: "Sorry, the product couldn't be saved. Please try again." },
    };
  }
  updateTag(PRODUCTS_TAG);
  if (!slug) redirect("/admin/products?added=1");
  return { status: "success" };
}

export async function deleteProduct(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  const slug = String(formData.get("slug") ?? "");
  await removeProduct(slug);
  // Nobody can be told about a deleted product, so its waiting list goes too, and
  // its reviews have no page to appear on any more.
  try {
    await removeProductFromWaitlist(slug);
  } catch (error) {
    console.error("Couldn't remove the deleted product's waiting list", error.message);
  }
  try {
    await deleteProductReviews(slug);
    updateTag(REVIEWS_TAG);
  } catch (error) {
    console.error("Couldn't remove the deleted product's reviews", error.message);
  }
  updateTag(PRODUCTS_TAG);
  redirect("/admin/products?deleted=1");
}

// Removes people from a waiting list (after telling them the flavour is available).
export async function removeWaitlistEntries(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  await removeFromWaitlist(formData.getAll("id").map(String).slice(0, 10000));
  refresh();
}

// After a review is published or removed: refreshes the reviews and, to be sure, the
// product pages built from them.
function refreshReviews() {
  updateTag(REVIEWS_TAG);
  revalidatePath("/[lang]/shop/[slug]", "page");
  refresh();
}

// Shows a review on its product's page (and in the rating Google sees).
export async function publishReview(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  await approveReview(String(formData.get("id") ?? ""));
  refreshReviews();
}

// Deletes a review: one waiting for approval, or one already shown.
export async function removeReview(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  await deleteReview(String(formData.get("id") ?? ""));
  refreshReviews();
}

// ---------- Books (/admin/books) ----------

const NOTE_LIMIT = 200;
const MAX_AMOUNT = 1_000_000_000; // FCFA
const MAX_PACKS = 1_000_000;

// The fields every book entry shares: a valid date (not in the future, Cameroon time)
// and an optional note.
function entryBasics(formData, errors) {
  const date = String(formData.get("date") ?? "").trim();
  if (!validDate(date) || date < "2020-01-01") {
    errors.date = "Choose the date.";
  } else if (date > cameroonDate()) {
    errors.date = "This date is in the future.";
  }
  const note = String(formData.get("note") ?? "").trim();
  if (note.length > NOTE_LIMIT) errors.note = `Keep this under ${NOTE_LIMIT} characters.`;
  return { date, note };
}

// A real calendar day written YYYY-MM-DD (so not 2026-02-30).
function validDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const time = Date.parse(`${text}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === text;
}

async function entryProduct(formData, errors) {
  const product = await getProduct(String(formData.get("slug") ?? "").slice(0, 100));
  if (!product) errors.slug = "Choose a product.";
  return product;
}

// "Mixed Fruit Pack: 38 packs left." after a change to counted stock, or "".
function stockNote(product, counts, word) {
  const count = counts[product.slug];
  if (count === undefined) return "";
  return ` ${product.name}: ${count} ${count === 1 ? "pack" : "packs"} ${word}.`;
}

async function saveEntry(entry, errors) {
  try {
    await addEntry(entry);
    return true;
  } catch (error) {
    console.error("Couldn't save a book entry", error.message);
    errors.form = "Sorry, this couldn't be saved. Please try again.";
    return false;
  }
}

// A sale made outside the website: takes the packs off the stock count.
export async function recordSale(_prev, formData) {
  if (!(await touchAdminSession())) {
    return { status: "error", errors: { form: "Please sign in again." } };
  }
  const errors = {};
  const { date, note } = entryBasics(formData, errors);
  const product = await entryProduct(formData, errors);
  const quantity = wholeNumber(formData.get("quantity"), 1, MAX_PACKS);
  if (!quantity) errors.quantity = "Enter the number of packs, e.g. 2.";
  const price = wholeNumber(formData.get("price"), 0, MAX_AMOUNT);
  if (price === null || price === undefined) errors.price = "Enter the price per pack in FCFA.";
  const payment = String(formData.get("payment") ?? "");
  if (!(payment in PAYMENT_METHODS)) errors.payment = "Choose how they paid.";
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const entry = {
    type: "sale",
    date,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    quantity,
    price,
    total: quantity * price,
    payment,
    note,
  };
  if (!(await saveEntry(entry, errors))) return { status: "error", errors };
  const counts = await changeStockSafely(takeStock, [{ slug: product.slug, quantity }]);
  refresh();
  return { status: "success", message: `Sale recorded.${stockNote(product, counts, "left")}` };
}

// Packs that arrived: adds them to the stock count, with what they cost (optional).
export async function recordStockArrival(_prev, formData) {
  if (!(await touchAdminSession())) {
    return { status: "error", errors: { form: "Please sign in again." } };
  }
  const errors = {};
  const { date, note } = entryBasics(formData, errors);
  const product = await entryProduct(formData, errors);
  const quantity = wholeNumber(formData.get("quantity"), 1, MAX_PACKS);
  if (!quantity) errors.quantity = "Enter the number of packs, e.g. 100.";
  const cost = wholeNumber(formData.get("cost"), 0, MAX_AMOUNT);
  if (cost === undefined) errors.cost = "Enter a whole number of FCFA, or leave it empty.";
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const entry = {
    type: "stock",
    date,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    quantity,
    cost,
    note,
  };
  if (!(await saveEntry(entry, errors))) return { status: "error", errors };
  const counts = await changeStockSafely(addStock, [{ slug: product.slug, quantity }]);
  refresh();
  const counted = counts[product.slug] !== undefined;
  return {
    status: "success",
    message: counted
      ? `Stock recorded.${stockNote(product, counts, "in stock")}`
      : `Stock recorded. Packs aren't counted for ${product.name}, so no count changed: ` +
        "to count them, enter Packs in stock on its product page.",
  };
}

// Any other cost: delivery, packaging, transport, advertising...
export async function recordExpense(_prev, formData) {
  if (!(await touchAdminSession())) {
    return { status: "error", errors: { form: "Please sign in again." } };
  }
  const errors = {};
  const { date, note } = entryBasics(formData, errors);
  const category = String(formData.get("category") ?? "");
  if (!(category in EXPENSE_CATEGORIES)) errors.category = "Choose what it was for.";
  const amount = wholeNumber(formData.get("amount"), 1, MAX_AMOUNT);
  if (!amount) errors.amount = "Enter the amount in FCFA, e.g. 1500.";
  if (category === "other" && !note && !errors.note) errors.note = "Say what it was for.";
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const entry = { type: "expense", date, category, amount, note };
  if (!(await saveEntry(entry, errors))) return { status: "error", errors };
  refresh();
  return { status: "success", message: "Expense recorded." };
}

// Deletes an entry recorded by mistake, putting the stock count back as it was.
export async function deleteBookEntry(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  const entry = await getEntry(String(formData.get("id") ?? ""));
  if (!entry) return refresh();
  await deleteEntry(entry.id);
  const items = [{ slug: entry.slug, quantity: entry.quantity }];
  if (entry.type === "sale") await changeStockSafely(addStock, items);
  if (entry.type === "stock") await changeStockSafely(takeStock, items);
  refresh();
}

// Changes counted stock; the entry is already saved, so a failure is only logged.
async function changeStockSafely(change, items) {
  try {
    const counts = await change(items);
    if (Object.keys(counts).length > 0) updateTag(PRODUCTS_TAG);
    return counts;
  } catch (error) {
    console.error("The stock count couldn't be updated", error.message);
    return {};
  }
}
