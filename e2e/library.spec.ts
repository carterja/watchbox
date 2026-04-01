/**
 * Browser-driven library management tests.
 * Each suite uses unique TMDB ids + titles so parallel runs and leftover DB rows
 * cannot hide cards or break assertions.
 */
import { randomInt } from "node:crypto";
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

type MediaItem = {
  id: string;
  tmdbId: number;
  type: string;
  title: string;
  status: string;
  streamingService?: string | null;
  viewer?: string | null;
};

function uniqueTmdbId(): number {
  return 9_100_000 + randomInt(0, 9_999);
}

function moviePayload(overrides: Partial<Record<string, unknown>> = {}) {
  const tmdbId = uniqueTmdbId();
  return {
    tmdbId,
    type: "movie" as const,
    title: `E2E Movie ${tmdbId}`,
    overview: "Playwright browser fixture.",
    status: "yet_to_start" as const,
    ...overrides,
  };
}

function tvPayload(overrides: Partial<Record<string, unknown>> = {}) {
  const tmdbId = uniqueTmdbId();
  return {
    tmdbId,
    type: "tv" as const,
    title: `E2E Show ${tmdbId}`,
    overview: "Playwright browser TV fixture.",
    status: "in_progress" as const,
    totalSeasons: 2,
    ...overrides,
  };
}

async function createOrFind(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  payload: Record<string, unknown>
): Promise<MediaItem> {
  const res = await request.post("/api/media", { data: payload });
  if (res.status() === 201) return (await res.json()) as MediaItem;
  if (res.status() === 409) {
    const list = (await (await request.get("/api/media")).json()) as MediaItem[];
    const found = list.find((m) => m.tmdbId === payload.tmdbId && m.type === payload.type);
    if (found) return found;
  }
  throw new Error(`createOrFind failed: HTTP ${res.status()}`);
}

async function deleteItem(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  id: string
) {
  await request.delete(`/api/media/${id}`);
}

async function switchToCompactMode(page: Page) {
  const compact = page.getByRole("button", { name: /Compact/i }).first();
  try {
    await expect(compact).toBeVisible({ timeout: 8_000 });
    await compact.click();
  } catch {
    // Compact button not found or already in compact mode
  }
}

// ─── library page visibility tests ────────────────────────────────────────────

test.describe("Library: page routing", () => {
  let movieTitle: string;
  let tvTitle: string;
  let movieId: string;
  let tvId: string;

  test.beforeAll(async ({ request }) => {
    const movie = await createOrFind(request, moviePayload());
    movieId = movie.id;
    movieTitle = movie.title;
    const tv = await createOrFind(request, tvPayload());
    tvId = tv.id;
    tvTitle = tv.title;
  });

  test.afterAll(async ({ request }) => {
    await deleteItem(request, movieId);
    await deleteItem(request, tvId);
  });

  test("/all shows both movie and TV", async ({ page }) => {
    await page.goto("/all", { waitUntil: "networkidle" });
    await switchToCompactMode(page);
    // Wait for WatchBox header to appear first to ensure page has loaded
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(movieTitle).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(tvTitle).first()).toBeVisible({ timeout: 10_000 });
  });

  test("/movies shows movie but not TV", async ({ page }) => {
    await page.goto("/movies", { waitUntil: "networkidle" });
    await switchToCompactMode(page);
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(movieTitle).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(tvTitle)).toHaveCount(0, { timeout: 5_000 });
  });

  test("/series shows TV but not movie", async ({ page }) => {
    await page.goto("/series", { waitUntil: "networkidle" });
    await switchToCompactMode(page);
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(tvTitle).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(movieTitle)).toHaveCount(0, { timeout: 5_000 });
  });
});

// ─── status filter bar ────────────────────────────────────────────────────────

