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
  changeStock,
  createProduct,
  deleteProduct as removeProduct,
  getProduct,
  getProducts,
  returnStock,
  subtractStock,
  updateProduct,
} from "@/lib/catalog";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  addEntry,
  cameroonDate,
  deleteEntry,
  getEntry,
  updateEntry,
} from "@/lib/ledger";
import { ORDER_STATUS, getOrder, isPaid, newReceiptNumber, saveOrder } from "@/lib/orders";
import { DEFAULT_LOW_STOCK_AT, formatPrice, stockLeft } from "@/lib/products";
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

// Runs a stock change for an order (subtractStock or returnStock). Returns the packs that
// really moved, { slug: +added or -taken off }, or null if it failed (logged).
async function moveOrderStock(change) {
  try {
    const counts = await change();
    if (Object.keys(counts).length > 0) updateTag(PRODUCTS_TAG);
    return Object.fromEntries(
      Object.entries(counts).map(([slug, { before, after }]) => [slug, after - before]),
    );
  } catch (error) {
    console.error("The stock count couldn't be updated for an order", error);
    return null;
  }
}

// A paid order takes its packs off the stock count. The order keeps how many really came
// off (none for products whose packs aren't counted), so Undo puts back exactly those.
export async function confirmPayment(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  const order = await getOrder(String(formData.get("orderId") ?? ""));
  if (!order) throw new Error("Order not found");
  if (!isPaid(order)) {
    const moved = await moveOrderStock(() => subtractStock(order.items));
    const stockTaken = moved && Object.fromEntries(Object.entries(moved).map(([s, n]) => [s, -n]));
    try {
      await saveOrder({
        ...order,
        status: ORDER_STATUS.confirmed,
        receipt: { number: newReceiptNumber(), confirmedAt: new Date().toISOString() },
        rejection: null,
        // null when the stock change failed: Undo then leaves the count alone.
        stockTaken,
      });
    } catch (error) {
      if (stockTaken) await moveOrderStock(() => returnStock(stockTaken));
      throw error;
    }
  }
  refresh();
}

// Undo for "Mark as paid": the order goes back to New orders, its receipt is hidden and
// the packs it took off the stock count are put back.
export async function undoPayment(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  const order = await getOrder(String(formData.get("orderId") ?? ""));
  if (!order) throw new Error("Order not found");
  if (order.status === ORDER_STATUS.confirmed) {
    const { stockTaken, ...rest } = order;
    await saveOrder({ ...rest, status: ORDER_STATUS.awaitingPayment, receipt: null });
    if (stockTaken) await moveOrderStock(() => returnStock(stockTaken));
  }
  refresh();
}

// Undo for "Mark as delivered": back to Paid, to deliver.
export async function undoDelivered(formData) {
  await updateOrder(formData, (order) => {
    if (order.status !== ORDER_STATUS.delivered) return null;
    const { delivery, ...rest } = order;
    return { ...rest, status: ORDER_STATUS.confirmed };
  });
}

