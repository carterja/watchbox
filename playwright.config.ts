import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Load .env / .env.local so TMDB and other secrets apply to this process and the webServer child.
loadEnvConfig(process.cwd());

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.cwd(), ".pw-browsers");

const port = Number(process.env.PLAYWRIGHT_PORT ?? process.env.PORT) || 3333;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

// Never use the repo .env DATABASE_URL for Playwright: it breaks e2e (wrong DB, relative paths from standalone cwd).
const e2eDbUrl = `file:${path.join(process.cwd(), "prisma", "e2e.db")}`;
const DATABASE_URL = process.env.PLAYWRIGHT_DATABASE_URL ?? e2eDbUrl;
process.env.DATABASE_URL = DATABASE_URL;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `sh -c "${process.env.CI ? "rm -rf .next && " : ""}npx prisma db push --skip-generate && npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public 2>/dev/null; HOSTNAME=127.0.0.1 node .next/standalone/server.js"`,
        url: baseURL,
        /** Local runs often chain `playwright test <file>`; reuse avoids "port already used". */
        reuseExistingServer: true,
        timeout: 180_000,
        env: {
          PORT: String(port),
          DATABASE_URL,
          // Standalone server may not read .env; ensure TMDB health + discover tests see the key.
          ...(process.env.TMDB_API_KEY?.trim()
            ? { TMDB_API_KEY: process.env.TMDB_API_KEY }
            : {}),
          // Webhook e2e must use the same secret as tests (when set in .env.local).
          ...(process.env.PLEX_WEBHOOK_SECRET?.trim()
            ? { PLEX_WEBHOOK_SECRET: process.env.PLEX_WEBHOOK_SECRET }
            : {}),
        },
      },
});
