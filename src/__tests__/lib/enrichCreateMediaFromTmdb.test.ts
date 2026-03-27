import { describe, it, expect, vi, beforeEach } from "vitest";
import { mergeCreatePayloadWithTmdb } from "@/lib/enrichCreateMediaFromTmdb";
import * as tmdb from "@/lib/tmdb";

describe("mergeCreatePayloadWithTmdb", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fills poster and overview from TMDB when omitted (TV)", async () => {
    vi.spyOn(tmdb, "getTmdbTvDetails").mockResolvedValue({
      id: 82728,
      name: "Bluey",
      overview: "Australian animated series.",
      poster_path: "/bluey.jpg",
      first_air_date: "2018-10-01",
      number_of_seasons: 3,
    });
    vi.spyOn(tmdb, "getTmdbMovieDetails").mockResolvedValue(null);

    const base = {
      tmdbId: 82728,
      type: "tv" as const,
      title: "Bluey (2018)",
      status: "in_progress" as const,
    };

    const out = await mergeCreatePayloadWithTmdb(base);
    expect(out.title).toBe("Bluey");
    expect(out.posterPath).toBe("/bluey.jpg");
    expect(out.overview).toBe("Australian animated series.");
    expect(out.releaseDate).toBe("2018-10-01");
    expect(out.totalSeasons).toBe(3);
  });

  it("keeps client poster when provided", async () => {
    vi.spyOn(tmdb, "getTmdbTvDetails").mockResolvedValue({
      id: 1,
      name: "Show",
      overview: "X",
      poster_path: "/tmdb.jpg",
      first_air_date: null,
      number_of_seasons: 1,
    });

    const out = await mergeCreatePayloadWithTmdb({
      tmdbId: 1,
      type: "tv",
      title: "Show",
      posterPath: "/custom.jpg",
      status: "yet_to_start",
    });
    expect(out.posterPath).toBe("/custom.jpg");
  });

  it("fills movie runtime from TMDB", async () => {
    vi.spyOn(tmdb, "getTmdbTvDetails").mockResolvedValue(null);
    vi.spyOn(tmdb, "getTmdbMovieDetails").mockResolvedValue({
      id: 99,
      title: "Film",
      overview: "Desc",
      poster_path: "/p.jpg",
      release_date: "2020-01-01",
      runtime: 120,
    });

    const out = await mergeCreatePayloadWithTmdb({
      tmdbId: 99,
      type: "movie",
      title: "Film",
      status: "yet_to_start",
    });
    expect(out.runtime).toBe(120);
    expect(out.posterPath).toBe("/p.jpg");
  });
});
