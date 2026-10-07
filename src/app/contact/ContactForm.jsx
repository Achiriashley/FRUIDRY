"use client";

import { useActionState } from "react";
import { submitContact } from "./actions";

const initialState = { status: "idle" };

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-orange-200";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initialState);

  if (state.status === "success") {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm" role="status">
        <p className="text-4xl" aria-hidden>
          📬
        </p>
        <p className="mt-3 text-lg font-semibold">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm" noValidate>
      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input id="name" name="name" className={inputClass} autoComplete="name" />
        {state.errors?.name && <p className="mt-1 text-sm text-red-600">{state.errors.name}</p>}
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" className={inputClass} autoComplete="email" />
        {state.errors?.email && <p className="mt-1 text-sm text-red-600">{state.errors.email}</p>}
      </div>
      <div>
        <label htmlFor="message" className="text-sm font-medium">
          Message
        </label>
        <textarea id="message" name="message" rows={5} className={inputClass} />
        {state.errors?.message && (
          <p className="mt-1 text-sm text-red-600">{state.errors.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
