import { randomBytes } from "node:crypto";
import { jsonFile, supabaseConfig, supabaseRequest } from "./storage";

export const ORDER_STATUS = {
  awaitingPayment: "awaiting_payment",
  paymentSubmitted: "payment_submitted",
  confirmed: "confirmed",
  delivered: "delivered",
  rejected: "rejected",
};

export const STATUS_LABELS = {
  awaiting_payment: "New order",
  // Orders from the old Mobile Money checkout, where the customer sent a transaction ID.
  payment_submitted: "New order",
  confirmed: "Paid, to deliver",
  delivered: "Delivered",
  rejected: "Cancelled",
};

// Orders waiting for you to arrange payment on WhatsApp.
export function isNew(order) {
  return (
    order.status === ORDER_STATUS.awaitingPayment || order.status === ORDER_STATUS.paymentSubmitted
  );
}

// Orders whose payment you confirmed (whether or not they've been delivered yet).
export function isPaid(order) {
  return order.status === ORDER_STATUS.confirmed || order.status === ORDER_STATUS.delivered;
}

const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join("");
}

export function newOrderId() {
  // Unguessable, because the order link is the customer's only way to see it.
  return randomBytes(12).toString("base64url");
}

export function newOrderReference() {
  return `FD-${randomCode(6)}`;
}

export function newReceiptNumber() {
  return `RC-${randomCode(8)}`;
}

const ordersFile = jsonFile("orders.json", []);

const supabaseStore = {
  async create(config, order) {
    await supabaseRequest(config, "orders", "", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: order.id,
        created_at: order.createdAt,
        status: order.status,
        data: order,
      }),
    });
  },
  async get(config, id) {
    const rows = await supabaseRequest(
      config,
      "orders",
      `?id=eq.${encodeURIComponent(id)}&select=data`,
    );
    return rows[0]?.data ?? null;
  },
  async list(config) {
    const rows = await supabaseRequest(
      config,
      "orders",
      "?select=data&order=created_at.desc&limit=1000",
    );
    return rows.map((r) => r.data);
  },
  async save(config, order) {
    await supabaseRequest(config, "orders", `?id=eq.${encodeURIComponent(order.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: order.status, data: order }),
    });
  },
};

const fileStore = {
  create: (order) => ordersFile.update((orders) => [...orders, order]),
  async get(id) {
    const orders = await ordersFile.read();
    return orders.find((o) => o.id === id) ?? null;
  },
  async list() {
    const orders = await ordersFile.read();
    return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  save: (order) =>
    ordersFile.update((orders) => {
      const index = orders.findIndex((o) => o.id === order.id);
      if (index === -1) throw new Error(`Order ${order.id} not found`);
      orders[index] = order;
      return orders;
    }),
};

// ---------- Public API ----------

export async function createOrder(order) {
  const config = supabaseConfig();
  return config ? supabaseStore.create(config, order) : fileStore.create(order);
}

export async function getOrder(id) {
  if (!id || typeof id !== "string") return null;
  const config = supabaseConfig();
  return config ? supabaseStore.get(config, id) : fileStore.get(id);
}

export async function listOrders() {
  const config = supabaseConfig();
  return config ? supabaseStore.list(config) : fileStore.list();
}

export async function saveOrder(order) {
  const config = supabaseConfig();
  return config ? supabaseStore.save(config, order) : fileStore.save(order);
}

export function formatOrderDate(iso) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Douala",
  }).format(new Date(iso));
}
