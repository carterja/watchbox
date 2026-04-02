import { describe, expect, it } from "vitest";
import {
  extractTmdbFromWebhookMetadata,
  firstImdbIdFromGuidArray,
  firstTmdbIdFromGuidArray,
  parseTmdbFromGuid,
} from "@/lib/plex";

describe("parseTmdbFromGuid", () => {
  it("parses com.plexapp.agents.themoviedb movie guid", () => {
    expect(parseTmdbFromGuid("com.plexapp.agents.themoviedb://movie/550?lang=en")).toEqual({
      type: "movie",
      id: 550,
    });
  });
  it("parses com.plexapp.agents.themoviedb tv guid", () => {
    expect(parseTmdbFromGuid("com.plexapp.agents.themoviedb://tv/1399?lang=en")).toEqual({
      type: "tv",
      id: 1399,
    });
  });
  it("returns null for missing guid", () => {
    expect(parseTmdbFromGuid(undefined)).toBeNull();
  });
  it("does not treat Plex hex guids as TMDB ids", () => {
    expect(parseTmdbFromGuid("plex://movie/5d7768285af944001f1f7091")).toBeNull();
  });
  it("parses plex://movie when id is numeric TMDB style", () => {
    expect(parseTmdbFromGuid("plex://movie/550?lang=en")).toEqual({ type: "movie", id: 550 });
  });
});

describe("firstTmdbIdFromGuidArray", () => {
  it("reads first tmdb id from Guid array", () => {
    expect(
      firstTmdbIdFromGuidArray([{ id: "imdb://tt123" }, { id: "tmdb://46533" }])
    ).toBe(46533);
  });
});

describe("firstImdbIdFromGuidArray", () => {
  it("reads first imdb id from Guid array", () => {
    expect(
      firstImdbIdFromGuidArray([{ id: "imdb://tt15551032" }, { id: "tmdb://3381140" }])
    ).toBe("tt15551032");
  });
});

describe("extractTmdbFromWebhookMetadata", () => {
  it("prefers agent guid for episode", () => {
    expect(
      extractTmdbFromWebhookMetadata({
        type: "episode",
        guid: "com.plexapp.agents.themoviedb://tv/1399?lang=en",
        Guid: [{ id: "tmdb://999999" }],
      })
    ).toEqual({ type: "tv", id: 1399 });
  });
  it("falls back to Guid tmdb when guid missing", () => {
    expect(
      extractTmdbFromWebhookMetadata({
        type: "episode",
        Guid: [{ id: "tmdb://46533" }],
      })
    ).toEqual({ type: "tv", id: 46533 });
  });
  it("resolves movie from Guid", () => {
    expect(
      extractTmdbFromWebhookMetadata({
        type: "movie",
        Guid: [{ id: "tmdb://550" }],
      })
    ).toEqual({ type: "movie", id: 550 });
  });
});
