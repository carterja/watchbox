import { test, expect } from "@playwright/test";

const dashboardRoutes = [
  "/discover",
  "/all",
  "/movies",
  "/series",
  "/watching",
  "/plex",
  "/settings",
] as const;

const listLibraryPaths = new Set(["/all", "/movies", "/series"]);

test.describe("Smoke", { tag: "@smoke" }, () => {
  test("root redirects to discover", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/discover/);
  });

  for (const path of dashboardRoutes) {
    test(`dashboard page ${path} loads`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "load" });
      expect(res?.ok(), `${path} HTTP status`).toBeTruthy();
      await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 20_000 });
      if (listLibraryPaths.has(path)) {
        await expect(page.getByRole("button", { name: "Poster display" }).first()).toBeVisible({
          timeout: 20_000,
        });
      }
    });
  }

  test("GET /api/health returns ok with database", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { ok: boolean; db: boolean; version: string };
    expect(body.ok).toBe(true);
    expect(body.db).toBe(true);
    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
  });
});
