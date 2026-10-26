"use client";

import { Analytics } from "@vercel/analytics/next";

// Order and invoice pages are private links: report them without their ID.
function hidePrivateIds(event) {
  return { ...event, url: event.url.replace(/\/(order|invoice)\/[^/?#]+/, "/$1/[id]") };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={hidePrivateIds} />;
}
