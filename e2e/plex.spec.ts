/**
 * Plex hub UI — “Not in WatchBox” and manual link modal.
 * Seeds an unmatched playback row via the same webhook helper as api.spec.ts.
 */
import { randomInt } from "node:crypto";
import { test, expect } from "@playwright/test";
import { postPlexWebhook, plexAccountTitleForE2E } from "./helpers/plexE2e";

test.describe("Plex hub", () => {
  const runId = `ui_${Date.now()}_${randomInt(0, 99_999)}`;
  let tvId: string;
  let tvTitle: string;
  let grandparentLabel: string;

  test.beforeAll(async ({ request }) => {
    const tmdbId = 9_200_000 + randomInt(0, 50_000);
    tvTitle = `E2E Plex UI ${runId}`;
    grandparentLabel = `Unmatched UI ${runId}`;

    const res = await request.post("/api/media", {
      data: {
        tmdbId,
        type: "tv",
        title: tvTitle,
        overview: "Playwright Plex hub UI fixture.",
        status: "in_progress",
        totalSeasons: 2,
      },
    });
    expect(res.status()).toBe(201);
    const m = (await res.json()) as { id: string };
    tvId = m.id;

    const wh = await postPlexWebhook(request, {
      event: "media.stop",
      Metadata: {
        type: "episode",
        title: "S1E1",
        grandparentTitle: grandparentLabel,
        parentIndex: 1,
        index: 1,
        ratingKey: `rk_${runId}`,
        grandparentRatingKey: `gp_ui_${runId}`,
      },
    });
    expect(wh.ok()).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    await request.delete(`/api/media/${tvId}`);
  });

  test("Not in WatchBox: shows Plex account, Link to library opens modal and clears row", async ({ page }) => {
    await page.goto("/plex?tab=unmatched");
    await expect(page.getByRole("heading", { name: /Plex hub/i })).toBeVisible({ timeout: 20_000 });

    const row = page.locator("li").filter({ hasText: grandparentLabel });
    await expect(row.getByRole("button", { name: "Link to library" })).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText("Plex:");
    await expect(row).toContainText(plexAccountTitleForE2E());

    await row.getByRole("button", { name: "Link to library" }).click();

    await expect(page.getByRole("dialog", { name: /link to library/i })).toBeVisible();
    await page.getByPlaceholder(/filter your library/i).fill(tvTitle.slice(0, 16));
    await page.getByRole("button", { name: tvTitle }).click();
    await expect(page.getByRole("dialog", { name: /link to library/i })).toBeHidden({ timeout: 15_000 });

    await expect(row).toHaveCount(0);

    // Tabs stay mounted (no remount on switch) — Sync panel should still be one click away.
    await page.getByRole("tab", { name: "Sync" }).click();
    await expect(page.getByRole("heading", { name: /Plex & library sync/i })).toBeVisible({ timeout: 15_000 });
  });
});
