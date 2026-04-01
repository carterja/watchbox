import { describe, expect, it } from "vitest";
import {
  backfillSeasonProgressAfterEpisodeWatched,
  mergeManualLastWatchedWithPlex,
} from "@/lib/seasonProgress";

describe("backfillSeasonProgressAfterEpisodeWatched", () => {
  it("marks seasons before current as completed and current as in_progress", () => {
    const r = backfillSeasonProgressAfterEpisodeWatched(null, 12, 9, 3);
    expect(r).not.toBeNull();
    expect(r!.totalSeasons).toBe(12);
    expect(r!.seasonProgress.find((x) => x.season === 1)?.status).toBe("completed");
    expect(r!.seasonProgress.find((x) => x.season === 8)?.status).toBe("completed");
    expect(r!.seasonProgress.find((x) => x.season === 9)?.status).toBe("in_progress");
    expect(r!.seasonProgress.find((x) => x.season === 10)?.status).toBe("not_started");
  });

  it("expands totalSeasons when watching a later season than totalSeasons", () => {
    const r = backfillSeasonProgressAfterEpisodeWatched([{ season: 1, status: "completed" }], 3, 5, 1);
    expect(r!.totalSeasons).toBe(5);
    expect(r!.seasonProgress.find((x) => x.season === 4)?.status).toBe("completed");
    expect(r!.seasonProgress.find((x) => x.season === 5)?.status).toBe("in_progress");
  });

  it("does not downgrade a season already marked completed", () => {
    const r = backfillSeasonProgressAfterEpisodeWatched(
      [
        { season: 1, status: "completed" },
        { season: 9, status: "completed" },
      ],
      10,
      9,
      2
    );
    expect(r!.seasonProgress.find((x) => x.season === 9)?.status).toBe("completed");
  });

  it("returns null for invalid season/episode", () => {
    expect(backfillSeasonProgressAfterEpisodeWatched(null, 10, 0, 1)).toBeNull();
    expect(backfillSeasonProgressAfterEpisodeWatched(null, 10, 1, 0)).toBeNull();
  });
});

describe("mergeManualLastWatchedWithPlex", () => {
  it("uses Plex when manual is null", () => {
    expect(mergeManualLastWatchedWithPlex(null, null, 2, 5)).toEqual({ season: 2, episode: 5 });
  });

  it("keeps the lexicographically later episode", () => {
    expect(mergeManualLastWatchedWithPlex(3, 10, 2, 1)).toEqual({ season: 3, episode: 10 });
    expect(mergeManualLastWatchedWithPlex(2, 1, 3, 1)).toEqual({ season: 3, episode: 1 });
  });

  it("returns manual when Plex season is invalid for merge", () => {
    expect(mergeManualLastWatchedWithPlex(1, 1, 0, 5)).toEqual({ season: 1, episode: 1 });
  });
});