test.describe("Library: status filters", () => {
  let movieTitle: string;
  let tvTitle: string;
  let movieId: string;
  let tvId: string;

  test.beforeAll(async ({ request }) => {
    const movie = await createOrFind(request, moviePayload({ status: "yet_to_start" }));
    movieId = movie.id;
    movieTitle = movie.title;
    const tv = await createOrFind(request, tvPayload({ status: "in_progress" }));
    tvId = tv.id;
    tvTitle = tv.title;
  });

  test.afterAll(async ({ request }) => {
    await deleteItem(request, movieId);
    await deleteItem(request, tvId);
  });

  test("'All' filter shows both items", async ({ page }) => {
    await page.goto("/all", { waitUntil: "networkidle" });
    await switchToCompactMode(page);
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(movieTitle).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(tvTitle).first()).toBeVisible();
  });

  test("'Unwatched' filter shows only yet_to_start movie", async ({ page }) => {
    await page.goto("/all", { waitUntil: "networkidle" });
    await switchToCompactMode(page);
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(movieTitle).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Unwatched" }).first().click();

    await expect(page.getByText(movieTitle).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(tvTitle)).toHaveCount(0, { timeout: 5_000 });
  });

  test("'In progress' filter shows only in_progress TV", async ({ page }) => {
    await page.goto("/all", { waitUntil: "networkidle" });
    await switchToCompactMode(page);
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(tvTitle).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "In progress" }).first().click();

    await expect(page.getByText(tvTitle).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(movieTitle)).toHaveCount(0, { timeout: 5_000 });
  });
});

// ─── detail modal: edit status ────────────────────────────────────────────────

test.describe("Library: edit item via detail modal", () => {
  let movieId: string;
  let movieTitle: string;

  test.beforeEach(async ({ request }) => {
    const movie = await createOrFind(request, moviePayload({ status: "yet_to_start" }));
    movieId = movie.id;
    movieTitle = movie.title;
    await request.patch(`/api/media/${movieId}`, { data: { status: "yet_to_start" } });
  });

  test.afterEach(async ({ request }) => {
    await deleteItem(request, movieId);
  });

  test("changing status to 'Finished' persists after save", async ({ page, request }) => {
    await page.goto("/all", { waitUntil: "networkidle" });
    await switchToCompactMode(page);
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });

    const title = page.getByText(movieTitle).first();
    await expect(title).toBeVisible({ timeout: 15_000 });
    await title.click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 8_000 });

    await modal.getByRole("button", { name: "Finished" }).click();

    await modal.getByRole("button", { name: /Save Changes/i }).click();

    await expect(modal).not.toBeVisible({ timeout: 8_000 });

    const list = (await (await request.get("/api/media")).json()) as MediaItem[];
    const updated = list.find((m) => m.id === movieId);
    expect(updated?.status).toBe("finished");
  });

  test("updating streaming service persists after save", async ({ page, request }) => {
    await page.goto("/all", { waitUntil: "networkidle" });
    await switchToCompactMode(page);
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });

    const title = page.getByText(movieTitle).first();
    await expect(title).toBeVisible({ timeout: 15_000 });
    await title.click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 8_000 });

    await modal.getByRole("button", { name: "Netflix" }).click();

    await modal.getByRole("button", { name: /Save Changes/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 8_000 });

    const list = (await (await request.get("/api/media")).json()) as MediaItem[];
    const updated = list.find((m) => m.id === movieId) as MediaItem | undefined;
    expect(updated?.streamingService).toBe("Netflix");
  });

  test("changing viewer to 'Me' persists after save", async ({ page, request }) => {
    await page.goto("/all", { waitUntil: "networkidle" });
    await switchToCompactMode(page);
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });

    const title = page.getByText(movieTitle).first();
    await expect(title).toBeVisible({ timeout: 15_000 });
    await title.click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 8_000 });

    await modal.getByRole("button", { name: /^Me$/i }).click();

    await modal.getByRole("button", { name: /Save Changes/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 8_000 });

    const list = (await (await request.get("/api/media")).json()) as MediaItem[];
    const updated = list.find((m) => m.id === movieId) as MediaItem | undefined;
    expect(updated?.viewer).toBe("me");
  });

  test("Cancel button closes modal without saving", async ({ page, request }) => {
    await page.goto("/all", { waitUntil: "networkidle" });
    await switchToCompactMode(page);
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });

    const title = page.getByText(movieTitle).first();
    await expect(title).toBeVisible({ timeout: 15_000 });
    await title.click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 8_000 });

    await modal.getByRole("button", { name: "Finished" }).click();
    await modal.getByRole("button", { name: "Cancel" }).click();

    await expect(modal).not.toBeVisible({ timeout: 8_000 });

    const list = (await (await request.get("/api/media")).json()) as MediaItem[];
    const item = list.find((m) => m.id === movieId);
    expect(item?.status).toBe("yet_to_start");
  });
});

