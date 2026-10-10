"use server";

import { ORDER_STATUS, createOrder, newOrderId, newOrderReference } from "@/lib/orders";
import { getProduct } from "@/lib/products";
import { normalizeCameroonPhone } from "@/lib/shop-config";

const MAX_QUANTITY = 50;

// Rebuild the order lines from the catalogue so prices always come from the server.
function parseItems(raw) {
  let lines;
  try {
    lines = JSON.parse(String(raw ?? "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(lines) || lines.length === 0) return null;

  const items = [];
  for (const line of lines) {
    const product = getProduct(line?.slug);
    const quantity = Number(line?.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return null;
    }
    items.push({ slug: product.slug, name: product.name, price: product.price, quantity });
  }
  return items;
}

export async function placeOrder(_prev, formData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizeCameroonPhone(formData.get("phone"));
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "")
    .trim()
    .slice(0, 500);
  const items = parseItems(formData.get("items"));

  const errors = {};
  if (!name) errors.name = "Please enter your name.";
  if (!phone) errors.phone = "Enter a Cameroon mobile number, e.g. 6XX XX XX XX.";
  if (!address) errors.address = "Tell us where to deliver your order.";
  if (!items) errors.form = "Your cart is empty or out of date. Please refresh the page.";
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const order = {
    id: newOrderId(),
    reference: newOrderReference(),
    createdAt: new Date().toISOString(),
    status: ORDER_STATUS.awaitingPayment,
    customer: { name, phone, address, notes },
    items,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    payment: null,
    receipt: null,
  };
  await createOrder(order);

  return { status: "success", orderId: order.id };
}
