"use client";

import { deleteBookEntry } from "../actions";

// Deletes an entry recorded by mistake. Sales and stock arrivals put the stock count
// back as it was.
export function DeleteEntryButton({ id, what }) {
  return (
    <form
      action={deleteBookEntry}
      onSubmit={(event) => {
        if (!window.confirm(`Delete this ${what}? This can't be undone.`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700 hover:border-red-300 hover:text-red-700"
      >
        Delete
      </button>
    </form>
  );
}
