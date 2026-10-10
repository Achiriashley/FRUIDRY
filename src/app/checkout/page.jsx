import { CheckoutForm } from "./CheckoutForm";

export const metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-extrabold tracking-tight">Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
