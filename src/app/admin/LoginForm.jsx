"use client";

import { useActionState, useId, useState } from "react";
import { login } from "./actions";

// An eye: open while the password is shown, crossed out while it's hidden.
function EyeIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M6.6 6.6A18.4 18.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <path d="M2 2l20 20" />
        </>
      )}
    </svg>
  );
}

export function LoginForm() {
  const uid = useId();
  const [state, formAction, pending] = useActionState(login, { error: null });
  const [shown, setShown] = useState(false);
  const inputId = `${uid}-password`;
  return (
    // Wrapped in a function so a press before the page has finished loading is held and
    // sent once it has (instead of a plain form post). The password is hidden again on
    // each attempt.
    <form
      action={(formData) => {
        setShown(false);
        return formAction(formData);
      }}
      className="mx-auto max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-bold">Orders admin</h1>
      <p className="text-sm text-stone-600">
        For your security, the password is needed each time the admin panel is opened or reloaded,
        and after 30 minutes without activity.
      </p>
      <div>
        <label htmlFor={inputId} className="text-sm font-medium">
          Password
        </label>
        <div className="relative mt-1">
          <input
            id={inputId}
            name="password"
            type={shown ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-lg border border-stone-300 py-2 pr-12 pl-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-controls={inputId}
            aria-pressed={shown}
            aria-label={shown ? "Hide password" : "Show password"}
            title={shown ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-stone-500 hover:text-brand"
          >
            <EyeIcon open={shown} />
          </button>
        </div>
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
