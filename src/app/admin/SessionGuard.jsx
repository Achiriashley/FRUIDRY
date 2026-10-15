"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { logout, stillHere } from "./actions";

const CHECK_IN_EVERY_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"];

// Signs the admin out after a period without activity (clicks, typing, scrolling),
// even if the page stays open, and keeps the session going while it's being used.
// The server enforces the same limit; this hides the panel as soon as it's reached.
export function SessionGuard({ idleSeconds }) {
  const router = useRouter();
  const lastActivity = useRef(null);
  const lastCheckIn = useRef(0);
  const ended = useRef(false);

  useEffect(() => {
    const idleMs = idleSeconds * 1000;
    // Opening the page counts as activity (kept when the page is shown again).
    lastActivity.current ??= Date.now();

    async function end() {
      if (ended.current) return;
      ended.current = true;
      await logout();
      router.refresh();
    }

    function checkIdle() {
      if (Date.now() - lastActivity.current > idleMs) end();
    }

    function onActivity() {
      const now = Date.now();
      // Coming back to a page left open for too long doesn't count: sign in again.
      if (now - lastActivity.current > idleMs) return end();
      lastActivity.current = now;
      if (now - lastCheckIn.current > CHECK_IN_EVERY_MS) {
        lastCheckIn.current = now;
        stillHere().then((active) => {
          if (!active) end();
        });
      }
    }

    checkIdle();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", checkIdle);
    const timer = setInterval(checkIdle, 15_000);
    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity);
      document.removeEventListener("visibilitychange", checkIdle);
      clearInterval(timer);
    };
  }, [idleSeconds, router]);

  return null;
}
