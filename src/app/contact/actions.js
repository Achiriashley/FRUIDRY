"use server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContact(_prev, formData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const errors = {};
  if (!name) errors.name = "Please tell us your name.";
  if (!EMAIL_PATTERN.test(email)) errors.email = "Please enter a valid email address.";
  if (message.length < 10) errors.message = "Your message should be at least 10 characters.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  // TODO: forward the message to an inbox or CRM. For now it is only logged.
  console.log("New contact message", { name, email, message });

  return {
    status: "success",
    message: `Thanks, ${name}! We'll get back to you within two working days.`,
  };
}
