/**
 * Merge a filtered subset reorder into full-library id order without changing
 * positions of items outside the filtered set.
 *
 * `filteredIdsInOrder` must match the order those ids appear in `fullOrderedIds`
 * (same as filtering `list` in UI order). If not, returns a copy of `fullOrderedIds`
 * so we never write a malformed permutation.
 */
export function mergeFilteredReorder(
  fullOrderedIds: string[],
  filteredIdsInOrder: string[],
  reorderedFilteredIds: string[]
): string[] {
  if (filteredIdsInOrder.length !== reorderedFilteredIds.length) {
    return fullOrderedIds.slice();
  }
  const filteredSet = new Set(reorderedFilteredIds);
  const indicesOfFiltered = fullOrderedIds
    .map((id, i) => (filteredSet.has(id) ? i : -1))
    .filter((i) => i >= 0);
  if (indicesOfFiltered.length !== reorderedFilteredIds.length) {
    return fullOrderedIds.slice();
  }
  for (let j = 0; j < indicesOfFiltered.length; j++) {
    if (fullOrderedIds[indicesOfFiltered[j]] !== filteredIdsInOrder[j]) {
      return fullOrderedIds.slice();
    }
  }
  const next = fullOrderedIds.slice();
  reorderedFilteredIds.forEach((id, j) => {
    next[indicesOfFiltered[j]] = id;
  });
  return next;
}
