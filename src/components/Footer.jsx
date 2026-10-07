import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-stone-900 text-stone-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-white">🍊 Fruidry</p>
          <p className="mt-2 text-sm">
            Naturally dried fruit snacks with nothing added and nothing hidden.
          </p>
        </div>
        <div>
          <p className="font-semibold text-white">Explore</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link href="/shop" className="hover:text-white">
                Shop all
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white">
                Our story
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Promise</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>No added sugar</li>
            <li>No preservatives</li>
            <li>Compostable packaging</li>
          </ul>
        </div>
      </div>
      <p className="border-t border-stone-800 py-4 text-center text-xs">
        © 2026 Fruidry. All rights reserved.
      </p>
    </footer>
  );
}
