import { describe, expect, it } from "vitest";
import { compareEpisode, maxEpisodeRef } from "@/lib/whatNext";

describe("whatNext episode refs", () => {
  it("compareEpisode orders by season then episode", () => {
    expect(compareEpisode({ season: 1, episode: 10 }, { season: 2, episode: 1 })).toBeLessThan(0);
    expect(compareEpisode({ season: 2, episode: 1 }, { season: 2, episode: 1 })).toBe(0);
    expect(compareEpisode({ season: 2, episode: 2 }, { season: 2, episode: 1 })).toBeGreaterThan(0);
  });

  it("maxEpisodeRef picks lexicographic max", () => {
    expect(maxEpisodeRef({ season: 1, episode: 5 }, { season: 2, episode: 1 })).toEqual({
      season: 2,
      episode: 1,
    });
    expect(maxEpisodeRef(null, { season: 1, episode: 1 })).toEqual({ season: 1, episode: 1 });
    expect(maxEpisodeRef({ season: 3, episode: 1 }, null)).toEqual({ season: 3, episode: 1 });
  });
});
