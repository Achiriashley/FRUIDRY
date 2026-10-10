import Link from "next/link";
import { connection } from "next/server";
import { AutoRefresh } from "@/components/AutoRefresh";
import { adminPasswordConfigured, isAdmin } from "@/lib/admin-auth";
import { logout } from "./actions";
import { LoginForm } from "./LoginForm";

const NAV = [
  { href: "/admin", label: "Dashboard", id: "dashboard" },
  { href: "/admin/orders", label: "Orders", id: "orders" },
  { href: "/admin/products", label: "Product", id: "products" },
];

// Wraps every admin page: checks the admin is signed in and draws the menu.
// Children are a function so pages only load their data once access is checked.
export async function AdminShell({ active, autoRefresh = false, children }) {
  // Read the password and data at request time, not when the site is built.
  await connection();

  if (!adminPasswordConfigured()) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Admin is not set up</h1>
        <p className="mt-2 text-stone-600">
          Set the <code className="font-mono">ADMIN_PASSWORD</code> environment variable and restart
          the site to use the admin panel.
        </p>
      </div>
    );
  }
  if (!(await isAdmin())) return <LoginForm />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-stone-900 px-5 py-3 text-white">
        <p className="font-bold">🍊 Fruidry admin</p>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active === item.id ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 font-medium ${
                active === item.id ? "bg-white text-stone-900" : "text-stone-300 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/" className="rounded-full px-3 py-1.5 text-stone-300 hover:text-white">
            View shop
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full px-3 py-1.5 text-stone-300 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
      {autoRefresh && <AutoRefresh intervalMs={30000} />}
      {await children()}
    </div>
  );
}

export function AdminPage({ children }) {
  return <div className="mx-auto max-w-5xl px-4 py-10">{children}</div>;
}
