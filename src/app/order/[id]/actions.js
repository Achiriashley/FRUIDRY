"use server";

import { refresh } from "next/cache";
import { ORDER_STATUS, getOrder, saveOrder } from "@/lib/orders";
import { normalizeCameroonPhone } from "@/lib/shop-config";

export async function submitPayment(_prev, formData) {
  const order = await getOrder(String(formData.get("orderId") ?? ""));
  if (!order) return { status: "error", errors: { form: "We couldn't find this order." } };
  if (![ORDER_STATUS.awaitingPayment, ORDER_STATUS.rejected].includes(order.status)) {
    return { status: "error", errors: { form: "This order's payment has already been sent." } };
  }

  const transactionId = String(formData.get("transactionId") ?? "").trim();
  const payerPhone = normalizeCameroonPhone(formData.get("payerPhone"));

  const errors = {};
  if (!/^[A-Za-z0-9.\-]{4,40}$/.test(transactionId)) {
    errors.transactionId = "Enter the transaction ID from your Mobile Money SMS.";
  }
  if (!payerPhone) errors.payerPhone = "Enter the number you paid from, e.g. 6XX XX XX XX.";
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  await saveOrder({
    ...order,
    status: ORDER_STATUS.paymentSubmitted,
    payment: { transactionId, payerPhone, submittedAt: new Date().toISOString() },
    rejection: null,
  });
  refresh();
  return { status: "success" };
}
