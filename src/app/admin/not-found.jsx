import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link
        href="/admin"
        className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
      >
        Back to admin
      </Link>
    </div>
  );
}
