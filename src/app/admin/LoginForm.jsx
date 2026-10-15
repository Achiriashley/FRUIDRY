"use client";

import { useActionState, useId } from "react";
import { login } from "./actions";

export function LoginForm() {
  const uid = useId();
  const [state, formAction, pending] = useActionState(login, { error: null });
  return (
    // Wrapped in a function so a press before the page has finished loading is held and
    // sent once it has (instead of a plain form post).
    <form
      action={(formData) => formAction(formData)}
      className="mx-auto max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-bold">Orders admin</h1>
      <p className="text-sm text-stone-600">
        For your security, the password is needed each time the admin panel is opened or reloaded,
        and after 30 minutes without activity.
      </p>
      <div>
        <label htmlFor={`${uid}-password`} className="text-sm font-medium">
          Password
        </label>
        <input
          id={`${uid}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
