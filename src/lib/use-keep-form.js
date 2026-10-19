"use client";

import { startTransition, useEffect, useRef } from "react";

// React resets a form's fields after a form action runs, which would wipe what
// the visitor typed whenever we show a validation error. Submitting through
// onSubmit instead keeps their input. Give the form action={formAction} too: before
// the page's JavaScript has loaded, it then posts the form to the server (instead of
// putting the fields in the address as a plain GET would).
export function submitKeepingInput(formAction) {
  return (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };
}

// Links each field to its error message (for screen readers) and, after a failed
// submit, moves the cursor to the first field with an error. Only once per result:
// Next.js re-runs effects when a kept-alive page is shown again.
export function useFieldErrors(state, uid, fields) {
  const formRef = useRef(null);
  const handled = useRef(null);
  useEffect(() => {
    if (state.status !== "error" || handled.current === state) return;
    handled.current = state;
    const first = fields.find((field) => state.errors?.[field]);
    // A group of radio buttons comes back as a list: focus its first button.
    const element = first && formRef.current?.elements.namedItem(first);
    (element instanceof RadioNodeList ? element[0] : element)?.focus();
  }, [state, fields]);

  const errorId = (field) => `${uid}-${field}-error`;
  const fieldProps = (field) =>
    state.errors?.[field] ? { "aria-invalid": true, "aria-describedby": errorId(field) } : {};
  return { formRef, errorId, fieldProps };
}
