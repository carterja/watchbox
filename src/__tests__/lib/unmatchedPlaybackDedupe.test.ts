import { describe, expect, it } from "vitest";
import { inferUnmatchedKind, unmatchedPlaybackDedupeKey } from "@/lib/unmatchedPlaybackDedupe";

describe("unmatchedPlaybackDedupeKey", () => {
  it("TV: same grandparentRatingKey yields same key across episodes", () => {
    const base = {
      mediaKind: "tv" as string | null,
      showTitle: "Bluey (2018)",
      title: "Tina",
      ratingKey: "999",
      grandparentRatingKey: "12345",
      tmdbId: 82728,
      id: "a",
    };
    const k1 = unmatchedPlaybackDedupeKey(base);
    const k2 = unmatchedPlaybackDedupeKey({ ...base, id: "b", title: "Other ep" });
    expect(k1).toBe(k2);
    expect(k1).toBe("tv:gp:12345");
  });

  it("inferUnmatchedKind uses showTitle when mediaKind is null", () => {
    expect(
      inferUnmatchedKind({
        mediaKind: null,
        showTitle: "Bluey",
        grandparentRatingKey: null,
      })
    ).toBe("tv");
  });
});
