const isDev = process.env.NODE_ENV === "development";
const onVercel = Boolean(process.env.VERCEL);

// Only this project's Supabase Storage may be used for product photos.
function supabaseImagePattern() {
  try {
    const { hostname } = new URL(process.env.SUPABASE_URL);
    return [{ protocol: "https", hostname, pathname: "/storage/v1/object/public/**" }];
  } catch {
    return [];
  }
}

// Content Security Policy. Scripts and styles may only come from this site; the
// pre-rendered pages need 'unsafe-inline' (nonces would force every page to be
// rendered per request). Images go through this site's own image optimizer.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(onVercel ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // HTTPS only. Set where the site is served over HTTPS (Vercel), not on local http.
  ...(onVercel
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

/** @type {import("next").NextConfig} */
const nextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  experimental: {
    // Product photos are resized in the browser first, but allow some headroom.
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    remotePatterns: supabaseImagePattern(),
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
