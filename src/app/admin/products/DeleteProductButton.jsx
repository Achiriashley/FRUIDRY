"use client";

import { deleteProduct } from "../actions";

export function DeleteProductButton({ slug, name }) {
  return (
    <form
      action={deleteProduct}
      onSubmit={(event) => {
        if (!window.confirm(`Delete "${name}" from the shop? This can't be undone.`)) {
          event.preventDefault();
        }
      }}
      className="mt-4"
    >
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className="rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Delete product
      </button>
    </form>
  );
}
