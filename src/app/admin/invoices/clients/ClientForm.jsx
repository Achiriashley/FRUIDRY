"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { submitKeepingInput, useFieldErrors } from "@/lib/use-keep-form";
import { saveClientAction } from "../actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const FIELDS = ["name", "contact", "phone", "email", "address", "niu", "note"];

// Adds a client (no `client`) or edits one. A new client's form is emptied once saved.
export function ClientForm({ client }) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(saveClientAction, { status: "idle" });
  const { formRef, errorId, fieldProps } = useFieldErrors(state, uid, FIELDS);
  const cleared = useRef(null);
  useEffect(() => {
    if (client || state.status !== "success" || cleared.current === state) return;
    cleared.current = state;
    formRef.current?.reset();
  }, [state, formRef, client]);

  const field = (name, label, props = {}) => (
    <div className={name === "address" || name === "note" ? "sm:col-span-2" : undefined}>
      <label htmlFor={`${uid}-${name}`} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={`${uid}-${name}`}
        name={name}
        defaultValue={client?.[name] ?? ""}
        className={inputClass}
        {...props}
        {...fieldProps(name)}
      />
      {state.errors?.[name] && (
        <p id={errorId(name)} className="mt-1 text-sm text-red-600">
          {state.errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={submitKeepingInput(formAction)}
      noValidate
      className="grid gap-4 sm:grid-cols-2"
    >
      {client && <input type="hidden" name="id" value={client.id} />}
      {field("name", "Name (business or person)")}
      {field("contact", "Contact person (optional)")}
      {field("phone", "Phone / WhatsApp (optional)", { type: "tel", inputMode: "tel" })}
      {field("email", "Email (optional)", { type: "email", inputMode: "email" })}
      {field("address", "Address (optional)")}
      {field("niu", "NIU (optional)")}
      {field("note", "Private note (optional, not on invoices)")}
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
          {pending ? "Saving…" : client ? "Save changes" : "Add client"}
        </button>
      </div>
    </form>
  );
}
