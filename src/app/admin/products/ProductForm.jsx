"use client";

import { useActionState } from "react";
import { saveProduct } from "../actions";
import { submitKeepingInput } from "@/lib/use-keep-form";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-orange-200";

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ProductForm({ product }) {
  const [state, formAction, pending] = useActionState(saveProduct, { status: "idle" });
  const id = (field) => `${product.slug}-${field}`;

  return (
    <form
      onSubmit={submitKeepingInput(formAction)}
      noValidate
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="slug" value={product.slug} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{product.name}</h2>
        <a
          href={`/shop/${product.slug}`}
          className="text-sm text-stone-600 underline hover:text-brand"
        >
          View in shop
        </a>
      </div>

      <label className="flex items-center gap-3 rounded-lg bg-stone-50 p-3">
        <input
          type="checkbox"
          name="inStock"
          defaultChecked={product.inStock}
          className="h-5 w-5 accent-brand"
        />
        <span>
          <span className="font-medium">In stock</span>
          <span className="block text-sm text-stone-500">
            Untick to show &ldquo;Sold out&rdquo; and stop new orders.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={id("price")} label="Price (FCFA)" error={state.errors?.price}>
          <input
            id={id("price")}
            name="price"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            defaultValue={product.price}
            className={inputClass}
          />
        </Field>
        <Field id={id("weight")} label="Pack size" error={state.errors?.weight}>
          <input
            id={id("weight")}
            name="weight"
            defaultValue={product.weight}
            className={inputClass}
          />
        </Field>
      </div>
      <Field id={id("sku")} label="Item code (shown in WhatsApp orders)" error={state.errors?.sku}>
        <input
          id={id("sku")}
          name="sku"
          defaultValue={product.sku}
          className={`${inputClass} font-mono uppercase`}
        />
      </Field>
      <Field id={id("name")} label="Name" error={state.errors?.name}>
        <input id={id("name")} name="name" defaultValue={product.name} className={inputClass} />
      </Field>
      <Field id={id("tagline")} label="Short tagline" error={state.errors?.tagline}>
        <input
          id={id("tagline")}
          name="tagline"
          defaultValue={product.tagline}
          className={inputClass}
        />
      </Field>
      <Field id={id("description")} label="Description" error={state.errors?.description}>
        <textarea
          id={id("description")}
          name="description"
          rows={4}
          defaultValue={product.description}
          className={inputClass}
        />
      </Field>
      <Field
        id={id("highlights")}
        label="Highlights (one per line)"
        error={state.errors?.highlights}
      >
        <textarea
          id={id("highlights")}
          name="highlights"
          rows={4}
          defaultValue={product.highlights.join("\n")}
          className={inputClass}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state.status === "success" && !pending && (
          <p className="text-sm font-medium text-green-700" role="status">
            Saved ✓
          </p>
        )}
      </div>
    </form>
  );
}
