"use client";

import { startTransition } from "react";

// React resets a form's fields after a form action runs, which would wipe what
// the visitor typed whenever we show a validation error. Submitting through
// onSubmit instead keeps their input.
export function submitKeepingInput(formAction) {
  return (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };
}
