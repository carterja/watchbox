/**
 * Discover page browser tests.
 * TMDB-dependent tests are skipped automatically when TMDB is not configured.
 *
 * Uses stable `data-testid` hooks from the Discover UI so we never confuse the
 * main "Search" tab with the title-mode "Search" submit button (same visible label).
 */
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// ─── helpers ──────────────────────────────────────────────────────────────────

async function isTmdbAvailable(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"]
): Promise<boolean> {
  try {
    const health = (await (await request.get("/api/health")).json()) as { tmdb?: boolean };
    return health.tmdb === true;
  } catch {
    return false;
  }
}

async function deleteByTmdbId(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  tmdbId: number,
  type: "movie" | "tv"
) {
  try {
    const list = (await (await request.get("/api/media")).json()) as {
      id: string;
      tmdbId: number;
      type: string;
    }[];
    const found = list.find((m) => m.tmdbId === tmdbId && m.type === type);
    if (found) await request.delete(`/api/media/${found.id}`);
  } catch {
    // best-effort
  }
}

async function openDiscoverSearchTab(page: Page) {
  await page.goto("/discover", { waitUntil: "networkidle" });
  await page.getByTestId("discover-tab-search").click();
}

// ─── browse tab ───────────────────────────────────────────────────────────────

test.describe("Discover: browse tab", () => {
  let tmdbAvailable = false;

  test.beforeAll(async ({ request }) => {
    tmdbAvailable = await isTmdbAvailable(request);
  });

  test("Browse tab is active on load and shows category buttons", async ({ page }) => {
    await page.goto("/discover", { waitUntil: "networkidle" });
    await expect(page.getByTestId("discover-tab-browse")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("discover-tab-search")).toBeVisible();
  });

  test("Popular category loads movie/TV cards (TMDB required)", async ({ page }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");

    await page.goto("/discover", { waitUntil: "networkidle" });
    await expect(page.getByTestId("discover-browse-card").first()).toBeVisible({ timeout: 30_000 });
  });

  test("Switching to Trending category loads content (TMDB required)", async ({ page }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");

    await page.goto("/discover", { waitUntil: "networkidle" });
    await expect(page.getByTestId("discover-browse-card").first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Trending" }).first().click();
    await expect(page.getByTestId("discover-browse-card").first()).toBeVisible({ timeout: 15_000 });
  });

  test("Switching to Top Rated category loads content (TMDB required)", async ({ page }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");

    await page.goto("/discover", { waitUntil: "networkidle" });
    await expect(page.getByTestId("discover-browse-card").first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /Top/i }).first().click();
    await expect(page.getByTestId("discover-browse-card").first()).toBeVisible({ timeout: 15_000 });
  });
});

// ─── search tab ───────────────────────────────────────────────────────────────

test.describe("Discover: search tab", () => {
  let tmdbAvailable = false;

  test.beforeAll(async ({ request }) => {
    tmdbAvailable = await isTmdbAvailable(request);
  });

  test("Clicking Search tab shows the search input", async ({ page }) => {
    await openDiscoverSearchTab(page);
    await expect(page.getByPlaceholder(/Search movies/i)).toBeVisible({ timeout: 10_000 });
  });

  test("Search mode tabs: Movies & TV | Actor | IMDb are visible", async ({ page }) => {
    await openDiscoverSearchTab(page);
    await expect(page.getByTestId("discover-search-mode-title")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("discover-search-mode-actor")).toBeVisible();
    await expect(page.getByTestId("discover-search-mode-imdb")).toBeVisible();
  });

  test("Title search returns results for 'Inception' (TMDB required)", async ({ page }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");

    await openDiscoverSearchTab(page);
    await page.getByPlaceholder(/Search movies/i).fill("Inception");
    await page.getByTestId("discover-query-submit").click();

    await expect(page.getByText("Inception").first()).toBeVisible({ timeout: 15_000 });
  });

  test("No-results state shown for obscure query (TMDB required)", async ({ page }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");

    await openDiscoverSearchTab(page);
    await page.getByPlaceholder(/Search movies/i).fill("zzz_no_results_xyzxyzxyz");
    await page.getByTestId("discover-query-submit").click();

    await expect(page.getByText(/No results for/i)).toBeVisible({ timeout: 15_000 });
  });

  test("Actor search: typing shows an actor select (TMDB required)", async ({ page }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");

    await openDiscoverSearchTab(page);
    await page.getByTestId("discover-search-mode-actor").click();
    await page.getByPlaceholder(/actor name/i).fill("Tom Hanks");

    await expect(page.getByLabel(/Select actor/i)).toBeVisible({ timeout: 15_000 });
  });
});

// ─── add to library from search ───────────────────────────────────────────────