// ─── detail modal: delete item ────────────────────────────────────────────────

test.describe("Library: delete item from modal", () => {
  let movieId: string;
  let movieTitle: string;

  test.beforeEach(async ({ request }) => {
    const movie = await createOrFind(request, moviePayload());
    movieId = movie.id;
    movieTitle = movie.title;
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`/api/media/${movieId}`).catch(() => undefined);
  });

  test("Remove button deletes item from library", async ({ page, request }) => {
    await page.goto("/all", { waitUntil: "networkidle" });
    await switchToCompactMode(page);
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });

    const title = page.getByText(movieTitle).first();
    await expect(title).toBeVisible({ timeout: 15_000 });
    await title.click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 8_000 });

    page.once("dialog", (dialog) => dialog.accept());
    await modal.getByRole("button", { name: /Remove/i }).click();

    await expect(modal).not.toBeVisible({ timeout: 8_000 });

    await expect(page.getByText(movieTitle)).toHaveCount(0, { timeout: 8_000 });

    const list = (await (await request.get("/api/media")).json()) as MediaItem[];
    expect(list.some((m) => m.id === movieId)).toBe(false);
    movieId = "";
  });
});

// ─── Settings page ────────────────────────────────────────────────────────────

test.describe("Settings page", () => {
  test("Settings page renders section headings and Plex link", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Integrations/i).first()).toBeVisible();
    await expect(page.getByText(/Plex/i).first()).toBeVisible();
    await expect(page.getByText(/Theme/i).first()).toBeVisible();
  });

  test("Settings links to /plex", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: /Plex/i }).first().click();
    await expect(page).toHaveURL(/\/plex/, { timeout: 10_000 });
  });

  test("Theme swatches are clickable", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "networkidle" });
    const themeButtons = page.locator("button").filter({ hasText: /Default|Neon|Sakura|Ocean/i });
    await expect(themeButtons.first()).toBeVisible({ timeout: 15_000 });
    await themeButtons.first().click();
  });

  test("Sync seasons button is present and clickable", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "networkidle" });
    const syncBtn = page.getByRole("button", { name: /Sync seasons/i });
    await expect(syncBtn).toBeVisible({ timeout: 15_000 });
    await syncBtn.click();
    await expect(syncBtn).toBeDisabled({ timeout: 5_000 });
    await expect(syncBtn).toBeEnabled({ timeout: 30_000 });
  });
});

// ─── Watching page ────────────────────────────────────────────────────────────

test.describe("Watching page", () => {
  let tvId: string;
  let tvTitle: string;

  test.beforeAll(async ({ request }) => {
    const tv = await createOrFind(request, tvPayload({ status: "in_progress" }));
    tvId = tv.id;
    tvTitle = tv.title;
  });

  test.afterAll(async ({ request }) => {
    await deleteItem(request, tvId);
  });

  test("/watching shows in_progress TV show", async ({ page }) => {
    await page.goto("/watching", { waitUntil: "networkidle" });
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(tvTitle).first()).toBeVisible({ timeout: 20_000 });
  });

  test("/watching carousel renders for in_progress TV", async ({ page }) => {
    await page.goto("/watching", { waitUntil: "networkidle" });
    await expect(page.getByText("WatchBox").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/what.?s next/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
