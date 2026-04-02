/**
 * Deploy/build identifier for prod checks. Set at build via `next.config.ts`
 * (`NEXT_PUBLIC_APP_VERSION`, or `GIT_SHA` / `VERCEL_GIT_COMMIT_SHA` + package.json version).
 */
export const APP_VERSION =
  typeof process.env.NEXT_PUBLIC_APP_VERSION === "string" &&
  process.env.NEXT_PUBLIC_APP_VERSION.length > 0
    ? process.env.NEXT_PUBLIC_APP_VERSION
    : "dev";
