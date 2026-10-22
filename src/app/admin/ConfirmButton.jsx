"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

// A button that asks before it submits its form: the first tap shows the question with
// a "Yes" button (which submits) and a "No" button. Used for order changes the customer
// can see, so one wrong tap on a phone doesn't mark an order paid, delivered or cancelled.
export function ConfirmButton({ label, question, hint, yes, no, className, yesClassName }) {
  const [asking, setAsking] = useState(false);
  const { pending } = useFormStatus();
  const questionRef = useRef(null);
  const buttonRef = useRef(null);
  const focusButton = useRef(false);

  // The question takes the focus (screen readers read it); "No" gives it back.
  useEffect(() => {
    if (asking) {
      questionRef.current?.focus();
    } else if (focusButton.current) {
      focusButton.current = false;
      buttonRef.current?.focus();
    }
  }, [asking]);

  function stopAsking() {
    focusButton.current = true;
    setAsking(false);
  }

  if (!asking) {
    return (
      <button ref={buttonRef} type="button" onClick={() => setAsking(true)} className={className}>
        {label}
      </button>
    );
  }
  return (
    <div
      role="group"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !pending) stopAsking();
      }}
      className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3"
    >
      <p ref={questionRef} tabIndex={-1} className="font-semibold outline-none">
        {question}
      </p>
      {hint && <p className="mt-0.5 text-sm text-stone-600">{hint}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={yesClassName ?? className}>
          {pending ? "Saving…" : yes}
        </button>
        <button
          type="button"
          onClick={stopAsking}
          disabled={pending}
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
        >
          {no}
        </button>
      </div>
    </div>
  );
}
