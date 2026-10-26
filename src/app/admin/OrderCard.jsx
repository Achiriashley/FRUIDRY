import Link from "next/link";
import { ORDER_STATUS, STATUS_LABELS, formatOrderDate, isPaid } from "@/lib/orders";
import { momoPayCode, whatsAppLink } from "@/lib/shop-config";
import { formatPrice } from "@/lib/products";
import {
  confirmPayment,
  markDelivered,
  rejectPayment,
  reopenOrder,
  undoDelivered,
  undoPayment,
} from "./actions";
import { ConfirmButton } from "./ConfirmButton";

const STATUS_STYLES = {
  awaiting_payment: "bg-stone-100 text-stone-700",
  payment_submitted: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// The customer's order page, in the language they ordered in.
function orderPath(order) {
  return order.lang ? `/${order.lang}/order/${order.id}` : `/order/${order.id}`;
}

// Messages to the customer are written in the language they ordered in.
function receiptMessage(order, siteUrl) {
  const { name } = order.customer;
  const link = `${siteUrl}${orderPath(order)}`;
  return order.lang === "fr"
    ? `Bonjour ${name}, votre paiement Fruidry de ${formatPrice(order.total)} pour la ` +
        `commande ${order.reference} est confirmé. Votre reçu : ${link}`
    : `Hello ${name}, your Fruidry payment of ${formatPrice(order.total)} ` +
        `for order ${order.reference} is confirmed. Your receipt: ${link}`;
}

// Asks a new order's customer to pay with MTN Mobile Money and send a screenshot.
// The code is between ``` so WhatsApp shows its * as typed (not as bold).
function paymentRequestMessage(order) {
  const { name } = order.customer;
  const total = formatPrice(order.total);
  const code = "```" + momoPayCode(order.total) + "```";
  const lines =
    order.lang === "fr"
      ? [
          `Bonjour ${name} 👋 Merci pour votre commande *${order.reference}* !`,
          "",
          `Montant à payer : *${total}*`,
          "",
          "Payez avec MTN Mobile Money en composant :",
          code,
          "",
          "Ensuite, envoyez-nous ici une *capture d'écran du message de confirmation* (avec le " +
            "numéro de transaction). Dès que nous aurons vérifié le paiement, votre commande " +
            "sera confirmée et nous organiserons la livraison. Merci ! 🍓",
        ]
      : [
          `Hello ${name} 👋 Thank you for your order *${order.reference}*!`,
          "",
          `Amount to pay: *${total}*`,
          "",
          "Pay with MTN Mobile Money by dialling:",
          code,
          "",
          "Then send us a *screenshot of the confirmation message* here (showing the " +
            "transaction ID). As soon as we've checked the payment, your order is confirmed " +
            "and we'll arrange delivery. Thank you! 🍓",
        ];
  return lines.join("\n");
}

// New orders that haven't been paid or cancelled.
function asksForPayment(order) {
  return !isPaid(order) && order.status !== ORDER_STATUS.rejected;
}

function customerMessage(order) {
  if (asksForPayment(order)) return paymentRequestMessage(order);
  const { name } = order.customer;
  return order.lang === "fr"
    ? `Bonjour ${name}, ici Fruidry au sujet de votre commande ${order.reference}.`
    : `Hello ${name}, this is Fruidry about your order ${order.reference}.`;
}

const packsText = (n) => `${n} ${n === 1 ? "pack goes" : "packs go"}`;

// What "Undo payment" does besides moving the order back to New orders. Orders marked
// paid before Undo existed have no stockTaken; null means the stock change failed then.
function undoPaymentHint(order) {
  if (order.stockTaken === null) {
    return (
      "The customer's receipt is hidden. The stock count may not have changed when it was " +
      "marked paid, so it isn't changed now: check each product's count on its page."
    );
  }
  if (!order.stockTaken) {
    return (
      "The customer's receipt is hidden. The stock count doesn't change: if you count " +
      "this product's packs, add them back on its page."
    );
  }
  const packs = Object.values(order.stockTaken).reduce((total, n) => total + n, 0);
  return packs > 0
    ? `The customer's receipt is hidden and ${packsText(packs)} back into stock.`
    : "The customer's receipt is hidden.";
}

const UNDO_BUTTON = "text-sm font-semibold text-stone-600 underline hover:text-brand";
const UNDO_YES =
  "rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700";

// A form whose only field is the order: its buttons sit directly in the card's row.
function OrderForm({ action, order, children }) {
  return (
    <form action={action} className="contents">
      <input type="hidden" name="orderId" value={order.id} />
      {children}
    </form>
  );
}

// `invoice`: the order's invoice, if one was made (Invoices).
export function OrderCard({ order, siteUrl, invoice }) {
  const canDecide = !isPaid(order);
  const cancelled = order.status === ORDER_STATUS.rejected;
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono font-semibold">{order.reference}</p>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-lg font-bold">{formatPrice(order.total)}</p>
      </div>
      <p className="mt-1 text-xs text-stone-500">{formatOrderDate(order.createdAt)}</p>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <p className="font-semibold">{order.customer.name}</p>
          <a href={`tel:+237${order.customer.phone}`} className="text-brand hover:underline">
            {order.customer.phone}
          </a>
          <p className="text-stone-600">{order.customer.address}</p>
          {order.customer.notes && (
            <p className="mt-1 text-stone-500">Note: {order.customer.notes}</p>
          )}
        </div>
        <ul className="text-stone-700">
          {order.items.map((item) => (
            <li key={item.slug}>
              {item.name} × {item.quantity}
              {item.sku && (
                <span className="ml-2 font-mono text-xs text-stone-500">{item.sku}</span>
              )}
            </li>
          ))}
        </ul>
        <div>
          {order.payment?.transactionId && (
            <>
              <p className="text-stone-500">Transaction ID</p>
              <p className="font-mono font-semibold break-all">{order.payment.transactionId}</p>
            </>
          )}
          {order.receipt && <p className="mt-1 text-stone-500">Receipt {order.receipt.number}</p>}
          {order.delivery && (
            <p className="text-stone-500">
              Delivered {formatOrderDate(order.delivery.deliveredAt)}
            </p>
          )}
          {order.rejection && (
            <p className="mt-1 text-red-600">Rejected: {order.rejection.reason}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
        {canDecide && (
          <OrderForm action={confirmPayment} order={order}>
            <ConfirmButton
              label="Mark as paid"
              question={`Has the ${formatPrice(order.total)} for ${order.reference} arrived?`}
              hint="Check your MoMo account first: screenshots can be faked. The customer then sees their receipt."
              yes="Yes, mark as paid"
              no="Not yet"
              className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            />
          </OrderForm>
        )}
        {canDecide && !cancelled && (
          <form
            action={rejectPayment}
            className="flex w-full flex-wrap items-center gap-2 sm:w-auto"
          >
            {/* Pressing Enter (or Go on a phone) in the reason box would send the form
                without the question: a disabled first button stops that. */}
            <button type="submit" disabled hidden aria-hidden="true" tabIndex={-1} />
            <input type="hidden" name="orderId" value={order.id} />
            <input
              name="reason"
              aria-label="Reason for cancelling"
              placeholder="Reason (optional)"
              className="rounded-full border border-stone-300 px-3 py-1.5 text-sm"
            />
            <ConfirmButton
              label="Cancel order"
              question={`Cancel ${order.reference}?`}
              hint="The customer's order page will say it's cancelled, with your reason if you typed one."
              yes="Yes, cancel order"
              no="Keep it"
              className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              yesClassName="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            />
          </form>
        )}
        {order.status === ORDER_STATUS.confirmed && (
          <OrderForm action={markDelivered} order={order}>
            <ConfirmButton
              label="Mark as delivered"
              question={`Has ${order.reference} been delivered?`}
              hint="The customer's receipt will then ask them to review what they bought."
              yes="Yes, mark as delivered"
              no="Not yet"
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
            />
          </OrderForm>
        )}
        <a
          href={whatsAppLink(`237${order.customer.phone}`, customerMessage(order))}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-[#25D366] px-4 py-2 text-sm font-semibold text-brand hover:bg-green-50"
        >
          {asksForPayment(order) ? "Ask for payment on WhatsApp" : "Message on WhatsApp"}
        </a>
        {isPaid(order) && (
          <a
            href={whatsAppLink(`237${order.customer.phone}`, receiptMessage(order, siteUrl))}
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp rounded-full px-4 py-2 text-sm font-semibold"
          >
            Send receipt on WhatsApp
          </a>
        )}
        {/* In a new tab: coming back to the panel would be a page load, which asks for the password. */}
        <Link
          href={orderPath(order)}
          target="_blank"
          className="text-sm text-stone-600 underline hover:text-brand"
        >
          {isPaid(order) ? "View receipt" : "View customer page"}
        </Link>
        {invoice ? (
          <Link
            href={`/admin/invoices/${invoice.id}`}
            className="text-sm text-stone-600 underline hover:text-brand"
          >
            Invoice {invoice.number}
          </Link>
        ) : (
          !cancelled && (
            <Link
              href={`/admin/invoices/new?order=${order.id}`}
              className="text-sm text-stone-600 underline hover:text-brand"
            >
              Make an invoice
            </Link>
          )
        )}
        {/* Undo for a wrong tap: one step back each time. */}
        {order.status === ORDER_STATUS.confirmed && (
          <OrderForm action={undoPayment} order={order}>
            <ConfirmButton
              label="Undo payment"
              question={`Move ${order.reference} back to New orders?`}
              hint={undoPaymentHint(order)}
              yes="Yes, undo payment"
              no="Keep it paid"
              className={UNDO_BUTTON}
              yesClassName={UNDO_YES}
            />
          </OrderForm>
        )}
        {order.status === ORDER_STATUS.delivered && (
          <OrderForm action={undoDelivered} order={order}>
            <ConfirmButton
              label="Undo delivery"
              question={`Move ${order.reference} back to Paid, to deliver?`}
              hint="The customer's receipt stops asking them for a review."
              yes="Yes, undo delivery"
              no="Keep it delivered"
              className={UNDO_BUTTON}
              yesClassName={UNDO_YES}
            />
          </OrderForm>
        )}
        {cancelled && (
          <OrderForm action={reopenOrder} order={order}>
            <ConfirmButton
              label="Undo cancel"
              question={`Reopen ${order.reference}?`}
              hint="It goes back to New orders, and the customer's page no longer says it's cancelled."
              yes="Yes, reopen order"
              no="Keep it cancelled"
              className={UNDO_BUTTON}
              yesClassName={UNDO_YES}
            />
          </OrderForm>
        )}
      </div>
    </article>
  );
}
