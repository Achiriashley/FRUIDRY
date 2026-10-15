"use client";

import { logout } from "./actions";

// Signs out, then reloads the page, so nothing from the admin panel stays in memory
// (Next.js keeps recently visited pages, hidden, to show them faster).
export function SignOutButton({ className }) {
  async function signOut() {
    await logout();
    window.location.replace("/admin");
  }

  return (
    <form action={signOut}>
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}
