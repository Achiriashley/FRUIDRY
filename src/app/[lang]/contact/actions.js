"use server";

import { getDictionary } from "@/lib/i18n";
import { rateLimit, retryMessage } from "@/lib/rate-limit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContact(_prev, formData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const lang = String(formData.get("lang") ?? "");
  const t = getDictionary(lang).contact;

  const errors = {};
  if (!name) errors.name = t.errors.name;
  else if (name.length > 100) errors.name = t.errors.nameTooLong;
  if (email.length > 200 || !EMAIL_PATTERN.test(email)) {
    errors.email = t.errors.email;
  }
  if (message.length < 10) errors.message = t.errors.messageTooShort;
  else if (message.length > 2000)
    errors.message = t.errors.messageTooLong;

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  const limit = await rateLimit("contact");
  if (!limit.allowed) {
    return {
      status: "error",
      errors: {
        form: t.errors.rateLimited(retryMessage(limit.retryAfterSeconds, lang)),
      },
    };
  }

  // TODO: deliver the message (e.g. by email). Customer details are deliberately not
  // written to the server logs.
  console.info("Contact form submitted (message delivery is not set up yet).");

  return {
    status: "success",
    message: t.thanks(name),
  };
}
