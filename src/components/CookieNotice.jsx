"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useLocale } from "./LocaleProvider";

// A short note at the bottom of the shop on what the site keeps. There's no tracking, so
// there's nothing to accept or refuse: it shows until the visitor taps "Got it", and that
// is remembered on their device only (in the browser's storage, not a cookie).
const CLOSED_KEY = "fruidry-cookie-notice";
const CLOSED_EVENT = "fruidry-cookie-notice-closed";

// If the browser won't save it (private browsing), it stays closed until the page reloads.
let closedThisVisit = false;

function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(CLOSED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CLOSED_EVENT, callback);
  };
}

function isClosed() {
  if (closedThisVisit) return true;
  try {
    return window.localStorage.getItem(CLOSED_KEY) !== null;
  } catch {
    return false;
  }
}

function close() {
  closedThisVisit = true;
  try {
    window.localStorage.setItem(CLOSED_KEY, new Date().toISOString());
  } catch {
    // Storage unavailable: closed for this visit only.
  }
  window.dispatchEvent(new Event(CLOSED_EVENT));
}

export function CookieNotice() {
  const { t, href } = useLocale();
  // Not drawn on the server: whether it was closed is only known on the device.
  const closed = useSyncExternalStore(subscribe, isClosed, () => true);
  if (closed) return null;
  const text = t.cookieNotice;
  return (
    <section
      data-dark
      aria-label={text.label}
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl bg-brand-deep p-4 text-sm text-white shadow-2xl ring-1 ring-white/10 sm:flex-row sm:items-center sm:gap-5 sm:p-5 print:hidden"
    >
      <p className="flex-1 leading-relaxed text-white/90">
        {text.message}{" "}
        <Link
          href={href("/privacy")}
          className="font-semibold whitespace-nowrap text-white underline underline-offset-2 hover:text-sun"
        >
          {text.privacy}
        </Link>
      </p>
      <button
        type="button"
        onClick={close}
        className="shrink-0 rounded-full bg-sun px-6 py-2.5 font-bold text-brand-deep transition hover:bg-sun-light"
      >
        {text.ok}
      </button>
    </section>
  );
}
