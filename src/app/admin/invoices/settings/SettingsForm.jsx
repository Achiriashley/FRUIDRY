"use client";

import { useActionState, useId } from "react";
import { submitKeepingInput, useFieldErrors } from "@/lib/use-keep-form";
import { saveInvoiceSettingsAction } from "../actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const FIELDS = [
  "businessName",
  "address",
  "phone",
  "email",
  "niu",
  "rccm",
  "paymentInfo",
  "dueDays",
  "proformaDays",
  "footer",
];

// The shop's details printed on invoices, and how new invoices are made.
export function SettingsForm({ settings }) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(saveInvoiceSettingsAction, {
    status: "idle",
  });
  const { formRef, errorId, fieldProps } = useFieldErrors(state, uid, FIELDS);

  const field = (name, label, hint, input = (props) => <input {...props} />) => (
    <div>
      <label htmlFor={`${uid}-${name}`} className="text-sm font-medium">
        {label}
      </label>
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
      {input({
        id: `${uid}-${name}`,
        name,
        defaultValue: settings[name] ?? "",
        className: inputClass,
        ...fieldProps(name),
      })}
      {state.errors?.[name] && (
        <p id={errorId(name)} className="mt-1 text-sm text-red-600">
          {state.errors[name]}
        </p>
      )}
    </div>
  );

  const checkbox = (name, label, hint) => (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={settings[name]} className="mt-1" />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-stone-500">{hint}</span>
      </span>
    </label>
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={submitKeepingInput(formAction)}
      noValidate
      className="space-y-6"
    >
      <section className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">Your details on invoices</h2>
        {field("businessName", "Business name")}
        {field("phone", "Phone")}
        {field("address", "Address", "Shown under your name", (props) => (
          <textarea {...props} rows={2} />
        ))}
        {field("email", "Email (optional)")}
        {field("niu", "NIU", "Your taxpayer number (Numéro d'Identifiant Unique)")}
        {field("rccm", "RCCM", "Your trade register number")}
      </section>

      <section className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">Getting paid</h2>
        <div className="sm:col-span-2">
          {checkbox(
            "showMomo",
            "Show the MTN MoMo code on unpaid invoices",
            "With the amount still to pay, ready to dial (merchant code 747434).",
          )}
        </div>
        <div className="sm:col-span-2">
          {field(
            "paymentInfo",
            "Other ways to pay (optional)",
            "For example your bank, account name and number. Printed on unpaid invoices.",
            (props) => (
              <textarea {...props} rows={3} />
            ),
          )}
        </div>
        {field("dueDays", "Days to pay an invoice", "Sets the usual due date", (props) => (
          <input {...props} inputMode="numeric" />
        ))}
        {field("proformaDays", "Days a proforma is valid", null, (props) => (
          <input {...props} inputMode="numeric" />
        ))}
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Tax and footer</h2>
        {checkbox(
          "vat",
          "Add TVA (19.25%) to new invoices",
          "Only if you're registered to collect VAT. Invoices then show the total excluding VAT, the TVA and the total including VAT. Invoices already made don't change.",
        )}
        {field(
          "footer",
          "Message at the bottom of invoices (optional)",
          "Empty: “Merci pour votre confiance.” (or the English for English invoices)",
          (props) => (
            <textarea {...props} rows={2} />
          ),
        )}
      </section>

      {state.errors?.form && (
        <p role="alert" className="text-sm text-red-600">
          {state.errors.form}
        </p>
      )}
      {state.status === "success" && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          ✓ {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
