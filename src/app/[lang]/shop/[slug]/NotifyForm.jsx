"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { submitKeepingInput, useFieldErrors } from "@/lib/use-keep-form";
import { joinWaitlist } from "./actions";

const FIELDS = ["phone"];

// "Notify me": leave a WhatsApp number to hear when a coming-soon flavour is available.
export function NotifyForm({ slug }) {
  const uid = useId();
  const { lang, t, href } = useLocale();
  const [state, formAction, pending] = useActionState(joinWaitlist, { status: "idle" });
  const { formRef, errorId, fieldProps } = useFieldErrors(state, uid, FIELDS);

  if (state.status === "success") {
    return (
      <p role="status" className="rounded-2xl bg-white p-5 font-medium text-brand-deep shadow-sm">
        ✓ {state.message}
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={submitKeepingInput(formAction)}
      noValidate
      className="rounded-2xl bg-white p-5 shadow-sm"
    >
      <h2 className="font-bold">{t.comingSoon.notifyTitle}</h2>
      <p className="mt-1 text-sm text-stone-600">{t.comingSoon.notifyIntro}</p>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="lang" value={lang} />
      <label htmlFor={`${uid}-phone`} className="mt-4 block text-sm font-medium">
        {t.comingSoon.phone}
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        <input
          id={`${uid}-phone`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t.comingSoon.phoneHint}
          className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none placeholder:text-stone-500 focus:border-brand focus:ring-2 focus:ring-brand/20"
          {...fieldProps("phone")}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full btn-whatsapp px-5 py-2 font-semibold disabled:opacity-60"
        >
          {pending ? t.comingSoon.notifying : t.comingSoon.notify}
        </button>
      </div>
      {state.errors?.phone && (
        <p id={errorId("phone")} className="mt-1 text-sm text-red-600">
          {state.errors.phone}
        </p>
      )}
      {state.errors?.form && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {state.errors.form}
        </p>
      )}
      <p className="mt-3 text-xs text-stone-500">
        {t.comingSoon.notifyConsent}{" "}
        <Link href={href("/privacy")} className="underline hover:text-brand">
          {t.privacy.title}
        </Link>
        .
      </p>
    </form>
  );
}
