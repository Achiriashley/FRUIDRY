import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "fruidry_admin";

export function adminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

// The cookie holds an HMAC of the password, so changing ADMIN_PASSWORD logs everyone out.
function sessionToken() {
  return createHmac("sha256", process.env.ADMIN_PASSWORD)
    .update("fruidry-admin-session")
    .digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function passwordMatches(candidate) {
  return adminPasswordConfigured() && safeEqual(candidate, process.env.ADMIN_PASSWORD);
}

export async function isAdmin() {
  if (!adminPasswordConfigured()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(value) && safeEqual(value, sessionToken());
}

export async function startAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
