import { getDictionary } from "./i18n";
import { formatPrice } from "./products";

// The message a customer sends to the shop on WhatsApp to place an order, in the
// language they ordered in.
export function orderMessage(order) {
  const { whatsapp: t, colon } = getDictionary(order.lang ?? "en");
  const lines = [
    t.greeting,
    "",
    `*${t.order} ${order.reference}*`,
    ...order.items.map(
      (item) =>
        `• ${item.sku ?? item.slug} · ${item.name} × ${item.quantity} = ${formatPrice(item.price * item.quantity)}`,
    ),
    `*${t.total}${colon} ${formatPrice(order.total)}*`,
    "",
    `${t.name}${colon} ${order.customer.name}`,
    `${t.phone}${colon} ${order.customer.phone}`,
    `${t.delivery}${colon} ${order.customer.address}`,
  ];
  if (order.customer.notes) lines.push(`${t.note}${colon} ${order.customer.notes}`);
  return lines.join("\n");
}
