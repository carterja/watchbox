import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.cwd(), ".pw-browsers");

const port = Number(process.env.PLAYWRIGHT_PORT ?? process.env.PORT) || 3333;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

const DATABASE_URL =
  process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "prisma", "e2e.db")}`;

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
        },
      },
});
