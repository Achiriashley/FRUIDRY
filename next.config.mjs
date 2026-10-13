/** @type {import("next").NextConfig} */
const nextConfig = {
  cacheComponents: true,
  experimental: {
    // Product photos are resized in the browser first, but allow some headroom.
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    // Product photos uploaded to Supabase Storage.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
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
