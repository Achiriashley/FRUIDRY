// Security: headers and CSP, sign-in lockout, forged or expired admin cookies, replayed
// admin actions, tampered orders, XSS, rate limits, no personal data in the server log,
// and the image proxy.
//
// The log check reads the server's output from SERVER_LOG (set by tests/run.mjs).
import { createHmac } from "node:crypto";
import fs from "node:fs";
import {
  ADMIN_PASSWORD as PASSWORD,
  BASE_URL as B,
  check,
  finish,
  launch,
  signPayload as signTok,
  skip,
} from "./lib.mjs";

const b = await launch({ adminHarness: true });

// ---------- 1. Headers ----------
for (const path of ["/en", "/fr", "/admin", "/en/shop/mixed-fruit-pack"]) {
  const res = await fetch(B + path);
  const h = res.headers;
  check(
    `headers on ${path}`,
    !!h.get("content-security-policy") &&
      h.get("x-content-type-options") === "nosniff" &&
      !!h.get("referrer-policy") &&
      !!h.get("permissions-policy") &&
      h.get("x-frame-options") === "DENY" &&
      !h.get("x-powered-by"),
    `CSP frame-ancestors=${/frame-ancestors 'none'/.test(h.get("content-security-policy") ?? "")}, x-powered-by=${h.get("x-powered-by") ?? "absent"}`,
  );
}

// ---------- 2. CSP must not break the site ----------
const ctx = await b.newContext({ locale: "en-GB", viewport: { width: 1100, height: 900 } });
await ctx.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
const cspErrors = [];
const watch = (p) => {
  p.on("console", (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text()))
      cspErrors.push(m.text().slice(0, 160));
  });
  p.on("pageerror", (e) => cspErrors.push("pageerror: " + e.message.slice(0, 160)));
};
const c = await ctx.newPage();
watch(c);
for (const path of [
  "/fr",
  "/fr/shop",
  "/en",
  "/en/shop",
  "/en/shop/mixed-fruit-pack",
  "/en/about",
  "/en/contact",
  "/en/cart",
]) {
  await c.goto(B + path, { waitUntil: "load" });
  await c.waitForTimeout(700);
}
await c.getByRole("link", { name: "Shop" }).first().click();
await c.waitForTimeout(500);
check(
  "pages load with no CSP violations or script errors",
  cspErrors.length === 0,
  cspErrors.join(" | "),
);
const hydrated = await c.evaluate(() => !!document.querySelector("button"));
await c.goto(B + "/en/shop/mixed-fruit-pack");
await c.waitForTimeout(600);
await c.getByRole("button", { name: "Add to cart" }).first().click();
await c.waitForTimeout(300);
check(
  "interactive JS works under CSP (cart badge updates)",
  hydrated && /1/.test(await c.getByRole("link", { name: /Cart/ }).first().innerText()),
);

// ---------- 3. Admin sign-in lockout ----------
const a = await ctx.newPage();
watch(a);
await a.goto(B + "/admin");
await a.waitForTimeout(600);
const pw = () => a.locator('input[name="password"]:visible');
for (let i = 1; i <= 5; i++) {
  await pw().fill("wrong-" + i);
  await a.getByRole("button", { name: "Sign in" }).first().click();
  await a.getByText("Wrong password.").first().waitFor();
}
await pw().fill(PASSWORD);
await a.getByRole("button", { name: "Sign in" }).first().click();
await a
  .getByText(/Too many sign-in attempts/)
  .first()
  .waitFor({ timeout: 10000 })
  .catch(() => {});
const locked = await a.getByText(/Too many sign-in attempts/).count();
check(
  "6th attempt is blocked even with the right password",
  locked > 0,
  await a
    .locator("p.text-red-600:visible")
    .first()
    .innerText()
    .catch(() => ""),
);

