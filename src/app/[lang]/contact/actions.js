"use server";

import { getDictionary } from "@/lib/i18n";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { shopWhatsAppNumber, whatsAppLink } from "@/lib/shop-config";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Checks the message and turns it into a WhatsApp message to the shop, so it
// reaches you the same way orders do. Nothing is stored or logged.
export async function submitContact(_prev, formData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const lang = String(formData.get("lang") ?? "");
  const t = getDictionary(lang).contact;

  const errors = {};
  if (!name) errors.name = t.errors.name;
  else if (name.length > 100) errors.name = t.errors.nameTooLong;
  if (email && (email.length > 200 || !EMAIL_PATTERN.test(email))) {
    errors.email = t.errors.email;
  }
  if (message.length < 10) errors.message = t.errors.messageTooShort;
  else if (message.length > 2000) errors.message = t.errors.messageTooLong;

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  const limit = await rateLimit("contact");
  if (!limit.allowed) {
    return {
      status: "error",
      errors: { form: t.errors.rateLimited(retryMessage(limit.retryAfterSeconds, lang)) },
    };
  }

  const shopNumber = shopWhatsAppNumber();
  if (!shopNumber) {
    console.error("WHATSAPP_NUMBER is not set, so contact messages can't be sent on WhatsApp.");
    return { status: "error", errors: { form: t.errors.notSetUp } };
  }

  const text = [
    t.whatsappGreeting,
    "",
    message,
    "",
    `${t.whatsappFrom} ${name}${email ? ` (${email})` : ""}`,
  ].join("\n");
  return { status: "success", whatsappUrl: whatsAppLink(shopNumber, text) };
}
