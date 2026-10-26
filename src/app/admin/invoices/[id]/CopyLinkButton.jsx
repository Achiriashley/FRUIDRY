"use client";

import { useRef, useState } from "react";

// Copies the invoice's link (to paste in an email or another app). Where copying isn't
// allowed, the link is shown selected, to copy by hand.
export function CopyLinkButton({ url }) {
  const [copy, setCopy] = useState("idle");
  const inputRef = useRef(null);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopy("copied");
    } catch {
      setCopy("byHand");
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-stone-500"
      >
        Copy link
      </button>
      <span role="status" className="text-sm text-green-700">
        {copy === "copied" ? "Copied" : ""}
      </span>
      {copy === "byHand" && (
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label="Invoice link"
          className="w-64 rounded-lg border border-stone-300 px-2 py-1 text-xs"
        />
      )}
    </span>
  );
}
