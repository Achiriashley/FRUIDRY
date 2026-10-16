import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// Shared storage for orders and product details. Uses Supabase when
// SUPABASE_URL and SUPABASE_SECRET_KEY are set, and otherwise JSON files
// in data/ (fine for local development or a single server, but not for hosts
// with a read-only filesystem such as Vercel).

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  // SUPABASE_SERVICE_ROLE_KEY is the older name for the same setting.
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key?.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SECRET_KEY is set to a publishable key. Use the secret key " +
        "(sb_secret_...) or the legacy service_role key from Supabase → Project Settings → API Keys.",
    );
  }
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

export async function supabaseRequest(config, table, query, init = {}) {
  // New secret keys (sb_secret_...) go only in the apikey header. Legacy
  // service_role keys are JWTs ("eyJ...") and also need the Authorization header.
  const isLegacyJwt = config.key.startsWith("eyJ");
  const res = await fetch(`${config.url}/rest/v1/${table}${query}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: config.key,
      ...(isLegacyJwt ? { Authorization: `Bearer ${config.key}` } : {}),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase request failed (${res.status}): ${await res.text()}`);
  }
  // Writes reply with no body (201, 204, or 200 when an upsert updated an existing row).
  const text = await res.text();
  return text ? JSON.parse(text) : null;
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
    if (process.env.VERCEL) {
      throw new Error(
        "Can't save data: Supabase isn't configured for this deployment, and Vercel can't " +
          "save files. Set SUPABASE_URL and SUPABASE_SECRET_KEY for this environment " +
          "(Production and Preview) in Vercel, then redeploy.",
      );
    }
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

// ---------- Uploaded images ----------

export const IMAGE_BUCKET = "product-images";
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Works out the real image type from the file's first bytes, ignoring the type the
// browser claimed. Returns null for anything that isn't a JPEG, PNG or WebP.
export function detectImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

// Saves an uploaded image and returns the URL to show it with.
export async function saveImage(file) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) throw new Error("Uploaded file is not a JPEG, PNG or WebP image");
  const extension = IMAGE_TYPES[type];
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${extension}`;

  const config = supabaseConfig();
  if (config) {
    const isLegacyJwt = config.key.startsWith("eyJ");
    const res = await fetch(`${config.url}/storage/v1/object/${IMAGE_BUCKET}/${name}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: config.key,
        ...(isLegacyJwt ? { Authorization: `Bearer ${config.key}` } : {}),
        "Content-Type": type,
        "Cache-Control": "max-age=31536000",
      },
      body: bytes,
    });
    if (!res.ok) {
      throw new Error(`Supabase image upload failed (${res.status}): ${await res.text()}`);
    }
    return `${config.url}/storage/v1/object/public/${IMAGE_BUCKET}/${name}`;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Can't save images: Supabase isn't configured for this deployment, and Vercel can't " +
        "save files. Set SUPABASE_URL and SUPABASE_SECRET_KEY, then redeploy.",
    );
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), bytes);
  return `/uploads/${name}`;
}

// Reads an image saved by saveImage() without Supabase. Returns null if missing.
export async function readLocalImage(name) {
  if (!/^[a-z0-9-]+\.(jpg|png|webp)$/.test(name)) return null;
  try {
    const bytes = await fs.readFile(path.join(UPLOAD_DIR, name));
    const type = Object.keys(IMAGE_TYPES).find((t) => name.endsWith(`.${IMAGE_TYPES[t]}`));
    return { bytes, type };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