// ---------- 4. Cookie forgery ----------
const now = Math.floor(Date.now() / 1000);
const oldStyle = createHmac("sha256", PASSWORD).update("fruidry-admin-session").digest("hex");
const cases = {
  "old-format cookie (before this change)": oldStyle,
  "7-day cookie from the previous version": signTok(`v2.${now + 3600}`),
  "forged token with wrong signature": `v3.${now}.${now}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
  "idle for 31 minutes": signTok(`v3.${now - 3600}.${now - 31 * 60}`),
  "signed in more than 8 hours ago": signTok(`v3.${now - 9 * 3600}.${now - 60}`),
  "tampered last-activity time": signTok(`v3.${now - 3600}.${now - 3500}`).replace(
    `.${now - 3500}.`,
    `.${now}.`,
  ),
  "valid token (control)": signTok(`v3.${now - 60}.${now - 60}`),
};
for (const [name, value] of Object.entries(cases)) {
  const res = await fetch(B + "/admin/orders", { headers: { cookie: `fruidry_admin=${value}` } });
  const html = await res.text();
  const isIn = html.includes("Sign out");
  const expectIn = name.includes("control");
  check(`admin cookie: ${name}`, isIn === expectIn, isIn ? "signed in" : "rejected");
}

// ---------- 5. Replaying admin actions without a session ----------
const admin = await b.newContext();
await admin.addCookies([{ name: "fruidry_admin", value: signTok(`v3.${now}.${now}`), url: B }]);
const ap = await admin.newPage();
let captured = null;
ap.on("request", (r) => {
  if (r.method() === "POST" && r.headers()["next-action"] && r.url().includes("/admin/products/")) {
    captured = { url: r.url(), headers: r.headers(), body: r.postDataBuffer() };
  }
});
await ap.goto(B + "/admin/products/mixed-fruit-pack");
await ap.waitForTimeout(800);
const form = ap.locator("form:visible", { has: ap.locator('input[name="price"]') }).first();
await form.getByLabel("Price (FCFA)").fill("2600");
await form.getByRole("button", { name: "Save changes" }).click();
await ap.getByText("Saved ✓").first().waitFor();
check("admin can still save products when signed in", true);
if (captured) {
  const body = Buffer.from(captured.body.toString("latin1").replace(/2600/g, "1"), "latin1");
  const h = { ...captured.headers };
  delete h.cookie;
  delete h["content-length"];
  const res = await fetch(captured.url, { method: "POST", headers: h, body });
  const text = await res.text();
  const page = await (await fetch(B + "/en/shop/mixed-fruit-pack")).text();
  check(
    "replayed product save WITHOUT cookie is refused",
    /sign in again/i.test(text) && !/>1\s?FCFA</.test(page),
    `status ${res.status}`,
  );
} else check("captured product save request for replay", false);

// ---------- 6. Order tampering & limits ----------
const o = await ctx.newPage();
watch(o);
async function placeWith(items, name = "Test") {
  await o.goto(B + "/en/shop/mixed-fruit-pack");
  await o.waitForTimeout(400);
  await o.getByRole("button", { name: "Add to cart" }).first().click();
  await o.waitForTimeout(300);
  await o.goto(B + "/en/checkout");
  await o.waitForTimeout(800);
  const f = o.locator("form:visible", { has: o.locator('input[name="phone"]') }).first();
  await f.getByLabel("Full name").fill(name);
  await f.getByLabel("Phone number").fill("677123456");
  await f.getByLabel("Delivery address").fill("Douala");
  if (items) await f.locator('input[name="items"]').evaluate((el, v) => (el.value = v), items);
  const nav = o
    .waitForURL("https://wa.me/**", { timeout: 8000 })
    .then(() => "sent")
    .catch(() => "not sent");
  await f.getByRole("button", { name: "Order on WhatsApp" }).click();
  const outcome = await nav;
  const err =
    outcome === "sent"
      ? ""
      : await o
          .locator("p.text-red-600:visible")
          .first()
          .innerText()
          .catch(() => "");
  const url = outcome === "sent" ? o.url() : "";
  return { outcome, err, url };
}
const tamper = {
  "price field injected": JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 1, price: 1 }]),
  "negative quantity": JSON.stringify([{ slug: "mixed-fruit-pack", quantity: -5 }]),
  "zero quantity": JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 0 }]),
  "huge quantity": JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 100000 }]),
  "fractional quantity": JSON.stringify([{ slug: "mixed-fruit-pack", quantity: 1.5 }]),
  "unknown product": JSON.stringify([{ slug: "free-stuff", quantity: 1 }]),
  "not JSON": "<script>",
};
let sentCount = 0;
for (const [name, items] of Object.entries(tamper)) {
  const r = await placeWith(items);
  if (r.outcome === "sent") sentCount++;
  if (name === "price field injected") {
    const text = r.url ? new URL(r.url).searchParams.get("text") : "";
    check(
      "injected price is ignored (server price used)",
      r.outcome === "sent" && /2[\s ]?600/.test(text) && !/= 1 FCFA/.test(text),
      text.split("\n").find((l) => l.startsWith("•")) ?? r.err,
    );
  } else {
    check(`rejected: ${name}`, r.outcome === "not sent", r.err);
  }
}
// XSS attempt in customer fields
const xss = await placeWith(
  null,
  `<img src=x onerror="window.__xss=1">"><script>window.__xss=1</script>`,
);
if (xss.outcome === "sent") sentCount++;
const ap2 = await admin.newPage();
let dialog = false;
ap2.on("dialog", (d) => {
  dialog = true;
  d.dismiss();
});
await ap2.goto(B + "/admin/orders");
await ap2.waitForTimeout(1000);
const fired = await ap2.evaluate(() => window.__xss === 1);
const shownAsText = await ap2
  .getByText("<script>window.__xss=1</script>", { exact: false })
  .count();
