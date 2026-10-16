"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { logout } from "./actions";
import { resumeSessionChecks, stopSessionChecks } from "./SessionGuard";

// Shows "Signing out…" until it's done (offline, it waits for the connection).
function SubmitButton({ className }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

// Signs out, then reloads the page, so nothing from the admin panel stays in memory
// (Next.js keeps recently visited pages, hidden, to show them faster).
export function SignOutButton({ className }) {
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setFailed(false);
    await stopSessionChecks();
    try {
      await logout();
    } catch {
      // Signing out failed (e.g. a server error): still signed in. Say so rather than
      // look signed out.
      resumeSessionChecks();
      setFailed(true);
      return;
    }
    window.location.replace("/admin");
  }

  return (
    <form action={signOut} className="flex items-center gap-2">
      <SubmitButton className={className} />
      {failed && (
        <span role="alert" className="text-xs text-sun-light">
          Couldn&apos;t sign out. Try again.
        </span>
      )}
    </form>
  );
}
