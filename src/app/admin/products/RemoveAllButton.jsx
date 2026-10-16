"use client";

import { removeWaitlistEntries } from "../actions";

export function RemoveAllButton({ ids }) {
  return (
    <form
      action={removeWaitlistEntries}
      onSubmit={(event) => {
        if (!window.confirm(`Remove all ${ids.length} people from this waiting list?`)) {
          event.preventDefault();
        }
      }}
      className="mt-4"
    >
      {ids.map((id) => (
        <input key={id} type="hidden" name="id" value={id} />
      ))}
      <button
        type="submit"
        className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Remove everyone ({ids.length})
      </button>
    </form>
  );
}