test.describe("Discover: add from search results (TMDB required)", () => {
  const INCEPTION_TMDB_ID = 27205;
  let tmdbAvailable = false;

  test.beforeAll(async ({ request }) => {
    tmdbAvailable = await isTmdbAvailable(request);
    if (tmdbAvailable) await deleteByTmdbId(request, INCEPTION_TMDB_ID, "movie");
  });

  test.afterAll(async ({ request }) => {
    await deleteByTmdbId(request, INCEPTION_TMDB_ID, "movie");
  });

  test("Search → Add to list → QuickSetup → Save & Continue → item in library", async ({ page, request }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");

    await openDiscoverSearchTab(page);
    await page.getByPlaceholder(/Search movies/i).fill("Inception");
    await page.getByTestId("discover-query-submit").click();

    await expect(page.getByText("Inception").first()).toBeVisible({ timeout: 20_000 });

    const addBtn = page.getByRole("button", { name: "Add to list" }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 8_000 });
    await expect(modal.getByText(/Quick Setup/i)).toBeVisible();

    await modal.getByRole("button", { name: "Netflix" }).click();
    await modal.getByRole("button", { name: "Both" }).click();
    await modal.getByRole("button", { name: "Finished" }).click();

    await modal.getByRole("button", { name: /Save & Continue/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 8_000 });

    await page.goto("/movies", { waitUntil: "networkidle" });
    await expect(page.getByText("Inception").first()).toBeVisible({ timeout: 15_000 });

    const list = (await (await request.get("/api/media")).json()) as {
      tmdbId: number;
      type: string;
      streamingService: string | null;
      status: string;
    }[];
    const inception = list.find((m) => m.tmdbId === INCEPTION_TMDB_ID && m.type === "movie");
    expect(inception).toBeTruthy();
    expect(inception?.streamingService).toBe("Netflix");
    expect(inception?.status).toBe("finished");
  });

  test("Added item shows 'In collection' badge on second visit", async ({ page, request }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");

    const list = (await (await request.get("/api/media")).json()) as { tmdbId: number; type: string }[];
    const alreadyIn = list.some((m) => m.tmdbId === INCEPTION_TMDB_ID && m.type === "movie");
    if (!alreadyIn) {
      await request.post("/api/media", {
        data: { tmdbId: INCEPTION_TMDB_ID, type: "movie", title: "Inception", status: "finished" },
      });
    }

    await openDiscoverSearchTab(page);
    await page.getByPlaceholder(/Search movies/i).fill("Inception");
    await page.getByTestId("discover-query-submit").click();

    await expect(page.getByText("Inception").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/In collection/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ─── add from browse grid ─────────────────────────────────────────────────────

test.describe("Discover: add from browse grid (TMDB required)", () => {
  let tmdbAvailable = false;
  let addedTmdbId: number | null = null;
  let addedType: "movie" | "tv" | null = null;

  test.beforeAll(async ({ request }) => {
    tmdbAvailable = await isTmdbAvailable(request);
  });

  test.afterAll(async ({ request }) => {
    if (addedTmdbId && addedType) {
      await deleteByTmdbId(request, addedTmdbId, addedType);
    }
  });

  test("Click a card in browse grid → QuickSetup → item saved (TMDB required)", async ({ page, request }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");

    await page.goto("/discover", { waitUntil: "networkidle" });

    const firstCard = page.getByTestId("discover-browse-card").first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });

    const cards = page.getByTestId("discover-browse-card");
    let clickedTitle: string | null = null;

    for (let i = 0; i < await cards.count(); i++) {
      const card = cards.nth(i);
      const disabled = await card.getAttribute("disabled");
      if (disabled !== null) continue;
      const img = card.locator("img").first();
      clickedTitle = await img.getAttribute("alt");
      await card.click();
      break;
    }

    if (!clickedTitle) {
      test.skip(true, "All browse cards already in collection");
      return;
    }

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 8_000 });

    await modal.getByRole("button", { name: /Skip for now/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 8_000 });

    const list = (await (await request.get("/api/media")).json()) as {
      id: string;
      title: string;
      tmdbId: number;
      type: string;
    }[];
    const added = list.find((m) => m.title === clickedTitle);
    if (added) {
      addedTmdbId = added.tmdbId;
      addedType = added.type as "movie" | "tv";
      expect(added.id).toBeTruthy();
    }
    expect(list.length).toBeGreaterThan(0);
  });
});

// ─── IMDb lookup ──────────────────────────────────────────────────────────────

test.describe("Discover: IMDb lookup (TMDB required)", () => {
  let tmdbAvailable = false;

  test.beforeAll(async ({ request }) => {
    tmdbAvailable = await isTmdbAvailable(request);
    await deleteByTmdbId(request, 27205, "movie");
  });

  test.afterAll(async ({ request }) => {
    await deleteByTmdbId(request, 27205, "movie");
  });

  test("IMDb ID lookup opens QuickSetup modal", async ({ page }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");

    await openDiscoverSearchTab(page);
    await page.getByTestId("discover-search-mode-imdb").click();

    await page.getByPlaceholder(/IMDb link/i).fill("tt1375666");
    await page.getByTestId("discover-query-submit").click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal.getByText(/Inception/i).first()).toBeVisible();

    await modal.getByRole("button", { name: /Skip for now/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 8_000 });
  });
});
