"use client";

// Prints the page (or saves it as a PDF). With `documentTitle`, the page is named that
// while printing, which is the name a saved PDF gets.
export function PrintButton({ label, documentTitle }) {
  function print() {
    if (documentTitle) {
      const title = document.title;
      document.title = documentTitle;
      // Some phones read the title after print() returns: put it back once printing is done.
      window.addEventListener("afterprint", () => (document.title = title), { once: true });
    }
    window.print();
  }
  return (
    <button
      type="button"
      onClick={print}
      className="rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark print:hidden"
    >
      {label}
    </button>
  );
}
