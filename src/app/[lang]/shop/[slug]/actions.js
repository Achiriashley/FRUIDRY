"use server";

import { getProduct } from "@/lib/catalog";
import { DEFAULT_LOCALE, getDictionary, hasLocale, localizeProduct } from "@/lib/i18n";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { addReview } from "@/lib/reviews";
import { REVIEW_LIMITS, normalizeCameroonPhone } from "@/lib/shop-config";
import { addToWaitlist } from "@/lib/waitlist";

// "Notify me" on a coming-soon flavour: keeps the visitor's WhatsApp number so the shop
// can tell them once it's available.
export async function joinWaitlist(_prev, formData) {
  const rawLang = String(formData.get("lang") ?? "");
  const lang = hasLocale(rawLang) ? rawLang : DEFAULT_LOCALE;
  const t = getDictionary(lang).comingSoon;

  const product = await getProduct(String(formData.get("slug") ?? "").slice(0, 100));
  if (!product) return { status: "error", errors: { form: t.errors.failed } };
  if (!product.comingSoon) return { status: "error", errors: { form: t.errors.notComingSoon } };

  const phone = normalizeCameroonPhone(String(formData.get("phone") ?? "").slice(0, 40));
  if (!phone) return { status: "error", errors: { phone: t.errors.phone } };

  const limit = await rateLimit("waitlist");
  if (!limit.allowed) {
    return {
      status: "error",
      errors: { form: t.errors.rateLimited(retryMessage(limit.retryAfterSeconds, lang)) },
    };
  }

  try {
    await addToWaitlist({ slug: product.slug, phone, lang });
  } catch (error) {
    // Not the number itself: logs shouldn't hold customers' details.
    console.error("Couldn't save a waiting-list signup", error.message);
    return { status: "error", errors: { form: t.errors.failed } };
  }
  return { status: "success", message: t.notifyDone(localizeProduct(product, lang).name) };
}

// Collapses a one-line text (a name): no control characters, single spaces.
const oneLine = (text) =>
  text
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Keeps line breaks in a review (at most one empty line in a row), drops other control
// characters.
const paragraphs = (text) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// "Leave a review" on a product page. The review waits for approval in the admin panel
// before it's shown.
export async function submitReview(_prev, formData) {
  const rawLang = String(formData.get("lang") ?? "");
  const lang = hasLocale(rawLang) ? rawLang : DEFAULT_LOCALE;
  const t = getDictionary(lang).reviews;

  const product = await getProduct(String(formData.get("slug") ?? "").slice(0, 100));
  if (!product) return { status: "error", errors: { form: t.errors.failed } };
  if (product.comingSoon) return { status: "error", errors: { form: t.errors.notForSale } };

  // A field people can't see: only robots fill it in. They're told it worked.
  if (String(formData.get("website") ?? "") !== "") return { status: "success" };

  const rating = Number(formData.get("rating"));
  const name = oneLine(String(formData.get("name") ?? "").slice(0, 500));
  const comment = paragraphs(String(formData.get("comment") ?? "").slice(0, 5000));
  const errors = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = t.errors.rating;
  if (name.length < 2) errors.name = t.errors.name;
  else if (name.length > REVIEW_LIMITS.name) errors.name = t.errors.tooLong(REVIEW_LIMITS.name);
  if (comment.length < 3) errors.comment = t.errors.comment;
  else if (comment.length > REVIEW_LIMITS.comment) {
    errors.comment = t.errors.tooLong(REVIEW_LIMITS.comment);
  }
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const limit = await rateLimit("review");
  if (!limit.allowed) {
    return {
      status: "error",
      errors: { form: t.errors.rateLimited(retryMessage(limit.retryAfterSeconds, lang)) },
    };
  }

  try {
    await addReview({ slug: product.slug, name, rating, comment, lang });
  } catch (error) {
    console.error("Couldn't save a review", error.message);
    return { status: "error", errors: { form: t.errors.failed } };
  }
  return { status: "success" };
}
