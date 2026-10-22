"use client";

import { useState } from "react";

// Downloads a file from an admin address (a month of Books, the full copy). Fetched by
// the page (instead of a plain link) because opening an admin address directly asks for
// the password again. The file keeps the name the server gives it.
export function DownloadButton({ url, label, fileName, onDownloaded }) {
  const [state, setState] = useState("idle");
  async function download() {
    setState("loading");
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const disposition = response.headers.get("content-disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fileName;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(await response.blob());
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
      setState("idle");
      onDownloaded?.();
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
        {state === "loading" ? "Preparing…" : label}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          The file couldn&apos;t be downloaded. Reload the page and try again.
        </p>
      )}
    </div>
  );
}
