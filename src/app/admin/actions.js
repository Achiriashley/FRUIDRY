"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { endAdminSession, isAdmin, passwordMatches, startAdminSession } from "@/lib/admin-auth";
import {
  PRODUCTS_TAG,
  createProduct,
  deleteProduct as removeProduct,
  getProducts,
  updateProduct,
} from "@/lib/catalog";
import { ORDER_STATUS, getOrder, isPaid, newReceiptNumber, saveOrder } from "@/lib/orders";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { detectImageType, saveImage } from "@/lib/storage";

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
  refresh();
  return { error: null };
}

export async function logout() {
  await endAdminSession();
  refresh();
}

async function updateOrder(formData, change) {
  if (!(await isAdmin())) throw new Error("Not signed in");
  const order = await getOrder(String(formData.get("orderId") ?? ""));
  if (!order) throw new Error("Order not found");
  const updated = change(order);
  if (updated) await saveOrder(updated);
  refresh();
}

export async function confirmPayment(formData) {
  await updateOrder(formData, (order) =>
    isPaid(order)
      ? null
      : {
          ...order,
          status: ORDER_STATUS.confirmed,
          receipt: { number: newReceiptNumber(), confirmedAt: new Date().toISOString() },
          rejection: null,
        },
  );
}

export async function rejectPayment(formData) {
  const reason =
    String(formData.get("reason") ?? "")
      .trim()
      .slice(0, 300) ||
    "This order was cancelled. Message us on WhatsApp if you have any questions.";
  await updateOrder(formData, (order) =>
    isPaid(order)
      ? null
      : {
          ...order,
          status: ORDER_STATUS.rejected,
          rejection: { reason, rejectedAt: new Date().toISOString() },
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
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

// Adds a product (no slug) or updates one (slug), with an optional new photo.
export async function saveProduct(_prev, formData) {
  if (!(await isAdmin())) return { status: "error", errors: { form: "Please sign in again." } };

  const slug = String(formData.get("slug") ?? "").trim();
  const text = (field) => String(formData.get(field) ?? "").trim();
  const fields = {
    sku: text("sku").toUpperCase(),
    name: text("name"),
    tagline: text("tagline"),
    description: text("description"),
    weight: text("weight"),
    price: Number(text("price")),
    highlights: text("highlights")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 8),
    inStock: formData.get("inStock") === "on",
  };

  const errors = {};
  for (const [field, max] of Object.entries(LIMITS)) {
    if (!fields[field]) errors[field] = "This can't be empty.";
    else if (fields[field].length > max) errors[field] = `Keep this under ${max} characters.`;
  }
  if (!errors.sku && !/^[A-Z0-9-]+$/.test(fields.sku)) {
    errors.sku = "Use only letters, numbers and dashes, e.g. FD-MIX-50.";
  }
  if (!errors.sku) {
    const products = await getProducts();
    const clash = products.find((p) => p.sku === fields.sku && p.slug !== slug);
    if (clash) errors.sku = `${clash.name} already uses this item code.`;
  }
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
  if (!(await isAdmin())) throw new Error("Not signed in");
  await removeProduct(String(formData.get("slug") ?? ""));
  updateTag(PRODUCTS_TAG);
  redirect("/admin/products?deleted=1");
}
