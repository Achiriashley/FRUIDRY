"use client";

import { Analytics } from "@vercel/analytics/next";

// Order pages are private links: report them without the order's ID.
function hideOrderIds(event) {
  return { ...event, url: event.url.replace(/\/order\/[^/?#]+/, "/order/[id]") };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={hideOrderIds} />;
}