// Undo for "Cancel order": back to New orders.
export async function reopenOrder(formData) {
  await updateOrder(formData, (order) =>
    order.status !== ORDER_STATUS.rejected
      ? null
      : { ...order, status: ORDER_STATUS.awaitingPayment, rejection: null },
  );
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
const SIGN_IN_AGAIN = { status: "error", errors: { form: "Please sign in again." } };

// The fields every book entry has: a real date, not in the future (Cameroon time), and an
// optional note.
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

// The fields that differ by type and can also be changed later (Edit): a sale's price
// and payment, a stock arrival's cost, an expense's category and amount.
function typeFields(type, formData, note, errors) {
  if (type === "sale") {
    const price = wholeNumber(formData.get("price"), 0, MAX_AMOUNT);
    if (price === null || price === undefined) errors.price = "Enter the price per pack in FCFA.";
    const payment = String(formData.get("payment") ?? "");
    if (!Object.hasOwn(PAYMENT_METHODS, payment)) errors.payment = "Choose how they paid.";
    return { price, payment };
  }
  if (type === "stock") {
    const cost = wholeNumber(formData.get("cost"), 0, MAX_AMOUNT);
    if (cost === undefined) errors.cost = "Enter a whole number of FCFA, or leave it empty.";
    return { cost };
  }
  const category = String(formData.get("category") ?? "");
  if (!Object.hasOwn(EXPENSE_CATEGORIES, category)) errors.category = "Choose what it was for.";
  const amount = wholeNumber(formData.get("amount"), 1, MAX_AMOUNT);
  if (!amount) errors.amount = "Enter the amount in FCFA, e.g. 1500.";
  if (category === "other" && !note && !errors.note) errors.note = "Say what it was for.";
  return { category, amount };
}

const packsText = (n) => `${n} ${n === 1 ? "pack" : "packs"}`;

// "12 Oct 2026"
const dayText = (date) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

// Changes a product's counted stock. Returns { before, after }, or null if its packs
// aren't counted or the change failed (logged).
async function moveStock(slug, delta) {
  try {
    const moved = await changeStock(slug, delta);
    if (moved) updateTag(PRODUCTS_TAG);
    return moved;
  } catch (error) {
    console.error("The stock count couldn't be updated", error.message);
    return null;
  }
}

// Saves a new entry with the stock change it makes. The stock is changed first, so the
// entry records how many packs really moved (0 if they aren't counted): deleting it later
// undoes exactly that. If the entry can't be saved, the stock change is undone.
async function saveEntryWithStock(entry, delta, errors) {
  const moved = delta ? await moveStock(entry.slug, delta) : null;
  const stockChange = moved ? moved.after - moved.before : 0;
  try {
    await addEntry({ ...entry, stockChange });
    return { saved: true, moved };
  } catch (error) {
    console.error("Couldn't save a book entry", error.message);
    if (stockChange) await moveStock(entry.slug, -stockChange);
    errors.form = "Sorry, this couldn't be saved. Please try again.";
    return { saved: false };
  }
}

// A sale made outside the website: takes the packs off the stock count.
export async function recordSale(_prev, formData) {
  if (!(await touchAdminSession())) return SIGN_IN_AGAIN;
  const errors = {};
  const { date, note } = entryBasics(formData, errors);
  const product = await getProduct(String(formData.get("slug") ?? "").slice(0, 100));
  if (!product) errors.slug = "Choose a product.";
  const quantity = wholeNumber(formData.get("quantity"), 1, MAX_PACKS);
  if (!quantity) errors.quantity = "Enter the number of packs, e.g. 2.";
  // More packs than are counted is usually a typo (20 for 2), or a count that's wrong.
  const left = product && stockLeft(product);
  if (quantity && Number.isInteger(left) && quantity > left) {
    errors.quantity =
      `Only ${packsText(left)} of ${product.name} are counted in stock. Check the number, ` +
      "or correct Packs in stock on its product page first.";
  }
  const { price, payment } = typeFields("sale", formData, note, errors);
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const total = quantity * price;
  const { saved, moved } = await saveEntryWithStock(
    {
      type: "sale",
      date,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      quantity,
      price,
      total,
      payment,
      note,
    },
    -quantity,
    errors,
  );
  if (!saved) return { status: "error", errors };
  refresh();
  return {
    status: "success",
    message:
      `Sale of ${formatPrice(total)} recorded for ${dayText(date)}.` +
      (moved ? ` ${product.name}: ${packsText(moved.after)} left.` : ""),
  };
}

// Packs that arrived: adds them to the stock count, with what they cost (optional).
export async function recordStockArrival(_prev, formData) {
  if (!(await touchAdminSession())) return SIGN_IN_AGAIN;
  const errors = {};
  const { date, note } = entryBasics(formData, errors);
  const product = await getProduct(String(formData.get("slug") ?? "").slice(0, 100));
  if (!product) errors.slug = "Choose a product.";
  const quantity = wholeNumber(formData.get("quantity"), 1, MAX_PACKS);
  if (!quantity) errors.quantity = "Enter the number of packs, e.g. 100.";
  const { cost } = typeFields("stock", formData, note, errors);
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const { saved, moved } = await saveEntryWithStock(
    {
      type: "stock",
      date,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      quantity,
      cost,
      note,
    },
    quantity,
    errors,
  );
  if (!saved) return { status: "error", errors };
  refresh();
  const perPack = cost ? ` at ${formatPrice(Math.round(cost / quantity))} per pack` : "";
  return {
    status: "success",
    message:
      `Stock arrival of ${packsText(quantity)}${perPack} recorded for ${dayText(date)}.` +
      (moved
        ? ` ${product.name}: ${packsText(moved.after)} in stock.`
        : ` Packs aren't counted for ${product.name}, so no count changed: ` +
          "to count them, enter Packs in stock on its product page."),
  };
}

// Any other cost: delivery, packaging, transport, advertising...
export async function recordExpense(_prev, formData) {
  if (!(await touchAdminSession())) return SIGN_IN_AGAIN;
  const errors = {};
  const { date, note } = entryBasics(formData, errors);
  const { category, amount } = typeFields("expense", formData, note, errors);
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  try {
    await addEntry({ type: "expense", date, category, amount, note });
  } catch (error) {
    console.error("Couldn't save a book entry", error.message);
    return {
      status: "error",
      errors: { form: "Sorry, this couldn't be saved. Please try again." },
    };
  }
  refresh();
  return {
    status: "success",
    message: `Expense of ${formatPrice(amount)} recorded for ${dayText(date)}.`,
  };
}

// Corrects an entry's date, note, price and payment (sale), cost (stock arrival), or
// category and amount (expense). The product and number of packs can't be changed here,
// so the stock count stays as it is: to change those, delete the entry and record it
// again.
export async function updateBookEntry(_prev, formData) {
  if (!(await touchAdminSession())) return SIGN_IN_AGAIN;
  const entry = await getEntry(String(formData.get("id") ?? ""));
  if (!entry) return { status: "error", errors: { form: "This entry has been deleted." } };
  const errors = {};
  const { date, note } = entryBasics(formData, errors);
  const changes = typeFields(entry.type, formData, note, errors);
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const updated = { ...entry, date, note, ...changes };
  if (entry.type === "sale") updated.total = entry.quantity * changes.price;
  try {
    await updateEntry(updated);
  } catch (error) {
    console.error("Couldn't update a book entry", error.message);
    return {
      status: "error",
      errors: { form: "Sorry, the changes couldn't be saved. Please try again." },
    };
  }
  refresh();
  return { status: "success", message: "Changes saved." };
}

// Deletes an entry recorded by mistake, undoing the stock change it made.
export async function deleteBookEntry(formData) {
  if (!(await touchAdminSession())) redirect("/admin");
  // Only the request that really deleted it undoes its stock change.
  const entry = await deleteEntry(String(formData.get("id") ?? ""));
  if (entry && (entry.type === "sale" || entry.type === "stock")) {
    const undo = Number.isInteger(entry.stockChange)
      ? -entry.stockChange
      : (entry.type === "sale" ? 1 : -1) * entry.quantity;
    if (undo) await moveStock(entry.slug, undo);
  }
  refresh();
}
