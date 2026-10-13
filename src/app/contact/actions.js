"use server";

import { rateLimit, retryMessage } from "@/lib/rate-limit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContact(_prev, formData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const errors = {};
  if (!name) errors.name = "Please tell us your name.";
  else if (name.length > 100) errors.name = "Please keep your name under 100 characters.";
  if (email.length > 200 || !EMAIL_PATTERN.test(email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (message.length < 10) errors.message = "Your message should be at least 10 characters.";
  else if (message.length > 2000)
    errors.message = "Please keep your message under 2000 characters.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  const limit = await rateLimit("contact");
  if (!limit.allowed) {
    return {
      status: "error",
      errors: {
        form: `Too many messages sent just now. Please try again in ${retryMessage(limit.retryAfterSeconds)}.`,
      },
    };
  }

  // TODO: deliver the message (e.g. by email). Customer details are deliberately not
  // written to the server logs.
  console.info("Contact form submitted (message delivery is not set up yet).");

  return {
    status: "success",
    message: `Thanks, ${name}! We'll get back to you within two working days.`,
  };
}
