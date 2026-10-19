"use client";

import { removeReview } from "../actions";

export function DeleteReviewButton({ id, published }) {
  return (
    <form
      action={removeReview}
      onSubmit={(event) => {
        const question = published
          ? "Remove this review from the shop? This can't be undone."
          : "Delete this review? This can't be undone.";
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-full border border-stone-300 px-4 py-1.5 text-sm text-stone-700 hover:border-red-300 hover:text-red-700"
      >
        {published ? "Remove from shop" : "Delete"}
      </button>
    </form>
  );
}
