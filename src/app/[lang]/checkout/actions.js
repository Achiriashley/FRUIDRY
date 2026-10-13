"use server";

import { ORDER_STATUS, createOrder, newOrderId, newOrderReference } from "@/lib/orders";
import { getProducts } from "@/lib/catalog";
import { DEFAULT_LOCALE, getDictionary, hasLocale, localizeProduct } from "@/lib/i18n";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { normalizeCameroonPhone, shopWhatsAppNumber, whatsAppLink } from "@/lib/shop-config";
import { orderMessage } from "@/lib/whatsapp-order";

const MAX_QUANTITY = 50;

// Rebuild the order lines from the catalogue so prices always come from the server.
function parseItems(raw, products, lang) {
  let lines;
  try {
    lines = JSON.parse(String(raw ?? "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(lines) || lines.length === 0) return null;

  const items = [];
  for (const line of lines) {
    const found = products.find((p) => p.slug === line?.slug);
    const product = found && localizeProduct(found, lang);
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
  const rawLang = String(formData.get("lang") ?? "");
  const lang = hasLocale(rawLang) ? rawLang : DEFAULT_LOCALE;
  const t = getDictionary(lang).checkout;
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalizeCameroonPhone(formData.get("phone"));
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "")
    .trim()
    .slice(0, 500);
  const products = await getProducts();
  const items = parseItems(formData.get("items"), products, lang);
  const soldOut = items?.find((item) => !products.find((p) => p.slug === item.slug)?.inStock);

  const errors = {};
  if (!name) errors.name = t.errors.name;
  else if (name.length > 100) errors.name = t.errors.nameTooLong;
  if (!phone) errors.phone = t.errors.phone;
  if (!address) errors.address = t.errors.address;
  else if (address.length > 300) errors.address = t.errors.addressTooLong;
  if (!items) errors.form = t.errors.cart;
  else if (soldOut) errors.form = t.errors.soldOut(soldOut.name);
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  // Stops bots from flooding the shop with fake orders; generous for real customers.
  const limit = await rateLimit("placeOrder");
  if (!limit.allowed) {
    return {
      status: "error",
      errors: {
        form: t.errors.rateLimited(retryMessage(limit.retryAfterSeconds, lang)),
      },
    };
  }

  const order = {
    id: newOrderId(),
    reference: newOrderReference(),
    createdAt: new Date().toISOString(),
    status: ORDER_STATUS.awaitingPayment,
    lang,
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
      errors: { form: t.errors.notSetUp },
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
