// Runs the end-to-end suites in tests/e2e/ against a throwaway copy of the shop.
//
//   npm run test:e2e                    all suites
//   npm run test:e2e -- stock reload    only these suites
//   E2E_PORT=3160 npm run test:e2e      another port (default 3150)
//
// Other settings: E2E_SUITE_TIMEOUT (seconds per suite, default 600), CHROMIUM_PATH (a
// Chromium to use instead of Playwright's), EXPECT_ANALYTICS (see privacy.test.mjs).
// Suites get BASE_URL, SERVER_LOG (the server's output) and E2E_DATA_DIR (its data/ folder).
//
// What it does:
// 1. Copies the project into .e2e/app-<port>/ (inside the project, so the copy finds the
//    project's node_modules), leaving out .git, node_modules, .next, data, .e2e, tests,
//    .claude, .vercel, package-lock.json (so Next.js still treats the project folder as
//    the workspace root) and every .env* file.
// 2. Builds that copy once and keeps the build.
// 3. For each suite: restores the build (pages cached by one suite would break the next),
//    empties the copy's data/ folder, starts `next start` on the port, runs the suite,
//    and stops the server. Each suite gets a fresh server because rate limits are kept
//    in the server's memory.
// 4. Deletes the copy, prints a summary and exits with 1 if any suite failed. Server and
//    test output stay in .e2e/logs-<port>/.
//
// Safety: the suites place orders, change products and try wrong passwords. They only
// ever run against the copy, which has its own empty data/ folder, none of your .env
// files, no Supabase settings (so orders are never written to a real database) and a
// test admin password. Nothing outside .e2e/ is written, except screenshots in
// tests/e2e/.artifacts/.

import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUITES_DIR = path.join(ROOT, "tests", "e2e");
const WORK = path.join(ROOT, ".e2e");
const PORT = Number(process.env.E2E_PORT ?? 3150);
const APP = path.join(WORK, `app-${PORT}`);
// The build, kept at the same depth as the copy's .next: it holds relative links to
// packages in node_modules (e.g. .next/node_modules/sharp-<hash>), copied as they are.
const BUILD = path.join(WORK, `build-${PORT}`);
const PRISTINE_NEXT = path.join(BUILD, ".next");
const LOGS = path.join(WORK, `logs-${PORT}`);
const BASE_URL = `http://localhost:${PORT}`;
const SUITE_TIMEOUT_MS = Number(process.env.E2E_SUITE_TIMEOUT ?? 600) * 1000;

// Settings the test server and the suites run with.
const TEST_SETTINGS = {
  ADMIN_PASSWORD: "test-pass-123",
  WHATSAPP_NUMBER: "237600000000",
  NEXT_TELEMETRY_DISABLED: "1",
};

// Left out of the copy (top-level names), as well as .env* files anywhere.
const NOT_COPIED = new Set([
  ".git",
  "node_modules",
  ".next",
  "data",
  ".e2e",
  "tests",
  ".claude",
  ".vercel",
  "package-lock.json",
]);

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");

// ---------- Helpers ----------

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

// The environment for every child process: the developer's, minus anything that could
// point the app at real data or a real deployment, plus the test settings.
function childEnv(extra = {}) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (
      key.startsWith("SUPABASE_") ||
      key.startsWith("NEXT_PUBLIC_") ||
      /^VERCEL(_|$)/.test(key) ||
      key === "SITE_URL" ||
      key === "NODE_ENV" ||
      key === "BASE_URL" ||
      key === "SERVER_LOG" ||
      key === "E2E_DATA_DIR"
    ) {
      delete env[key];
    }
  }
  return { ...env, ...TEST_SETTINGS, ...extra };
}

// Deletes a folder, but only one inside .e2e/.
function removeScratch(dir) {
  const rel = path.relative(WORK, dir);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Refusing to delete ${dir}: it isn't inside ${WORK}`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyProject() {
  removeScratch(APP);
  fs.mkdirSync(APP, { recursive: true });
  for (const name of fs.readdirSync(ROOT)) {
    if (NOT_COPIED.has(name) || name.startsWith(".env")) continue;
    fs.cpSync(path.join(ROOT, name), path.join(APP, name), {
      recursive: true,
      filter: (src) => !path.basename(src).startsWith(".env"),
    });
  }
}

