import { randomBytes } from "node:crypto";
import { cacheTag } from "next/cache";
import { jsonFile, supabaseConfig, supabaseRequest } from "./storage";

// Customer reviews of a product: a star rating, a first name and a few words. Visitors
// send them from the product page; they're only shown (and given to Google as the
// product's rating) once approved in the admin panel (/admin/reviews).

export const REVIEWS_TAG = "reviews";
export const REVIEW_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

const reviewsFile = jsonFile("reviews.json", []);
const COLUMNS = "id,slug,name,rating,comment,lang,status,created_at,approved_at";

const fromRow = ({ created_at: createdAt, approved_at: approvedAt, ...rest }) => ({
  ...rest,
  createdAt,
  approvedAt,
});

const byNewest = (a, b) =>
  String(b.approvedAt ?? b.createdAt).localeCompare(String(a.approvedAt ?? a.createdAt));

const supabaseStore = {
  add: (config, review) =>
    supabaseRequest(config, "reviews", "", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: review.id,
        slug: review.slug,
        name: review.name,
        rating: review.rating,
        comment: review.comment,
        lang: review.lang,
        status: review.status,
        created_at: review.createdAt,
      }),
    }),
  // Supabase returns at most "Max rows" (1,000 by default) per request: read page by page.
  async list(config, filter) {
    const rows = [];
    for (;;) {
      const page = await supabaseRequest(
        config,
        "reviews",
        `?select=${COLUMNS}${filter}&order=created_at.desc,id.asc&limit=1000&offset=${rows.length}`,
      );
      if (!page?.length) break;
      rows.push(...page);
    }
    return rows.map(fromRow);
  },
  approve: (config, id, approvedAt) =>
    supabaseRequest(config, "reviews", `?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "approved", approved_at: approvedAt }),
    }),
  remove: (config, query) => supabaseRequest(config, "reviews", query, { method: "DELETE" }),
};

const fileStore = {
  add: (review) => reviewsFile.update((list) => [...list, review]),
  list: async (keep) => (await reviewsFile.read()).filter(keep),
  approve: (id, approvedAt) =>
    reviewsFile.update((list) =>
      list.map((r) => (r.id === id ? { ...r, status: "approved", approvedAt } : r)),
    ),
  remove: (keep) => reviewsFile.update((list) => list.filter(keep)),
};

// Saves a review sent from the product page. It waits for approval.
export async function addReview({ slug, name, rating, comment, lang }) {
  const review = {
    id: randomBytes(9).toString("base64url"),
    slug,
    name,
    rating,
    comment,
    lang,
    status: "pending",
    createdAt: new Date().toISOString(),
    approvedAt: null,
  };
  const config = supabaseConfig();
  return config ? supabaseStore.add(config, review) : fileStore.add(review);
}

// Every review, newest first, for the admin panel.
export async function listReviews() {
  const config = supabaseConfig();
  const list = config ? await supabaseStore.list(config, "") : await fileStore.list(() => true);
  return list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// A product's approved reviews, most recently approved first, as shown on its page.
// Cached with the page; approving or deleting a review refreshes it (REVIEWS_TAG). If
// the reviews can't be read (for example before the Supabase table exists), the page
// is shown without reviews instead of failing.
export async function getApprovedReviews(slug) {
  "use cache";
  cacheTag(REVIEWS_TAG);
  try {
    const config = supabaseConfig();
    const list = config
      ? await supabaseStore.list(config, `&slug=eq.${encodeURIComponent(slug)}&status=eq.approved`)
      : await fileStore.list((r) => r.slug === slug && r.status === "approved");
    return list.sort(byNewest);
  } catch (error) {
    if (!reviewsTableMissing(error)) console.error("Couldn't load reviews", error.message);
    return [];
  }
}

export async function approveReview(id) {
  if (!REVIEW_ID_PATTERN.test(id)) return;
  const approvedAt = new Date().toISOString();
  const config = supabaseConfig();
  return config ? supabaseStore.approve(config, id, approvedAt) : fileStore.approve(id, approvedAt);
}

export async function deleteReview(id) {
  if (!REVIEW_ID_PATTERN.test(id)) return;
  const config = supabaseConfig();
  return config
    ? supabaseStore.remove(config, `?id=eq.${encodeURIComponent(id)}`)
    : fileStore.remove((r) => r.id !== id);
}

// When a product is deleted, its reviews go too.
export async function deleteProductReviews(slug) {
  const config = supabaseConfig();
  return config
    ? supabaseStore.remove(config, `?slug=eq.${encodeURIComponent(slug)}`)
    : fileStore.remove((r) => r.slug !== slug);
}

// Average (one decimal) and number of reviews.
export function ratingSummary(reviews) {
  if (reviews.length === 0) return { count: 0, average: null };
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return { count: reviews.length, average: Math.round((total / reviews.length) * 10) / 10 };
}

// True when Supabase is set up but the reviews table hasn't been created yet.
export function reviewsTableMissing(error) {
  return /PGRST205|42P01|Could not find the table|does not exist/i.test(error?.message ?? "");
}
