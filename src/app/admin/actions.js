"use server";

import { refresh } from "next/cache";
import { endAdminSession, isAdmin, passwordMatches, startAdminSession } from "@/lib/admin-auth";
import { ORDER_STATUS, getOrder, newReceiptNumber, saveOrder } from "@/lib/orders";

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
    order.status === ORDER_STATUS.confirmed
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
    "We could not find this payment. Please check the transaction ID and try again.";
  await updateOrder(formData, (order) =>
    order.status === ORDER_STATUS.confirmed
      ? null
      : {
          ...order,
          status: ORDER_STATUS.rejected,
          rejection: { reason, rejectedAt: new Date().toISOString() },
        },
  );
}
