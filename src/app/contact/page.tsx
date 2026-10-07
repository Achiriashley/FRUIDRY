import type { Metadata } from "next";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Fruidry team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">Say hello</h1>
        <p className="mt-4 text-lg text-stone-600">
          Questions about an order, wholesale or our fruit? Send us a message
          and we&apos;ll reply soon.
        </p>
        <ul className="mt-8 space-y-3 text-stone-700">
          <li>📧 hello@fruidry.example</li>
          <li>🕘 Monday to Friday, 9am–5pm</li>
        </ul>
      </div>
      <ContactForm />
    </div>
  );
}
