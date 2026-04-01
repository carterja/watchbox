import { describe, expect, it } from "vitest";
import { mergeOnDeckWithLibrary } from "@/lib/plex";
import { computeWatchingMatches, progressNoteFromPlex, tmdbMatchKey } from "@/lib/watching";
import type { Media } from "@/types/media";
import type { PlexOnDeckItem } from "@/lib/plex";

const baseMedia = (over: Partial<Media>): Media => ({
  id: "1",
  tmdbId: 1399,
  type: "tv",
  title: "Show",
  overview: null,
  posterPath: null,
  releaseDate: null,
  runtime: null,
  status: "in_progress",
  progressNote: "S1 E1",
  totalSeasons: null,
  seasonEpisodeCounts: null,
  seasonProgress: null,
      manualLastWatchedSeason: null,
      manualLastWatchedEpisode: null,
  streamingService: null,
  viewer: null,
  sortOrder: 0,
  personalNotes: null,
  lastProgressSource: null,
  createdAt: "",
  updatedAt: "",
  ...over,
});

describe("computeWatchingMatches", () => {
  it("matches WatchBox in progress to Plex by TMDB", () => {
    const list = [baseMedia({ tmdbId: 1399, type: "tv", status: "in_progress" })];
    const plex: PlexOnDeckItem[] = [
      {
        ratingKey: "1",
        type: "episode",
        title: "Ep",
        grandparentTitle: "Show",
        parentIndex: 1,
        index: 2,
        tmdbId: 1399,
        tmdbType: "tv",
      },
    ];
    const { matches, watchBoxInProgressOnly, plexOnly } = computeWatchingMatches(list, plex);
    expect(matches).toHaveLength(1);
    expect(matches[0].media.tmdbId).toBe(1399);
    expect(watchBoxInProgressOnly).toHaveLength(0);
    expect(plexOnly).toHaveLength(0);
  });

  it("splits WatchBox only when no Plex match", () => {
    const list = [baseMedia({ tmdbId: 999, status: "in_progress" })];
    const plex: PlexOnDeckItem[] = [];
    const { matches, watchBoxInProgressOnly } = computeWatchingMatches(list, plex);
    expect(matches).toHaveLength(0);
    expect(watchBoxInProgressOnly).toHaveLength(1);
  });
});

describe("progressNoteFromPlex", () => {
  it("formats episode", () => {
    const p: PlexOnDeckItem = {
      ratingKey: "1",
      type: "episode",
      title: "x",
      parentIndex: 2,
      index: 4,
    };
    expect(progressNoteFromPlex(p)).toBe("S2 E4");
  });
});

describe("tmdbMatchKey", () => {
  it("builds stable keys", () => {
    expect(tmdbMatchKey("tv", 1)).toBe("tv:1");
  });
});

describe("mergeOnDeckWithLibrary", () => {
  it("keeps On Deck row when same TMDB as library", () => {
    const deck = [
      {
        ratingKey: "a",
        type: "episode",
        title: "Ep",
        tmdbId: 1,
        tmdbType: "tv" as const,
        source: "onDeck" as const,
      },
    ];
    const lib = [
      {
        ratingKey: "b",
        type: "show",
        title: "Show",
        tmdbId: 1,
        tmdbType: "tv" as const,
        source: "library" as const,
      },
    ];
    const m = mergeOnDeckWithLibrary(deck, lib);
    expect(m).toHaveLength(1);
    expect(m[0].type).toBe("episode");
  });
});
