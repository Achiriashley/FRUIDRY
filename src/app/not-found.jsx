import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl" aria-hidden>
        🍂
      </p>
      <h1 className="mt-4 text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-stone-600">This page has dried up. Try the shop instead.</p>
      <Link
        href="/shop"
        className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
      >
        Go to the shop
      </Link>
    </div>
  );
}
