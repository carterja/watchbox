/** Shared with GET /api/plex/unmatched-playback and POST dismiss — keys must stay in sync. */

export function inferUnmatchedKind(row: {
  mediaKind: string | null;
  showTitle: string | null;
  grandparentRatingKey: string | null;
}): "movie" | "tv" {
  if (row.mediaKind === "movie" || row.mediaKind === "tv") return row.mediaKind;
  if (row.showTitle || row.grandparentRatingKey) return "tv";
  return "movie";
}

export function unmatchedPlaybackDedupeKey(row: {
  mediaKind: string | null;
  showTitle: string | null;
  title: string | null;
  ratingKey: string | null;
  grandparentRatingKey: string | null;
  tmdbId: number | null;
  id: string;
}): string {
  const kind = inferUnmatchedKind(row);
  if (kind === "movie") {
    const id = row.ratingKey ?? (row.tmdbId != null ? `tmdb-${row.tmdbId}` : null) ?? row.title ?? row.id;
    return `m:${id}`;
  }
  const gp = row.grandparentRatingKey?.trim();
  if (gp) return `tv:gp:${gp}`;
  const show = row.showTitle?.trim();
  if (show) return `tv:show:${show.toLowerCase()}`;
  return `tv:fb:${row.tmdbId ?? row.title ?? row.id}`;
}
