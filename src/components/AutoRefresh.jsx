"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-checks the order every few seconds so the receipt appears once payment is confirmed.
export function AutoRefresh({ intervalMs = 15000 }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);
  return null;
}
