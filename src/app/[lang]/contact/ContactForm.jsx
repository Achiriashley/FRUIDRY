"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { submitContact } from "./actions";
import { useLocale } from "@/components/LocaleProvider";
import { submitKeepingInput, useFieldErrors } from "@/lib/use-keep-form";

const initialState = { status: "idle" };

const LAST_MESSAGE_KEY = "fruidry-last-message";
const FIELDS = ["name", "email", "message"];

function FieldError({ id, message }) {
  return message ? (
    <p id={id} className="mt-1 text-sm text-red-600">
      {message}
    </p>
  ) : null;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

// A fresh form on each new visit (see CheckoutForm) and after "Write another message".
export function ContactForm() {
  const { bfcacheId } = useRouter();
  const [round, setRound] = useState(0);
  function startOver() {
    try {
      window.sessionStorage.removeItem(LAST_MESSAGE_KEY);
    } catch {
      // Storage unavailable; nothing to clear.
    }
    setRound((r) => r + 1);
  }
  return <ContactFormInner key={`${bfcacheId}-${round}`} onNewMessage={startOver} />;
}

function ContactFormInner({ onNewMessage }) {
  const uid = useId();
  const { lang, t, href } = useLocale();
  const [state, formAction, pending] = useActionState(submitContact, initialState);
  const [restored, setRestored] = useState(null);
  const openedUrl = useRef(null);
  const { formRef, errorId, fieldProps } = useFieldErrors(state, uid, FIELDS);

  // If the visitor pressed Back to return from WhatsApp and the page reloaded, remind
  // them (once) to press send there instead of showing an empty form.
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(LAST_MESSAGE_KEY);
      window.sessionStorage.removeItem(LAST_MESSAGE_KEY);
      const cameBack = performance.getEntriesByType("navigation")[0]?.type === "back_forward";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (cameBack && saved?.startsWith("https://wa.me/")) setRestored(saved);
    } catch {
      // Storage unavailable; show the form.
    }
  }, []);

  // Opens the WhatsApp app on phones, or WhatsApp Web on computers. Only once per
  // message: Next.js re-runs effects when a kept-alive page is shown again.
  useEffect(() => {
    if (state.status !== "success" || openedUrl.current === state.whatsappUrl) return;
    openedUrl.current = state.whatsappUrl;
    try {
      window.sessionStorage.setItem(LAST_MESSAGE_KEY, state.whatsappUrl);
    } catch {
      // Storage unavailable; the confirmation still shows until the page reloads.
    }
    window.location.href = state.whatsappUrl;
  }, [state]);

  const sentUrl = state.status === "success" ? state.whatsappUrl : restored;
  if (sentUrl) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm" role="status">
        <p className="text-4xl" aria-hidden>
          💬
        </p>
        <p className="mt-3 text-lg font-semibold">{t.contact.almostDone}</p>
        <p className="mt-2 text-stone-600">{t.contact.ready}</p>
        <a
          href={sentUrl}
          className="mt-6 inline-block rounded-full btn-whatsapp px-6 py-3 font-semibold"
        >
          {t.contact.openAgain}
        </a>
        <p className="mt-4">
          <button
            type="button"
            onClick={onNewMessage}
            className="text-sm text-stone-600 underline hover:text-brand"
          >
            {t.contact.newMessage}
          </button>
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={submitKeepingInput(formAction)}
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      noValidate
    >
      <input type="hidden" name="lang" value={lang} />
      <div>
        <label htmlFor={`${uid}-name`} className="text-sm font-medium">
          {t.contact.name}
        </label>
        <input
          id={`${uid}-name`}
          name="name"
          className={inputClass}
          autoComplete="name"
          {...fieldProps("name")}
        />
        <FieldError id={errorId("name")} message={state.errors?.name} />
      </div>
      <div>
        <label htmlFor={`${uid}-email`} className="text-sm font-medium">
          {t.contact.email} <span className="font-normal text-stone-500">{t.contact.optional}</span>
        </label>
        <input
          id={`${uid}-email`}
          name="email"
          type="email"
          className={inputClass}
          autoComplete="email"
          {...fieldProps("email")}
        />
        <FieldError id={errorId("email")} message={state.errors?.email} />
      </div>
      <div>
        <label htmlFor={`${uid}-message`} className="text-sm font-medium">
          {t.contact.message}
        </label>
        <textarea
          id={`${uid}-message`}
          name="message"
          rows={5}
          className={inputClass}
          {...fieldProps("message")}
        />
        <FieldError id={errorId("message")} message={state.errors?.message} />
      </div>
      {state.errors?.form && (
        <p role="alert" className="text-sm text-red-600">
          {state.errors.form}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full btn-whatsapp py-3 font-semibold disabled:opacity-60"
      >
        {pending ? t.contact.sending : t.contact.send}
      </button>
      <p className="text-xs text-stone-500">
        {t.contact.consent}{" "}
        <Link href={href("/privacy")} className="underline hover:text-brand">
          {t.footer.privacy}
        </Link>
      </p>
    </form>
  );
}
