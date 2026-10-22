import type { NextConfig } from "next";

const apiOrigin = process.env.API_INTERNAL_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  rewrites: async () => [
    {
      source: "/backend/:path*",
      destination: `${apiOrigin}/:path*`,
    },
  ],
};

export default nextConfig;
