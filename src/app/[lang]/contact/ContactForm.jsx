"use client";

import { useActionState, useId } from "react";
import { submitContact } from "./actions";
import { useLocale } from "@/components/LocaleProvider";
import { submitKeepingInput } from "@/lib/use-keep-form";

const initialState = { status: "idle" };

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-orange-200";

export function ContactForm() {
  const uid = useId();
  const { lang, t } = useLocale();
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
    <form
      onSubmit={submitKeepingInput(formAction)}
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      noValidate
    >
      <input type="hidden" name="lang" value={lang} />
      <div>
        <label htmlFor={`${uid}-name`} className="text-sm font-medium">
          {t.contact.name}
        </label>
        <input id={`${uid}-name`} name="name" className={inputClass} autoComplete="name" />
        {state.errors?.name && <p className="mt-1 text-sm text-red-600">{state.errors.name}</p>}
      </div>
      <div>
        <label htmlFor={`${uid}-email`} className="text-sm font-medium">
          {t.contact.email}
        </label>
        <input
          id={`${uid}-email`}
          name="email"
          type="email"
          className={inputClass}
          autoComplete="email"
        />
        {state.errors?.email && <p className="mt-1 text-sm text-red-600">{state.errors.email}</p>}
      </div>
      <div>
        <label htmlFor={`${uid}-message`} className="text-sm font-medium">
          {t.contact.message}
        </label>
        <textarea id={`${uid}-message`} name="message" rows={5} className={inputClass} />
        {state.errors?.message && (
          <p className="mt-1 text-sm text-red-600">{state.errors.message}</p>
        )}
      </div>
      {state.errors?.form && <p className="text-sm text-red-600">{state.errors.form}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? t.contact.sending : t.contact.send}
      </button>
    </form>
  );
}
