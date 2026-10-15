"use client";

import { useEffect, useState } from "react";

const CHECK_IN_EVERY_MS = 2 * 60 * 1000;
const WARN_BEFORE_MS = 10 * 60 * 1000;
// Things only a person does. (Not "scroll": the page scrolls by itself when the
// dashboard's auto-refresh adds an order above what's on screen.)
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "input", "wheel", "touchstart"];

// What this browser tab knows about the session. Shared by all the admin pages in the
// tab: Next.js keeps recently visited pages (and their SessionGuard) in memory, hidden.
const tab = {
  lastActivity: 0,
  lastCheckIn: 0,
  checkInTimer: null,
  lastAsked: 0,
  asking: false,
  endsAt: null,
  inFlight: new Set(),
  stopped: false,
};

// Asks the server how the session is doing; `active` also reports activity, which
// keeps it going. See src/app/admin/session/route.js.
async function sessionCheck(active) {
  const request = fetch("/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
    cache: "no-store",
    // Gives up on a stalled connection, so the next check can try again.
    signal: AbortSignal.timeout(15_000),
  });
  tab.inFlight.add(request);
  try {
    const response = await request;
    if (!response.ok) throw new Error(`Session check failed (${response.status})`);
    return await response.json();
  } finally {
    tab.inFlight.delete(request);
  }
}

// Used when signing out: stops session checks and waits for any already sent, so a
// check started by the same click can't bring the sign-in cookie back afterwards.
export async function stopSessionChecks() {
  tab.stopped = true;
  clearTimeout(tab.checkInTimer);
  tab.checkInTimer = null;
  await Promise.allSettled([...tab.inFlight]);
}

export function resumeSessionChecks() {
  tab.stopped = false;
}

// Signs the admin out after a period without activity (clicks, taps, typing), even if
// the page stays open, and keeps the session going while it's being used. The server
// holds the session's real state, shared by every admin tab, so a page that has seen
// no activity asks it before signing out: another tab may be in use. Also warns before
// the 8-hour limit, so changes can be saved in time.
export function SessionGuard({ idleSeconds }) {
  const [signOutAt, setSignOutAt] = useState(null);

  useEffect(() => {
    const idleMs = idleSeconds * 1000;

    function showWarning() {
      const left = tab.endsAt === null ? Infinity : tab.endsAt - Date.now();
      setSignOutAt(left > 0 && left < WARN_BEFORE_MS ? tab.endsAt : null);
    }

    // Takes in the server's answer. null means the session has ended: reloading the
    // page shows the sign-in form and clears the admin pages kept in memory.
    function apply(status) {
      if (tab.stopped) return;
      if (!status) {
        window.location.reload();
        return;
      }
      const now = Date.now();
      // Another tab may have been used in the meantime.
      tab.lastActivity = Math.max(tab.lastActivity, now - status.idleSeconds * 1000);
      tab.endsAt = now + status.secondsLeft * 1000;
      showWarning();
    }

    // Asks the server how the session is doing (at most every few seconds, so a phone
    // that's offline after waking up doesn't send a request on every tap).
    function ask() {
      const now = Date.now();
      if (tab.stopped || tab.asking || now - tab.lastAsked < 5000) return;
      tab.asking = true;
      tab.lastAsked = now;
      sessionCheck(false)
        .then(apply, () => {}) // Offline: the next check tries again.
        .finally(() => {
          tab.asking = false;
        });
    }

    function check() {
      const now = Date.now();
      showWarning();
      if (now - tab.lastActivity > idleMs || tab.endsAt === null || now > tab.endsAt) ask();
    }

    function onActivity() {
      if (tab.stopped) return;
      const now = Date.now();
      // Coming back after a long time without activity here: the server decides
      // (the session may have ended, or another tab may have kept it going).
      if (now - tab.lastActivity > idleMs) return ask();
      tab.lastActivity = now;
      // Tell the server at most every 2 minutes, and once more after the last activity.
      tab.checkInTimer ??= setTimeout(
        () => {
          tab.checkInTimer = null;
          tab.lastCheckIn = Date.now();
          sessionCheck(true).then(apply, () => {});
        },
        Math.max(0, tab.lastCheckIn + CHECK_IN_EVERY_MS - now),
      );
    }

    // Coming back with the browser's Back button can show the page from memory without
    // loading it: reload it, which asks for the password (see src/proxy.js).
    function onPageShow(event) {
      if (event.persisted) window.location.reload();
    }

    // Opening the admin panel counts as activity. Every page asks for the session's
    // state when it's shown (a page Next.js kept hidden may be out of date).
    tab.lastActivity ||= Date.now();
    tab.endsAt = null;
    check();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { capture: true, passive: true });
    }
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", onPageShow);
    const timer = setInterval(check, 15_000);
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity, { capture: true });
      }
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("pageshow", onPageShow);
      clearInterval(timer);
    };
  }, [idleSeconds]);

  if (!signOutAt) return null;
  const time = new Date(signOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <p role="status" className="rounded-2xl bg-sun-light px-5 py-3 text-sm text-stone-900">
      For your security, you&apos;ll be signed out at <strong>{time}</strong>, 8 hours after signing
      in. Save any changes before then; you can sign in again straight after.
    </p>
  );
}
