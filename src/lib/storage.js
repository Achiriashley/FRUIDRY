import fs from "node:fs/promises";
import path from "node:path";

// Shared storage for orders and product details. Uses Supabase when
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, and otherwise JSON files
// in data/ (fine for local development or a single server, but not for hosts
// with a read-only filesystem such as Vercel).

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

export async function supabaseRequest(config, table, query, init = {}) {
  const res = await fetch(`${config.url}/rest/v1/${table}${query}`, {
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
  return res.status === 204 || res.status === 201 ? null : res.json();
}

const DATA_DIR = path.join(process.cwd(), "data");
const locks = new Map();

// A JSON file holding one value. update() serialises read-modify-write cycles so
// concurrent requests don't overwrite each other.
export function jsonFile(name, fallback) {
  const file = path.join(DATA_DIR, name);

  async function read() {
    try {
      return JSON.parse(await fs.readFile(file, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return structuredClone(fallback);
      throw error;
    }
  }

  async function write(value) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(value, null, 2));
    await fs.rename(tmp, file);
  }

  function update(change) {
    const previous = locks.get(file) ?? Promise.resolve();
    const run = previous.then(async () => {
      const next = await change(await read());
      await write(next);
    });
    locks.set(
      file,
      run.catch(() => {}),
    );
    return run;
  }

  return { read, update };
}
