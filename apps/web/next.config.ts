import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
module.exports = {
  reactStrictMode: true,
  experimental: {
    // ISR (Incremental Static Regeneration)
    incrementalCacheHandlerPath: require.resolve("next/dist/server/lib/incremental-cache/file-system-cache"),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
    ];
  },
};
