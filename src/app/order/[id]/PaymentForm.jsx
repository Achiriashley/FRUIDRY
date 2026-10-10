"use client";

import { useActionState } from "react";
import { submitPayment } from "./actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-orange-200";

export function PaymentForm({ orderId, defaultPhone }) {
  const [state, formAction, pending] = useActionState(submitPayment, { status: "idle" });

  return (
    <form action={formAction} noValidate className="mt-4 space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <label htmlFor="transactionId" className="text-sm font-medium">
          Transaction ID
        </label>
        <input
          id="transactionId"
          name="transactionId"
          autoComplete="off"
          className={`${inputClass} font-mono`}
        />
        {state.errors?.transactionId && (
          <p className="mt-1 text-sm text-red-600">{state.errors.transactionId}</p>
        )}
      </div>
      <div>
        <label htmlFor="payerPhone" className="text-sm font-medium">
          Number you paid from
        </label>
        <input
          id="payerPhone"
          name="payerPhone"
          type="tel"
          inputMode="tel"
          defaultValue={defaultPhone}
          className={inputClass}
        />
        {state.errors?.payerPhone && (
          <p className="mt-1 text-sm text-red-600">{state.errors.payerPhone}</p>
        )}
      </div>
      {state.errors?.form && <p className="text-sm text-red-600">{state.errors.form}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Sending…" : "I've paid"}
      </button>
    </form>
  );
}
