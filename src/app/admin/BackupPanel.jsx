"use client";

import { useState, useSyncExternalStore } from "react";
import { DownloadButton } from "./DownloadButton";

// The full copy of the shop (Dashboard). When the last copy saved on this device is more
// than a month old (or there's none), a reminder shows at the top of the dashboard;
// otherwise the button sits at the bottom. The date is kept on the device only.
const LAST_COPY_KEY = "fruidry-last-full-copy";
const SAVED_EVENT = "fruidry-full-copy-saved";
const REMIND_AFTER_DAYS = 30;
const DAY_MS = 86_400_000;

function subscribe(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(SAVED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SAVED_EVENT, callback);
  };
}

// Whole days since the last copy on this device, or -1 if there's none.
function daysSinceLastCopy() {
  try {
    const saved = Date.parse(window.localStorage.getItem(LAST_COPY_KEY) ?? "");
    return Number.isFinite(saved) ? Math.max(0, Math.floor((Date.now() - saved) / DAY_MS)) : -1;
  } catch {
    return -1;
  }
}

function rememberCopy() {
  try {
    window.localStorage.setItem(LAST_COPY_KEY, new Date().toISOString());
  } catch {
    // Storage unavailable (private browsing): the reminder just keeps showing.
  }
  window.dispatchEvent(new Event(SAVED_EVENT));
}

// null while the page is drawn on the server (the device's date isn't known yet).
function useDaysSinceLastCopy() {
  return useSyncExternalStore(subscribe, daysSinceLastCopy, () => null);
}

const isDue = (days) => days !== null && (days < 0 || days >= REMIND_AFTER_DAYS);

const DOWNLOAD = {
  url: "/admin/backup",
  label: "⬇ Download a full copy",
  fileName: "fruidry-backup.xlsx",
};

const KEEP_PRIVATE =
  "It has customers' names, phone numbers and addresses: keep it private, and delete older copies.";

// Top of the dashboard: shown only when a copy is due.
export function BackupReminder() {
  const days = useDaysSinceLastCopy();
  const [saved, setSaved] = useState(false);
  if (!isDue(days)) {
    return saved ? (
      <p role="status" className="rounded-2xl bg-green-50 p-5 text-sm text-green-800 shadow-sm">
        Your full copy is downloading. On an iPhone it goes to Files → Downloads (tap Download if
        asked). {KEEP_PRIVATE}
      </p>
    ) : null;
  }
  return (
    <section className="rounded-2xl bg-yellow-100 p-5 shadow-sm" aria-labelledby="copy-due">
      <h2 id="copy-due" className="text-xl font-bold">
        Time to save a copy of your shop
      </h2>
      <p className="mt-1 text-sm text-stone-700">
        {days < 0
          ? "You haven't saved a full copy on this device yet."
          : `Your last full copy on this device is ${days} days old.`}{" "}
        One Excel file with your orders, Books, products, reviews and waiting list, in case the
        database ever has a problem.
      </p>
      <div className="mt-3">
        <DownloadButton
          {...DOWNLOAD}
          onDownloaded={() => {
            setSaved(true);
            rememberCopy();
          }}
        />
      </div>
    </section>
  );
}

// Bottom of the dashboard: the button, when no reminder is showing.
export function BackupSection() {
  const days = useDaysSinceLastCopy();
  if (isDue(days)) return null;
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="full-copy">
      <h2 id="full-copy" className="text-xl font-bold">
        Full copy of your shop
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Orders, Books, products, reviews and the waiting list in one Excel file. Save one each
        month. {KEEP_PRIVATE}
      </p>
      <div className="mt-3">
        <DownloadButton {...DOWNLOAD} onDownloaded={rememberCopy} />
      </div>
      {days !== null && (
        <p className="mt-2 text-xs text-stone-500">
          Last copy on this device:{" "}
          {days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`}
        </p>
      )}
    </section>
  );
}
