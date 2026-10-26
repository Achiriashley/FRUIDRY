import { randomBytes } from "node:crypto";
import { jsonFile, supabaseConfig, supabaseListAll, supabaseRequest } from "./storage";

// Business clients saved for invoices (admin panel → Invoices → Clients): name,
// contact person, phone, email, address, tax number (NIU) and a private note.
// Invoices keep their own copy of the client's details, so editing or deleting a
// client doesn't change invoices already made.

export const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
export const CLIENT_FIELDS = ["name", "contact", "phone", "email", "address", "niu", "note"];

const clientsFile = jsonFile("clients.json", []);
const byName = (a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" });

const supabaseStore = {
  add: (config, client) =>
    supabaseRequest(config, "clients", "", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: client.id,
        name: client.name,
        created_at: client.createdAt,
        data: client,
      }),
    }),
  update: (config, client) =>
    supabaseRequest(config, "clients", `?id=eq.${encodeURIComponent(client.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ name: client.name, data: client }),
    }),
  remove: (config, id) =>
    supabaseRequest(config, "clients", `?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }),
  list: async (config) =>
    (await supabaseListAll(config, "clients", "select=data&order=name.asc,id.asc")).map(
      (row) => row.data,
    ),
};

const fileStore = {
  add: (client) => clientsFile.update((list) => [...list, client]),
  update: (client) =>
    clientsFile.update((list) => list.map((c) => (c.id === client.id ? client : c))),
  remove: (id) => clientsFile.update((list) => list.filter((c) => c.id !== id)),
  list: () => clientsFile.read(),
};

export async function listClients() {
  const config = supabaseConfig();
  return (config ? await supabaseStore.list(config) : await fileStore.list()).sort(byName);
}

export async function getClient(id) {
  if (!CLIENT_ID_PATTERN.test(String(id ?? ""))) return null;
  return (await listClients()).find((c) => c.id === id) ?? null;
}

export async function addClient(fields) {
  const client = {
    id: randomBytes(9).toString("base64url"),
    ...fields,
    createdAt: new Date().toISOString(),
  };
  const config = supabaseConfig();
  await (config ? supabaseStore.add(config, client) : fileStore.add(client));
  return client;
}

export async function updateClient(client) {
  const config = supabaseConfig();
  await (config ? supabaseStore.update(config, client) : fileStore.update(client));
}

export async function deleteClient(id) {
  if (!CLIENT_ID_PATTERN.test(String(id ?? ""))) return;
  const config = supabaseConfig();
  await (config ? supabaseStore.remove(config, id) : fileStore.remove(id));
}
