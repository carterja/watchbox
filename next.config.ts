import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Avoid Docker/CI build failures due to lint; run `npm run lint` separately.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
    ],
    formats: ["image/webp"],
    minimumCacheTTL: 86400, // 24 hours
    deviceSizes: [384, 640, 828, 1080],
    imageSizes: [48, 96, 128, 256],
    dangerouslyAllowSVG: false,
    unoptimized: false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  compress: true,
  // Enable standalone output for Docker
  output: 'standalone',
};

export default nextConfig;
