"use client";

import { useState } from "react";
import { logout } from "./actions";
import { resumeSessionChecks, stopSessionChecks } from "./SessionGuard";

// Signs out, then reloads the page, so nothing from the admin panel stays in memory
// (Next.js keeps recently visited pages, hidden, to show them faster).
export function SignOutButton({ className }) {
  const [failed, setFailed] = useState(false);

  async function signOut() {
    await stopSessionChecks();
    try {
      await logout();
    } catch {
      // Offline: still signed in. Say so rather than look signed out.
      resumeSessionChecks();
      setFailed(true);
      return;
    }
    window.location.replace("/admin");
  }

  return (
    <form action={signOut} className="flex items-center gap-2">
      <button type="submit" className={className}>
        Sign out
      </button>
      {failed && (
        <span role="alert" className="text-xs text-sun-light">
          Couldn&apos;t sign out. Check your connection and try again.
        </span>
      )}
    </form>
  );
}
