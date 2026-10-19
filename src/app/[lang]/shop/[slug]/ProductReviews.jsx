import { ReviewForm } from "./ReviewForm";

const locale = (lang) => (lang === "fr" ? "fr-FR" : "en-GB");

// "4,8" in French, "4.8" in English.
export function formatRating(value, lang) {
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 1 }).format(value);
}

// Five stars, filled up to the (rounded) rating. Read out as "Rated 4 out of 5".
function Stars({ rating, label, className = "text-xl" }) {
  const filled = Math.round(rating);
  return (
    <span role="img" aria-label={label} className={`leading-none tracking-wide ${className}`}>
      <span className="text-amber-600">{"★".repeat(filled)}</span>
      <span className="text-stone-300">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

// The product's approved reviews with their average, and the form to leave one.
export function ProductReviews({ slug, reviews, summary, lang, t }) {
  const date = new Intl.DateTimeFormat(locale(lang), {
    dateStyle: "long",
    timeZone: "Africa/Douala",
  });
  const average = summary.count > 0 && formatRating(summary.average, lang);
  return (
    <section className="mt-20" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-2xl font-bold">
        {t.reviews.heading}
      </h2>
      {summary.count > 0 ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stars rating={summary.average} label={t.reviews.stars(average)} className="text-2xl" />
          <span className="font-semibold">{t.reviews.summary(average, summary.count)}</span>
        </p>
      ) : (
        <p className="mt-2 text-stone-600">{t.reviews.none}</p>
      )}
      <div className="mt-6 grid items-start gap-8 md:grid-cols-2">
        {reviews.length > 0 && (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <Stars rating={review.rating} label={t.reviews.stars(review.rating)} />
                <p className="mt-2 whitespace-pre-line break-words text-stone-700">
                  {review.comment}
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  <span className="font-semibold text-stone-700">{review.name}</span> ·{" "}
                  {date.format(new Date(review.createdAt))}
                </p>
              </li>
            ))}
          </ul>
        )}
        <ReviewForm slug={slug} />
      </div>
    </section>
  );
}
