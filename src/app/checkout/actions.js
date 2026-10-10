"use server";

import { ORDER_STATUS, createOrder, newOrderId, newOrderReference } from "@/lib/orders";
import { getProducts } from "@/lib/catalog";
import { normalizeCameroonPhone, shopWhatsAppNumber, whatsAppLink } from "@/lib/shop-config";
import { orderMessage } from "@/lib/whatsapp-order";

const MAX_QUANTITY = 50;

// Rebuild the order lines from the catalogue so prices always come from the server.
function parseItems(raw, products) {
  let lines;
  try {
    lines = JSON.parse(String(raw ?? "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(lines) || lines.length === 0) return null;

  const items = [];
  for (const line of lines) {
    const product = products.find((p) => p.slug === line?.slug);
    const quantity = Number(line?.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return null;
    }
    items.push({
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      price: product.price,
      quantity,
    });
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
  const products = await getProducts();
  const items = parseItems(formData.get("items"), products);
  const soldOut = items?.find((item) => !products.find((p) => p.slug === item.slug)?.inStock);

  const errors = {};
  if (!name) errors.name = "Please enter your name.";
  if (!phone) errors.phone = "Enter a Cameroon mobile number, e.g. 6XX XX XX XX.";
  if (!address) errors.address = "Tell us where to deliver your order.";
  if (!items) errors.form = "Your cart is empty or out of date. Please refresh the page.";
  else if (soldOut)
    errors.form = `Sorry, ${soldOut.name} is sold out. Remove it from your cart to continue.`;
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
  const shopNumber = shopWhatsAppNumber();
  if (!shopNumber) {
    console.error("WHATSAPP_NUMBER is not set, so orders can't be sent on WhatsApp.");
    return {
      status: "error",
      errors: { form: "Ordering on WhatsApp isn't set up yet. Please contact us directly." },
    };
  }

  // Save the order for the admin panel, but never block the customer if that fails:
  // the WhatsApp message carries everything needed to fulfil it.
  let saved = true;
  try {
    await createOrder(order);
  } catch (error) {
    saved = false;
    console.error("Failed to save order (sent on WhatsApp anyway)", error);
  }

  return {
    status: "success",
    orderId: saved ? order.id : null,
    reference: order.reference,
    whatsappUrl: whatsAppLink(shopNumber, orderMessage(order)),
  };
}
