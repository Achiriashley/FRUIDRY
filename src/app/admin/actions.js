"use server";

import { refresh, updateTag } from "next/cache";
import { endAdminSession, isAdmin, passwordMatches, startAdminSession } from "@/lib/admin-auth";
import { PRODUCTS_TAG, saveProductEdits } from "@/lib/catalog";
import { ORDER_STATUS, getOrder, isPaid, newReceiptNumber, saveOrder } from "@/lib/orders";

export async function login(_prev, formData) {
  if (!passwordMatches(String(formData.get("password") ?? ""))) {
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

export async function saveProduct(_prev, formData) {
  if (!(await isAdmin())) return { status: "error", errors: { form: "Please sign in again." } };

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
  if (!Number.isInteger(fields.price) || fields.price < 1) {
    errors.price = "Enter a whole number of FCFA, e.g. 2500.";
  }
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  await saveProductEdits(text("slug"), fields);
  updateTag(PRODUCTS_TAG);
  return { status: "success" };
}
