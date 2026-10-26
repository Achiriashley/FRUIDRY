"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { INVOICE_PAYMENT_METHODS } from "@/lib/invoice-math";
import { submitKeepingInput, useFieldErrors } from "@/lib/use-keep-form";
import { recordPaymentAction } from "../actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const FIELDS = ["amount", "date", "method", "note"];

// Records money received for an invoice. The amount starts at what's left to pay.
export function PaymentForm({ invoiceId, due, today }) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(recordPaymentAction, { status: "idle" });
  const { formRef, errorId, fieldProps } = useFieldErrors(state, uid, FIELDS);
  const cleared = useRef(null);

  // After a payment, the form starts again with the new amount left to pay.
  useEffect(() => {
    if (state.status !== "success" || cleared.current === state) return;
    cleared.current = state;
    const form = formRef.current;
    form?.reset();
    const amount = form?.elements.namedItem("amount");
    if (amount) amount.value = String(due);
  }, [state, formRef, due]);

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
    <form
      ref={formRef}
      action={formAction}
      onSubmit={submitKeepingInput(formAction)}
      noValidate
      className="grid gap-4 sm:grid-cols-2"
    >
      <input type="hidden" name="id" value={invoiceId} />
      {field("amount", "Amount received (FCFA)", (props) => (
        <input {...props} inputMode="numeric" defaultValue={due} />
      ))}
      {field("date", "Date received", (props) => (
        <input {...props} type="date" defaultValue={today} max={today} />
      ))}
      {field("method", "Paid by", (props) => (
        <select {...props} defaultValue="momo">
          {Object.entries(INVOICE_PAYMENT_METHODS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      ))}
      {field("note", "Note (optional)", (props) => (
        <input {...props} placeholder="e.g. MoMo transaction ID" />
      ))}
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
          className="rounded-full bg-green-600 px-6 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Record payment"}
        </button>
      </div>
    </form>
  );
}
