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
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 24 hours
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    dangerouslyAllowSVG: false,
    unoptimized: false,
    loader: 'default',
    loaderFile: undefined,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  compress: true,
  // Enable standalone output for Docker
  output: 'standalone',
};

export default nextConfig;
