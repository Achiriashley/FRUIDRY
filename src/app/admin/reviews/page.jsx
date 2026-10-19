import Link from "next/link";
import { Suspense } from "react";
import { getProducts } from "@/lib/catalog";
import { formatOrderDate } from "@/lib/orders";
import { listReviews, reviewsTableMissing } from "@/lib/reviews";
import { AdminPage, AdminShell } from "../AdminShell";
import { publishReview } from "../actions";
import { DeleteReviewButton } from "./DeleteReviewButton";

export const metadata = { title: "Reviews", robots: { index: false } };

export default function ReviewsPage() {
  return (
    <AdminPage>
      <Suspense fallback={<p className="text-stone-600">Loading…</p>}>
        <AdminShell active="reviews">
          {async () => {
            const [reviews, products] = await Promise.all([loadReviews(), getProducts()]);
            const names = Object.fromEntries(products.map((p) => [p.slug, p.name]));
            return <Reviews {...reviews} names={names} />;
          }}
        </AdminShell>
      </Suspense>
    </AdminPage>
  );
}

// A missing Supabase table shows a setup note instead of breaking the page.
async function loadReviews() {
  try {
    return { reviews: await listReviews(), setupNeeded: false };
  } catch (error) {
    if (!reviewsTableMissing(error)) throw error;
    return { reviews: [], setupNeeded: true };
  }
}

function Stars({ rating }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="tracking-wide">
      <span className="text-amber-600">{"★".repeat(rating)}</span>
      <span className="text-stone-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function ReviewItem({ review, productName, waiting }) {
  return (
    <li className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars rating={review.rating} />
        <span className="font-semibold">{review.name}</span>
        <span className="text-sm text-stone-500">
          {productName ? (
            <Link href={`/${review.lang}/shop/${review.slug}`} className="hover:text-brand">
              {productName}
            </Link>
          ) : (
            "Deleted product"
          )}{" "}
          · {review.lang === "fr" ? "French" : "English"} · {formatOrderDate(review.createdAt)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-line break-words text-stone-700">{review.comment}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {waiting && (
          <form action={publishReview}>
            <input type="hidden" name="id" value={review.id} />
            <button
              type="submit"
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Publish
            </button>
          </form>
        )}
        <DeleteReviewButton id={review.id} published={!waiting} />
      </div>
    </li>
  );
}

function Reviews({ reviews, setupNeeded, names }) {
  const waiting = reviews.filter((r) => r.status !== "approved");
  const published = reviews.filter((r) => r.status === "approved");
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Reviews</h1>
        <p className="mt-2 text-sm text-stone-600">
          Customers leave reviews on each product&apos;s page. Publish the genuine ones: they then
          appear on the product page, and Google can show the stars in its results. Delete spam,
          insults, or anything with personal details such as phone numbers.
        </p>
        {setupNeeded && (
          <p className="mt-3 rounded-xl bg-yellow-100 p-4 text-sm text-stone-800">
            To turn on reviews, run <code className="font-mono">supabase/schema.sql</code> again in
            Supabase (SQL editor). It only adds what&apos;s missing.
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">
          Waiting for you <span className="text-stone-400">({waiting.length})</span>
        </h2>
        {waiting.length === 0 ? (
          <p className="text-sm text-stone-500">No new reviews.</p>
        ) : (
          <ul className="space-y-4">
            {waiting.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                productName={names[review.slug]}
                waiting
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">
          Published <span className="text-stone-400">({published.length})</span>
        </h2>
        {published.length === 0 ? (
          <p className="text-sm text-stone-500">None yet.</p>
        ) : (
          <ul className="space-y-4">
            {published.map((review) => (
              <ReviewItem key={review.id} review={review} productName={names[review.slug]} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
