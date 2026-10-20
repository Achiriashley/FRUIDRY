"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { submitKeepingInput, useFieldErrors } from "@/lib/use-keep-form";
import { recordExpense, recordSale, recordStockArrival } from "../actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

// One of the forms on the Books page, folded away until opened. Once an entry is
// saved, the form is emptied for the next one (the date stays at today) and a message
// says what changed.
function EntryForm({ title, action, fields, submit, onSaved, children }) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const { formRef, errorId, fieldProps } = useFieldErrors(state, uid, fields);
  const cleared = useRef(null);
  useEffect(() => {
    if (state.status !== "success" || cleared.current === state) return;
    cleared.current = state;
    formRef.current?.reset();
    onSaved?.();
  }, [state, formRef, onSaved]);

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

  return (
    <details className="group rounded-2xl bg-white shadow-sm">
      <summary className="cursor-pointer list-none rounded-2xl px-5 py-4 font-bold hover:bg-stone-50">
        <span className="mr-2 inline-block transition group-open:rotate-45" aria-hidden>
          +
        </span>
        {title}
      </summary>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={submitKeepingInput(formAction)}
        noValidate
        className="grid gap-4 border-t border-stone-100 px-5 pt-4 pb-5 sm:grid-cols-2"
      >
        {children(field)}
        {state.errors?.form && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2">
            {state.errors.form}
          </p>
        )}
        {state.status === "success" && (
          <p
            role="status"
            className="rounded-lg bg-green-50 p-3 text-sm text-green-800 sm:col-span-2"
          >
            ✓ {state.message}
          </p>
        )}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Saving…" : submit}
          </button>
        </div>
      </form>
    </details>
  );
}

const number = (min) => ({ type: "number", inputMode: "numeric", min, step: 1 });

function Choices({ options, ...props }) {
  return (
    <select defaultValue="" {...props}>
      <option value="" disabled>
        Choose…
      </option>
      {Object.entries(options).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function BookForms({ products, payments, categories, today }) {
  const productOptions = Object.fromEntries(products.map((p) => [p.slug, p.name]));
  // The sale's price per pack starts at the product's shop price, and can be changed.
  const [price, setPrice] = useState("");
  const date = (field) =>
    field("date", "Date", (props) => (
      <input type="date" max={today} defaultValue={today} {...props} />
    ));

  return (
    <div className="space-y-3">
      <EntryForm
        title="Sale in person"
        action={recordSale}
        fields={["date", "slug", "quantity", "price", "payment", "note"]}
        submit="Record sale"
        onSaved={() => setPrice("")}
      >
        {(field) => (
          <>
            {date(field)}
            {field("slug", "Product", (props) => (
              <Choices
                options={productOptions}
                onChange={(e) => {
                  const chosen = products.find((p) => p.slug === e.target.value);
                  if (chosen) setPrice(String(chosen.price));
                }}
                {...props}
              />
            ))}
            {field("quantity", "Packs sold", (props) => (
              <input {...number(1)} {...props} />
            ))}
            {field("price", "Price per pack (FCFA)", (props) => (
              <input
                {...number(0)}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                {...props}
              />
            ))}
            {field("payment", "Paid by", (props) => (
              <Choices options={payments} {...props} />
            ))}
            {field("note", "Note (optional)", (props) => (
              <input maxLength={200} {...props} />
            ))}
          </>
        )}
      </EntryForm>

      <EntryForm
        title="Stock arrival"
        action={recordStockArrival}
        fields={["date", "slug", "quantity", "cost", "note"]}
        submit="Record stock"
      >
        {(field) => (
          <>
            {date(field)}
            {field("slug", "Product", (props) => (
              <Choices options={productOptions} {...props} />
            ))}
            {field("quantity", "Packs received", (props) => (
              <input {...number(1)} {...props} />
            ))}
            {field("cost", "What they cost you in all, FCFA (optional)", (props) => (
              <input {...number(0)} {...props} />
            ))}
            {field("note", "Note, e.g. supplier (optional)", (props) => (
              <input maxLength={200} {...props} />
            ))}
          </>
        )}
      </EntryForm>

      <EntryForm
        title="Expense"
        action={recordExpense}
        fields={["date", "category", "amount", "note"]}
        submit="Record expense"
      >
        {(field) => (
          <>
            {date(field)}
            {field("category", "Category", (props) => (
              <Choices options={categories} {...props} />
            ))}
            {field("amount", "Amount (FCFA)", (props) => (
              <input {...number(1)} {...props} />
            ))}
            {field("note", "Note (needed for Other)", (props) => (
              <input maxLength={200} {...props} />
            ))}
          </>
        )}
      </EntryForm>
    </div>
  );
}
