import type { Media } from "@/types/media";
import type { PlexOnDeckItem } from "@/lib/plex";

/** Stable key for matching WatchBox media to Plex items (TMDB id + movie|tv). */
export function tmdbMatchKey(type: "movie" | "tv", tmdbId: number): string {
  return `${type}:${tmdbId}`;
}

export function plexItemMatchKey(item: PlexOnDeckItem): string | null {
  if (item.tmdbId == null || !item.tmdbType) return null;
  return tmdbMatchKey(item.tmdbType, item.tmdbId);
}

/** Human-readable progress from Plex for WatchBox `progressNote`. */
export function progressNoteFromPlex(item: PlexOnDeckItem): string | null {
  // Plex `parentIndex` is already the season number (1-based; 0 = specials). Do not add 1.
  if (item.type === "episode" && item.parentIndex != null && item.index != null) {
    return `S${item.parentIndex} E${item.index}`;
  }
  if (
    item.type === "show" &&
    item.viewedLeafCount != null &&
    item.viewedLeafCount > 0 &&
    item.leafCount != null &&
    item.leafCount > 0
  ) {
    return `${item.viewedLeafCount} / ${item.leafCount} eps (Plex)`;
  }
  if (item.type === "movie" && item.duration && item.duration > 0 && item.viewOffset != null) {
    const pct = Math.min(100, Math.round((item.viewOffset / item.duration) * 100));
    return `Plex ~${pct}%`;
  }
  return null;
}

export type WatchingMatch = {
  media: Media;
  plex: PlexOnDeckItem;
};

export function computeWatchingMatches(
  list: Media[],
  plexItems: PlexOnDeckItem[]
): {
  matches: WatchingMatch[];
  watchBoxInProgressOnly: Media[];
  plexOnly: PlexOnDeckItem[];
  plexByKey: Map<string, PlexOnDeckItem>;
} {
  /** Prefer first Plex row per TMDB (On Deck episodes come before library show rows in merged lists). */
  const plexByKey = new Map<string, PlexOnDeckItem>();
  for (const p of plexItems) {
    const k = plexItemMatchKey(p);
    if (k && !plexByKey.has(k)) plexByKey.set(k, p);
  }

  const wbInProgress = list.filter((m) => m.status === "in_progress");
  const matches: WatchingMatch[] = [];

  for (const media of wbInProgress) {
    const k = tmdbMatchKey(media.type, media.tmdbId);
    const plex = plexByKey.get(k);
    if (plex) matches.push({ media, plex });
  }

  const watchBoxInProgressOnly = wbInProgress.filter((m) => {
    const k = tmdbMatchKey(m.type, m.tmdbId);
    return !plexByKey.has(k);
  });

  const plexOnly = plexItems.filter((p) => {
    const k = plexItemMatchKey(p);
    if (!k) return true;
    return !list.some((m) => m.tmdbId === p.tmdbId && m.type === p.tmdbType);
  });

  return { matches, watchBoxInProgressOnly, plexOnly, plexByKey };
}
