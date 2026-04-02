import { describe, it, expect, vi, beforeEach } from "vitest";
import { previousEpisodeBeforeCurrent } from "@/lib/plexEpisodeNav";
import * as tmdb from "@/lib/tmdb";

vi.mock("@/lib/tmdb", () => ({
  getTmdbTvSeason: vi.fn(),
}));

describe("previousEpisodeBeforeCurrent", () => {
  beforeEach(() => {
    vi.mocked(tmdb.getTmdbTvSeason).mockReset();
  });

  it("returns previous episode in same season", async () => {
    const r = await previousEpisodeBeforeCurrent(1, 2, 5);
    expect(r).toEqual({ season: 2, episode: 4 });
    expect(tmdb.getTmdbTvSeason).not.toHaveBeenCalled();
  });

  it("returns last episode of prior season for S2E1", async () => {
    vi.mocked(tmdb.getTmdbTvSeason).mockResolvedValue({
      episode_count: 10,
      episodes: [],
    });
    const r = await previousEpisodeBeforeCurrent(99, 2, 1);
    expect(r).toEqual({ season: 1, episode: 10 });
    expect(tmdb.getTmdbTvSeason).toHaveBeenCalledWith(99, 1);
  });

  it("returns null for S1E1", async () => {
    const r = await previousEpisodeBeforeCurrent(1, 1, 1);
    expect(r).toBeNull();
  });
});
