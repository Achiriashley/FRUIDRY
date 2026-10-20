"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { formatPrice } from "@/lib/products";
import { submitKeepingInput, useFieldErrors } from "@/lib/use-keep-form";
import { recordExpense, recordSale, recordStockArrival } from "../actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

// One of the forms on the Books page, folded away until opened. Once an entry is
// saved, the form is emptied for the next one, keeping the date (for entering several
// sales of the same day), and a message says what was recorded, date included.
function EntryForm({ title, action, fields, submit, onSaved, children }) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const { formRef, errorId, fieldProps } = useFieldErrors(state, uid, fields);
  const cleared = useRef(null);
  useEffect(() => {
    if (state.status !== "success" || cleared.current === state) return;
    cleared.current = state;
    const form = formRef.current;
    const date = form?.elements.namedItem("date")?.value;
    form?.reset();
    if (date) form.elements.namedItem("date").value = date;
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
  // A stock arrival's cost per pack, shown as it's typed (to catch a per-pack price
  // typed where the total goes).
  const [arrival, setArrival] = useState({ quantity: "", cost: "" });
  // The value is read when typing, not later inside the state update.
  const setArrivalField = (name, value) => setArrival((a) => ({ ...a, [name]: value }));
  const perPack =
    Number(arrival.quantity) > 0 && Number(arrival.cost) > 0
      ? formatPrice(Math.round(Number(arrival.cost) / Number(arrival.quantity)))
      : null;
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
        onSaved={() => setArrival({ quantity: "", cost: "" })}
      >
        {(field) => (
          <>
            <p className="text-sm text-stone-600 sm:col-span-2">
              The packs are added to the stock count, so don&apos;t also change Packs in stock on
              the product page.
            </p>
            {date(field)}
            {field("slug", "Product", (props) => (
              <Choices options={productOptions} {...props} />
            ))}
            {field("quantity", "Packs received", (props) => (
              <input
                {...number(1)}
                onInput={(e) => setArrivalField("quantity", e.currentTarget.value)}
                {...props}
              />
            ))}
            {field("cost", "What they cost you in all, FCFA (optional)", (props) => (
              <input
                {...number(0)}
                onInput={(e) => setArrivalField("cost", e.currentTarget.value)}
                aria-describedby={perPack ? "per-pack" : undefined}
                {...props}
              />
            ))}
            {perPack && (
              <p id="per-pack" className="text-sm text-stone-600 sm:col-span-2">
                That&apos;s {perPack} per pack.
              </p>
            )}
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
