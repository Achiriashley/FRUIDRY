import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "fruidry_admin";

// Sessions last 7 days. The expiry is inside the signed token and checked on
// the server, so an old or copied cookie stops working on its own.
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export function adminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

// Signing key derived from the password: changing ADMIN_PASSWORD signs everyone out.
function signingKey() {
  return createHmac("sha256", process.env.ADMIN_PASSWORD)
    .update("fruidry-admin-session-v2")
    .digest();
}

function sign(payload) {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

// Compares fixed-length digests so the time taken doesn't reveal the password's length.
function digestEqual(a, b) {
  const left = createHash("sha256").update(String(a)).digest();
  const right = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(left, right);
}

export function passwordMatches(candidate) {
  return adminPasswordConfigured() && digestEqual(candidate, process.env.ADMIN_PASSWORD);
}

function newSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `v2.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function sessionTokenValid(token) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3 || parts[0] !== "v2") return false;
  const [version, expiresAt, signature] = parts;
  const payload = `${version}.${expiresAt}`;
  if (!digestEqual(signature, sign(payload))) return false;
  return Number(expiresAt) > Math.floor(Date.now() / 1000);
}

export async function isAdmin() {
  if (!adminPasswordConfigured()) return false;
  return sessionTokenValid((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function startAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, newSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