const secondsSince = (start) => Math.round((Date.now() - start) / 1000);

function tail(file, lines = 30) {
  try {
    return fs.readFileSync(file, "utf8").trimEnd().split("\n").slice(-lines).join("\n");
  } catch {
    return "(no log)";
  }
}

// True if nothing is listening on the port (checked on both IPv4 and IPv6 loopback, then
// by trying to listen on it).
async function portIsFree(port) {
  for (const host of ["127.0.0.1", "::1"]) {
    const answered = await new Promise((resolve) => {
      const socket = net.connect({ port, host });
      socket.setTimeout(1000);
      socket.once("connect", () => (socket.destroy(), resolve(true)));
      socket.once("timeout", () => (socket.destroy(), resolve(false)));
      socket.once("error", () => resolve(false));
    });
    if (answered) return false;
  }
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, () => server.close(() => resolve(true)));
  });
}

// Children run in their own process group so the whole group can be stopped.
const running = new Set();

function start(args, { cwd, env, stdio }) {
  const child = spawn(process.execPath, args, { cwd, env, stdio, detached: true });
  const exited = new Promise((resolve) =>
    child.once("exit", (code, signal) => resolve({ code, signal })),
  );
  const entry = { child, exited };
  running.add(entry);
  exited.then(() => running.delete(entry));
  return entry;
}

function signalGroup(child, signal) {
  try {
    process.kill(-child.pid, signal);
  } catch {
    // already gone
  }
}

async function stop({ child, exited }) {
  if (child.exitCode !== null || child.signalCode !== null) {
    signalGroup(child, "SIGKILL"); // anything the process left behind
    return;
  }
  signalGroup(child, "SIGTERM");
  const timer = setTimeout(() => signalGroup(child, "SIGKILL"), 5000);
  await exited;
  clearTimeout(timer);
  signalGroup(child, "SIGKILL");
}

function stopAllNow() {
  for (const { child } of running) signalGroup(child, "SIGKILL");
}
process.on("exit", stopAllNow);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, async () => {
    console.error(`\nStopping (${signal})…`);
    await Promise.all([...running].map(stop));
    process.exit(130);
  });
}

// ---------- Which suites ----------

const available = fs
  .readdirSync(SUITES_DIR)
  .filter((f) => f.endsWith(".test.mjs"))
  .map((f) => f.replace(/\.test\.mjs$/, ""))
  .sort();
const requested = process.argv
  .slice(2)
  .map((arg) => path.basename(arg).replace(/\.test\.mjs$/, ""));
const unknown = requested.filter((name) => !available.includes(name));
if (unknown.length) {
  fail(`Unknown suite: ${unknown.join(", ")}\nAvailable suites: ${available.join(", ")}`);
}
const suites = requested.length ? [...new Set(requested)] : available;

if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535)
  fail(`E2E_PORT must be a port number, got ${process.env.E2E_PORT}`);
if (fs.existsSync(WORK) && fs.lstatSync(WORK).isSymbolicLink())
  fail(`${WORK} must be a folder, not a link.`);

// ---------- Build ----------

if (!(await portIsFree(PORT))) {
  fail(
    `Port ${PORT} is already in use. Stop whatever runs there, or pick another port: E2E_PORT=3160 npm run test:e2e`,
  );
}

fs.mkdirSync(LOGS, { recursive: true });
const buildLog = path.join(LOGS, "build.log");
console.log(
  `Copying the project to ${path.relative(ROOT, APP)}/ and building it (log: ${path.relative(ROOT, buildLog)})…`,
);
const buildStart = Date.now();
copyProject();
{
  const out = fs.openSync(buildLog, "w");
  const build = start([nextBin, "build"], {
    cwd: APP,
    env: childEnv(),
    stdio: ["ignore", out, out],
  });
  const { code } = await build.exited;
  fs.closeSync(out);
  if (code !== 0) fail(`The build failed:\n${tail(buildLog)}`);
}
{
  const links = path.join(APP, ".next", "node_modules");
  const broken = fs.existsSync(links)
    ? fs.readdirSync(links).filter((name) => !fs.existsSync(path.join(links, name)))
    : [];
  if (broken.length) fail(`The build links to packages that can't be found: ${broken.join(", ")}`);
}
removeScratch(BUILD);
fs.mkdirSync(BUILD);
fs.renameSync(path.join(APP, ".next"), PRISTINE_NEXT);
console.log(`Built in ${secondsSince(buildStart)} s.\n`);

