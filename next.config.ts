import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Lint errors will fail CI builds; run `npm run lint` to check locally
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
    ],
    formats: ["image/avif", "image/webp"],
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
