import { describe, expect, it } from "vitest";
import { parseSeasonEpisodeCountsJson } from "@/lib/seasonEpisodeCounts";

describe("parseSeasonEpisodeCountsJson", () => {
  it("returns null for invalid totalSeasons", () => {
    expect(parseSeasonEpisodeCountsJson([], 0)).toBeNull();
    expect(parseSeasonEpisodeCountsJson([], null)).toBeNull();
  });

  it("returns null when length mismatch", () => {
    expect(parseSeasonEpisodeCountsJson([{ season: 1, episodeCount: 2 }], 2)).toBeNull();
  });

  it("returns null when seasons not 1..n", () => {
    expect(
      parseSeasonEpisodeCountsJson(
        [
          { season: 2, episodeCount: 1 },
          { season: 1, episodeCount: 1 },
        ],
        2
      )
    ).toBeNull();
  });

  it("parses valid array", () => {
    const raw = [
      { season: 1, episodeCount: 10 },
      { season: 2, episodeCount: 8 },
    ];
    expect(parseSeasonEpisodeCountsJson(raw, 2)).toEqual(raw);
  });
});
