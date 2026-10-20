"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import { submitKeepingInput, useFieldErrors } from "@/lib/use-keep-form";
import { deleteBookEntry, updateBookEntry } from "../actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

const FIELDS = ["date", "price", "payment", "cost", "category", "amount", "note"];

function Options({ options }) {
  return Object.entries(options).map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));
}

// Corrects an entry's date, price, payment, cost, category, amount or note. The product
// and number of packs stay as they are (so does the stock count).
export function EditEntry({ entry, payments, categories, today }) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(updateBookEntry, { status: "idle" });
  const { formRef, errorId, fieldProps } = useFieldErrors(state, uid, FIELDS);
  const field = (name, label, input) => (
    <div>
      <label htmlFor={`${uid}-${name}`} className="text-sm font-medium">
        {label}
      </label>
      {input({ id: `${uid}-${name}`, name, className: inputClass, ...fieldProps(name) })}
      {state.errors?.[name] && (
        <p id={errorId(name)} className="mt-1 text-sm text-red-600">
          {state.errors[name]}
        </p>
      )}
    </div>
  );
  const number = (min) => ({ type: "number", inputMode: "numeric", min, step: 1 });

  return (
    <details className="w-full">
      <summary className="inline-block cursor-pointer list-none rounded-full border border-stone-300 px-4 py-1.5 text-sm text-stone-700 hover:border-brand">
        Edit
      </summary>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={submitKeepingInput(formAction)}
        noValidate
        className="mt-3 grid gap-3 rounded-xl bg-stone-50 p-4 sm:grid-cols-2"
      >
        <input type="hidden" name="id" value={entry.id} />
        {field("date", "Date", (props) => (
          <input type="date" max={today} defaultValue={entry.date} {...props} />
        ))}
        {entry.type === "sale" && (
          <>
            {field("price", "Price per pack (FCFA)", (props) => (
              <input {...number(0)} defaultValue={entry.price} {...props} />
            ))}
            {field("payment", "Paid by", (props) => (
              <select defaultValue={entry.payment} {...props}>
                <Options options={payments} />
              </select>
            ))}
          </>
        )}
        {entry.type === "stock" &&
          field("cost", "What they cost you in all, FCFA (optional)", (props) => (
            <input {...number(0)} defaultValue={entry.cost ?? ""} {...props} />
          ))}
        {entry.type === "expense" && (
          <>
            {field("category", "Category", (props) => (
              <select defaultValue={entry.category} {...props}>
                <Options options={categories} />
              </select>
            ))}
            {field("amount", "Amount (FCFA)", (props) => (
              <input {...number(1)} defaultValue={entry.amount} {...props} />
            ))}
          </>
        )}
        {field("note", "Note", (props) => (
          <input maxLength={200} defaultValue={entry.note ?? ""} {...props} />
        ))}
        {entry.type !== "expense" && (
          <p className="text-xs text-stone-600 sm:col-span-2">
            To change the product or the number of packs, delete this entry and record it again.
          </p>
        )}
        {state.errors?.form && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2">
            {state.errors.form}
          </p>
        )}
        {state.status === "success" && (
          <p role="status" className="text-sm text-green-800 sm:col-span-2">
            ✓ {state.message}
          </p>
        )}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </details>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-stone-300 px-4 py-1.5 text-sm text-stone-700 hover:border-red-300 hover:text-red-700 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

// Deletes an entry recorded by mistake; a sale or stock arrival also undoes its change
// to the stock count.
export function DeleteEntryButton({ id, what, stockNote }) {
  return (
    <form
      action={deleteBookEntry}
      onSubmit={(event) => {
        const question = `Delete this ${what}?${stockNote ? ` ${stockNote}` : ""} This can't be undone.`;
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <DeleteButton />
    </form>
  );
}
