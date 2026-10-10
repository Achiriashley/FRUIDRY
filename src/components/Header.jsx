import Link from "next/link";
import { CartLink } from "./CartLink";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "Our story" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-20 print:hidden border-b border-stone-200 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-brand"
        >
          <span aria-hidden>🍊</span> Fruidry
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hidden rounded-md px-2 py-1 text-sm font-medium text-stone-700 hover:text-brand sm:inline"
            >
              {item.label}
            </Link>
          ))}
          <CartLink />
        </nav>
      </div>
      <nav className="flex justify-center gap-6 border-t border-stone-200 py-2 text-sm sm:hidden">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="font-medium text-stone-700">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
