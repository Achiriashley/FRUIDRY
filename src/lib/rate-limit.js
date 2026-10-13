import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { supabaseConfig, supabaseRequest } from "./storage";

// Simple fixed-window rate limiting for abuse-prone actions (admin sign-in,
// placing orders, the contact form).
//
// With Supabase configured, counts live in the rate_limits table (see
// supabase/schema.sql) so the limit holds across all server instances, which
// matters on Vercel. Without Supabase, or if that table is missing, counts are
// kept in this server's memory: fine locally, weaker on multi-instance hosts.

export const LIMITS = {
  adminLogin: { max: 5, windowSeconds: 15 * 60 },
  placeOrder: { max: 10, windowSeconds: 60 * 60 },
  contact: { max: 5, windowSeconds: 60 * 60 },
};

const memory = new Map();
let warnedAboutFallback = false;

// Identifies the visitor by network address. Hashed so raw IPs are never stored.
async function clientKey() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`fruidry-rate-limit:${ip}`).digest("hex").slice(0, 32);
}

function hitMemory(key, windowSeconds) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowSeconds * 1000 };
    memory.set(key, fresh);
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return fresh;
  }
  entry.count += 1;
  return entry;
}

async function hitSupabase(config, key, windowSeconds) {
  const rows = await supabaseRequest(config, "rpc/hit_rate_limit", "", {
    method: "POST",
    body: JSON.stringify({ p_key: key, p_window_seconds: windowSeconds }),
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  return { count: row.count, resetAt: new Date(row.reset_at).getTime() };
}

// Counts one attempt for this visitor. Returns { allowed, retryAfterSeconds }.
export async function rateLimit(action) {
  const { max, windowSeconds } = LIMITS[action];
  const key = `${action}:${await clientKey()}`;

  let entry;
  const config = supabaseConfig();
  if (config) {
    try {
      entry = await hitSupabase(config, key, windowSeconds);
    } catch (error) {
      if (!warnedAboutFallback) {
        warnedAboutFallback = true;
        console.error(
          "Rate limiting is using in-memory counts because the Supabase rate_limits table " +
            "or hit_rate_limit function is unavailable. Run supabase/schema.sql.",
          error.message,
        );
      }
    }
  }
  entry ??= hitMemory(key, windowSeconds);

  const allowed = entry.count <= max;
  const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
  return { allowed, retryAfterSeconds };
}

export function retryMessage(seconds) {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "a minute" : `${minutes} minutes`;
}
