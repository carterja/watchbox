import { readFileSync } from "fs";
import { join } from "path";
import type { NextConfig } from "next";

const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  version: string;
};

const gitShort =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.GIT_SHA?.slice(0, 7) ||
  "";

const defaultVersion =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
  (gitShort ? `${pkg.version}+${gitShort}` : pkg.version);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: defaultVersion,
  },
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
