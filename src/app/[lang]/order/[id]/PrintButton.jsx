"use client";

export function PrintButton({ label }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark print:hidden"
    >
      {label}
    </button>
  );
}
