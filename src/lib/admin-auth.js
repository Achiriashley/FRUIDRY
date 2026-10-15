import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "fruidry_admin";

// Admin sign-ins are short-lived, so the panel asks for the password again after
// each session:
// - the cookie is a browser-session cookie: closing the browser signs you out (unless
//   the browser reopens your last tabs; the idle limit still applies then);
// - 30 minutes without any activity in the admin panel (in any tab) signs you out;
// - after 8 hours you must sign in again, even if you've been active.
// Both times are inside the signed token and checked on the server, so an old or
// copied cookie stops working on its own.
export const IDLE_SECONDS = 30 * 60;
const MAX_SECONDS = 8 * 60 * 60;

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

const nowSeconds = () => Math.floor(Date.now() / 1000);

function sessionToken(issuedAt, lastActive) {
  const payload = `v3.${issuedAt}.${lastActive}`;
  return `${payload}.${sign(payload)}`;
}

// The session in a cookie, or null if it's forged, from an older version, idle for
// too long or older than the 8-hour limit.
function readSession(token) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 4 || parts[0] !== "v3") return null;
  const [version, issued, last, signature] = parts;
  if (!digestEqual(signature, sign(`${version}.${issued}.${last}`))) return null;
  const issuedAt = Number(issued);
  const lastActive = Number(last);
  const now = nowSeconds();
  if (!Number.isInteger(issuedAt) || !Number.isInteger(lastActive)) return null;
  if (lastActive < issuedAt || lastActive > now + 60) return null;
  if (now - issuedAt > MAX_SECONDS || now - lastActive > IDLE_SECONDS) return null;
  return { issuedAt, lastActive };
}

async function currentSession() {
  if (!adminPasswordConfigured()) return null;
  return readSession((await cookies()).get(ADMIN_COOKIE)?.value);
}

async function setSessionCookie(token) {
  // No maxAge or expires: the browser deletes the cookie when it's closed (unless it
  // reopens your last tabs).
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function isAdmin() {
  return (await currentSession()) !== null;
}

export async function startAdminSession() {
  const now = nowSeconds();
  await setSessionCookie(sessionToken(now, now));
}

// How the session is doing, or null if it has ended: seconds since the last activity
// (in any tab) and seconds left before the 8-hour limit. With `active`, it also records
// activity, which keeps the session going. Recording only works where cookies can be
// set: Server Actions and Route Handlers.
export async function adminSessionStatus({ active = false } = {}) {
  const session = await currentSession();
  if (!session) return null;
  const now = nowSeconds();
  if (active) await setSessionCookie(sessionToken(session.issuedAt, now));
  return {
    idleSeconds: active ? 0 : Math.max(0, now - session.lastActive),
    secondsLeft: session.issuedAt + MAX_SECONDS - now,
  };
}

// Records activity in the admin panel. Returns false if the session has already ended.
export async function touchAdminSession() {
  return (await adminSessionStatus({ active: true })) !== null;
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
