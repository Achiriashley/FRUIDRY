"use client";

import { useState } from "react";

// Downloads the month's books as an Excel file. Fetched by the page (instead of a plain
// link) because opening an admin address directly asks for the password again.
export function DownloadButton({ month }) {
  const [state, setState] = useState("idle");
  async function download() {
    setState("loading");
    try {
      const response = await fetch(`/admin/books/export?month=${encodeURIComponent(month)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `fruidry-books-${month}.xlsx`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setState("idle");
    } catch {
      setState("error");
    }
  }
  return (
    <div>
      <button
        type="button"
        onClick={download}
        disabled={state === "loading"}
        className="rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-brand-light disabled:opacity-60"
      >
        {state === "loading" ? "Preparing…" : "⬇ Download for Excel"}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          The file couldn&apos;t be downloaded. Reload the page and try again.
        </p>
      )}
    </div>
  );
}
