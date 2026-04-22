import { describe, expect, it } from "vitest";
import { mergeFilteredReorder } from "@/lib/reorderFiltered";

describe("mergeFilteredReorder", () => {
  it("merges a filtered swap into the full library order", () => {
    const full = ["m1", "a", "m2", "c", "m3"];
    const filtered = ["a", "c"];
    const reordered = ["c", "a"];
    expect(mergeFilteredReorder(full, filtered, reordered)).toEqual(["m1", "c", "m2", "a", "m3"]);
  });

  it("returns unchanged order when filtered id order does not match full list (stale UI)", () => {
    const full = ["a", "b", "c"];
    const wrongFilteredOrder = ["c", "a"];
    const reordered = ["a", "c"];
    expect(mergeFilteredReorder(full, wrongFilteredOrder, reordered)).toEqual(["a", "b", "c"]);
  });
});
