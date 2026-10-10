import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Orders are stored in Supabase when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// are set, and otherwise in data/orders.json (fine for local development or a
// single server, but not for hosts with a read-only filesystem such as Vercel).

export const ORDER_STATUS = {
  awaitingPayment: "awaiting_payment",
  paymentSubmitted: "payment_submitted",
  confirmed: "confirmed",
  rejected: "rejected",
};

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

// ---------- Supabase backend ----------

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function supabaseRequest(config, query, init = {}) {
  const res = await fetch(`${config.url}/rest/v1/orders${query}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase request failed (${res.status}): ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

const supabaseStore = {
  async create(config, order) {
    await supabaseRequest(config, "", {
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
    const rows = await supabaseRequest(config, `?id=eq.${encodeURIComponent(id)}&select=data`);
    return rows[0]?.data ?? null;
  },
  async list(config) {
    const rows = await supabaseRequest(config, "?select=data&order=created_at.desc&limit=500");
    return rows.map((r) => r.data);
  },
  async save(config, order) {
    await supabaseRequest(config, `?id=eq.${encodeURIComponent(order.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: order.status, data: order }),
    });
  },
};

// ---------- Local file backend ----------

const DATA_FILE = path.join(process.cwd(), "data", "orders.json");
let fileQueue = Promise.resolve();

async function readFileOrders() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

// Serialises read-modify-write cycles so concurrent requests don't overwrite each other.
function withFileLock(fn) {
  const run = fileQueue.then(fn, fn);
  fileQueue = run.catch(() => {});
  return run;
}

async function writeFileOrders(orders) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(orders, null, 2));
  await fs.rename(tmp, DATA_FILE);
}

const fileStore = {
  create: (order) =>
    withFileLock(async () => {
      const orders = await readFileOrders();
      orders.push(order);
      await writeFileOrders(orders);
    }),
  async get(id) {
    const orders = await readFileOrders();
    return orders.find((o) => o.id === id) ?? null;
  },
  async list() {
    const orders = await readFileOrders();
    return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  save: (order) =>
    withFileLock(async () => {
      const orders = await readFileOrders();
      const index = orders.findIndex((o) => o.id === order.id);
      if (index === -1) throw new Error(`Order ${order.id} not found`);
      orders[index] = order;
      await writeFileOrders(orders);
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
