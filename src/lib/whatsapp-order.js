import { formatPrice } from "./products";

// The message a customer sends to the shop on WhatsApp to place an order.
export function orderMessage(order) {
  const lines = [
    "Hello Fruidry! I'd like to order:",
    "",
    `*Order ${order.reference}*`,
    ...order.items.map(
      (item) =>
        `• ${item.sku ?? item.slug} · ${item.name} × ${item.quantity} = ${formatPrice(item.price * item.quantity)}`,
    ),
    `*Total: ${formatPrice(order.total)}*`,
    "",
    `Name: ${order.customer.name}`,
    `Phone: ${order.customer.phone}`,
    `Delivery: ${order.customer.address}`,
  ];
  if (order.customer.notes) lines.push(`Note: ${order.customer.notes}`);
  return lines.join("\n");
}