// ---------- Suites ----------

async function startServer(serverLog) {
  if (!(await portIsFree(PORT))) throw new Error(`port ${PORT} is already in use`);
  removeScratch(path.join(APP, ".next"));
  fs.cpSync(PRISTINE_NEXT, path.join(APP, ".next"), { recursive: true, verbatimSymlinks: true });
  removeScratch(path.join(APP, "data"));
  const out = fs.openSync(serverLog, "w");
  const server = start([nextBin, "start", "-p", String(PORT)], {
    cwd: APP,
    env: childEnv({ NODE_ENV: "production" }),
    stdio: ["ignore", out, out],
  });
  fs.closeSync(out);
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null || server.child.signalCode !== null) {
      throw new Error(`the server stopped while starting:\n${tail(serverLog)}`);
    }
    const ready = /Ready in/.test(tail(serverLog, 50));
    const answered = await fetch(`${BASE_URL}/admin`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    })
      .then(() => true)
      .catch(() => false);
    if (ready && answered) return server;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await stop(server);
  throw new Error(`the server didn't answer within 60 s:\n${tail(serverLog)}`);
}

async function runSuite(name) {
  const serverLog = path.join(LOGS, `${name}.server.log`);
  const testLog = path.join(LOGS, `${name}.test.log`);
  const begin = Date.now();
  let server;
  try {
    server = await startServer(serverLog);
  } catch (error) {
    console.log(`FAIL  couldn't start the test server: ${error.message}`);
    return {
      name,
      ok: false,
      checks: "–",
      seconds: secondsSince(begin),
      note: "server didn't start",
    };
  }
  let output = "";
  let timedOut = false;
  const test = start([path.join(SUITES_DIR, `${name}.test.mjs`)], {
    cwd: ROOT,
    env: childEnv({ BASE_URL, SERVER_LOG: serverLog, E2E_DATA_DIR: path.join(APP, "data") }),
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const [stream, target] of [
    [test.child.stdout, process.stdout],
    [test.child.stderr, process.stderr],
  ]) {
    stream.on("data", (chunk) => {
      output += chunk;
      target.write(chunk);
    });
  }
  const timer = setTimeout(() => {
    timedOut = true;
    console.log(`FAIL  the suite took longer than ${SUITE_TIMEOUT_MS / 1000} s and was stopped`);
    stop(test);
  }, SUITE_TIMEOUT_MS);
  const { code } = await test.exited;
  clearTimeout(timer);
  await stop(server);
  fs.writeFileSync(testLog, output);
  const counts = [...output.matchAll(/^(\d+)\/(\d+) checks passed/gm)].pop();
  const skipped = output.match(/^\d+\/\d+ checks passed \((\d+) skipped\)/m)?.[1];
  return {
    name,
    ok: code === 0 && !timedOut,
    checks: counts ? `${counts[1]}/${counts[2]}` : "–",
    seconds: secondsSince(begin),
    note: timedOut ? "timed out" : skipped ? `${skipped} skipped` : "",
  };
}

const results = [];
for (const [i, name] of suites.entries()) {
  console.log(`\n=== ${name} (${i + 1}/${suites.length}) ===`);
  results.push(await runSuite(name));
}

removeScratch(APP);
removeScratch(BUILD);

// ---------- Summary ----------

const width = Math.max(5, ...results.map((r) => r.name.length));
console.log(`\n${"Suite".padEnd(width)}  Result  Checks   Time  Note`);
for (const r of results) {
  console.log(
    `${r.name.padEnd(width)}  ${(r.ok ? "pass" : "FAIL").padEnd(6)}  ${r.checks.padEnd(7)}  ${`${r.seconds}s`.padStart(5)}  ${r.note}`,
  );
}
const failed = results.filter((r) => !r.ok);
console.log(
  failed.length
    ? `\n${failed.length} of ${results.length} suites failed: ${failed.map((r) => r.name).join(", ")}. Logs: ${path.relative(ROOT, LOGS)}/`
    : `\nAll ${results.length} suites passed. Logs: ${path.relative(ROOT, LOGS)}/`,
);
process.exitCode = failed.length ? 1 : 0;
