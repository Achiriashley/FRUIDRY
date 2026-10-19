"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { REVIEW_LIMITS } from "@/lib/shop-config";
import { submitKeepingInput, useFieldErrors } from "@/lib/use-keep-form";
import { submitReview } from "./actions";

const FIELDS = ["rating", "name", "comment"];
const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none placeholder:text-stone-500 focus:border-brand focus:ring-2 focus:ring-brand/20";

// "Leave a review": a star rating, a first name and a few words. Reviews are shown
// once approved in the admin panel.
export function ReviewForm({ slug }) {
  const uid = useId();
  const { lang, t, href } = useLocale();
  const [state, formAction, pending] = useActionState(submitReview, { status: "idle" });
  const { formRef, errorId, fieldProps } = useFieldErrors(state, uid, FIELDS);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const lit = hovered || rating;

  if (state.status === "success") {
    return (
      <p role="status" className="rounded-2xl bg-white p-5 font-medium text-brand-deep shadow-sm">
        ✓ {t.reviews.done}
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={submitKeepingInput(formAction)}
      noValidate
      className="relative rounded-2xl bg-white p-5 shadow-sm"
    >
      <h3 className="font-bold">{t.reviews.formTitle}</h3>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="lang" value={lang} />

      <fieldset
        className="mt-4"
        aria-describedby={state.errors?.rating ? errorId("rating") : undefined}
      >
        <legend className="text-sm font-medium">{t.reviews.rating}</legend>
        <div className="mt-1 flex" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              onMouseEnter={() => setHovered(n)}
              className="cursor-pointer rounded-md px-0.5 text-4xl leading-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-deep"
            >
              <input
                type="radio"
                name="rating"
                value={n}
                onChange={() => setRating(n)}
                className="sr-only"
                {...(state.errors?.rating ? { "aria-invalid": true } : {})}
              />
              <span aria-hidden className={n <= lit ? "text-amber-600" : "text-stone-300"}>
                ★
              </span>
              <span className="sr-only">{t.reviews.star(n)}</span>
            </label>
          ))}
        </div>
        {state.errors?.rating && (
          <p id={errorId("rating")} className="mt-1 text-sm text-red-600">
            {state.errors.rating}
          </p>
        )}
      </fieldset>

      <label htmlFor={`${uid}-name`} className="mt-4 block text-sm font-medium">
        {t.reviews.name}
      </label>
      <input
        id={`${uid}-name`}
        name="name"
        autoComplete="given-name"
        maxLength={REVIEW_LIMITS.name}
        placeholder={t.reviews.nameHint}
        className={inputClass}
        {...fieldProps("name")}
      />
      {state.errors?.name && (
        <p id={errorId("name")} className="mt-1 text-sm text-red-600">
          {state.errors.name}
        </p>
      )}

      <label htmlFor={`${uid}-comment`} className="mt-4 block text-sm font-medium">
        {t.reviews.comment}
      </label>
      <textarea
        id={`${uid}-comment`}
        name="comment"
        rows={4}
        maxLength={REVIEW_LIMITS.comment}
        placeholder={t.reviews.commentHint}
        className={inputClass}
        {...fieldProps("comment")}
      />
      {state.errors?.comment && (
        <p id={errorId("comment")} className="mt-1 text-sm text-red-600">
          {state.errors.comment}
        </p>
      )}

      {/* Hidden from people; robots that fill in every field are ignored. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.errors?.form && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {state.errors.form}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-full bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? t.reviews.sending : t.reviews.send}
      </button>
      <p className="mt-3 text-xs text-stone-500">
        {t.reviews.consent}{" "}
        <Link href={href("/privacy")} className="underline hover:text-brand">
          {t.privacy.title}
        </Link>
        .
      </p>
    </form>
  );
}
