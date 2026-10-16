// Shared helpers for the end-to-end suites in this folder.
//
// Each suite is a plain Node script that drives a real browser against a running shop:
//   npm run test:e2e              (all suites, each against its own throwaway server)
//   npm run test:e2e -- stock     (some suites)
// tests/run.mjs builds a copy of the app, starts it with test settings and sets BASE_URL.
// A suite can also be run on its own against a server you started yourself:
//   BASE_URL=http://localhost:3150 node tests/e2e/stock.test.mjs
// The suites place orders, change products and stock, and try wrong passwords, so never
// point them at a shop with real data.

import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const HERE = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.BASE_URL) {
  console.error(
    "BASE_URL is not set. Run the suites with `npm run test:e2e`, which starts a throwaway " +
      "server, or set BASE_URL to a test server (never one with real shop data).",
  );
  process.exit(2);
}

/** The shop under test, without a trailing slash, e.g. http://localhost:3150 */
export const BASE_URL = process.env.BASE_URL.replace(/\/$/, "");

/** The admin password the test server was started with. */
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test-pass-123";

// ---------- Results ----------

const results = [];
let skipped = 0;
let finished = false;

/** Records one check and prints a PASS/FAIL line. */
export function check(name, ok, detail = "") {
  const passed = Boolean(ok);
  results.push(passed);
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  return passed;
}

/** A check that can't run here (it isn't counted). */
export function skip(name, reason) {
  skipped++;
  console.log(`SKIP  ${name} — ${reason}`);
}

function summary() {
  const passed = results.filter(Boolean).length;
  const note = skipped ? ` (${skipped} skipped)` : "";
  console.log(`\n${passed}/${results.length} checks passed${note}`);
  return passed === results.length && results.length > 0;
}

/** Prints "N/M checks passed" and makes the process fail if any check failed. */
export function finish() {
  finished = true;
  if (!summary()) process.exitCode = 1;
}

// A suite that throws stops early: Node exits with code 1 after printing the error.
// Say so next to the checks that did run.
process.on("exit", (code) => {
  if (finished) return;
  console.log("\nFAIL  the suite stopped before the end (see the error above)");
  summary();
  if (!code) process.exitCode = 1;
});

// ---------- Browser ----------

/**
 * Test harness for admin pages. The site asks for the password on every full page load
 * of the admin panel (tested in reload.test.mjs), but most suites open admin pages
 * directly with an existing sign-in. This makes the context's admin page loads look like
 * in-panel requests: they're fetched by Playwright (browsers don't let Sec-Fetch-Dest be
 * changed) with Sec-Fetch-Dest: empty.
 */
export async function adminHarness(context) {
  await context.route(/\/admin(\/|\?|$)/, async (route) => {
    const req = route.request();
    if (req.resourceType() !== "document") return route.fallback();
    const response = await route.fetch({
      headers: { ...req.headers(), "sec-fetch-dest": "empty", accept: "*/*" },
      maxRedirects: 0,
    });
    return route.fulfill({ response });
  });
}

/**
 * Starts Chromium (CHROMIUM_PATH picks a specific executable).
 * With { adminHarness: true }, every context the browser opens gets adminHarness().
 */
export async function launch({ adminHarness: withHarness = false } = {}) {
  const executablePath = process.env.CHROMIUM_PATH || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  if (withHarness) {
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (...args) => {
      const context = await newContext(...args);
      await adminHarness(context);
      return context;
    };
    browser.newPage = async (...args) => (await browser.newContext(...args)).newPage();
  }
  return browser;
}

// ---------- Admin sign-in cookies ----------

const signingKey = () =>
  createHmac("sha256", ADMIN_PASSWORD).update("fruidry-admin-session-v2").digest();

/** Signs any payload the way the server signs admin cookies: "<payload>.<signature>". */
export function signPayload(payload) {
  return `${payload}.${createHmac("sha256", signingKey()).update(payload).digest("base64url")}`;
}

/** A valid fruidry_admin cookie value for a sign-in at issuedAt, last active at lastActive. */
export function signToken(issuedAt, lastActive = issuedAt) {
  return signPayload(`v3.${issuedAt}.${lastActive}`);
}

/** Current time in whole seconds, as used in admin cookies. */
export const nowS = () => Math.floor(Date.now() / 1000);

// ---------- Files ----------

/** Path of a file in tests/e2e/fixtures/. */
export function fixture(name) {
  const file = path.join(HERE, "fixtures", name);
  if (!fs.existsSync(file)) throw new Error(`Missing test fixture: ${file}`);
  return file;
}

/** Path for a screenshot or other output in tests/e2e/.artifacts/ (not committed). */
export function artifact(name) {
  const dir = path.join(HERE, ".artifacts");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}