check(
  "XSS payload in order name is shown as text, not executed (admin page)",
  !fired && !dialog && shownAsText > 0,
);
// Order rate limit: 10/hour per visitor — keep ordering until blocked
let blockedAt = null;
for (let i = sentCount + 1; i <= 12; i++) {
  const r = await placeWith(null, "Limit test " + i);
  if (r.outcome !== "sent") {
    blockedAt = { i, err: r.err };
    break;
  }
}
check(
  "orders are limited to 10 per hour per visitor",
  blockedAt?.i === 11,
  blockedAt ? `blocked at order ${blockedAt.i}: ${blockedAt.err}` : "never blocked",
);

// ---------- 7. Contact form: no personal data in logs, limited ----------
const ct = await ctx.newPage();
watch(ct);
let contactBlocked = null;
for (let i = 1; i <= 6; i++) {
  await ct.goto(B + "/en/contact");
  await ct.waitForTimeout(600);
  const again = ct.getByRole("button", { name: "Write another message" });
  if (await again.count()) {
    await again.first().click();
    await ct.waitForTimeout(300);
  }
  const f = ct.locator("form:visible", { has: ct.locator('textarea[name="message"]') }).first();
  await f.getByLabel("Name").fill("Privacy Tester");
  await f.getByLabel("Email").fill("privacy.tester@example.com");
  await f.getByLabel("Message").fill("Hello, this is a test message " + i);
  await f.getByRole("button", { name: "Send on WhatsApp" }).click();
  await ct.waitForTimeout(900);
  if (await ct.getByText(/Too many messages/).count()) {
    contactBlocked = i;
    break;
  }
}
check(
  "contact form limited to 5 per hour",
  contactBlocked === 6,
  `blocked at message ${contactBlocked}`,
);
if (process.env.SERVER_LOG) {
  const log = fs.readFileSync(process.env.SERVER_LOG, "utf8");
  check(
    "server log has no customer names/emails/messages",
    !/privacy\.tester@example\.com|Privacy Tester|test message/.test(log),
  );
} else {
  skip(
    "server log has no customer names/emails/messages",
    "set SERVER_LOG to the server's log file to check it",
  );
}

// ---------- 8. Image proxy restricted ----------
const img = await fetch(
  B +
    "/_next/image?url=" +
    encodeURIComponent("https://evil.supabase.co/storage/v1/object/public/x.png") +
    "&w=640&q=75",
);
check("image proxy refuses other Supabase projects", img.status === 400, `status ${img.status}`);

check(
  "no CSP violations anywhere during the tests",
  cspErrors.length === 0,
  cspErrors.slice(0, 3).join(" | "),
);
finish();
await b.close();
