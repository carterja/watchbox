/**
 * API-level functional tests — no browser, uses Playwright's `request` fixture.
 * All tests clean up after themselves (afterEach / afterAll).
 *
 * Uses fake tmdbIds (9_000_001, 9_000_002) that don't exist in TMDB so the
 * enrichment step silently falls back to the provided payload — no TMDB key needed.
 *
 * Tests that genuinely require a TMDB key (search, sync, image lookup) are guarded
 * by a `tmdbAvailable` flag derived from GET /api/health.
 */
import { test, expect } from "@playwright/test";

/** Shared fake IDs + DB — run API tests in order to avoid cross-test collisions. */
test.describe.configure({ mode: "serial" });

// ─── test fixtures ────────────────────────────────────────────────────────────

const TEST_MOVIE = {
  tmdbId: 9_000_001,
  type: "movie" as const,
  title: "E2E Test Movie",
  overview: "Playwright end-to-end test fixture.",
  status: "yet_to_start" as const,
  streamingService: null,
  viewer: null,
};

const TEST_TV = {
  tmdbId: 9_000_002,
  type: "tv" as const,
  title: "E2E Test Show",
  overview: "Playwright end-to-end TV fixture.",
  status: "yet_to_start" as const,
  totalSeasons: 3,
  streamingService: null,
  viewer: null,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

type MediaItem = { id: string; tmdbId: number; type: string; title: string; status: string; streamingService: string | null; viewer: string | null; sortOrder: number; manualLastWatchedSeason: number | null; manualLastWatchedEpisode: number | null };

async function createOrFind(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  payload: typeof TEST_MOVIE | typeof TEST_TV
): Promise<MediaItem> {
  const res = await request.post("/api/media", { data: payload });
  if (res.status() === 201) return (await res.json()) as MediaItem;

  // 409 = already exists from a previous aborted run — find it
  if (res.status() === 409) {
    const list = await (await request.get("/api/media")).json() as MediaItem[];
    const found = list.find((m) => m.tmdbId === payload.tmdbId && m.type === payload.type);
    if (found) return found;
  }
  throw new Error(`Failed to create or find test media: HTTP ${res.status()}`);
}

async function cleanup(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  ...ids: (string | null | undefined)[]
) {
  await Promise.all(
    ids
      .filter((id): id is string => !!id)
      .map((id) => request.delete(`/api/media/${id}`))
  );
}

// ─── tests ────────────────────────────────────────────────────────────────────

test.describe("API: health", () => {
  test("GET /api/health → ok and db:true", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { ok: boolean; db: boolean };
    expect(body.ok).toBe(true);
    expect(body.db).toBe(true);
  });
});

