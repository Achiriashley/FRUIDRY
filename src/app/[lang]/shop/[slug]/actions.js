"use server";

import { getProduct } from "@/lib/catalog";
import { DEFAULT_LOCALE, getDictionary, hasLocale, localizeProduct } from "@/lib/i18n";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { normalizeCameroonPhone } from "@/lib/shop-config";
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
