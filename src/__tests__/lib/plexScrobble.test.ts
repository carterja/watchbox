import { describe, expect, it } from "vitest";
import { isPlexScrobbleEquivalent } from "@/lib/plexScrobble";

describe("isPlexScrobbleEquivalent", () => {
  it("returns false without duration or offset", () => {
    expect(isPlexScrobbleEquivalent(undefined, 1000, 0.9)).toBe(false);
    expect(isPlexScrobbleEquivalent(500, undefined, 0.9)).toBe(false);
  });

  it("uses explicit threshold", () => {
    expect(isPlexScrobbleEquivalent(899, 1000, 0.9)).toBe(false);
    expect(isPlexScrobbleEquivalent(900, 1000, 0.9)).toBe(true);
    expect(isPlexScrobbleEquivalent(500, 1000, 0.5)).toBe(true);
  });
});