test.describe("API: media CRUD", () => {
  let movieId: string;
  let tvId: string;

  test.afterAll(async ({ request }) => {
    await cleanup(request, movieId, tvId);
  });

  test("POST /api/media → creates a movie (201)", async ({ request }) => {
    const movie = await createOrFind(request, TEST_MOVIE);
    movieId = movie.id;
    expect(movie.id).toBeTruthy();
    expect(movie.title).toBe(TEST_MOVIE.title);
    expect(movie.type).toBe("movie");
    expect(movie.status).toBe("yet_to_start");
  });

  test("POST /api/media → creates a TV show (201)", async ({ request }) => {
    const tv = await createOrFind(request, TEST_TV);
    tvId = tv.id;
    expect(tv.id).toBeTruthy();
    expect(tv.title).toBe(TEST_TV.title);
    expect(tv.type).toBe("tv");
  });

  test("POST /api/media → duplicate returns 409", async ({ request }) => {
    const first = await createOrFind(request, TEST_MOVIE);
    movieId = first.id;

    const dup = await request.post("/api/media", { data: TEST_MOVIE });
    expect(dup.status()).toBe(409);
    const body = (await dup.json()) as { error: string };
    expect(body.error).toMatch(/already/i);
  });

  test("POST /api/media → missing title returns 400", async ({ request }) => {
    const res = await request.post("/api/media", {
      data: { tmdbId: 9_000_001, type: "movie", status: "yet_to_start" /* no title */ },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/media → invalid status returns 400", async ({ request }) => {
    const res = await request.post("/api/media", {
      data: { ...TEST_MOVIE, tmdbId: 9_000_099, status: "not_a_real_status" },
    });
    expect(res.status()).toBe(400);
  });

  test("GET /api/media → list includes created items", async ({ request }) => {
    const movie = await createOrFind(request, TEST_MOVIE);
    movieId = movie.id;
    const tv = await createOrFind(request, TEST_TV);
    tvId = tv.id;

    const res = await request.get("/api/media");
    expect(res.ok()).toBeTruthy();
    const list = (await res.json()) as MediaItem[];
    expect(Array.isArray(list)).toBe(true);
    expect(list.some((m) => m.id === movieId)).toBe(true);
    expect(list.some((m) => m.id === tvId)).toBe(true);
  });

  test("PATCH /api/media/:id → updates status", async ({ request }) => {
    const movie = await createOrFind(request, TEST_MOVIE);
    movieId = movie.id;

    const res = await request.patch(`/api/media/${movieId}`, {
      data: { status: "finished" },
    });
    expect(res.ok()).toBeTruthy();
    const updated = (await res.json()) as MediaItem;
    expect(updated.status).toBe("finished");
  });

  test("PATCH /api/media/:id → updates streamingService", async ({ request }) => {
    const movie = await createOrFind(request, TEST_MOVIE);
    movieId = movie.id;

    const res = await request.patch(`/api/media/${movieId}`, {
      data: { streamingService: "Netflix" },
    });
    expect(res.ok()).toBeTruthy();
    const updated = (await res.json()) as MediaItem;
    expect(updated.streamingService).toBe("Netflix");
  });

  test("PATCH /api/media/:id → updates viewer", async ({ request }) => {
    const movie = await createOrFind(request, TEST_MOVIE);
    movieId = movie.id;

    const res = await request.patch(`/api/media/${movieId}`, {
      data: { viewer: "both" },
    });
    expect(res.ok()).toBeTruthy();
    const updated = (await res.json()) as MediaItem;
    expect(updated.viewer).toBe("both");
  });

  test("PATCH /api/media/:id → non-existent ID returns 404", async ({ request }) => {
    const res = await request.patch("/api/media/nonexistent-id-xyz", {
      data: { status: "finished" },
    });
    expect(res.status()).toBe(404);
  });

  test("DELETE /api/media/:id → removes item then 404", async ({ request }) => {
    const movie = await createOrFind(request, TEST_MOVIE);
    movieId = movie.id;

    const del = await request.delete(`/api/media/${movieId}`);
    expect(del.ok()).toBeTruthy();

    const list = (await (await request.get("/api/media")).json()) as MediaItem[];
    const found = list.find((m) => m.id === movieId);
    expect(found).toBeUndefined();
    movieId = ""; // already deleted, skip afterAll cleanup
  });
});

test.describe("API: media reorder", () => {
  let idA: string;
  let idB: string;

  test.afterAll(async ({ request }) => {
    await cleanup(request, idA, idB);
  });

  test("POST /api/media/reorder → changes sort order", async ({ request }) => {
    // Create two items
    idA = (await createOrFind(request, TEST_MOVIE)).id;
    idB = (await createOrFind(request, TEST_TV)).id;

    // Put B before A
    const reorder = await request.post("/api/media/reorder", {
      data: { orderedIds: [idB, idA] },
    });
    expect(reorder.ok()).toBeTruthy();
    const body = (await reorder.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    // Verify order via GET (sorted by sortOrder asc)
    const list = (await (await request.get("/api/media")).json()) as MediaItem[];
    const posA = list.findIndex((m) => m.id === idA);
    const posB = list.findIndex((m) => m.id === idB);
    expect(posB).toBeLessThan(posA);
  });

  test("POST /api/media/reorder → empty orderedIds is a no-op", async ({ request }) => {
    const res = await request.post("/api/media/reorder", { data: { orderedIds: [] } });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe("API: TV episode tracking", () => {
  let tvId: string;

  test.afterAll(async ({ request }) => {
    await cleanup(request, tvId);
  });

  test("mark-episode-watched → explicit season/episode stored", async ({ request }) => {
    const tv = await createOrFind(request, { ...TEST_TV, status: "in_progress" });
    tvId = tv.id;

    const res = await request.post(`/api/media/${tvId}/mark-episode-watched`, {
      data: { season: 2, episode: 5 },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as MediaItem;
    expect(body.manualLastWatchedSeason).toBe(2);
    expect(body.manualLastWatchedEpisode).toBe(5);
  });

  test("mark-episode-watched → movie returns 400", async ({ request }) => {
    const movie = await createOrFind(request, TEST_MOVIE);
    const movieId = movie.id;
    try {
      const res = await request.post(`/api/media/${movieId}/mark-episode-watched`, {
        data: { season: 1, episode: 1 },
      });
      expect(res.status()).toBe(400);
    } finally {
      await cleanup(request, movieId);
    }
  });

  test("mark-episode-watched → season without episode returns 400", async ({ request }) => {
    const tv = await createOrFind(request, TEST_TV);
    tvId = tv.id;

    const res = await request.post(`/api/media/${tvId}/mark-episode-watched`, {
      data: { season: 1 }, // missing episode
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("API: playback history", () => {
  let movieId: string;

  test.afterAll(async ({ request }) => {
    await cleanup(request, movieId);
  });

  test("GET /api/media/:id/playback → returns array (empty for new item)", async ({ request }) => {
    const movie = await createOrFind(request, TEST_MOVIE);
    movieId = movie.id;

    const res = await request.get(`/api/media/${movieId}/playback`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/media/:id/playback → non-existent ID returns 404", async ({ request }) => {
    const res = await request.get("/api/media/nonexistent-xyz/playback");
    expect(res.status()).toBe(404);
  });
});

test.describe("API: what-next", () => {
  test("GET /api/what-next → 200 and array", async ({ request }) => {
    const res = await request.get("/api/what-next");
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("GET /api/what-next → includes in_progress TV item", async ({ request }) => {
    const tv = await createOrFind(request, { ...TEST_TV, status: "in_progress" });
    try {
      const res = await request.get("/api/what-next");
      expect(res.ok()).toBeTruthy();
      const items = (await res.json()) as { mediaId: string }[];
      expect(items.some((r) => r.mediaId === tv.id)).toBe(true);
    } finally {
      await cleanup(request, tv.id);
    }
  });

  test("GET /api/what-next → does NOT include yet_to_start TV", async ({ request }) => {
    // Use a different fake ID so it can never be confused with the in_progress TV
    const yetToStartTv = await createOrFind(request, { ...TEST_TV, tmdbId: 9_000_003, status: "yet_to_start" });
    try {
      const res = await request.get("/api/what-next");
      expect(res.ok()).toBeTruthy();
      const items = (await res.json()) as { mediaId: string }[];
      expect(items.some((r) => r.mediaId === yetToStartTv.id)).toBe(false);
    } finally {
      await cleanup(request, yetToStartTv.id);
    }
  });
});

test.describe("API: TMDB (requires TMDB key)", () => {
  let tmdbAvailable = false;

  test.beforeAll(async ({ request }) => {
    const health = await (await request.get("/api/health")).json() as { tmdb?: boolean };
    tmdbAvailable = health.tmdb === true;
  });

  test("GET /api/tmdb/search → returns results for 'Inception'", async ({ request }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");
    const res = await request.get("/api/tmdb/search?q=Inception");
    expect(res.ok()).toBeTruthy();
    const results = await res.json() as
      | { type: "movie"; data: { title: string } }[]
      | { type: "tv"; data: { name: string } }[];
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    const first = results[0] as { type: string; data: { title?: string; name?: string } };
    const label = first.type === "movie" ? first.data.title : first.data.name;
    expect(label).toBeTruthy();
  });

  test("GET /api/tmdb/search → empty q returns empty array", async ({ request }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");
    const res = await request.get("/api/tmdb/search?q=");
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toEqual([]);
  });

  test("GET /api/tmdb/posters/:id → returns posters array", async ({ request }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");
    // tmdbId 27205 = Inception
    const res = await request.get("/api/tmdb/posters/27205?type=movie");
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { posters: unknown[] };
    expect(Array.isArray(body.posters)).toBe(true);
    expect(body.posters.length).toBeGreaterThan(0);
  });

  test("GET /api/tmdb/external-ids → returns imdbId for Inception", async ({ request }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");
    const res = await request.get("/api/tmdb/external-ids?id=27205&type=movie");
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { imdbId: string | null };
    expect(body.imdbId).toBeTruthy();
    expect(body.imdbId).toMatch(/^tt\d+$/);
  });

  test("POST /api/sync-seasons → responds 200 with summary", async ({ request }) => {
    test.skip(!tmdbAvailable, "TMDB not configured");
    const res = await request.post("/api/sync-seasons");
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { updated: number; failed: number; total: number };
    expect(typeof body.updated).toBe("number");
    expect(typeof body.failed).toBe("number");
    expect(typeof body.total).toBe("number");
  });
});
