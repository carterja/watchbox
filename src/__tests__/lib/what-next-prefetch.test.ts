import { describe, expect, it } from "vitest";
import { shouldPrefetchWhatNext } from "@/contexts/WhatNextCacheContext";
import type { Media } from "@/types/media";

const base: Media = {
  id: "1",
  tmdbId: 1,
  type: "tv",
  title: "Test",
  overview: null,
  posterPath: null,
  releaseDate: null,
  runtime: null,
  status: "in_progress",
  progressNote: null,
  totalSeasons: null,
  seasonProgress: null,
  manualLastWatchedSeason: null,
  manualLastWatchedEpisode: null,
  streamingService: null,
  viewer: null,
  sortOrder: 0,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("shouldPrefetchWhatNext", () => {
  it("returns false for empty list", () => {
    expect(shouldPrefetchWhatNext([])).toBe(false);
  });

  it("returns false when no in-progress TV", () => {
    expect(
      shouldPrefetchWhatNext([
        { ...base, id: "a", status: "yet_to_start" },
        { ...base, id: "b", status: "finished" },
      ])
    ).toBe(false);
  });

  it("returns true when at least one TV is in_progress", () => {
    expect(shouldPrefetchWhatNext([{ ...base, id: "a", status: "in_progress" }])).toBe(true);
  });

  it("ignores in-progress movies", () => {
    expect(
      shouldPrefetchWhatNext([
        { ...base, id: "m", type: "movie", status: "in_progress" },
      ])
    ).toBe(false);
  });
});
