import { getDictionary } from "./i18n";
import { formatPrice } from "./products";

// The message a customer sends to the shop on WhatsApp to place an order, in the
// language they ordered in.
export function orderMessage(order) {
  const t = getDictionary(order.lang ?? "en").whatsapp;
  const lines = [
    t.greeting,
    "",
    `*${t.order} ${order.reference}*`,
    ...order.items.map(
      (item) =>
        `• ${item.sku ?? item.slug} · ${item.name} × ${item.quantity} = ${formatPrice(item.price * item.quantity)}`,
    ),
    `*${t.total}${t.colon} ${formatPrice(order.total)}*`,
    "",
    `${t.name}${t.colon} ${order.customer.name}`,
    `${t.phone}${t.colon} ${order.customer.phone}`,
    `${t.delivery}${t.colon} ${order.customer.address}`,
  ];
  if (order.customer.notes) lines.push(`${t.note}${t.colon} ${order.customer.notes}`);
  return lines.join("\n");
}
