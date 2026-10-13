"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useId, useState } from "react";
import { saveProduct } from "../actions";

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

// Shrinks a photo in the browser before upload, so phone photos upload quickly.
async function resizePhoto(file, maxSize = 1200) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("resize failed"))),
      "image/jpeg",
      0.85,
    ),
  );
}

const EMPTY_PRODUCT = {
  slug: "",
  sku: "",
  name: "",
  tagline: "",
  description: "",
  price: "",
  weight: "",
  highlights: [],
  inStock: true,
  image: null,
};

// Fresh form on each new visit (so "Add product" starts empty every time), while the
// browser's back button still restores a draft. See CheckoutForm for why.
export function ProductForm(props) {
  const { bfcacheId } = useRouter();
  return <ProductFormInner key={bfcacheId} {...props} />;
}

function ProductFormInner({ product = EMPTY_PRODUCT }) {
  const isNew = !product.slug;
  const [state, formAction, pending] = useActionState(saveProduct, { status: "idle" });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(product.image ?? null);
  const [photoError, setPhotoError] = useState(null);
  const uid = useId();
  const id = (field) => `${uid}-${field}`;

  // Clear the chosen photo once it has been saved.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.status === "success") setPhoto(null);
  }, [state]);

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    setPhotoError(null);
    if (!file) return;
    try {
      const resized = await resizePhoto(file);
      setPhoto(resized);
      setPreview(URL.createObjectURL(resized));
    } catch {
      setPhoto(null);
      setPhotoError("This photo couldn't be read. Try a JPG or PNG.");
    }
  }

  // Submit through onSubmit (not the action prop) so fields keep their values on errors.
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (photo) formData.set("photo", photo, "photo.jpg");
    startTransition(() => formAction(formData));
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="slug" value={product.slug} />
      {!isNew && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{product.name}</h2>
          <a
            href={`/shop/${product.slug}`}
            className="text-sm text-stone-600 underline hover:text-brand"
          >
            View in shop
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-100 text-3xl">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{product.emoji ?? "📷"}</span>
          )}
        </div>
        <div>
          <label
            htmlFor={id("photo")}
            className="inline-block cursor-pointer rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
          >
            {preview ? "Change photo" : "Add a photo"}
          </label>
          <input
            id={id("photo")}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="sr-only"
          />
          <p className="mt-1 text-xs text-stone-500">A square photo looks best.</p>
          {(photoError || state.errors?.photo) && (
            <p className="mt-1 text-sm text-red-600">{photoError || state.errors.photo}</p>
          )}
        </div>
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
          {pending ? "Saving…" : isNew ? "Add product" : "Save changes"}
        </button>
        {state.errors?.form && <p className="text-sm text-red-600">{state.errors.form}</p>}
        {state.status === "success" && !pending && (
          <p className="text-sm font-medium text-green-700" role="status">
            Saved ✓
          </p>
        )}
      </div>
    </form>
  );
}
