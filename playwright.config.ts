import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/** Project-local browsers (always; some tools pre-set a broken PLAYWRIGHT_BROWSERS_PATH). */
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.cwd(), ".pw-browsers");

/** Dedicated port so `npm run test:e2e` does not collide with `next dev` on 3000. */
const port = Number(process.env.PLAYWRIGHT_PORT ?? process.env.PORT) || 3333;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

/**
 * Use an absolute DATABASE_URL so the standalone server (which chdir's into
 * .next/standalone/) resolves the SQLite path correctly.  A dedicated e2e.db
 * keeps the test database separate from dev.db.
 */
const DATABASE_URL =
  process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "prisma", "e2e.db")}`;

export default defineConfig({
  testDir: "e2e",
  /** One worker avoids shared SQLite + API races between parallel tests. */
  fullyParallel: true,
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
        command: `sh -c "${process.env.CI ? "rm -rf .next && " : ""}npx prisma db push --skip-generate && npm run build && HOSTNAME=127.0.0.1 node .next/standalone/server.js"`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
        env: {
          PORT: String(port),
          DATABASE_URL,
        },
      },
});
